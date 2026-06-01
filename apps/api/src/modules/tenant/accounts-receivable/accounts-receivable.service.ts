import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { Decimal } from '@prisma/client/runtime/library'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { buildBranchWhere, assertBranchAccess, resolveWriteBranchId } from '../../../common/branch-scope.util'
import { z } from 'zod'

export const CreateArSchema = z.object({
  companyId:   z.string().cuid(),
  branchId:    z.string().optional().nullable(),
  clientId:    z.string().cuid(),
  saleId:      z.string().cuid().optional(),
  description: z.string().min(2),
  amount:      z.number().positive(),
  dueDate:     z.string().datetime(),
  notes:       z.string().optional().nullable(),
})

export const RegisterPaymentSchema = z.object({
  amount:        z.number().positive(),
  paymentMethod: z.string().default('01'),
  reference:     z.string().optional().nullable(),
  notes:         z.string().optional().nullable(),
  paymentDate:   z.string().datetime().optional(),
})

export type CreateArDto      = z.infer<typeof CreateArSchema>
export type RegisterPaymentDto = z.infer<typeof RegisterPaymentSchema>

@Injectable()
export class AccountsReceivableService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  private assertBranchAccess(user: JwtAccessPayload, branchId?: string | null) {
    if (branchId) assertBranchAccess(user, branchId)
  }

  private async assertClientAccess(
    db: ReturnType<AccountsReceivableService['getDb']>,
    tenantId: string,
    companyId: string,
    clientId?: string,
  ) {
    if (!clientId) return
    const client = await db.client.findFirst({
      where: { id: clientId, tenantId, companyId, isActive: true },
      select: { id: true },
    })
    if (!client) throw new NotFoundException('Cliente no encontrado')
  }

  // ─── KPIs ─────────────────────────────────────────────────────────────────

  async getStats(companyId: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)

    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Owner sees every branch; branch users are confined to their branchIds.
    let branchFilter: string
    if (user.canViewAllBranches) {
      branchFilter = 'TRUE'
    } else if (user.branchIds.length > 0) {
      const placeholders = user.branchIds.map((_, index) => `$${index + 3}`).join(', ')
      branchFilter = `ar."branchId" IN (${placeholders})`
    } else {
      branchFilter = 'FALSE'
    }
    const nowParam = user.branchIds.length + 3

    const [stats, cobradoMes] = await Promise.all([
      db.$queryRawUnsafe<Array<{
        totalPendiente: Decimal | null
        totalVencido: Decimal | null
        countPendiente: number
        countVencido: number
      }>>(`
        SELECT
          COALESCE(SUM(ar."amount" - ar."amountPaid"), 0) AS "totalPendiente",
          COALESCE(SUM(ar."amount" - ar."amountPaid") FILTER (
            WHERE ar."dueDate" < $${nowParam} AND ar."status" <> 'PAID'
          ), 0) AS "totalVencido",
          COUNT(*) FILTER (WHERE ar."status" = 'PENDING')::int AS "countPendiente",
          COUNT(*) FILTER (WHERE ar."status" = 'OVERDUE')::int AS "countVencido"
        FROM "AccountReceivable" ar
        WHERE ar."tenantId" = $1
          AND ar."companyId" = $2
          AND ar."status" IN ('PENDING', 'PARTIAL', 'OVERDUE')
          AND ${branchFilter}
      `, tenantId, companyId, ...user.branchIds, now),
      db.arPayment.aggregate({
        where: {
          tenantId,
          accountReceivable: {
            companyId,
            tenantId,
            ...buildBranchWhere(user),
          },
          createdAt: { gte: firstOfMonth },
        },
        _sum: { amount: true },
      }),
    ])
    const row = stats[0]

    return {
      totalPendiente: Number(row?.totalPendiente ?? 0).toFixed(2),
      totalVencido:   Number(row?.totalVencido ?? 0).toFixed(2),
      cobradoMes:     Number(cobradoMes._sum.amount ?? 0).toFixed(2),
      countPendiente: row?.countPendiente ?? 0,
      countVencido:   row?.countVencido ?? 0,
    }
  }

  // ─── Listado ──────────────────────────────────────────────────────────────

  async findAll(
    companyId: string,
    user: JwtAccessPayload,
    status?: string,
    clientId?: string,
    from?: string,
    to?: string,
    branchId?: string,
  ) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    await this.assertClientAccess(db, tenantId, companyId, clientId)

    // Auto-mark overdue: fire-and-forget — never block the read
    void db.accountReceivable.updateMany({
      where: {
        tenantId,
        companyId,
        ...buildBranchWhere(user, branchId),
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    }).catch(() => { /* best-effort — no race condition on concurrent reads */ })

    return db.accountReceivable.findMany({
      where: {
        tenantId,
        companyId,
        ...buildBranchWhere(user, branchId),
        ...(status   ? { status: status as any } : {}),
        ...(clientId ? { clientId }              : {}),
        ...(from || to ? {
          dueDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        } : {}),
      },
      include: {
        client:   { select: { id: true, name: true, numDocumento: true, esCreditoFiscal: true } },
        payments: { orderBy: { paymentDate: 'asc' } },
        sale:     { select: { id: true, tipoDte: true, totalPagar: true, createdAt: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 500,
    })
  }

  // ─── Crear CxC ────────────────────────────────────────────────────────────

  async create(dto: CreateArDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)

    const client = await db.client.findFirst({
      where: { id: dto.clientId, tenantId, companyId: dto.companyId, isActive: true },
    })
    if (!client) throw new NotFoundException('Cliente no encontrado')

    let branchId: string
    if (dto.saleId) {
      const sale = await db.sale.findFirst({
        where: { id: dto.saleId, tenantId, companyId: dto.companyId, clientId: dto.clientId },
        select: { id: true, branchId: true },
      })
      if (!sale) throw new BadRequestException('Venta no pertenece al cliente o empresa indicada')
      this.assertBranchAccess(user, sale.branchId)
      branchId = sale.branchId

      const existing = await db.accountReceivable.findFirst({
        where: { saleId: dto.saleId, tenantId, companyId: dto.companyId },
      })
      if (existing) throw new ConflictException('Ya existe una CxC para esta venta')
    } else {
      branchId = resolveWriteBranchId(user, dto.branchId ?? undefined)
    }

    return db.accountReceivable.create({
      data: {
        tenantId,
        companyId:   dto.companyId,
        branchId,
        clientId:    dto.clientId,
        saleId:      dto.saleId ?? null,
        description: dto.description,
        amount:      new Decimal(dto.amount),
        dueDate:     new Date(dto.dueDate),
        notes:       dto.notes ?? null,
        status:      'PENDING',
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    })
  }

  // ─── Registrar abono ─────────────────────────────────────────────────────

  async registerPayment(id: string, dto: RegisterPaymentDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const ar = await db.accountReceivable.findFirst({
      where: { id, tenantId, companyId: user.companyId, ...buildBranchWhere(user) },
    })
    if (!ar) throw new NotFoundException('CxC no encontrada')
    if (ar.status === 'PAID') throw new BadRequestException('CxC ya está pagada')
    if (ar.status === 'CANCELLED') throw new BadRequestException('CxC está cancelada')

    const pending = Number(ar.amount) - Number(ar.amountPaid)
    if (dto.amount > pending + 0.001)
      throw new BadRequestException(`Monto excede pendiente ($${pending.toFixed(2)})`)

    const newPaid   = Number(ar.amountPaid) + dto.amount
    const newStatus = newPaid >= Number(ar.amount) - 0.001 ? 'PAID'
      : newPaid > 0 ? 'PARTIAL'
      : ar.status

    const [payment] = await db.$transaction([
      db.arPayment.create({
        data: {
          tenantId,
          accountReceivableId: id,
          amount:        new Decimal(dto.amount),
          paymentMethod: dto.paymentMethod,
          reference:     dto.reference ?? null,
          notes:         dto.notes ?? null,
          paymentDate:   dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        },
      }),
      db.accountReceivable.update({
        where: { id },
        data: {
          amountPaid: new Decimal(newPaid),
          status:     newStatus as any,
        },
      }),
    ])

    return payment
  }

  // ─── Aging report ─────────────────────────────────────────────────────────

  async getAging(companyId: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)

    const records = await db.accountReceivable.findMany({
      where: {
        tenantId,
        companyId,
        ...buildBranchWhere(user),
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    })

    const now = Date.now()
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 }
    const rows = records.map(r => {
      const pending = Number(r.amount) - Number(r.amountPaid)
      const daysPast = Math.floor((now - new Date(r.dueDate).getTime()) / 86_400_000)
      let bucket: keyof typeof buckets
      if (daysPast <= 0)  bucket = 'current'
      else if (daysPast <= 30)  bucket = 'd30'
      else if (daysPast <= 60)  bucket = 'd60'
      else if (daysPast <= 90)  bucket = 'd90'
      else bucket = 'd90plus'
      buckets[bucket] += pending
      return { ...r, pending: round2(pending), daysPast: Math.max(0, daysPast), bucket }
    })

    return {
      rows,
      buckets: {
        current:  round2(buckets.current),
        d30:      round2(buckets.d30),
        d60:      round2(buckets.d60),
        d90:      round2(buckets.d90),
        d90plus:  round2(buckets.d90plus),
        total:    round2(Object.values(buckets).reduce((a, b) => a + b, 0)),
      },
    }
  }

  // ─── Cancelar CxC ────────────────────────────────────────────────────────

  async cancel(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const ar = await db.accountReceivable.findFirst({
      where: { id, tenantId, companyId: user.companyId, ...buildBranchWhere(user) },
    })
    if (!ar) throw new NotFoundException('CxC no encontrada')
    if (ar.status === 'PAID') throw new BadRequestException('No se puede cancelar una CxC ya pagada')

    return db.accountReceivable.update({
      where: { id },
      data:  { status: 'CANCELLED' },
    })
  }
}

function round2(n: number) { return Math.round(n * 100) / 100 }

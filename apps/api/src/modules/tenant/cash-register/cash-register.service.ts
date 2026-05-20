import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { Decimal } from '@prisma/client/runtime/library'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const OpenRegisterSchema = z.object({
  companyId: z.string().cuid(),
  branchId: z.string().cuid(),
  openingBalance: z.number().nonnegative().default(0),
  notes: z.string().optional(),
})

export const CloseRegisterSchema = z.object({
  closingBalance: z.number().nonnegative(),
  arqueoCaja: z.any().optional(),
  notes: z.string().optional(),
})

export type OpenRegisterDto = z.infer<typeof OpenRegisterSchema>
export type CloseRegisterDto = z.infer<typeof CloseRegisterSchema>

// DTE El Salvador formaPago codes
const FORMAS_EFECTIVO      = ['01']
const FORMAS_TARJETA       = ['02', '03']
const FORMAS_TRANSFERENCIA = ['04', '05']
const FORMAS_QR            = ['06']

@Injectable()
export class CashRegisterService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  private assertBranchAccess(user: JwtAccessPayload, branchId: string) {
    if (!user.branchIds.includes(branchId)) throw new ForbiddenException('Sucursal no autorizada')
  }

  async findAll(user: JwtAccessPayload, branchId?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    if (branchId) this.assertBranchAccess(user, branchId)
    return db.cashRegister.findMany({
      where: {
        tenantId,
        companyId: user.companyId,
        ...(branchId ? { branchId } : { branchId: { in: user.branchIds } }),
      },
      include: {
        branch: { select: { id: true, name: true } },
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        _count: { select: { sales: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
    })
  }

  async findOpen(user: JwtAccessPayload, branchId: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertBranchAccess(user, branchId)
    return db.cashRegister.findFirst({
      where: { tenantId, companyId: user.companyId, branchId, closedAt: null },
      include: {
        openedBy: { select: { id: true, name: true } },
        _count: { select: { sales: true } },
      },
    })
  }

  async open(dto: OpenRegisterDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)
    this.assertBranchAccess(user, dto.branchId)

    const alreadyOpen = await db.cashRegister.findFirst({
      where: { tenantId, companyId: dto.companyId, branchId: dto.branchId, closedAt: null },
    })
    if (alreadyOpen) throw new BadRequestException('Ya hay una caja abierta en esta sucursal')

    return db.cashRegister.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        branchId: dto.branchId,
        openedById: user.sub,
        openingBalance: new Decimal(dto.openingBalance),
        notes: dto.notes,
      },
    })
  }

  async close(id: string, dto: CloseRegisterDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const register = await db.cashRegister.findFirst({ where: { id, tenantId } })
    if (!register) throw new NotFoundException('Caja no encontrada')
    this.assertCompanyAccess(user, register.companyId)
    this.assertBranchAccess(user, register.branchId)
    if (register.closedAt) throw new BadRequestException('Esta caja ya está cerrada')

    // Payment totals by method (single query)
    const paymentGroups = await db.payment.groupBy({
      by: ['formaPago'],
      where: { sale: { cashRegisterId: id, tenantId } },
      _sum: { amount: true },
    })

    const sumFor = (codes: string[]) =>
      paymentGroups
        .filter(p => codes.includes(p.formaPago))
        .reduce((s, p) => s.plus(p._sum.amount ?? 0), new Decimal(0))

    const totalEfectivo      = sumFor(FORMAS_EFECTIVO)
    const totalTarjeta       = sumFor(FORMAS_TARJETA)
    const totalTransferencia = sumFor(FORMAS_TRANSFERENCIA)
    const totalQR            = sumFor(FORMAS_QR)

    // Sales totals
    const [cantidadVentas, salesAgg] = await Promise.all([
      db.sale.count({ where: { cashRegisterId: id, tenantId } }),
      db.sale.aggregate({
        where: { cashRegisterId: id, tenantId },
        _sum: { totalPagar: true },
      }),
    ])

    const totalVentas    = new Decimal(salesAgg._sum.totalPagar ?? 0)
    const montoEsperado  = new Decimal(register.openingBalance).plus(totalEfectivo)
    const actualBalance  = new Decimal(dto.closingBalance)
    const difference     = actualBalance.minus(montoEsperado)

    return db.cashRegister.update({
      where: { id },
      data: {
        closedAt: new Date(),
        closedById: user.sub,
        closingBalance: actualBalance,
        difference,
        montoEsperado,
        totalEfectivo,
        totalTarjeta,
        totalTransferencia,
        totalQR,
        totalVentas,
        cantidadVentas,
        arqueoCaja: dto.arqueoCaja ?? undefined,
        notes: dto.notes,
      },
    })
  }

  async getSummary(user: JwtAccessPayload, id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const register = await db.cashRegister.findFirst({ where: { id, tenantId } })
    if (!register) throw new NotFoundException('Caja no encontrada')
    this.assertCompanyAccess(user, register.companyId)
    this.assertBranchAccess(user, register.branchId)

    const [salesCount, totalSales, paymentsByMethod] = await Promise.all([
      db.sale.count({ where: { cashRegisterId: id, tenantId } }),
      db.sale.aggregate({
        where: { cashRegisterId: id, tenantId },
        _sum: { totalPagar: true },
      }),
      db.payment.groupBy({
        by: ['formaPago'],
        where: { sale: { cashRegisterId: id, tenantId } },
        _sum: { amount: true },
      }),
    ])

    return {
      register,
      salesCount,
      totalSales: totalSales._sum.totalPagar,
      paymentsByMethod,
    }
  }
}

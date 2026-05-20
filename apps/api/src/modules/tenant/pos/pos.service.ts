import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { calcLineTotals, calcSaleSummary } from '@pos-dte/dte-core'
import { Decimal } from '@prisma/client/runtime/library'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const SaleLineSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive().optional(), // override if custom price
  discount: z.number().nonnegative().default(0),
})

export const CreateSaleSchema = z.object({
  companyId: z.string().cuid(),
  branchId: z.string().cuid(),
  cashRegisterId: z.string().cuid(),
  clientId: z.string().cuid().optional().nullable(),
  tipoDte: z.enum(['01', '03']).default('01'), // 01=CF, 03=CCF
  condicionOperacion: z.enum(['1', '2', '3']).default('1'), // 1=Contado, 2=Crédito, 3=Otro
  items: z.array(SaleLineSchema).min(1),
  payments: z.array(z.object({
    formaPago: z.string().length(2), // 01=Efectivo,02=Tarjeta,03=Transferencia,etc.
    amount: z.number().positive(),
    reference: z.string().optional(),
  })),
  notes: z.string().optional(),
  emitDte: z.boolean().default(true),
})

export type CreateSaleDto = z.infer<typeof CreateSaleSchema>

@Injectable()
export class PosService {
  constructor(
    private readonly clientFactory: TenantClientFactory,
    @InjectQueue('dte') private readonly dteQueue: Queue,
  ) {}

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

  async findSales(companyId: string, user: JwtAccessPayload, branchId?: string, from?: string, to?: string, page = 1, limit = 50) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    if (branchId) this.assertBranchAccess(user, branchId)
    const skip = (page - 1) * limit

    const where = {
      tenantId,
      companyId,
      ...(branchId ? { branchId } : { branchId: { in: user.branchIds } }),
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    }

    const [sales, total] = await Promise.all([
      db.sale.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          dteDocument: { select: { id: true, tipoDte: true, numeroControl: true, selloRecibido: true, status: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.sale.count({ where }),
    ])

    return { sales, total, page, limit }
  }

  async findOne(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const sale = await db.sale.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        branch: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        payments: true,
        cashRegister: { select: { id: true, openedAt: true } },
        dteDocument: true,
      },
    })
    if (!sale) throw new NotFoundException('Venta no encontrada')
    return sale
  }

  async create(dto: CreateSaleDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)
    this.assertBranchAccess(user, dto.branchId)

    // Validate cash register is open
    const register = await db.cashRegister.findFirst({
      where: { id: dto.cashRegisterId, tenantId, companyId: dto.companyId, branchId: dto.branchId, closedAt: null },
    })
    if (!register) throw new BadRequestException('Caja cerrada o no encontrada')

    // Load products
    const productIds = dto.items.map(i => i.productId)
    const products = await db.service.findMany({
      where: { id: { in: productIds }, tenantId, companyId: dto.companyId, isActive: true },
    })
    if (products.length !== productIds.length) throw new BadRequestException('Uno o más productos no encontrados')

    if (dto.clientId) {
      const client = await db.client.findFirst({
        where: { id: dto.clientId, tenantId, companyId: dto.companyId, isActive: true },
        select: { id: true },
      })
      if (!client) throw new BadRequestException('Cliente no encontrado para esta empresa')
    }

    // Build typed line totals
    const lines = dto.items.map(item => {
      const product = products.find(p => p.id === item.productId)!
      const unitPrice = item.unitPrice ?? Number(product.price)
      const totals = calcLineTotals(
        {
          quantity: item.quantity,
          unitPrice,
          discount: item.discount,
        },
        dto.tipoDte as '01' | '03',
      )
      return { item, product, unitPrice, totals }
    })

    const summary = calcSaleSummary({
      lines: lines.map(l => l.totals),
    })

    // Validate payment total covers sale total
    const totalPaid = dto.payments.reduce((s, p) => s + p.amount, 0)
    if (new Decimal(totalPaid).lessThan(summary.totalPagar)) {
      throw new BadRequestException('El total pagado no cubre el total de la venta')
    }

    // Check stock for tracked products
    for (const { item, product } of lines) {
      if (product.trackStock && (product.stock ?? 0) < item.quantity) {
        throw new BadRequestException(`Stock insuficiente para "${product.name}"`)
      }
    }

    // Validate tipoDte is enabled for this company
    const companyConfig = await db.company.findFirst({
      where: { id: dto.companyId, tenantId },
      select: { dteEnabledTypes: true },
    })
    const enabledTypes: string[] = (companyConfig?.dteEnabledTypes as string[]) ?? []
    const effectiveEnabled = enabledTypes.length > 0 ? enabledTypes : ['01', '03']
    if (dto.emitDte && !effectiveEnabled.includes(dto.tipoDte)) {
      throw new BadRequestException(
        `Tipo de documento '${dto.tipoDte}' no está habilitado para esta empresa. Actívalo en Configuración → Integraciones DTE.`
      )
    }

    // Get numero control
    const dteNumberControl = await this.getNextNumeroControl(dto.companyId, dto.branchId, dto.tipoDte, tenantId)

    // Create sale in transaction
    const sale = await db.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          tenantId,
          companyId: dto.companyId,
          branchId: dto.branchId,
          cashRegisterId: dto.cashRegisterId,
          clientId: dto.clientId,
          userId: user.sub,
          tipoDte: dto.tipoDte,
          condicionOperacion: dto.condicionOperacion,
          notes: dto.notes,
          // Totals
          totalNoSuj: new Decimal(summary.totalNoSuj),
          totalExenta: new Decimal(summary.totalExenta),
          totalGravada: new Decimal(summary.totalGravada),
          totalIva: new Decimal(summary.totalIva),
          totalDescuento: new Decimal(summary.totalDescu),
          totalPagar: new Decimal(summary.totalPagar),
          // Items
          items: {
            create: lines.map(({ item, product, unitPrice, totals }) => ({
              productId: item.productId,
              productName: product.name,
              quantity: item.quantity,
              unitPrice: new Decimal(unitPrice),
              discount: new Decimal(item.discount),
              ventaNoSuj: new Decimal(totals.ventaNoSujeta),
              ventaExenta: new Decimal(totals.ventaExenta),
              ventaGravada: new Decimal(totals.ventaGravada),
              ivaItem: new Decimal(totals.ivaItem),
              tipoItem: product.tipoItem,
              uniMedida: product.uniMedida,
            })),
          },
          // Payments
          payments: {
            create: dto.payments.map(p => ({
              formaPago: p.formaPago,
              amount: new Decimal(p.amount),
              reference: p.reference,
            })),
          },
        },
      })

      // Decrease stock
      for (const { item, product } of lines) {
        if (product.trackStock) {
          await tx.service.update({
            where: { id: product.id },
            data: { stock: { decrement: item.quantity } },
          })
        }
      }

      // Update numero control sequence
      await tx.dteNumberControl.update({
        where: { id: dteNumberControl.id },
        data: { lastSequence: { increment: 1 } },
      })

      return newSale
    })

    // Enqueue DTE emission
    if (dto.emitDte) {
      await this.dteQueue.add('emit', {
        saleId: sale.id,
        tenantId,
        companyId: dto.companyId,
        branchId: dto.branchId,
        tipoDte: dto.tipoDte,
        numeroControl: dteNumberControl.nextNumeroControl,
      }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      })
    }

    return this.findOne(sale.id)
  }

  async getStats(companyId: string, user: JwtAccessPayload, period: 'today' | 'month') {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)

    const now = new Date()
    let from: Date
    let to: Date

    if (period === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      to   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      to   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }

    const saleWhere = {
      tenantId,
      companyId,
      branchId: { in: user.branchIds },
      createdAt: { gte: from, lte: to },
      dteDocument: { isNot: { status: 'ANNULLED' } as any },
    }

    const [salesAgg, activeClientsAgg, expensesAgg] = await Promise.all([
      db.sale.aggregate({
        where: saleWhere,
        _sum: { totalPagar: true },
        _count: { id: true },
      }),
      db.sale.groupBy({
        by: ['clientId'],
        where: { ...saleWhere, clientId: { not: null } },
        _count: { clientId: true },
      }),
      db.expense.aggregate({
        where: { tenantId, companyId, date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
    ])

    const totalSales   = Number(salesAgg._sum.totalPagar ?? 0)
    const countSales   = salesAgg._count.id
    const activeClients = activeClientsAgg.length
    const totalExpenses = Number(expensesAgg._sum.amount ?? 0)

    // last7Days only for month period
    let last7Days: { day: string; total: number }[] = []
    if (period === 'month') {
      const days7from = new Date(now)
      days7from.setDate(days7from.getDate() - 6)
      days7from.setHours(0, 0, 0, 0)

      const salesLast7 = await db.sale.findMany({
        where: {
          tenantId,
          companyId,
          createdAt: { gte: days7from, lte: new Date() },
          dteDocument: { isNot: { status: 'ANNULLED' } as any },
        },
        select: { createdAt: true, totalPagar: true },
      })

      const dayMap: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
        dayMap[key] = 0
      }
      for (const s of salesLast7) {
        const d = s.createdAt
        const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key in dayMap) dayMap[key] += Number(s.totalPagar ?? 0)
      }
      last7Days = Object.entries(dayMap).map(([day, total]) => ({ day, total }))
    }

    return { totalSales, countSales, activeClients, totalExpenses, last7Days }
  }

  private async getNextNumeroControl(companyId: string, branchId: string, tipoDte: string, tenantId: string) {
    const db = this.getDb()
    const year = new Date().getFullYear()

    let control = await db.dteNumberControl.findFirst({
      where: { tenantId, companyId, branchId, tipoDte, year },
    })

    if (!control) {
      // Auto-create for this year — sequence resets to 0 on each new calendar year
      const branch = await db.branch.findFirst({
        where: { id: branchId, tenantId, companyId },
        select: { codEstableMH: true, codPuntoVentaMH: true },
      })
      control = await db.dteNumberControl.create({
        data: {
          tenantId,
          companyId,
          branchId,
          tipoDte,
          year,
          lastSequence: 0,
          codEstable: branch?.codEstableMH ?? 'M001',
          codPuntoVenta: branch?.codPuntoVentaMH ?? 'P001',
        },
      })
    }

    const nextSeq = control.lastSequence + 1
    const { buildNumeroControl } = await import('@pos-dte/dte-core')
    const nextNumeroControl = buildNumeroControl({
      tipoDte: tipoDte as import('@pos-dte/shared-types').TipoDte,
      codEstable: control.codEstable,
      codPuntoVenta: control.codPuntoVenta,
      sequence: nextSeq,
    })

    return { ...control, nextNumeroControl }
  }

  async voidSale(id: string, reason: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const sale = await db.sale.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      include: { dteDocument: true },
    })
    if (!sale) throw new NotFoundException('Venta no encontrada')
    if (sale.dteDocument?.status === 'ANNULLED') {
      throw new BadRequestException('Esta venta ya fue anulada')
    }
    if (sale.dteDocument) {
      await db.dteDocument.update({
        where: { id: sale.dteDocument.id },
        data: { status: 'ANNULLED', observaciones: [reason] },
      })
    }
    return this.findOne(id)
  }
}

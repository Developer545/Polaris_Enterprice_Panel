import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger, Optional } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { randomUUID } from 'crypto'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { calcIvaRetention1, calcLineTotals, calcSaleSummary, buildNumeroControl } from '@pos-dte/dte-core'
import { Decimal } from '@prisma/client/runtime/library'
import { type JwtAccessPayload, type TipoDte } from '@pos-dte/shared-types'
import { buildBranchWhere, assertBranchAccess } from '../../../common/branch-scope.util'
import { useBullDteQueue } from '../../../config/env'
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
  private readonly logger = new Logger(PosService.name)

  constructor(
    private readonly clientFactory: TenantClientFactory,
    @Optional() @InjectQueue('dte') private readonly dteQueue?: Queue,
  ) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  private assertBranchAccess(user: JwtAccessPayload, branchId: string) {
    assertBranchAccess(user, branchId)
  }

  async findSales(companyId: string, user: JwtAccessPayload, branchId?: string, from?: string, to?: string, page = 1, limit = 50) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    const skip = (page - 1) * limit

    const where = {
      tenantId,
      companyId,
      ...buildBranchWhere(user, branchId),
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

  async findOne(id: string, user?: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const sale = await db.sale.findFirst({
      where: {
        id,
        tenantId,
        ...(user ? { companyId: user.companyId, ...buildBranchWhere(user) } : {}),
      },
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

    let clientForSale: { id: string; esGranContribuyente: boolean; retieneIva1: boolean } | null = null
    if (dto.clientId) {
      clientForSale = await db.client.findFirst({
        where: { id: dto.clientId, tenantId, companyId: dto.companyId, isActive: true },
        select: { id: true, esGranContribuyente: true, retieneIva1: true },
      })
      if (!clientForSale) throw new BadRequestException('Cliente no encontrado para esta empresa')
    }

    const companyConfig = await db.company.findFirst({
      where: { id: dto.companyId, tenantId },
      select: {
        dteEnabledTypes: true,
        esGranContribuyente: true,
        sujetoRetencionIva1: true,
      },
    })

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
    for (const { item, product } of lines) {
      if (product.trackStock && !Number.isInteger(item.quantity)) {
        throw new BadRequestException(`La cantidad de inventario para "${product.name}" debe ser entera`)
      }
    }

    const summaryBeforeRetention = calcSaleSummary({
      lines: lines.map(l => l.totals),
      tipoDte: dto.tipoDte,
    })
    const ivaRete1 = calcIvaRetention1({
      tipoDte: dto.tipoDte,
      taxableBase: summaryBeforeRetention.totalGravada,
      buyerRetainsIva1: !!clientForSale?.retieneIva1,
      sellerSubjectToRetention: companyConfig?.sujetoRetencionIva1 ?? true,
      sellerIsGranContribuyente: companyConfig?.esGranContribuyente ?? false,
    })
    const summary = calcSaleSummary({
      lines: lines.map(l => l.totals),
      tipoDte: dto.tipoDte,
      ivaRete1,
    })

    // Validate payment total covers sale total
    const totalPaid = dto.payments.reduce((s, p) => s + p.amount, 0)
    if (new Decimal(totalPaid).lessThan(summary.totalPagar)) {
      throw new BadRequestException('El total pagado no cubre el total de la venta')
    }

    // Validate tipoDte contra tenant (admin) Y company (configuración local)
    const { dteAllowedTypes } = getCurrentTenant()
    if (dto.emitDte && dteAllowedTypes.length > 0 && !dteAllowedTypes.includes(dto.tipoDte)) {
      throw new BadRequestException(
        `Tipo de documento '${dto.tipoDte}' no está permitido para este tenant por el administrador de la plataforma.`
      )
    }
    const enabledTypes: string[] = (companyConfig?.dteEnabledTypes as string[]) ?? []
    const effectiveEnabled = enabledTypes.length > 0 ? enabledTypes : ['01', '03']
    if (dto.emitDte && !effectiveEnabled.includes(dto.tipoDte)) {
      throw new BadRequestException(
        `Tipo de documento '${dto.tipoDte}' no está habilitado para esta empresa. Actívalo en Configuración → Integraciones DTE.`
      )
    }

    // codigoGeneracion generado antes de la tx para incluirlo en el outbox
    const codigoGeneracion = randomUUID().toUpperCase()

    // Create sale in transaction — numero control y stock son atómicos aquí
    const { sale, numeroControl } = await db.$transaction(async (tx) => {
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
          ivaRete1: new Decimal(summary.ivaRete1),
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

      // Stock atómico: updateMany con condición stock >= quantity.
      // Si count === 0, otro hilo ya vendió el último stock → rollback.
      for (const { item, product } of lines) {
        if (product.trackStock) {
          const activeBranchCount = await tx.branch.count({
            where: { tenantId, companyId: dto.companyId, isActive: true },
          })
          const existingBranchStockCount = await tx.branchInventory.count({
            where: { tenantId, companyId: dto.companyId, productId: product.id },
          })
          const initialStock = existingBranchStockCount === 0 && activeBranchCount <= 1
            ? Number(product.stock ?? 0)
            : 0
          const branchStock = await tx.branchInventory.upsert({
            where: {
              tenantId_branchId_productId: {
                tenantId,
                branchId: dto.branchId,
                productId: product.id,
              },
            },
            update: {},
            create: {
              tenantId,
              companyId: dto.companyId,
              branchId: dto.branchId,
              productId: product.id,
              stock: initialStock,
              minStock: product.minStock,
            },
            select: { id: true, stock: true },
          })
          const quantity = item.quantity
          const currentStock = Number(branchStock.stock ?? 0)
          const newStock = currentStock - quantity
          const result = await tx.branchInventory.updateMany({
            where: { id: branchStock.id, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          })
          if (result.count === 0) {
            throw new BadRequestException(`Stock insuficiente para "${product.name}"`)
          }
          await tx.inventoryMovement.create({
            data: {
              tenantId,
              companyId: dto.companyId,
              branchId: dto.branchId,
              productId: product.id,
              userId: user.sub,
              type: 'OUT',
              quantity: new Decimal(quantity),
              quantityBefore: new Decimal(currentStock),
              quantityAfter: new Decimal(newStock),
              saleId: newSale.id,
              reference: newSale.id,
              reason: 'Venta POS',
            },
          })
          const branchTotals = await tx.branchInventory.aggregate({
            where: { tenantId, companyId: dto.companyId, productId: product.id },
            _sum: { stock: true },
          })
          await tx.service.update({
            where: { id: product.id },
            data: { stock: branchTotals._sum.stock ?? newStock },
          })
        }
      }

      // Número de control atómico dentro de la tx.
      // update con increment devuelve el lastSequence nuevo — imposible duplicar.
      const year = new Date().getFullYear()
      let control = await tx.dteNumberControl.findFirst({
        where: { tenantId, companyId: dto.companyId, branchId: dto.branchId, tipoDte: dto.tipoDte, year },
      })
      if (!control) {
        const branch = await tx.branch.findFirst({
          where: { id: dto.branchId, tenantId, companyId: dto.companyId },
          select: { codEstableMH: true, codPuntoVentaMH: true },
        })
        if (!branch?.codEstableMH || !branch?.codPuntoVentaMH) {
          throw new Error('Sucursal sin codigos MH de establecimiento y punto de venta; no se puede generar numero de control DTE')
        }
        control = await tx.dteNumberControl.create({
          data: {
            tenantId,
            companyId: dto.companyId,
            branchId: dto.branchId,
            tipoDte: dto.tipoDte,
            year,
            lastSequence: 0,
            codEstable: branch.codEstableMH,
            codPuntoVenta: branch.codPuntoVentaMH,
          },
        })
      }
      const updatedControl = await tx.dteNumberControl.update({
        where: { id: control.id },
        data: { lastSequence: { increment: 1 } },
        select: { lastSequence: true, codEstable: true, codPuntoVenta: true },
      })
      const txNumeroControl = buildNumeroControl({
        tipoDte: dto.tipoDte as TipoDte,
        codEstable: updatedControl.codEstable,
        codPuntoVenta: updatedControl.codPuntoVenta,
        sequence: updatedControl.lastSequence,
      })

      // Outbox transaccional: DteDocument nace QUEUED dentro de la misma tx.
      // Si Redis/BullMQ falla después, el registro queda en PG para reprocesar.
      if (dto.emitDte) {
        await tx.dteDocument.create({
          data: {
            tenantId,
            saleId: newSale.id,
            companyId: dto.companyId,
            branchId: dto.branchId,
            tipoDte: dto.tipoDte,
            numeroControl: txNumeroControl,
            codigoGeneracion,
            status: 'QUEUED',
          },
        })
      }

      return { sale: newSale, numeroControl: txNumeroControl }
    })

    // BullMQ best-effort — el outbox en PG ya garantiza que no se pierde el DTE.
    // En desktop local sin Redis, el DteLocalOutboxService procesa QUEUED desde PostgreSQL.
    if (dto.emitDte && useBullDteQueue() && this.dteQueue) {
      await this.dteQueue.add('emit', {
        saleId: sale.id,
        tenantId,
        companyId: dto.companyId,
        branchId: dto.branchId,
        tipoDte: dto.tipoDte,
        numeroControl,
      }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      }).catch((err: Error) =>
        this.logger.warn(`BullMQ enqueue failed for sale ${sale.id}: ${err.message} — DteDocument QUEUED en PG para reprocesar`)
      )
    } else if (dto.emitDte) {
      this.logger.log(`DTE ${numeroControl} quedo QUEUED para procesador local PostgreSQL`)
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

    const branchScope = buildBranchWhere(user)
    const saleWhere = {
      tenantId,
      companyId,
      ...branchScope,
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
        where: { tenantId, companyId, ...branchScope, date: { gte: from, lte: to } },
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
          ...branchScope,
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

  /**
   * Bootstrap — returns categories + products (first 100) + open register in ONE round-trip.
   * Replaces 3 separate requests on POS page load.
   */
  async bootstrap(companyId: string, branchId: string, user: JwtAccessPayload) {
    const { tenantId, dbUrl } = getCurrentTenant()
    const db = this.clientFactory.getClient(dbUrl)
    this.assertCompanyAccess(user, companyId)
    if (branchId && !user.branchIds.includes(branchId) && !user.canViewAllBranches)
      throw new ForbiddenException('Sucursal no autorizada')

    const [categories, products, openRegister, company, branch] = await Promise.all([
      // Categories — lightweight, all active
      db.category.findMany({
        where: { tenantId, companyId, isActive: true },
        select: { id: true, name: true, color: true },
        orderBy: { name: 'asc' },
      }),

      // Products — active, first 100 ordered by name (POS initial grid)
      db.service.findMany({
        where: { tenantId, companyId, isActive: true },
        select: {
          id: true, name: true, sku: true, barcode: true,
          price: true, cost: true, emoji: true, imageUrl: true,
          tipoItem: true, uniMedida: true,
          trackStock: true, stock: true, minStock: true,
          categoryId: true,
          category: { select: { id: true, name: true, color: true } },
          branchInventories: {
            where: { tenantId, branchId },
            select: { stock: true, minStock: true },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
        take: 100,
      }),

      // Open cash register for this branch
      db.cashRegister.findFirst({
        where: { tenantId, companyId, branchId, closedAt: null },
        include: {
          openedBy: { select: { id: true, name: true } },
          _count: { select: { sales: true } },
        },
      }),

      // Company — for print headers
      db.company.findFirst({
        where: { id: companyId, tenantId },
        select: {
          id: true, name: true, comercialName: true,
          nit: true, nrc: true, phone: true, email: true,
          address: true, actividadEconomica: true,
          esGranContribuyente: true, dteEnabledTypes: true,
        },
      }),

      // Branch — for print headers + DTE establishment code
      db.branch.findFirst({
        where: { id: branchId, tenantId, companyId },
        select: { id: true, name: true, address: true, phone: true, codEstableMH: true, codPuntoVentaMH: true },
      }),
    ])

    // Resolve branch stock
    const resolvedProducts = products.map(({ branchInventories, ...p }) => ({
      ...p,
      stock: branchInventories?.[0]?.stock ?? p.stock,
      minStock: branchInventories?.[0]?.minStock ?? p.minStock,
    }))

    return { categories, products: resolvedProducts, openRegister, company, branch }
  }

  async voidSale(id: string, reason: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const sale = await db.sale.findFirst({
      where: { id, tenantId, companyId: user.companyId, ...buildBranchWhere(user) },
      include: { dteDocument: true },
    })
    if (!sale) throw new NotFoundException('Venta no encontrada')
    if (sale.dteDocument?.status === 'ANNULLED') {
      throw new BadRequestException('Esta venta ya fue anulada')
    }
    if (sale.dteDocument?.status === 'ACCEPTED') {
      throw new BadRequestException('DTE aceptado por Hacienda: usa el flujo de invalidacion DTE, no anulacion local de POS')
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

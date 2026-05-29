import { Injectable, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import type { JwtAccessPayload } from '@pos-dte/shared-types'

type Period = 'today' | 'month'

@Injectable()
export class DashboardService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  private periodRange(period: Period): { from: Date; to: Date } {
    const now = new Date()
    if (period === 'today') {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      }
    }
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    }
  }

  /**
   * Consolidated owner view: company totals + per-branch breakdown.
   * Gated by canViewAllBranches — only the owner reaches this data.
   */
  async getConsolidated(companyId: string, user: JwtAccessPayload, period: Period = 'today') {
    if (!user.canViewAllBranches) {
      throw new ForbiddenException('Panel central disponible solo para el dueño')
    }
    if (user.companyId !== companyId) {
      throw new ForbiddenException('Empresa no autorizada')
    }

    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const { from, to } = this.periodRange(period)

    const notAnnulled = { dteDocument: { isNot: { status: 'ANNULLED' } as any } }
    const saleWhere = { tenantId, companyId, createdAt: { gte: from, lte: to }, ...notAnnulled }
    const expenseWhere = { tenantId, companyId, date: { gte: from, lte: to } }

    const [
      branches,
      salesByBranch,
      expensesByBranch,
      openRegisters,
      inventoryValue,
      lowStockCount,
      topProducts,
    ] = await Promise.all([
      db.branch.findMany({
        where: { tenantId, companyId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      db.sale.groupBy({
        by: ['branchId'],
        where: saleWhere,
        _sum: { totalPagar: true },
        _count: { id: true },
      }),
      db.expense.groupBy({
        by: ['branchId'],
        where: expenseWhere,
        _sum: { amount: true },
      }),
      db.cashRegister.groupBy({
        by: ['branchId'],
        where: { tenantId, companyId, closedAt: null },
        _count: { id: true },
      }),
      db.branchInventory.groupBy({
        by: ['branchId'],
        where: { tenantId, companyId },
        _sum: { stock: true },
      }),
      db.branchInventory.findMany({
        where: { tenantId, companyId, product: { trackStock: true, isActive: true } },
        select: { branchId: true, stock: true, minStock: true },
      }),
      db.saleItem.groupBy({
        by: ['productName'],
        where: { sale: { is: saleWhere } },
        _sum: { quantity: true, ventaGravada: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
    ])

    const salesMap = new Map(salesByBranch.map((r) => [r.branchId, r]))
    const expenseMap = new Map(expensesByBranch.map((r) => [r.branchId, r]))
    const openMap = new Map(openRegisters.map((r) => [r.branchId, r._count.id]))
    const lowStockMap = new Map<string, number>()
    for (const inv of lowStockCount) {
      if (inv.stock <= inv.minStock) {
        lowStockMap.set(inv.branchId, (lowStockMap.get(inv.branchId) ?? 0) + 1)
      }
    }

    const branchRows = branches.map((b) => {
      const s = salesMap.get(b.id)
      const e = expenseMap.get(b.id)
      const ventas = Number(s?._sum.totalPagar ?? 0)
      const gastos = Number(e?._sum.amount ?? 0)
      return {
        branchId: b.id,
        branchName: b.name,
        ventas,
        countVentas: s?._count.id ?? 0,
        gastos,
        neto: ventas - gastos,
        cajasAbiertas: openMap.get(b.id) ?? 0,
        itemsBajoMinimo: lowStockMap.get(b.id) ?? 0,
      }
    })

    const totals = branchRows.reduce(
      (acc, r) => {
        acc.ventas += r.ventas
        acc.countVentas += r.countVentas
        acc.gastos += r.gastos
        acc.cajasAbiertas += r.cajasAbiertas
        acc.itemsBajoMinimo += r.itemsBajoMinimo
        return acc
      },
      { ventas: 0, countVentas: 0, gastos: 0, cajasAbiertas: 0, itemsBajoMinimo: 0 },
    )

    return {
      period,
      totals: {
        ventas: totals.ventas,
        countVentas: totals.countVentas,
        gastos: totals.gastos,
        neto: totals.ventas - totals.gastos,
        cajasAbiertas: totals.cajasAbiertas,
        itemsBajoMinimo: totals.itemsBajoMinimo,
        totalSucursales: branches.length,
      },
      branches: branchRows.sort((a, b) => b.ventas - a.ventas),
      topProducts: topProducts.map((p) => ({
        productName: p.productName,
        cantidad: Number(p._sum.quantity ?? 0),
        ventaGravada: Number(p._sum.ventaGravada ?? 0),
      })),
    }
  }
}

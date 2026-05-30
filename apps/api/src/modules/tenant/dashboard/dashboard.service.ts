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

  /**
   * Extended owner dashboard: KPIs with variance, 6-month evolution,
   * gastos por categoría, CxP snapshot, planilla evolution.
   * Accepts free date range (from/to) + optional branchId filter.
   */
  async getExtended(
    companyId: string,
    user: JwtAccessPayload,
    from: Date,
    to: Date,
    branchId?: string,
  ) {
    if (!user.canViewAllBranches) {
      throw new ForbiddenException('Panel central disponible solo para el dueño')
    }
    if (user.companyId !== companyId) {
      throw new ForbiddenException('Empresa no autorizada')
    }

    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    // Previous period (same duration before from)
    const durationMs = to.getTime() - from.getTime()
    const prevFrom = new Date(from.getTime() - durationMs - 1)
    const prevTo = new Date(from.getTime() - 1)

    const branchFilter = branchId ? { branchId } : {}
    const notAnnulled = { dteDocument: { isNot: { status: 'ANNULLED' } as any } }

    const saleWhere = { tenantId, companyId, createdAt: { gte: from, lte: to }, ...notAnnulled, ...branchFilter }
    const prevSaleWhere = { tenantId, companyId, createdAt: { gte: prevFrom, lte: prevTo }, ...notAnnulled, ...branchFilter }
    const expenseWhere = { tenantId, companyId, date: { gte: from, lte: to }, ...branchFilter }
    const prevExpenseWhere = { tenantId, companyId, date: { gte: prevFrom, lte: prevTo }, ...branchFilter }

    // Build 6-month window ending at `to` month
    const monthSlots = this._buildMonthSlots(to, 6)

    const [
      salesCur,
      salesPrev,
      expensesCur,
      expensesPrev,
      dteDocs,
      clientesNuevos,
      totalClientes,
      empleadosActivos,
      lowStockItems,
      // Gastos por categoría (período actual)
      gastosCat,
      // Evoluciones mensuales — ventas
      salesEvol,
      // Evoluciones mensuales — gastos
      expEvol,
      // Compras (PurchaseOrders) evolución
      comprasEvol,
      // CxP snapshot
      cxpVencidas,
      cxpVigentes,
      cxpPorVencer,
      // Planilla períodos
      planillaPeriods,
      // Branches ranking
      branchRanking,
      // Top productos
      topProducts,
    ] = await Promise.all([
      // Ventas período actual
      db.sale.aggregate({ where: saleWhere, _sum: { totalPagar: true }, _count: { id: true } }),
      // Ventas período anterior
      db.sale.aggregate({ where: prevSaleWhere, _sum: { totalPagar: true }, _count: { id: true } }),
      // Gastos período actual
      db.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
      // Gastos período anterior
      db.expense.aggregate({ where: prevExpenseWhere, _sum: { amount: true } }),
      // DTE docs período
      db.dteDocument.findMany({
        where: { tenantId, companyId, createdAt: { gte: from, lte: to } },
        select: { status: true },
      }),
      // Clientes nuevos en período
      db.client.count({ where: { tenantId, companyId, createdAt: { gte: from, lte: to }, ...branchFilter } }),
      // Total clientes
      db.client.count({ where: { tenantId, companyId } }),
      // Empleados activos
      db.employee.count({ where: { tenantId, companyId, status: 'ACTIVE' } }),
      // Items bajo mínimo (findMany + filter en app — Prisma no soporta campo-a-campo en where)
      db.branchInventory.findMany({
        where: { tenantId, companyId, ...(branchId ? { branchId } : {}), product: { trackStock: true, isActive: true } },
        select: { stock: true, minStock: true },
      }),
      // Gastos por categoría en período
      db.expense.findMany({
        where: expenseWhere,
        select: { amount: true, category: { select: { name: true, color: true } } },
      }),
      // Ventas por mes (6 meses)
      Promise.all(
        monthSlots.map((s) =>
          db.sale.aggregate({
            where: { tenantId, companyId, createdAt: { gte: s.from, lte: s.to }, ...notAnnulled, ...branchFilter },
            _sum: { totalPagar: true },
          }).then((r) => ({ mes: s.label, ventas: Number(r._sum.totalPagar ?? 0) })),
        ),
      ),
      // Gastos por mes (6 meses)
      Promise.all(
        monthSlots.map((s) =>
          db.expense.aggregate({
            where: { tenantId, companyId, date: { gte: s.from, lte: s.to }, ...branchFilter },
            _sum: { amount: true },
          }).then((r) => ({ mes: s.label, gastos: Number(r._sum.amount ?? 0) })),
        ),
      ),
      // Compras (PurchaseOrders) por mes
      Promise.all(
        monthSlots.map((s) =>
          db.purchaseOrder.aggregate({
            where: { tenantId, companyId, createdAt: { gte: s.from, lte: s.to }, ...(branchId ? {} : {}) },
            _sum: { total: true },
            _count: { id: true },
          }).then((r) => ({ mes: s.label, total: Number(r._sum.total ?? 0), count: r._count.id })),
        ),
      ),
      // CxP vencidas
      db.accountPayable.aggregate({
        where: { tenantId, companyId, status: 'OVERDUE', ...branchFilter },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // CxP vigentes (PENDING)
      db.accountPayable.aggregate({
        where: { tenantId, companyId, status: 'PENDING', ...branchFilter },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // CxP por vencer (dueDate próximos 30 días, PENDING)
      db.accountPayable.aggregate({
        where: {
          tenantId, companyId, status: 'PENDING',
          dueDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          ...branchFilter,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Planilla períodos (últimos 12)
      db.payrollPeriod.findMany({
        where: { tenantId, companyId },
        orderBy: { startDate: 'desc' },
        take: 12,
        include: {
          items: {
            select: { isssPatronal: true, afpPatronal: true, insaforp: true, totalDeducciones: true },
          },
        },
      }),
      // Branch ranking en período
      db.sale.groupBy({
        by: ['branchId'],
        where: saleWhere,
        _sum: { totalPagar: true },
        _count: { id: true },
      }),
      // Top productos
      db.saleItem.groupBy({
        by: ['productName'],
        where: { sale: { is: saleWhere } },
        _sum: { quantity: true, ventaGravada: true },
        orderBy: { _sum: { ventaGravada: 'desc' } },
        take: 8,
      }),
    ])

    // ── Cálculos ──────────────────────────────────────────────────────────────

    const ventasCur  = Number(salesCur._sum.totalPagar ?? 0)
    const ventasPrev = Number(salesPrev._sum.totalPagar ?? 0)
    const gastosCur  = Number(expensesCur._sum.amount ?? 0)
    const gastosPrev = Number(expensesPrev._sum.amount ?? 0)
    const netoCur    = ventasCur - gastosCur
    const netoPrev   = ventasPrev - gastosPrev

    const varPct = (cur: number, prev: number) =>
      prev === 0 ? null : parseFloat(((cur - prev) / prev * 100).toFixed(1))

    const dteTotales   = dteDocs.length
    const dteAceptados = dteDocs.filter((d) => d.status === 'ACCEPTED').length
    const tasaDte      = dteTotales === 0 ? 0 : parseFloat(((dteAceptados / dteTotales) * 100).toFixed(1))

    // Gastos por categoría
    const catMap = new Map<string, { nombre: string; color: string; total: number; count: number }>()
    for (const e of gastosCat) {
      const key = e.category?.name ?? 'Sin categoría'
      const color = e.category?.color ?? '#8c8c8c'
      const existing = catMap.get(key) ?? { nombre: key, color, total: 0, count: 0 }
      existing.total += Number(e.amount)
      existing.count += 1
      catMap.set(key, existing)
    }
    const gastosPorCategoria = [...catMap.values()].sort((a, b) => b.total - a.total)

    // 6-month evolution merged
    const evolucion = salesEvol.map((s, i) => ({
      mes: s.mes,
      ventas: s.ventas,
      gastos: expEvol[i]?.gastos ?? 0,
      neto: s.ventas - (expEvol[i]?.gastos ?? 0),
    }))

    // Branch ranking — join with branch names
    const branches = await db.branch.findMany({
      where: { tenantId, companyId, isActive: true },
      select: { id: true, name: true },
    })
    const branchNameMap = new Map(branches.map((b) => [b.id, b.name]))
    const branchesRanking = branchRanking
      .map((r) => ({
        branchId: r.branchId,
        branchName: branchNameMap.get(r.branchId) ?? r.branchId,
        ventas: Number(r._sum.totalPagar ?? 0),
        countVentas: r._count.id,
      }))
      .sort((a, b) => b.ventas - a.ventas)

    // CxP stats
    const cxp = {
      montoVencido:   Number(cxpVencidas._sum.amount ?? 0),
      montoVigente:   Number(cxpVigentes._sum.amount ?? 0),
      montoPorVencer: Number(cxpPorVencer._sum.amount ?? 0),
      countVencidas:  cxpVencidas._count.id,
      countVigentes:  cxpVigentes._count.id,
      countPorVencer: cxpPorVencer._count.id,
    }

    // Planilla evolution (reversed = ascending order)
    const planillaEvolucion = [...planillaPeriods].reverse().map((p) => {
      const costoPatronal = p.items.reduce(
        (acc, i) => acc + Number(i.isssPatronal) + Number(i.afpPatronal) + Number(i.insaforp),
        0,
      )
      const totalDeducciones = Number(p.totalIsss) + Number(p.totalAfp) + Number(p.totalRenta)
      return {
        periodo: p.name,
        totalBruto: Number(p.totalBruto),
        totalDeducciones,
        totalNeto: Number(p.totalNeto),
        costoPatronal: parseFloat(costoPatronal.toFixed(2)),
        estado: p.status,
      }
    })

    const planillaTotals = planillaEvolucion.reduce(
      (acc, p) => {
        acc.totalBruto       += p.totalBruto
        acc.totalNeto        += p.totalNeto
        acc.totalDeducciones += p.totalDeducciones
        acc.totalPatronal    += p.costoPatronal
        return acc
      },
      { totalBruto: 0, totalNeto: 0, totalDeducciones: 0, totalPatronal: 0 },
    )

    return {
      panel: {
        ventas: ventasCur,
        countVentas: salesCur._count.id,
        gastos: gastosCur,
        neto: netoCur,
        varVentas:  varPct(ventasCur, ventasPrev),
        varGastos:  varPct(gastosCur, gastosPrev),
        varNeto:    varPct(netoCur, netoPrev),
        margenPct:  ventasCur === 0 ? 0 : parseFloat((netoCur / ventasCur * 100).toFixed(1)),
        dteTotales,
        dteAceptados,
        tasaDte,
        clientesNuevos,
        totalClientes,
        empleadosActivos,
        itemsBajoMinimo: lowStockItems.filter((i: any) => i.stock <= i.minStock).length,
        totalSucursales: branches.length,
      },
      evolucion,
      branches: branchesRanking,
      topProducts: topProducts.map((p) => ({
        productName: p.productName,
        cantidad:    Number(p._sum.quantity ?? 0),
        ventaGravada: Number(p._sum.ventaGravada ?? 0),
      })),
      gastosPorCategoria,
      gastosEvolucion: expEvol,
      comprasEvolucion: comprasEvol,
      cxp,
      planillaEvolucion,
      planillaTotals,
    }
  }

  /** Build N monthly slots ending at the month of `endDate` (inclusive) */
  private _buildMonthSlots(endDate: Date, count: number) {
    const slots: { label: string; from: Date; to: Date }[] = []
    const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1)
      const from = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0)
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      slots.push({ label: `${MONTHS_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, from, to })
    }
    return slots
  }
}

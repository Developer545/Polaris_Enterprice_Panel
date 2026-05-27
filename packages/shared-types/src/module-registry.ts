export const BASE_MODULE_IDS = [
  'dashboard',
  'pos',
  'ventas',
  'dte',
  'turnos_caja',
  'clientes',
  'proveedores',
  'inventario',
  'productos',
  'servicios',
] as const

export const ADDON_MODULE_IDS = [
  'compras',
  'cxp',
  'gastos',
  'empleados',
  'planilla',
  'cxc',
  'sucursales',
  'reportes_avanzados',
  'proyectos',
  'contabilidad',
  'conciliacion_bancaria',
  'revision_presupuesto',
] as const

export const ALL_MODULE_IDS = [
  ...BASE_MODULE_IDS,
  ...ADDON_MODULE_IDS,
] as const

export type BaseModuleId = (typeof BASE_MODULE_IDS)[number]
export type AddonModuleId = (typeof ADDON_MODULE_IDS)[number]
export type ModuleId = (typeof ALL_MODULE_IDS)[number]

export type ModuleCategory =
  | 'base'
  | 'ventas'
  | 'inventario'
  | 'compras'
  | 'finanzas'
  | 'rrhh'
  | 'proyectos'
  | 'reportes'

export type ModuleDefinition = {
  id: ModuleId
  name: string
  category: ModuleCategory
  commercialType: 'base' | 'addon'
  dependencies: ModuleId[]
  dashboardWidgets: string[]
  routes: string[]
}

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    category: 'base',
    commercialType: 'base',
    dependencies: [],
    dashboardWidgets: [],
    routes: ['/'],
  },
  pos: {
    id: 'pos',
    name: 'POS',
    category: 'ventas',
    commercialType: 'base',
    dependencies: ['ventas', 'dte', 'turnos_caja', 'productos', 'clientes'],
    dashboardWidgets: ['sales_today', 'cash_open'],
    routes: ['/pos'],
  },
  ventas: {
    id: 'ventas',
    name: 'Ventas',
    category: 'ventas',
    commercialType: 'base',
    dependencies: [],
    dashboardWidgets: ['sales_today', 'sales_month'],
    routes: ['/sales'],
  },
  dte: {
    id: 'dte',
    name: 'DTE',
    category: 'ventas',
    commercialType: 'base',
    dependencies: ['ventas'],
    dashboardWidgets: ['dte_status'],
    routes: ['/settings'],
  },
  turnos_caja: {
    id: 'turnos_caja',
    name: 'Turnos de caja',
    category: 'ventas',
    commercialType: 'base',
    dependencies: ['pos'],
    dashboardWidgets: ['cash_open'],
    routes: ['/cash-registers'],
  },
  clientes: {
    id: 'clientes',
    name: 'Clientes',
    category: 'base',
    commercialType: 'base',
    dependencies: [],
    dashboardWidgets: ['active_clients'],
    routes: ['/clients'],
  },
  proveedores: {
    id: 'proveedores',
    name: 'Proveedores',
    category: 'compras',
    commercialType: 'base',
    dependencies: [],
    dashboardWidgets: ['suppliers_count'],
    routes: ['/suppliers'],
  },
  inventario: {
    id: 'inventario',
    name: 'Inventario',
    category: 'inventario',
    commercialType: 'base',
    dependencies: ['productos'],
    dashboardWidgets: ['low_stock', 'stock_value'],
    routes: ['/inventory'],
  },
  productos: {
    id: 'productos',
    name: 'Productos',
    category: 'inventario',
    commercialType: 'base',
    dependencies: [],
    dashboardWidgets: ['products_count'],
    routes: ['/products'],
  },
  servicios: {
    id: 'servicios',
    name: 'Servicios',
    category: 'inventario',
    commercialType: 'base',
    dependencies: [],
    dashboardWidgets: ['services_count'],
    routes: ['/services'],
  },
  compras: {
    id: 'compras',
    name: 'Compras',
    category: 'compras',
    commercialType: 'addon',
    dependencies: ['proveedores', 'productos', 'inventario'],
    dashboardWidgets: ['pending_purchases'],
    routes: ['/purchases'],
  },
  cxp: {
    id: 'cxp',
    name: 'Cuentas por pagar',
    category: 'finanzas',
    commercialType: 'addon',
    dependencies: ['proveedores', 'compras'],
    dashboardWidgets: ['accounts_payable_due'],
    routes: ['/accounts-payable'],
  },
  gastos: {
    id: 'gastos',
    name: 'Gastos',
    category: 'finanzas',
    commercialType: 'addon',
    dependencies: [],
    dashboardWidgets: ['expenses_month'],
    routes: ['/expenses'],
  },
  empleados: {
    id: 'empleados',
    name: 'Empleados',
    category: 'rrhh',
    commercialType: 'addon',
    dependencies: [],
    dashboardWidgets: ['employees_count'],
    routes: ['/employees'],
  },
  planilla: {
    id: 'planilla',
    name: 'Planilla',
    category: 'rrhh',
    commercialType: 'addon',
    dependencies: ['empleados'],
    dashboardWidgets: ['payroll_pending'],
    routes: ['/payroll'],
  },
  cxc: {
    id: 'cxc',
    name: 'Cuentas por cobrar',
    category: 'finanzas',
    commercialType: 'addon',
    dependencies: ['clientes', 'ventas'],
    dashboardWidgets: ['accounts_receivable_due'],
    routes: ['/accounts-receivable'],
  },
  sucursales: {
    id: 'sucursales',
    name: 'Sucursales adicionales',
    category: 'base',
    commercialType: 'addon',
    dependencies: [],
    dashboardWidgets: ['branches_count'],
    routes: ['/branches', '/settings'],
  },
  reportes_avanzados: {
    id: 'reportes_avanzados',
    name: 'Reportes avanzados',
    category: 'reportes',
    commercialType: 'addon',
    dependencies: [],
    dashboardWidgets: ['advanced_reports'],
    routes: ['/reports'],
  },
  proyectos: {
    id: 'proyectos',
    name: 'Proyectos',
    category: 'proyectos',
    commercialType: 'addon',
    dependencies: ['clientes'],
    dashboardWidgets: ['project_progress', 'project_budget_used'],
    routes: ['/projects'],
  },
  contabilidad: {
    id: 'contabilidad',
    name: 'Contabilidad',
    category: 'finanzas',
    commercialType: 'addon',
    dependencies: ['ventas', 'compras', 'gastos'],
    dashboardWidgets: ['balance_general', 'estado_resultados'],
    routes: ['/accounting'],
  },
  conciliacion_bancaria: {
    id: 'conciliacion_bancaria',
    name: 'Conciliacion bancaria',
    category: 'finanzas',
    commercialType: 'addon',
    dependencies: ['contabilidad'],
    dashboardWidgets: ['bank_reconciliation_pending'],
    routes: ['/bank-reconciliation'],
  },
  revision_presupuesto: {
    id: 'revision_presupuesto',
    name: 'Revision de presupuesto',
    category: 'proyectos',
    commercialType: 'addon',
    dependencies: ['proyectos'],
    dashboardWidgets: ['budget_review_alerts'],
    routes: ['/budget-review'],
  },
}

export const BASE_MODULES: ModuleId[] = [...BASE_MODULE_IDS]

export function isModuleId(value: string): value is ModuleId {
  return (ALL_MODULE_IDS as readonly string[]).includes(value)
}

export function normalizeModuleIds(modules: readonly string[]): ModuleId[] {
  const enabled = new Set<ModuleId>(BASE_MODULES)

  for (const moduleId of modules) {
    if (!isModuleId(moduleId)) continue
    enabled.add(moduleId)
    for (const dependency of MODULE_REGISTRY[moduleId].dependencies) {
      enabled.add(dependency)
    }
  }

  return ALL_MODULE_IDS.filter((moduleId) => enabled.has(moduleId))
}

export function moduleMapFromIds(modules: readonly string[]): Record<string, boolean> {
  const normalized = new Set(normalizeModuleIds(modules))
  return Object.fromEntries(ALL_MODULE_IDS.map((moduleId) => [moduleId, normalized.has(moduleId)]))
}

export function getDashboardWidgetsForModules(modules: readonly string[]): string[] {
  const normalized = normalizeModuleIds(modules)
  const widgets = new Set<string>()
  for (const moduleId of normalized) {
    for (const widgetId of MODULE_REGISTRY[moduleId].dashboardWidgets) {
      widgets.add(widgetId)
    }
  }
  return [...widgets]
}

import { z } from 'zod'

// ─── JWT Payloads ─────────────────────────────────────────────────────────────

export interface JwtAccessPayload {
  sub: string           // userId
  tenantId: string
  companyId: string
  email: string
  name: string
  roleId: string
  permissions: Record<string, boolean>
  branchIds: string[]   // branches this user can access
  type: 'access'
}

export interface JwtRefreshPayload {
  sub: string
  familyId: string
  type: 'refresh'
}

export interface JwtAdminPayload {
  sub: string           // adminUserId
  email: string
  name: string
  role: 'SUPER_ADMIN' | 'OPERATOR' | 'SUPPORT'
  type: 'admin'
}

// ─── Auth DTOs ────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  companyId: z.string().min(1),
})

export type LoginDto = z.infer<typeof LoginSchema>

export const AdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export type AdminLoginDto = z.infer<typeof AdminLoginSchema>

export interface AuthTokens {
  accessToken: string
  expiresIn: number   // seconds
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  // POS / Sales
  POS_CREATE: 'pos.create',
  POS_VIEW: 'pos.view',
  POS_CANCEL: 'pos.cancel',
  SALES_VIEW: 'sales.view',
  // DTE
  DTE_VIEW: 'dte.view',
  DTE_EMIT: 'dte.emit',
  DTE_ANULAR: 'dte.anular',
  // Clients
  CLIENTS_VIEW: 'clients.view',
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_EDIT: 'clients.edit',
  CLIENTS_DELETE: 'clients.delete',
  // Products / Services
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  // Categories
  CATEGORIES_VIEW: 'categories.view',
  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',
  // Company
  COMPANY_VIEW: 'company.view',
  COMPANY_EDIT: 'company.edit',
  // Branches
  BRANCHES_VIEW: 'branches.view',
  BRANCHES_CREATE: 'branches.create',
  BRANCHES_EDIT: 'branches.edit',
  BRANCHES_DELETE: 'branches.delete',
  // Cash Register
  CASH_REGISTER_VIEW: 'cash_register.view',
  CASH_REGISTER_OPEN: 'cash_register.open',
  CASH_REGISTER_CLOSE: 'cash_register.close',
  // Reports
  REPORTS_VIEW: 'reports.view',
  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  // Suppliers
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_EDIT: 'suppliers.edit',
  SUPPLIERS_DELETE: 'suppliers.delete',
  // Purchases
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_EDIT: 'purchases.edit',
  // Accounts Payable
  ACCOUNTS_PAYABLE_VIEW: 'accounts_payable.view',
  ACCOUNTS_PAYABLE_CREATE: 'accounts_payable.create',
  ACCOUNTS_PAYABLE_EDIT: 'accounts_payable.edit',
  // Expenses
  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_CREATE: 'expenses.create',
  EXPENSES_EDIT: 'expenses.edit',
  EXPENSES_DELETE: 'expenses.delete',
  // Employees
  EMPLOYEES_VIEW: 'employees.view',
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_EDIT: 'employees.edit',
  EMPLOYEES_DELETE: 'employees.delete',
  // Payroll
  PAYROLL_VIEW: 'payroll.view',
  PAYROLL_CREATE: 'payroll.create',
  PAYROLL_APPROVE: 'payroll.approve',
  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_CREATE: 'inventory.create',
  INVENTORY_ADJUST: 'inventory.adjust',
  // Accounts Receivable (CxC)
  ACCOUNTS_RECEIVABLE_VIEW: 'accounts_receivable.view',
  ACCOUNTS_RECEIVABLE_CREATE: 'accounts_receivable.create',
  ACCOUNTS_RECEIVABLE_EDIT: 'accounts_receivable.edit',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

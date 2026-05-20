import { z } from 'zod';
export interface JwtAccessPayload {
    sub: string;
    tenantId: string;
    companyId: string;
    email: string;
    name: string;
    roleId: string;
    permissions: Record<string, boolean>;
    branchIds: string[];
    type: 'access';
}
export interface JwtRefreshPayload {
    sub: string;
    familyId: string;
    type: 'refresh';
}
export interface JwtAdminPayload {
    sub: string;
    email: string;
    name: string;
    role: 'SUPER_ADMIN' | 'OPERATOR' | 'SUPPORT';
    type: 'admin';
}
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    companyId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    companyId: string;
}, {
    email: string;
    password: string;
    companyId: string;
}>;
export type LoginDto = z.infer<typeof LoginSchema>;
export declare const AdminLoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type AdminLoginDto = z.infer<typeof AdminLoginSchema>;
export interface AuthTokens {
    accessToken: string;
    expiresIn: number;
}
export declare const PERMISSIONS: {
    readonly POS_CREATE: "pos.create";
    readonly POS_VIEW: "pos.view";
    readonly POS_CANCEL: "pos.cancel";
    readonly SALES_VIEW: "sales.view";
    readonly DTE_VIEW: "dte.view";
    readonly DTE_EMIT: "dte.emit";
    readonly DTE_ANULAR: "dte.anular";
    readonly CLIENTS_VIEW: "clients.view";
    readonly CLIENTS_CREATE: "clients.create";
    readonly CLIENTS_EDIT: "clients.edit";
    readonly CLIENTS_DELETE: "clients.delete";
    readonly PRODUCTS_VIEW: "products.view";
    readonly PRODUCTS_CREATE: "products.create";
    readonly PRODUCTS_EDIT: "products.edit";
    readonly PRODUCTS_DELETE: "products.delete";
    readonly CATEGORIES_VIEW: "categories.view";
    readonly USERS_VIEW: "users.view";
    readonly USERS_CREATE: "users.create";
    readonly USERS_EDIT: "users.edit";
    readonly USERS_DELETE: "users.delete";
    readonly ROLES_VIEW: "roles.view";
    readonly ROLES_CREATE: "roles.create";
    readonly ROLES_EDIT: "roles.edit";
    readonly ROLES_DELETE: "roles.delete";
    readonly COMPANY_VIEW: "company.view";
    readonly COMPANY_EDIT: "company.edit";
    readonly BRANCHES_VIEW: "branches.view";
    readonly BRANCHES_CREATE: "branches.create";
    readonly BRANCHES_EDIT: "branches.edit";
    readonly BRANCHES_DELETE: "branches.delete";
    readonly CASH_REGISTER_VIEW: "cash_register.view";
    readonly CASH_REGISTER_OPEN: "cash_register.open";
    readonly CASH_REGISTER_CLOSE: "cash_register.close";
    readonly REPORTS_VIEW: "reports.view";
    readonly SETTINGS_VIEW: "settings.view";
    readonly SETTINGS_EDIT: "settings.edit";
    readonly SUPPLIERS_VIEW: "suppliers.view";
    readonly SUPPLIERS_CREATE: "suppliers.create";
    readonly SUPPLIERS_EDIT: "suppliers.edit";
    readonly SUPPLIERS_DELETE: "suppliers.delete";
    readonly PURCHASES_VIEW: "purchases.view";
    readonly PURCHASES_CREATE: "purchases.create";
    readonly PURCHASES_EDIT: "purchases.edit";
    readonly ACCOUNTS_PAYABLE_VIEW: "accounts_payable.view";
    readonly ACCOUNTS_PAYABLE_CREATE: "accounts_payable.create";
    readonly ACCOUNTS_PAYABLE_EDIT: "accounts_payable.edit";
    readonly EXPENSES_VIEW: "expenses.view";
    readonly EXPENSES_CREATE: "expenses.create";
    readonly EXPENSES_EDIT: "expenses.edit";
    readonly EXPENSES_DELETE: "expenses.delete";
    readonly EMPLOYEES_VIEW: "employees.view";
    readonly EMPLOYEES_CREATE: "employees.create";
    readonly EMPLOYEES_EDIT: "employees.edit";
    readonly EMPLOYEES_DELETE: "employees.delete";
    readonly PAYROLL_VIEW: "payroll.view";
    readonly PAYROLL_CREATE: "payroll.create";
    readonly PAYROLL_APPROVE: "payroll.approve";
    readonly INVENTORY_VIEW: "inventory.view";
    readonly INVENTORY_CREATE: "inventory.create";
    readonly INVENTORY_ADJUST: "inventory.adjust";
    readonly ACCOUNTS_RECEIVABLE_VIEW: "accounts_receivable.view";
    readonly ACCOUNTS_RECEIVABLE_CREATE: "accounts_receivable.create";
    readonly ACCOUNTS_RECEIVABLE_EDIT: "accounts_receivable.edit";
};
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

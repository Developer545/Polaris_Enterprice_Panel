import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common'
import { APP_GUARD, APP_FILTER } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { BullModule } from '@nestjs/bullmq'
import { getEnv } from './config/env'

// Infrastructure
import { PrismaModule } from './infrastructure/prisma/prisma.module'
import { RedisModule } from './infrastructure/redis/redis.module'
import { CryptoModule } from './infrastructure/crypto/crypto.module'

// Guards & Filters (global)
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { TenantModuleGuard } from './common/guards/tenant-module.guard'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'

// Control Plane
import { AdminAuthModule } from './modules/control-plane/admin-auth/admin-auth.module'
import { TenantsModule } from './modules/control-plane/tenants/tenants.module'
import { PlansModule } from './modules/control-plane/plans/plans.module'
import { CatalogsAdminModule } from './modules/control-plane/catalogs/catalogs-admin.module'

// Tenant middleware
import { TenantResolverMiddleware } from './modules/tenant/tenant-resolver/tenant-resolver.middleware'
import { CsrfMiddleware } from './common/middleware/csrf.middleware'

// Tenant — Phase 1: Core
import { AuthModule } from './modules/tenant/auth/auth.module'
import { UsersModule } from './modules/tenant/users/users.module'
import { CompanyModule } from './modules/tenant/company/company.module'
import { BranchesModule } from './modules/tenant/branches/branches.module'
import { RolesModule } from './modules/tenant/roles/roles.module'
import { ClientsModule } from './modules/tenant/clients/clients.module'
import { CategoriesModule } from './modules/tenant/categories/categories.module'
import { ProductsModule } from './modules/tenant/products/products.module'
import { UnitsModule } from './modules/tenant/units/units.module'
import { CashRegisterModule } from './modules/tenant/cash-register/cash-register.module'

// Tenant — Phase 2: POS + DTE
import { PosModule } from './modules/tenant/pos/pos.module'
import { DteModule } from './modules/tenant/dte/dte.module'

// Tenant — Phase 3: Compras
import { SuppliersModule } from './modules/tenant/suppliers/suppliers.module'
import { PurchasesModule } from './modules/tenant/purchases/purchases.module'
import { AccountsPayableModule } from './modules/tenant/accounts-payable/accounts-payable.module'
import { ExpensesModule } from './modules/tenant/expenses/expenses.module'

// Tenant — Phase 4: RRHH
import { EmployeesModule } from './modules/tenant/employees/employees.module'
import { PayrollModule } from './modules/tenant/payroll/payroll.module'

// Tenant — Phase 5
import { InventoryModule } from './modules/tenant/inventory/inventory.module'
import { AccountsReceivableModule } from './modules/tenant/accounts-receivable/accounts-receivable.module'

// Tenant — Catalogs (global, read-only for tenant users)
import { CatalogsModule } from './modules/tenant/catalogs/catalogs.module'

@Module({
  imports: [
    // Global infrastructure
    PrismaModule,
    RedisModule,
    CryptoModule,
    JwtModule.register({ global: true }),

    // BullMQ — Redis connection for DTE queue (non-blocking for dev)
    BullModule.forRootAsync({
      useFactory: () => {
        const env = getEnv()
        return {
          connection: {
            url: env.REDIS_URL,
            lazyConnect: true,
            enableReadyCheck: false,
            maxRetriesPerRequest: null,
          },
        }
      },
    }),

    // Control plane (no tenant middleware)
    AdminAuthModule,
    TenantsModule,
    PlansModule,
    CatalogsAdminModule,

    // Tenant — Phase 1
    AuthModule,
    UsersModule,
    CompanyModule,
    BranchesModule,
    RolesModule,
    ClientsModule,
    CategoriesModule,
    ProductsModule,
    UnitsModule,
    CashRegisterModule,

    // Tenant — Phase 2
    PosModule,
    DteModule,

    // Tenant — Phase 3
    SuppliersModule,
    PurchasesModule,
    AccountsPayableModule,
    ExpensesModule,

    // Tenant — Phase 4
    EmployeesModule,
    PayrollModule,

    // Tenant — Phase 5
    InventoryModule,
    AccountsReceivableModule,

    // Tenant — Catalogs (global read-only)
    CatalogsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: TenantModuleGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // CSRF: validar Origin en todas las mutaciones (POST/PUT/PATCH/DELETE)
    consumer
      .apply(CsrfMiddleware)
      .forRoutes(
        { path: '*', method: RequestMethod.POST },
        { path: '*', method: RequestMethod.PUT },
        { path: '*', method: RequestMethod.PATCH },
        { path: '*', method: RequestMethod.DELETE },
      )

    consumer
      .apply(TenantResolverMiddleware)
      .exclude(
        { path: 'control-plane/(.*)', method: RequestMethod.ALL },
        { path: 'health', method: RequestMethod.GET },
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'auth/logout', method: RequestMethod.POST },
        { path: 'catalogs/(.*)', method: RequestMethod.GET },
      )
      .forRoutes('*')
  }
}

import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common'
import { APP_GUARD, APP_FILTER } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { BullModule } from '@nestjs/bullmq'
import { getEnv, useBullDteQueue } from './config/env'

// Infrastructure
import { PrismaModule } from './infrastructure/prisma/prisma.module'
import { RedisModule } from './infrastructure/redis/redis.module'
import { CryptoModule } from './infrastructure/crypto/crypto.module'

// Guards & Filters (global)
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { TenantModuleGuard } from './common/guards/tenant-module.guard'
import { LocalModuleGuard } from './common/guards/local-module.guard'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'

// Control Plane
import { AdminAuthModule } from './modules/control-plane/admin-auth/admin-auth.module'
import { TenantsModule } from './modules/control-plane/tenants/tenants.module'
import { PlansModule } from './modules/control-plane/plans/plans.module'
import { CatalogsAdminModule } from './modules/control-plane/catalogs/catalogs-admin.module'
import { LicensesModule } from './modules/control-plane/licenses/licenses.module'

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
import { DashboardModule } from './modules/tenant/dashboard/dashboard.module'

// Tenant — Phase 3: Compras
import { SuppliersModule } from './modules/tenant/suppliers/suppliers.module'
import { PurchasesModule } from './modules/tenant/purchases/purchases.module'
import { AccountsPayableModule } from './modules/tenant/accounts-payable/accounts-payable.module'
import { ExpensesModule } from './modules/tenant/expenses/expenses.module'

// Tenant — Phase 4: RRHH
import { EmployeesModule } from './modules/tenant/employees/employees.module'
import { PayrollModule } from './modules/tenant/payroll/payroll.module'
import { SalesGoalsModule } from './modules/tenant/sales-goals/sales-goals.module'

// Tenant — Phase 5
import { InventoryModule } from './modules/tenant/inventory/inventory.module'
import { AccountsReceivableModule } from './modules/tenant/accounts-receivable/accounts-receivable.module'
import { ReportsModule } from './modules/tenant/reports/reports.module'

// Tenant — Catalogs (global, read-only for tenant users)
import { CatalogsModule } from './modules/tenant/catalogs/catalogs.module'

// Local desktop setup (only active when IS_LOCAL_BUNDLE=1)
import { LocalSetupModule } from './modules/local-setup/local-setup.module'

// Upload (imágenes de productos/servicios — Cloudinary o local según modo)
import { UploadModule } from './modules/tenant/upload/upload.module'

@Module({
  imports: [
    // Global infrastructure
    PrismaModule,
    RedisModule,
    CryptoModule,
    JwtModule.register({ global: true }),

    // BullMQ is enabled for online/server deployments. Local desktop can run
    // without Redis and process the DTE outbox directly from PostgreSQL.
    ...(useBullDteQueue()
      ? [
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
        ]
      : []),

    // Control plane (no tenant middleware)
    AdminAuthModule,
    TenantsModule,
    PlansModule,
    CatalogsAdminModule,
    LicensesModule,

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
    DashboardModule,

    // Tenant — Phase 3
    SuppliersModule,
    PurchasesModule,
    AccountsPayableModule,
    ExpensesModule,

    // Tenant — Phase 4
    EmployeesModule,
    PayrollModule,
    SalesGoalsModule,

    // Tenant — Phase 5
    InventoryModule,
    AccountsReceivableModule,
    ReportsModule,

    // Tenant — Catalogs (global read-only)
    CatalogsModule,

    // Upload imágenes (Cloudinary / local)
    UploadModule,

    // Local setup wizard (public endpoints, guarded internally by IS_LOCAL_BUNDLE)
    LocalSetupModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: TenantModuleGuard },
    { provide: APP_GUARD, useClass: LocalModuleGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // CSRF: validar Origin en todas las mutaciones (POST/PUT/PATCH/DELETE)
    // Excluir /setup/* — llamado desde proceso Node.js de Electron sin Origin header
    consumer
      .apply(CsrfMiddleware)
      .exclude(
        { path: 'setup/*path', method: RequestMethod.ALL },
        { path: 'licenses/validate', method: RequestMethod.POST },
        { path: 'licenses/heartbeat', method: RequestMethod.POST },
        { path: 'licenses/sync', method: RequestMethod.POST },
      )
      .forRoutes(
        { path: '*', method: RequestMethod.POST },
        { path: '*', method: RequestMethod.PUT },
        { path: '*', method: RequestMethod.PATCH },
        { path: '*', method: RequestMethod.DELETE },
      )

    consumer
      .apply(TenantResolverMiddleware)
      .exclude(
        { path: 'control-plane/*path', method: RequestMethod.ALL },
        { path: 'health', method: RequestMethod.GET },
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'auth/logout', method: RequestMethod.POST },
        { path: 'catalogs/*path', method: RequestMethod.GET },
        { path: 'setup/*path', method: RequestMethod.ALL },
        { path: 'licenses/validate', method: RequestMethod.POST },
        { path: 'licenses/heartbeat', method: RequestMethod.POST },
        { path: 'licenses/sync', method: RequestMethod.POST },
      )
      .forRoutes('*')
  }
}

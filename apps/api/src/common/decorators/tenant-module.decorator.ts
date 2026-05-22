import { SetMetadata } from '@nestjs/common'

export const TENANT_MODULE_KEY = 'tenantModule'

/**
 * Marca un controller o handler como perteneciente a un módulo funcional.
 * TenantModuleGuard verifica que el tenant tenga ese módulo habilitado.
 *
 * Módulos válidos: pos, dte, compras, gastos, inventario, rrhh, cxc, reportes
 */
export const RequireModule = (module: string) =>
  SetMetadata(TENANT_MODULE_KEY, module)

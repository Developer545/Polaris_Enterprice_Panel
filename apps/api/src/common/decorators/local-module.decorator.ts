import { SetMetadata } from '@nestjs/common'

export const LOCAL_MODULE_KEY = 'localModule'

/**
 * Marca un controller o handler como módulo premium en la versión desktop local.
 * LocalModuleGuard verifica que la licencia activa tenga ese módulo habilitado.
 *
 * Solo aplica cuando IS_LOCAL_BUNDLE=1. En modo cloud, TenantModuleGuard maneja esto.
 *
 * Módulos premium: compras, proveedores, cxp, gastos, empleados, planilla, cxc,
 *                  sucursales, reportes_avanzados
 *
 * @example
 * @RequireLocalModule('planilla')
 * @Controller('payroll')
 * export class PayrollController {}
 */
export const RequireLocalModule = (module: string) =>
  SetMetadata(LOCAL_MODULE_KEY, module)

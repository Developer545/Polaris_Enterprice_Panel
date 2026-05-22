import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { TENANT_MODULE_KEY } from '../decorators/tenant-module.decorator'
import { tenantStorage } from '../../modules/tenant/tenant-resolver/tenant.context'

@Injectable()
export class TenantModuleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const module = this.reflector.getAllAndOverride<string>(TENANT_MODULE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])

    // Sin @RequireModule → no aplica restricción
    if (!module) return true

    // Si no hay contexto tenant (ruta admin o pública) → dejar pasar
    const tenantCtx = tenantStorage.getStore()
    if (!tenantCtx) return true

    // Si modules está vacío ({}) → tenant recién creado, aún no configurado → permitir
    const hasConfig = Object.keys(tenantCtx.modules).length > 0
    if (!hasConfig) return true

    if (tenantCtx.modules[module] === false) {
      throw new ForbiddenException(
        `El módulo "${module}" no está habilitado para este tenant. Contacta al administrador de la plataforma.`
      )
    }

    return true
  }
}

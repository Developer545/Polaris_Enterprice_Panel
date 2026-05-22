import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ADMIN_ROLES_KEY, type AdminRole } from '../decorators/admin-roles.decorator'
import type { JwtAdminPayload } from '@pos-dte/shared-types'

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ADMIN_ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])

    // No @RequireAdminRoles → cualquier admin autenticado puede acceder
    if (!requiredRoles || requiredRoles.length === 0) return true

    const request = ctx.switchToHttp().getRequest()
    const admin: JwtAdminPayload = request.adminUser

    if (!admin) throw new ForbiddenException('Sin contexto de administrador')

    if (!requiredRoles.includes(admin.role)) {
      throw new ForbiddenException(
        `Acción reservada para: ${requiredRoles.join(', ')}. Tu rol actual es: ${admin.role}`
      )
    }

    return true
  }
}

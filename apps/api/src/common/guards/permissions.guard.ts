import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import type { JwtAccessPayload, Permission } from '@pos-dte/shared-types'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!required || required.length === 0) return true

    const { user } = ctx.switchToHttp().getRequest() as { user: JwtAccessPayload }
    if (!user) throw new ForbiddenException('Sin permisos')

    const hasAll = required.every((p) => user.permissions[p] === true)
    if (!hasAll) throw new ForbiddenException(`Permiso requerido: ${required.join(', ')}`)
    return true
  }
}

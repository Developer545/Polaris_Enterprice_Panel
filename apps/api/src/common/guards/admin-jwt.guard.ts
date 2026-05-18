import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { getEnv } from '../../config/env'
import { ADMIN_COOKIE } from '../../config/constants'
import type { JwtAdminPayload } from '@pos-dte/shared-types'

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest()
    const token = request.cookies?.[ADMIN_COOKIE]
    if (!token) throw new UnauthorizedException('No autenticado como administrador')

    try {
      const payload = await this.jwtService.verifyAsync<JwtAdminPayload>(token, {
        secret: getEnv().JWT_ADMIN_SECRET,
      })
      request.adminUser = payload
      return true
    } catch {
      throw new UnauthorizedException('Token de administrador inválido')
    }
  }
}

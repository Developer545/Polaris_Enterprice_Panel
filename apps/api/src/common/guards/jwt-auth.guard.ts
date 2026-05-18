import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { IS_ADMIN_KEY } from '../decorators/admin.decorator'
import { getEnv } from '../../config/env'
import { ACCESS_COOKIE } from '../../config/constants'
import type { JwtAccessPayload } from '@pos-dte/shared-types'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (isPublic) return true

    const isAdmin = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (isAdmin) return true // admin routes handled by AdminJwtGuard

    const request = ctx.switchToHttp().getRequest()
    if (request.method === 'OPTIONS') return true
    const token = request.cookies?.[ACCESS_COOKIE]
    if (!token) throw new UnauthorizedException('No autenticado')

    try {
      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(token, {
        secret: getEnv().JWT_ACCESS_SECRET,
      })
      request.user = payload
      return true
    } catch {
      throw new UnauthorizedException('Token inválido o expirado')
    }
  }
}

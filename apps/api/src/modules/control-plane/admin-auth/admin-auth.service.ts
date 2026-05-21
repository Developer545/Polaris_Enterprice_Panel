import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { ControlPlaneClient } from '../../../infrastructure/prisma/control-plane.client'
import { getEnv } from '../../../config/env'
import {
  ADMIN_COOKIE,
  ADMIN_TOKEN_TTL_SECONDS,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_MINUTES,
} from '../../../config/constants'
import type { AdminLoginDto, JwtAdminPayload } from '@pos-dte/shared-types'
import { FastifyReply } from 'fastify'

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name)

  constructor(
    private readonly cpClient: ControlPlaneClient,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: AdminLoginDto, reply: FastifyReply) {
    const admin = await this.cpClient.adminUser.findUnique({ where: { email: dto.email } })
    if (!admin || !admin.isActive) throw new UnauthorizedException('Credenciales inválidas')

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw new ForbiddenException(`Cuenta bloqueada hasta ${admin.lockedUntil.toISOString()}`)
    }

    const valid = await bcrypt.compare(dto.password, admin.password)
    if (!valid) {
      const failed = admin.failedLogins + 1
      const update: Record<string, unknown> = { failedLogins: failed }
      if (failed >= MAX_LOGIN_ATTEMPTS) {
        update.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        update.failedLogins = 0
      }
      await this.cpClient.adminUser.update({ where: { id: admin.id }, data: update })
      throw new UnauthorizedException('Credenciales inválidas')
    }

    await this.cpClient.adminUser.update({
      where: { id: admin.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    })

    const payload: JwtAdminPayload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role as JwtAdminPayload['role'],
      type: 'admin',
    }

    const token = await this.jwtService.signAsync(payload, {
      secret: getEnv().JWT_ADMIN_SECRET,
      expiresIn: ADMIN_TOKEN_TTL_SECONDS,
    })

    const isProd = getEnv().NODE_ENV === 'production'
    reply.setCookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: ADMIN_TOKEN_TTL_SECONDS,
    })

    this.logger.log(`Admin login: ${admin.email}`)
    return { name: admin.name, email: admin.email, role: admin.role }
  }

  logout(reply: FastifyReply) {
    reply.clearCookie(ADMIN_COOKIE, { path: '/' })
    return { ok: true }
  }
}

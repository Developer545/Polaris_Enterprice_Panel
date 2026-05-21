import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { ControlPlaneClient } from '../../../infrastructure/prisma/control-plane.client'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { getEnv } from '../../../config/env'
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_MINUTES,
} from '../../../config/constants'
import type { JwtAccessPayload, LoginDto } from '@pos-dte/shared-types'
import { FastifyReply } from 'fastify'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly clientFactory: TenantClientFactory,
    private readonly cpClient: ControlPlaneClient,
    private readonly jwtService: JwtService,
  ) {}

  /** For authenticated routes that already have tenant context via middleware */
  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  /** For login/refresh/logout — bypass middleware, use shared DB directly */
  private getSharedDb() {
    return this.clientFactory.getClient()
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex')
  }

  async login(dto: LoginDto, reply: FastifyReply) {
    const db = this.getSharedDb()

    // Resolve tenantId from companyId (no middleware needed)
    const company = await db.company.findUnique({
      where: { id: dto.companyId },
      select: { tenantId: true },
    })
    if (!company) throw new UnauthorizedException('Empresa no encontrada')
    const { tenantId } = company

    const user = await db.user.findFirst({
      where: { email: dto.email, companyId: dto.companyId, tenantId },
      include: {
        role: true,
        branches: { select: { branchId: true } },
      },
    })

    if (!user || !user.isActive) throw new UnauthorizedException('Credenciales inválidas')

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(`Cuenta bloqueada hasta ${user.lockedUntil.toISOString()}`)
    }

    const valid = await bcrypt.compare(dto.password, user.password)
    if (!valid) {
      const failed = user.failedLogins + 1
      const update: Record<string, unknown> = { failedLogins: failed }
      if (failed >= MAX_LOGIN_ATTEMPTS) {
        update.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        update.failedLogins = 0
      }
      await db.user.update({ where: { id: user.id }, data: update })
      throw new UnauthorizedException('Credenciales inválidas')
    }

    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    })

    // Get tenant slug so frontend can inject X-Tenant-Slug in subsequent requests
    const tenant = await this.cpClient.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    })

    const permissions = user.role.permissions as Record<string, boolean>
    const branchIds = user.branches.map((b) => b.branchId)

    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      tenantId,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      permissions,
      branchIds,
      type: 'access',
    }

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: getEnv().JWT_ACCESS_SECRET,
      expiresIn: getEnv().JWT_ACCESS_EXPIRES,
    })

    const familyId = uuidv4()
    const refreshToken = uuidv4()
    const refreshTokenHash = this.hashRefreshToken(refreshToken)

    await db.session.create({
      data: {
        userId: user.id,
        refreshToken: refreshTokenHash,
        familyId,
        deviceInfo: 'electron',
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    })

    this.setAuthCookies(reply, accessToken, refreshToken)

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        permissions,
        branchIds,
      },
      tenantSlug: tenant?.slug ?? '',
    }
  }

  async refresh(refreshToken: string, reply: FastifyReply) {
    const db = this.getSharedDb()
    const refreshTokenHash = this.hashRefreshToken(refreshToken)

    const session = await db.session.findFirst({
      where: { OR: [{ refreshToken: refreshTokenHash }, { refreshToken }], revokedAt: null },
      include: {
        user: { include: { role: true, branches: { select: { branchId: true } } } },
      },
    })

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await db.session.updateMany({
          where: { familyId: session.familyId },
          data: { revokedAt: new Date() },
        })
        this.logger.warn(`Refresh token reuse detected for user ${session.userId}`)
      }
      this.clearAuthCookies(reply)
      throw new UnauthorizedException('Sesión expirada o inválida')
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('Usuario inactivo')
    }

    await db.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } })

    const newRefreshToken = uuidv4()
    const newRefreshTokenHash = this.hashRefreshToken(newRefreshToken)
    await db.session.create({
      data: {
        userId: session.userId,
        refreshToken: newRefreshTokenHash,
        familyId: session.familyId,
        deviceInfo: session.deviceInfo,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    })

    const permissions = session.user.role.permissions as Record<string, boolean>
    const branchIds = session.user.branches.map((b) => b.branchId)

    const accessPayload: JwtAccessPayload = {
      sub: session.userId,
      tenantId: session.user.tenantId,
      companyId: session.user.companyId,
      email: session.user.email,
      name: session.user.name,
      roleId: session.user.roleId,
      permissions,
      branchIds,
      type: 'access',
    }

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: getEnv().JWT_ACCESS_SECRET,
      expiresIn: getEnv().JWT_ACCESS_EXPIRES,
    })

    this.setAuthCookies(reply, accessToken, newRefreshToken)
    return { ok: true }
  }

  async logout(refreshToken: string | undefined, reply: FastifyReply) {
    if (refreshToken) {
      const db = this.getSharedDb()
      const refreshTokenHash = this.hashRefreshToken(refreshToken)
      await db.session.updateMany({
        where: { OR: [{ refreshToken: refreshTokenHash }, { refreshToken }], revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
    this.clearAuthCookies(reply)
    return { ok: true }
  }

  async me(userId: string) {
    const db = this.getDb()
    const { tenantId } = getCurrentTenant()
    return db.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true, name: true, email: true, phone: true, avatar: true,
        roleId: true, companyId: true,
        role: { select: { name: true, permissions: true } },
        branches: { select: { branch: { select: { id: true, name: true } } } },
      },
    })
  }

  private setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
    const isProd = getEnv().NODE_ENV === 'production'
    const cookieOpts = {
      httpOnly: true,
      secure: isProd,
      // SameSite=None required for cross-origin: frontend (vercel.app) → API (onrender.com)
      // SameSite=Strict would block cookies in cross-site requests
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      path: '/',
    }
    reply.setCookie(ACCESS_COOKIE, accessToken, {
      ...cookieOpts,
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
    })
    reply.setCookie(REFRESH_COOKIE, refreshToken, {
      ...cookieOpts,
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
    })
  }

  private clearAuthCookies(reply: FastifyReply) {
    reply.clearCookie(ACCESS_COOKIE, { path: '/' })
    reply.clearCookie(REFRESH_COOKIE, { path: '/' })
  }
}

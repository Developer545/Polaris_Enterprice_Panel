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
import { EncryptionService } from '../../../infrastructure/crypto/encryption.service'
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
    private readonly encryption: EncryptionService,
  ) {}

  /** For authenticated routes that already have tenant context via middleware */
  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  /** Legacy fallback for old sessions and pre-control-plane data. */
  private getSharedDb() {
    return this.clientFactory.getClient()
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex')
  }

  private createRefreshToken(tenantId: string) {
    return `${tenantId}.${uuidv4()}`
  }

  private parseTenantIdFromRefreshToken(refreshToken: string | undefined) {
    if (!refreshToken) return null
    const [tenantId, tokenId] = refreshToken.split('.', 2)
    return tenantId && tokenId ? tenantId : null
  }

  private getTenantDbUrl(tenant: { dbStrategy: string; dbUrl: string | null }) {
    if (tenant.dbStrategy === 'NEON_SHARED') return undefined
    if (!tenant.dbUrl) throw new UnauthorizedException('Base de datos del tenant no configurada')
    return this.encryption.decrypt(tenant.dbUrl)
  }

  private async resolveTenantForCompany(companyId: string) {
    const tenantCompany = await this.cpClient.tenantCompany.findFirst({
      where: { companyRef: companyId },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            status: true,
            dbStrategy: true,
            dbUrl: true,
          },
        },
      },
    })

    if (tenantCompany?.tenant) {
      const tenant = tenantCompany.tenant
      if (tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') {
        throw new ForbiddenException('Tenant suspendido o cancelado')
      }
      return {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        db: this.clientFactory.getClient(this.getTenantDbUrl(tenant)),
      }
    }

    // Legacy fallback: old shared tenants may not have TenantCompany registered.
    const db = this.getSharedDb()
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { tenantId: true },
    })
    if (!company) throw new UnauthorizedException('Empresa no encontrada')

    const tenant = await this.cpClient.tenant.findUnique({
      where: { id: company.tenantId },
      select: { slug: true, status: true },
    })
    if (tenant?.status === 'SUSPENDED' || tenant?.status === 'CANCELLED') {
      throw new ForbiddenException('Tenant suspendido o cancelado')
    }

    return {
      tenantId: company.tenantId,
      tenantSlug: tenant?.slug ?? '',
      db,
    }
  }

  private async getDbForRefreshToken(refreshToken: string | undefined) {
    const tenantId = this.parseTenantIdFromRefreshToken(refreshToken)
    if (!tenantId) return this.getSharedDb()

    const tenant = await this.cpClient.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true, dbStrategy: true, dbUrl: true },
    })
    if (!tenant) throw new UnauthorizedException('Tenant no encontrado')
    if (tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') {
      throw new ForbiddenException('Tenant suspendido o cancelado')
    }

    return this.clientFactory.getClient(this.getTenantDbUrl(tenant))
  }

  async login(dto: LoginDto, reply: FastifyReply) {
    const { db, tenantId, tenantSlug } = await this.resolveTenantForCompany(dto.companyId)

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
    const refreshToken = this.createRefreshToken(tenantId)
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
      tenantSlug,
    }
  }

  async refresh(refreshToken: string, reply: FastifyReply) {
    const db = await this.getDbForRefreshToken(refreshToken)
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

    const newRefreshToken = this.createRefreshToken(session.user.tenantId)
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
      const db = await this.getDbForRefreshToken(refreshToken)
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

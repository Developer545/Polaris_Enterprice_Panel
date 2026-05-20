import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'
import { ControlPlaneClient } from '../../../infrastructure/prisma/control-plane.client'
import { RedisService } from '../../../infrastructure/redis/redis.service'
import { EncryptionService } from '../../../infrastructure/crypto/encryption.service'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { tenantStorage } from './tenant.context'
import { TENANT_HEADER, TENANT_CACHE_TTL } from '../../../config/constants'
import type { TenantContext } from '@pos-dte/shared-types'

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolverMiddleware.name)

  constructor(
    private readonly cpClient: ControlPlaneClient,
    private readonly redis: RedisService,
    private readonly encryption: EncryptionService,
    private readonly clientFactory: TenantClientFactory,
  ) {}

  async use(
    req: FastifyRequest,
    _res: FastifyReply,
    next: (error?: Error) => void,
  ): Promise<void> {
    if (req.method === 'OPTIONS') { next(); return }

    const slug = (req.headers[TENANT_HEADER] as string)?.toLowerCase()
    if (!slug) {
      next(new UnauthorizedException('Header X-Tenant-Slug requerido'))
      return
    }

    try {
      const ctx = await this.resolveTenant(slug)
      // Warm up tenant DB connection before handler runs — eliminates cold-start lag
      await this.clientFactory.ensureClient(ctx.dbUrl)
      tenantStorage.run(ctx, next)
    } catch (err) {
      next(err as Error)
    }
  }

  private async resolveTenant(slug: string): Promise<TenantContext> {
    const cacheKey = `tenant:${slug}`

    // Try Redis cache — fall back to DB if Redis is unavailable
    try {
      const cached = await this.redis.get(cacheKey)
      if (cached) return JSON.parse(cached) as TenantContext
    } catch {
      this.logger.warn('Redis unavailable — resolving tenant from DB (cache miss)')
    }

    const tenant = await this.cpClient.tenant.findUnique({ where: { slug } })
    if (!tenant) throw new UnauthorizedException(`Tenant '${slug}' no encontrado`)
    if (tenant.status === 'SUSPENDED') throw new UnauthorizedException('Tenant suspendido')
    if (tenant.status === 'CANCELLED') throw new UnauthorizedException('Tenant cancelado')

    const ctx: TenantContext = {
      tenantId: tenant.id,
      slug: tenant.slug,
      dbStrategy: tenant.dbStrategy as TenantContext['dbStrategy'],
      dbUrl:
        tenant.dbUrl && tenant.dbStrategy !== 'NEON_SHARED'
          ? this.encryption.decrypt(tenant.dbUrl)
          : undefined,
    }

    // Best-effort cache write — ignore if Redis is down
    try {
      await this.redis.set(cacheKey, JSON.stringify(ctx), TENANT_CACHE_TTL)
    } catch {
      // Redis down — continue without cache
    }

    return ctx
  }
}

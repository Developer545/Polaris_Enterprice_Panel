import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@pos-dte/db/tenant'
import { getEnv } from '../../config/env'

/**
 * Creates and caches PrismaClient instances per tenant database URL.
 * - NEON_SHARED tenants → all share one client (SHARED_TENANT_DATABASE_URL)
 * - NEON_DEDICATED / LOCAL_DEDICATED → one client per dbUrl
 */
@Injectable()
export class TenantClientFactory implements OnModuleDestroy {
  private readonly logger = new Logger(TenantClientFactory.name)
  private readonly clients = new Map<string, PrismaClient>()

  getClient(dbUrl?: string): PrismaClient {
    const url = dbUrl ?? getEnv().SHARED_TENANT_DATABASE_URL

    const existing = this.clients.get(url)
    if (existing) return existing

    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      datasources: { db: { url } },
    })

    // Connect lazily — Prisma connects on first query
    this.clients.set(url, client)
    this.logger.debug(`Created new PrismaClient for DB: ${url.substring(0, 40)}...`)
    return client
  }

  async onModuleDestroy(): Promise<void> {
    for (const [url, client] of this.clients) {
      await client.$disconnect()
      this.logger.debug(`Disconnected PrismaClient for: ${url.substring(0, 40)}...`)
    }
  }
}

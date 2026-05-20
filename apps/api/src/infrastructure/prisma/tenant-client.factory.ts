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
  private readonly connecting = new Map<string, Promise<PrismaClient>>()

  /**
   * Eagerly connects the PrismaClient for a tenant DB URL.
   * Called from TenantResolverMiddleware so the connection is warm
   * before the first query in any service handler.
   */
  async ensureClient(dbUrl?: string): Promise<PrismaClient> {
    const url = dbUrl ?? getEnv().SHARED_TENANT_DATABASE_URL

    const existing = this.clients.get(url)
    if (existing) return existing

    // Deduplicate concurrent warm-up calls for the same URL
    const inFlight = this.connecting.get(url)
    if (inFlight) return inFlight

    const promise = (async () => {
      const client = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        datasources: { db: { url } },
      })
      await client.$connect()
      this.clients.set(url, client)
      this.connecting.delete(url)
      this.logger.debug(`Connected PrismaClient for: ${url.substring(0, 40)}...`)
      return client
    })()

    this.connecting.set(url, promise)
    return promise
  }

  /** Synchronous getter — only call after ensureClient() has resolved. */
  getClient(dbUrl?: string): PrismaClient {
    const url = dbUrl ?? getEnv().SHARED_TENANT_DATABASE_URL
    const existing = this.clients.get(url)
    if (existing) return existing

    // Fallback: create client synchronously (lazy connect) if ensureClient was never awaited
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      datasources: { db: { url } },
    })
    this.clients.set(url, client)
    this.logger.warn(`getClient() called before ensureClient() for: ${url.substring(0, 40)}...`)
    return client
  }

  async onModuleDestroy(): Promise<void> {
    for (const [url, client] of this.clients) {
      await client.$disconnect()
      this.logger.debug(`Disconnected PrismaClient for: ${url.substring(0, 40)}...`)
    }
  }
}

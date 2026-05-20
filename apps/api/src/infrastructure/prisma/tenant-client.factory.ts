import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@pos-dte/db/tenant'
import { getEnv } from '../../config/env'

// Neon serverless sleeps after ~5 min of inactivity — ping every 4 min to keep alive
const KEEP_ALIVE_MS = 4 * 60 * 1000

/**
 * Creates and caches PrismaClient instances per tenant database URL.
 * - NEON_SHARED tenants → all share one client (SHARED_TENANT_DATABASE_URL)
 * - NEON_DEDICATED / LOCAL_DEDICATED → one client per dbUrl
 */
@Injectable()
export class TenantClientFactory implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TenantClientFactory.name)
  private readonly clients = new Map<string, PrismaClient>()
  private readonly connecting = new Map<string, Promise<PrismaClient>>()
  private keepAliveTimer?: NodeJS.Timeout

  /** Pre-warm shared tenant DB at API startup so first user request is fast. */
  async onModuleInit(): Promise<void> {
    await this.ensureClient()
    this.startKeepAlive()
    this.logger.log('Shared tenant DB pre-warmed ✓')
  }

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

  /** Pings all cached Neon connections every 4 min to prevent cold sleep. */
  private startKeepAlive(): void {
    this.keepAliveTimer = setInterval(async () => {
      for (const [url, client] of this.clients) {
        try {
          await client.$queryRaw`SELECT 1`
          this.logger.debug(`Keep-alive ping OK: ${url.substring(0, 40)}...`)
        } catch (err) {
          this.logger.warn(`Keep-alive ping failed for ${url.substring(0, 40)}...: ${err}`)
          // Remove stale client so next request re-connects
          this.clients.delete(url)
        }
      }
    }, KEEP_ALIVE_MS)
  }

  async onModuleDestroy(): Promise<void> {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer)
    for (const [url, client] of this.clients) {
      await client.$disconnect()
      this.logger.debug(`Disconnected PrismaClient for: ${url.substring(0, 40)}...`)
    }
  }
}

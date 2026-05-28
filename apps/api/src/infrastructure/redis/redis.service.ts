import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'
import { getEnv, useLocalMemoryCache } from '../../config/env'

type MemoryValue = {
  value: string
  expiresAt?: number
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client?: Redis
  private readonly memory = new Map<string, MemoryValue>()
  private readonly memoryMode = useLocalMemoryCache()

  onModuleInit(): void {
    if (this.memoryMode) {
      this.logger.log('Redis disabled: using local in-memory cache')
      return
    }

    this.client = new Redis(getEnv().REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    })
    this.client.on('error', (err) => this.logger.error('Redis error', err))
    this.client.on('connect', () => this.logger.log('Redis connected'))
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit()
  }

  async get(key: string): Promise<string | null> {
    if (this.memoryMode) {
      const cached = this.memory.get(key)
      if (!cached) return null
      if (cached.expiresAt && cached.expiresAt < Date.now()) {
        this.memory.delete(key)
        return null
      }
      return cached.value
    }
    return this.client!.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.memoryMode) {
      this.memory.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
      })
      return
    }

    if (ttlSeconds) {
      await this.client!.setex(key, ttlSeconds, value)
    } else {
      await this.client!.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    if (this.memoryMode) {
      this.memory.delete(key)
      return
    }
    await this.client!.del(key)
  }

  async exists(key: string): Promise<boolean> {
    if (this.memoryMode) return (await this.get(key)) !== null
    return (await this.client!.exists(key)) === 1
  }

  /** Distributed lock — returns true if lock acquired */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    if (this.memoryMode) {
      if (await this.exists(key)) return false
      await this.set(key, '1', ttlSeconds)
      return true
    }
    const result = await this.client!.set(key, '1', 'EX', ttlSeconds, 'NX')
    return result === 'OK'
  }

  getClient(): Redis {
    if (!this.client) throw new Error('Redis client is disabled in local memory mode')
    return this.client
  }
}

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'
import { getEnv } from '../../config/env'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client!: Redis

  onModuleInit(): void {
    this.client = new Redis(getEnv().REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    })
    this.client.on('error', (err) => this.logger.error('Redis error', err))
    this.client.on('connect', () => this.logger.log('Redis connected'))
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit()
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value)
    } else {
      await this.client.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1
  }

  /** Distributed lock — returns true if lock acquired */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX')
    return result === 'OK'
  }

  getClient(): Redis {
    return this.client
  }
}

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { useBullDteQueue } from '../../../config/env'
import { tenantStorage } from '../tenant-resolver/tenant.context'
import { DteService } from './dte.service'

const POLL_MS = 15_000
const RETRY_ERROR_AFTER_MS = 60_000

@Injectable()
export class DteLocalOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DteLocalOutboxService.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly clientFactory: TenantClientFactory,
    private readonly dteService: DteService,
  ) {}

  onModuleInit(): void {
    if (useBullDteQueue()) return
    this.logger.log('DTE local outbox enabled: processing queued documents from PostgreSQL')
    this.timer = setInterval(() => void this.processPending(), POLL_MS)
    void this.processPending()
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  private async processPending(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      const db = this.clientFactory.getClient()
      const retryBefore = new Date(Date.now() - RETRY_ERROR_AFTER_MS)
      const docs = await db.dteDocument.findMany({
        where: {
          OR: [
            { status: 'QUEUED' },
            { status: 'ERROR', processedAt: { lt: retryBefore } },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      })

      for (const doc of docs) {
        try {
          await tenantStorage.run(
            {
              tenantId: doc.tenantId,
              slug: '',
              dbStrategy: 'NEON_SHARED',
              modules: {},
              dteAllowedTypes: [],
            },
            () => this.dteService.emitFromQueue({
              saleId: doc.saleId,
              tenantId: doc.tenantId,
              companyId: doc.companyId,
              branchId: doc.branchId,
              tipoDte: doc.tipoDte,
              numeroControl: doc.numeroControl,
            }),
          )
        } catch (err: any) {
          this.logger.warn(`DTE local retry failed for ${doc.numeroControl}: ${err.message}`)
        }
      }
    } catch (err: any) {
      this.logger.warn(`DTE local outbox scan failed: ${err.message}`)
    } finally {
      this.running = false
    }
  }
}

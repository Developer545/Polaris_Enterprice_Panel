import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { tenantStorage } from '../tenant-resolver/tenant.context'
import { ContingencyService } from './contingency.service'

// Escanea documentos en CONTINGENCY y transmite el evento de contingencia + reintenta
// la emisión real cuando el MH se recupera. Corre en ambos modos (Bull/local) sobre
// el cliente compartido por defecto. Para DB dedicada por tenant queda fuera de alcance.
const POLL_MS = 10 * 60_000

@Injectable()
export class ContingencyOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContingencyOutboxService.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly clientFactory: TenantClientFactory,
    private readonly contingency: ContingencyService,
  ) {}

  onModuleInit(): void {
    this.logger.log('Worker de contingencia DTE habilitado')
    this.timer = setInterval(() => void this.scan(), POLL_MS)
    setTimeout(() => void this.scan(), 30_000)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  private async scan(): Promise<void> {
    if (this.running) return
    this.running = true

    try {
      const db = this.clientFactory.getClient()
      const pending = await db.dteDocument.groupBy({
        by: ['tenantId', 'companyId'],
        where: { status: 'CONTINGENCY' },
      })

      for (const { tenantId, companyId } of pending) {
        try {
          await tenantStorage.run(
            {
              tenantId,
              slug: '',
              dbStrategy: 'NEON_SHARED',
              modules: {},
              dteAllowedTypes: [],
            },
            () => this.contingency.autoProcessCompany(tenantId, companyId),
          )
        } catch (err: any) {
          this.logger.warn(`Contingencia auto falló (tenant ${tenantId}): ${err.message}`)
        }
      }
    } catch (err: any) {
      this.logger.warn(`Escaneo de contingencia falló: ${err.message}`)
    } finally {
      this.running = false
    }
  }
}

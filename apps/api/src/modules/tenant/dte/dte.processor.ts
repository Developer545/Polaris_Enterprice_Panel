import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { DteService } from './dte.service'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { tenantStorage } from '../tenant-resolver/tenant.context'

interface DteEmitPayload {
  saleId: string
  tenantId: string
  companyId: string
  branchId: string
  tipoDte: string
  numeroControl: string
  dbUrl?: string
}

@Processor('dte')
export class DteProcessor extends WorkerHost {
  private readonly logger = new Logger(DteProcessor.name)

  constructor(
    private readonly dteService: DteService,
    private readonly clientFactory: TenantClientFactory,
  ) {
    super()
  }

  async process(job: Job<DteEmitPayload>): Promise<void> {
    const { tenantId, dbUrl } = job.data

    // Run inside tenant storage context so services can call getCurrentTenant()
    await tenantStorage.run(
      {
        tenantId,
        slug: '',            // not needed for queue processing
        dbStrategy: 'NEON_SHARED',
        dbUrl,
      },
      () => this.dteService.emitFromQueue(job.data),
    )

    this.logger.log(`Job ${job.id} completed — saleId: ${job.data.saleId}`)
  }
}

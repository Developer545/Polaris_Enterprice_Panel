import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { useBullDteQueue } from '../../../config/env'
import { DteController } from './dte.controller'
import { DteService } from './dte.service'
import { DteProcessor } from './dte.processor'
import { DteLocalOutboxService } from './dte-local-outbox.service'
import { ContingencyService } from './contingency.service'
import { ContingencyOutboxService } from './contingency-outbox.service'
import { DteBuilderService } from './dte-builder.service'
import { DtePdfService } from './dte-pdf.service'
import { MailService } from './mail.service'
import { FirmadorService } from './firmador.service'
import { HaciendaService } from './hacienda.service'
import { CompanyModule } from '../company/company.module'

@Module({
  imports: [
    ...(useBullDteQueue() ? [BullModule.registerQueue({ name: 'dte' })] : []),
    CompanyModule,
  ],
  controllers: [DteController],
  providers: [
    DteService,
    ...(useBullDteQueue() ? [DteProcessor] : [DteLocalOutboxService]),
    DteBuilderService,
    DtePdfService,
    MailService,
    FirmadorService,
    HaciendaService,
    ContingencyService,
    ContingencyOutboxService,
  ],
  exports: [DteService, HaciendaService, FirmadorService, ContingencyService],
})
export class DteModule {}

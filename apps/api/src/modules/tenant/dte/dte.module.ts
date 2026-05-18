import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { DteController } from './dte.controller'
import { DteService } from './dte.service'
import { DteProcessor } from './dte.processor'
import { DteBuilderService } from './dte-builder.service'
import { FirmadorService } from './firmador.service'
import { HaciendaService } from './hacienda.service'
import { CompanyModule } from '../company/company.module'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'dte' }),
    CompanyModule,
  ],
  controllers: [DteController],
  providers: [DteService, DteProcessor, DteBuilderService, FirmadorService, HaciendaService],
  exports: [DteService, HaciendaService, FirmadorService],
})
export class DteModule {}

import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { useBullDteQueue } from '../../../config/env'
import { PosController } from './pos.controller'
import { PosService } from './pos.service'

@Module({
  imports: [
    ...(useBullDteQueue() ? [BullModule.registerQueue({ name: 'dte' })] : []),
  ],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}

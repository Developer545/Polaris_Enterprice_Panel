import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { PosController } from './pos.controller'
import { PosService } from './pos.service'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'dte' }),
  ],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}

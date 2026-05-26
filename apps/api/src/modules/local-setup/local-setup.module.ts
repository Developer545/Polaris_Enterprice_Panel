import { Module } from '@nestjs/common'
import { LocalSetupController } from './local-setup.controller'
import { LocalSetupService } from './local-setup.service'
import { PrismaModule } from '../../infrastructure/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [LocalSetupController],
  providers: [LocalSetupService],
})
export class LocalSetupModule {}

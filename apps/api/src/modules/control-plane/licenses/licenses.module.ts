import { Module } from '@nestjs/common'
import { LicensesAdminController, LicensesPublicController } from './licenses.controller'
import { LicensesService } from './licenses.service'
import { PrismaModule } from '../../../infrastructure/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [LicensesAdminController, LicensesPublicController],
  providers: [LicensesService],
})
export class LicensesModule {}

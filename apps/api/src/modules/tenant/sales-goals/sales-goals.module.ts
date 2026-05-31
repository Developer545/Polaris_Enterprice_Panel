import { Module } from '@nestjs/common'
import { SalesGoalsController } from './sales-goals.controller'
import { SalesGoalsService } from './sales-goals.service'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'

@Module({
  controllers: [SalesGoalsController],
  providers: [SalesGoalsService, TenantClientFactory],
})
export class SalesGoalsModule {}

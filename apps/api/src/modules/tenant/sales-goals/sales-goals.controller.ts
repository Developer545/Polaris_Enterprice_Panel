import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { SalesGoalsService, CreateSalesGoalSchema, UpdateSalesGoalSchema } from './sales-goals.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('sales-goals')
export class SalesGoalsController {
  constructor(private readonly svc: SalesGoalsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  findAll(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId?: string) {
    return this.svc.findAll(companyId ?? user.companyId, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
  create(
    @Body(new ZodValidationPipe(CreateSalesGoalSchema)) dto: z.infer<typeof CreateSalesGoalSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSalesGoalSchema)) dto: z.infer<typeof UpdateSalesGoalSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.remove(id, user)
  }
}

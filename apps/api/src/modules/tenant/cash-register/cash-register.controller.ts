import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { CashRegisterService, OpenRegisterSchema, CloseRegisterSchema } from './cash-register.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('cash-registers')
export class CashRegisterController {
  constructor(private readonly svc: CashRegisterService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CASH_REGISTER_VIEW)
  findAll(@Query('branchId') branchId?: string) {
    return this.svc.findAll(branchId)
  }

  @Get('open/:branchId')
  @RequirePermissions(PERMISSIONS.CASH_REGISTER_VIEW)
  findOpen(@Param('branchId') branchId: string) {
    return this.svc.findOpen(branchId)
  }

  @Get(':id/summary')
  @RequirePermissions(PERMISSIONS.CASH_REGISTER_VIEW)
  summary(@Param('id') id: string) {
    return this.svc.getSummary(id)
  }

  @Post('open')
  @RequirePermissions(PERMISSIONS.CASH_REGISTER_OPEN)
  open(
    @Body(new ZodValidationPipe(OpenRegisterSchema)) dto: z.infer<typeof OpenRegisterSchema>,
    @CurrentUser('sub') userId: string,
  ) {
    return this.svc.open(dto, userId)
  }

  @Post(':id/close')
  @RequirePermissions(PERMISSIONS.CASH_REGISTER_CLOSE)
  close(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CloseRegisterSchema)) dto: z.infer<typeof CloseRegisterSchema>,
    @CurrentUser('sub') userId: string,
  ) {
    return this.svc.close(id, dto, userId)
  }
}

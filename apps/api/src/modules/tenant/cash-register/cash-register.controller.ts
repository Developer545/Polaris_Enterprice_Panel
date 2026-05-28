import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { CashRegisterService, OpenRegisterSchema, CloseRegisterSchema } from './cash-register.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireModule('turnos_caja')
@RequireLocalModule('turnos_caja')
@Controller('cash-registers')
export class CashRegisterController {
  constructor(private readonly svc: CashRegisterService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CASH_REGISTER_VIEW)
  findAll(@CurrentUser() user: JwtAccessPayload, @Query('branchId') branchId?: string) {
    return this.svc.findAll(user, branchId)
  }

  @Get('open/:branchId')
  @RequirePermissions(PERMISSIONS.CASH_REGISTER_VIEW)
  findOpen(@CurrentUser() user: JwtAccessPayload, @Param('branchId') branchId: string) {
    return this.svc.findOpen(user, branchId)
  }

  @Get(':id/summary')
  @RequirePermissions(PERMISSIONS.CASH_REGISTER_VIEW)
  summary(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.svc.getSummary(user, id)
  }

  @Post('open')
  @RequirePermissions(PERMISSIONS.CASH_REGISTER_OPEN)
  open(
    @Body(new ZodValidationPipe(OpenRegisterSchema)) dto: z.infer<typeof OpenRegisterSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.open(dto, user)
  }

  @Post(':id/close')
  @RequirePermissions(PERMISSIONS.CASH_REGISTER_CLOSE)
  close(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CloseRegisterSchema)) dto: z.infer<typeof CloseRegisterSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.close(id, dto, user)
  }
}

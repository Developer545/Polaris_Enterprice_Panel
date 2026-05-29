import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common'
import {
  AccountsReceivableService,
  CreateArSchema,
  RegisterPaymentSchema,
} from './accounts-receivable.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireModule('cxc')
@RequireLocalModule('cxc')
@Controller('accounts-receivable')
export class AccountsReceivableController {
  constructor(private readonly svc: AccountsReceivableService) {}

  @Get('stats')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_RECEIVABLE_VIEW)
  getStats(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
  ) {
    return this.svc.getStats(companyId ?? user.companyId, user)
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ACCOUNTS_RECEIVABLE_VIEW)
  findAll(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.svc.findAll(companyId ?? user.companyId, user, status, clientId, from, to, branchId)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ACCOUNTS_RECEIVABLE_CREATE)
  create(
    @Body(new ZodValidationPipe(CreateArSchema)) dto: z.infer<typeof CreateArSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.create(dto, user)
  }

  @Post(':id/payments')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_RECEIVABLE_EDIT)
  registerPayment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RegisterPaymentSchema)) dto: z.infer<typeof RegisterPaymentSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.registerPayment(id, dto, user)
  }

  @Patch(':id/cancel')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_RECEIVABLE_EDIT)
  cancel(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.cancel(id, user)
  }
}

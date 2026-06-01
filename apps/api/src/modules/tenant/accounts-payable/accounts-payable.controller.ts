import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common'
import {
  AccountsPayableService,
  CreateAccountPayableSchema,
  UpdateAccountPayableSchema,
  RegisterPaymentSchema,
} from './accounts-payable.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireModule('cxp')
@RequireLocalModule('cxp')
@Controller('accounts-payable')
export class AccountsPayableController {
  constructor(private readonly svc: AccountsPayableService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_VIEW)
  findAll(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.svc.findAll(companyId ?? user.companyId, user, status, supplierId, branchId)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_VIEW)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.findOne(id, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_CREATE)
  create(
    @Body(new ZodValidationPipe(CreateAccountPayableSchema)) dto: z.infer<typeof CreateAccountPayableSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAccountPayableSchema)) dto: z.infer<typeof UpdateAccountPayableSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Post(':id/payment')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_EDIT)
  registerPayment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RegisterPaymentSchema)) dto: z.infer<typeof RegisterPaymentSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.registerPayment(id, dto, user)
  }

  @Post('mark-overdue')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_EDIT)
  markOverdue(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId?: string) {
    return this.svc.markOverdue(companyId ?? user.companyId, user)
  }

  @Get('aging')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_VIEW)
  getAging(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId?: string) {
    return this.svc.getAging(companyId ?? user.companyId, user)
  }
}

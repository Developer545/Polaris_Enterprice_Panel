import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common'
import {
  AccountsPayableService,
  CreateAccountPayableSchema,
  UpdateAccountPayableSchema,
  RegisterPaymentSchema,
} from './accounts-payable.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('accounts-payable')
export class AccountsPayableController {
  constructor(private readonly svc: AccountsPayableService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_VIEW)
  findAll(
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.svc.findAll(companyId, status, supplierId)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_VIEW)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_CREATE)
  create(@Body(new ZodValidationPipe(CreateAccountPayableSchema)) dto: z.infer<typeof CreateAccountPayableSchema>) {
    return this.svc.create(dto)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAccountPayableSchema)) dto: z.infer<typeof UpdateAccountPayableSchema>,
  ) {
    return this.svc.update(id, dto)
  }

  @Post(':id/payment')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_EDIT)
  registerPayment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RegisterPaymentSchema)) dto: z.infer<typeof RegisterPaymentSchema>,
  ) {
    return this.svc.registerPayment(id, dto)
  }

  @Post('mark-overdue')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_PAYABLE_EDIT)
  markOverdue(@Query('companyId') companyId: string) {
    return this.svc.markOverdue(companyId)
  }
}

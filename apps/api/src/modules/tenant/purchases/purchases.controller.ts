import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import {
  PurchasesService,
  CreatePurchaseOrderSchema,
  UpdatePurchaseOrderSchema,
  ReceivePurchaseOrderSchema,
} from './purchases.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly svc: PurchasesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  findAll(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.findAll(companyId ?? user.companyId, user, status)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.findOne(id, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  create(
    @Body(new ZodValidationPipe(CreatePurchaseOrderSchema)) dto: z.infer<typeof CreatePurchaseOrderSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePurchaseOrderSchema)) dto: z.infer<typeof UpdatePurchaseOrderSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Post(':id/receive')
  @RequirePermissions(PERMISSIONS.PURCHASES_EDIT)
  receive(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReceivePurchaseOrderSchema)) dto: z.infer<typeof ReceivePurchaseOrderSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.receive(id, dto, user)
  }

  @Delete(':id/cancel')
  @RequirePermissions(PERMISSIONS.PURCHASES_EDIT)
  cancel(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.cancel(id, user)
  }
}

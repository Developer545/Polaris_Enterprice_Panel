import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import {
  PurchasesService,
  CreatePurchaseOrderSchema,
  UpdatePurchaseOrderSchema,
  ReceivePurchaseOrderSchema,
} from './purchases.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly svc: PurchasesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  findAll(@Query('companyId') companyId: string, @Query('status') status?: string) {
    return this.svc.findAll(companyId, status)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PURCHASES_CREATE)
  create(@Body(new ZodValidationPipe(CreatePurchaseOrderSchema)) dto: z.infer<typeof CreatePurchaseOrderSchema>) {
    return this.svc.create(dto)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePurchaseOrderSchema)) dto: z.infer<typeof UpdatePurchaseOrderSchema>,
  ) {
    return this.svc.update(id, dto)
  }

  @Post(':id/receive')
  @RequirePermissions(PERMISSIONS.PURCHASES_EDIT)
  receive(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReceivePurchaseOrderSchema)) dto: z.infer<typeof ReceivePurchaseOrderSchema>,
  ) {
    return this.svc.receive(id, dto)
  }

  @Delete(':id/cancel')
  @RequirePermissions(PERMISSIONS.PURCHASES_EDIT)
  cancel(@Param('id') id: string) {
    return this.svc.cancel(id)
  }
}

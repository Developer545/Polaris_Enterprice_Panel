import { Controller, Get, Post, Body, Query } from '@nestjs/common'
import { InventoryService, AdjustStockSchema } from './inventory.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { z } from 'zod'

@RequireModule('inventario')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  @Get('stats')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  getStats(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
  ) {
    return this.svc.getStats(companyId ?? user.companyId, user)
  }

  @Get('low-stock')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  findLowStock(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
  ) {
    return this.svc.findLowStock(companyId ?? user.companyId, user)
  }

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  findMovements(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findMovements(
      companyId ?? user.companyId,
      user,
      productId,
      type,
      branchId,
      from,
      to,
      page ? +page : 1,
      limit ? +limit : 100,
    )
  }

  @Post('adjust')
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  adjust(
    @Body(new ZodValidationPipe(AdjustStockSchema)) dto: z.infer<typeof AdjustStockSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.adjust(dto, user)
  }
}

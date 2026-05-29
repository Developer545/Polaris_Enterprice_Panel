import { Controller, Get, Post, Body, Query } from '@nestjs/common'
import { InventoryService, AdjustStockSchema } from './inventory.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireModule('inventario')
@RequireLocalModule('inventario')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  @Get('stats')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  getStats(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.svc.getStats(companyId ?? user.companyId, user, branchId)
  }

  @Get('low-stock')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  findLowStock(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.svc.findLowStock(companyId ?? user.companyId, user, branchId)
  }

  // Cross-branch stock lookup (business exception): any branch user may see in
  // which other branches a product has stock. Returns ONLY branch name + stock,
  // never sales, prices, or other branches' sensitive data.
  @Get('stock-search')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  stockSearch(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('productId') productId?: string,
    @Query('q') q?: string,
  ) {
    return this.svc.stockSearch(companyId ?? user.companyId, user, productId, q)
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

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { PosService, CreateSaleSchema } from './pos.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireModule('pos')
@RequireLocalModule('pos')
@Controller('pos')
export class PosController {
  constructor(private readonly svc: PosService) {}

  @Get('bootstrap')
  @RequirePermissions(PERMISSIONS.POS_CREATE)
  bootstrap(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.bootstrap(companyId, branchId, user)
  }

  @Get('stats')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  getStats(
    @Query('companyId') companyId: string,
    @Query('period') period: 'today' | 'month',
    @CurrentUser() user?: JwtAccessPayload,
  ) {
    return this.svc.getStats(companyId, user!, period ?? 'today')
  }

  @Get('sales')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  findSales(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @CurrentUser() user?: JwtAccessPayload,
  ) {
    return this.svc.findSales(companyId, user!, branchId, from, to, page ? +page : 1)
  }

  @Get('sales/:id')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.findOne(id, user)
  }

  @Post('sale')
  @RequirePermissions(PERMISSIONS.POS_CREATE)
  create(
    @Body(new ZodValidationPipe(CreateSaleSchema)) dto: z.infer<typeof CreateSaleSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.create(dto, user)
  }

  @Post('sales/:id/void')
  @RequirePermissions(PERMISSIONS.POS_CANCEL)
  voidSale(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.voidSale(id, body.reason ?? '', user)
  }
}

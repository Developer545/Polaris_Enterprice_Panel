import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { PosService, CreateSaleSchema } from './pos.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('pos')
export class PosController {
  constructor(private readonly svc: PosService) {}

  @Get('stats')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  getStats(
    @Query('companyId') companyId: string,
    @Query('period') period: 'today' | 'month',
  ) {
    return this.svc.getStats(companyId, period ?? 'today')
  }

  @Get('sales')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  findSales(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
  ) {
    return this.svc.findSales(companyId, branchId, from, to, page ? +page : 1)
  }

  @Get('sales/:id')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Post('sale')
  @RequirePermissions(PERMISSIONS.POS_CREATE)
  create(
    @Body(new ZodValidationPipe(CreateSaleSchema)) dto: z.infer<typeof CreateSaleSchema>,
    @CurrentUser('sub') userId: string,
  ) {
    return this.svc.create(dto, userId)
  }
}

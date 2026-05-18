import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ProductsService, CreateProductSchema, UpdateProductSchema, AdjustStockSchema } from './products.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  findAll(
    @Query('companyId') companyId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.svc.findAll(companyId, search, categoryId, lowStock === 'true')
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  create(@Body(new ZodValidationPipe(CreateProductSchema)) dto: z.infer<typeof CreateProductSchema>) {
    return this.svc.create(dto)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProductSchema)) dto: z.infer<typeof UpdateProductSchema>,
  ) {
    return this.svc.update(id, dto)
  }

  @Post(':id/stock')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  adjustStock(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AdjustStockSchema)) body: z.infer<typeof AdjustStockSchema>,
  ) {
    return this.svc.adjustStock(id, body.quantity, body.reason)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  remove(@Param('id') id: string) {
    return this.svc.remove(id)
  }
}

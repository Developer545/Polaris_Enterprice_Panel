import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ProductsService, CreateProductSchema, UpdateProductSchema, AdjustStockSchema } from './products.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireModule('productos')
@RequireLocalModule('productos')
@Controller('products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  findAll(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.svc.findAll(companyId, user, search, categoryId, lowStock === 'true')
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  findOne(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.svc.findOne(id, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  create(
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(CreateProductSchema)) dto: z.infer<typeof CreateProductSchema>,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(UpdateProductSchema)) dto: z.infer<typeof UpdateProductSchema>,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Post(':id/stock')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  adjustStock(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(AdjustStockSchema)) body: z.infer<typeof AdjustStockSchema>,
  ) {
    return this.svc.adjustStock(id, body.quantity, body.reason, user)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  remove(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.svc.remove(id, user)
  }
}

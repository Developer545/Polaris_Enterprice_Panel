import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { CategoriesService, CreateCategorySchema, UpdateCategorySchema } from './categories.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  findAll(@Query('companyId') companyId: string) {
    return this.svc.findAll(companyId)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  create(@Body(new ZodValidationPipe(CreateCategorySchema)) dto: z.infer<typeof CreateCategorySchema>) {
    return this.svc.create(dto)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCategorySchema)) dto: z.infer<typeof UpdateCategorySchema>,
  ) {
    return this.svc.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  remove(@Param('id') id: string) {
    return this.svc.remove(id)
  }
}

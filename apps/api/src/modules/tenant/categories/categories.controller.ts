import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { CategoriesService, CreateCategorySchema, UpdateCategorySchema } from './categories.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  findAll(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId: string) {
    return this.svc.findAll(companyId, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  create(
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(CreateCategorySchema)) dto: z.infer<typeof CreateCategorySchema>,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(UpdateCategorySchema)) dto: z.infer<typeof UpdateCategorySchema>,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  remove(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.svc.remove(id, user)
  }
}

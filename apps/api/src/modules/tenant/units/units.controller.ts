import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { UnitsService, CreateUnitSchema, UpdateUnitSchema } from './units.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('units')
export class UnitsController {
  constructor(private readonly svc: UnitsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  findAll(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId: string) {
    return this.svc.findAll(companyId, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  create(
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(CreateUnitSchema)) dto: z.infer<typeof CreateUnitSchema>,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(UpdateUnitSchema)) dto: z.infer<typeof UpdateUnitSchema>,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  remove(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.svc.remove(id, user)
  }
}

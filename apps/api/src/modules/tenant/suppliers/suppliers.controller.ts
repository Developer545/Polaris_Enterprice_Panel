import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { SuppliersService, CreateSupplierSchema, UpdateSupplierSchema } from './suppliers.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireLocalModule('proveedores')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly svc: SuppliersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SUPPLIERS_VIEW)
  findAll(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.findAll(companyId ?? user.companyId, user, search)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_VIEW)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.findOne(id, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SUPPLIERS_CREATE)
  create(
    @Body(new ZodValidationPipe(CreateSupplierSchema)) dto: z.infer<typeof CreateSupplierSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSupplierSchema)) dto: z.infer<typeof UpdateSupplierSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.remove(id, user)
  }
}

import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { SuppliersService, CreateSupplierSchema, UpdateSupplierSchema } from './suppliers.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly svc: SuppliersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SUPPLIERS_VIEW)
  findAll(@Query('companyId') companyId: string, @Query('search') search?: string) {
    return this.svc.findAll(companyId, search)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_VIEW)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SUPPLIERS_CREATE)
  create(@Body(new ZodValidationPipe(CreateSupplierSchema)) dto: z.infer<typeof CreateSupplierSchema>) {
    return this.svc.create(dto)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSupplierSchema)) dto: z.infer<typeof UpdateSupplierSchema>,
  ) {
    return this.svc.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SUPPLIERS_DELETE)
  remove(@Param('id') id: string) {
    return this.svc.remove(id)
  }
}

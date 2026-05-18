import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { EmployeesService, CreateEmployeeSchema, UpdateEmployeeSchema } from './employees.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('employees')
export class EmployeesController {
  constructor(private readonly svc: EmployeesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EMPLOYEES_VIEW)
  findAll(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.findAll(companyId, branchId, search)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_VIEW)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
  create(
    @Body(new ZodValidationPipe(CreateEmployeeSchema)) dto: z.infer<typeof CreateEmployeeSchema>,
  ) {
    return this.svc.create(dto)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEmployeeSchema)) dto: z.infer<typeof UpdateEmployeeSchema>,
  ) {
    return this.svc.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_DELETE)
  deactivate(@Param('id') id: string) {
    return this.svc.deactivate(id)
  }
}

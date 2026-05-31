import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import {
  EmployeesService,
  CreateEmployeeSchema, UpdateEmployeeSchema,
  CreateCargoSchema, UpdateCargoSchema,
  CreateGroupSchema, UpdateGroupSchema,
} from './employees.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireModule('empleados')
@RequireLocalModule('empleados')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly svc: EmployeesService) {}

  // ── Groups (must come before :id routes) ──────────────────────────────────────

  @Get('groups')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_VIEW)
  listGroups(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId?: string) {
    return this.svc.listGroups(companyId ?? user.companyId, user)
  }

  @Post('groups')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
  createGroup(
    @Body(new ZodValidationPipe(CreateGroupSchema)) dto: z.infer<typeof CreateGroupSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.createGroup(dto, user)
  }

  @Put('groups/:id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_EDIT)
  updateGroup(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateGroupSchema)) dto: z.infer<typeof UpdateGroupSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.updateGroup(id, dto, user)
  }

  @Delete('groups/:id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_DELETE)
  deleteGroup(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.deleteGroup(id, user)
  }

  // ── Cargos (must come before :id routes to avoid param collision) ─────────────

  @Get('cargos')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_VIEW)
  listCargos(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
  ) {
    return this.svc.listCargos(companyId ?? user.companyId, user)
  }

  @Post('cargos')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
  createCargo(
    @Body(new ZodValidationPipe(CreateCargoSchema)) dto: z.infer<typeof CreateCargoSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.createCargo(dto, user)
  }

  @Put('cargos/:id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_EDIT)
  updateCargo(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCargoSchema)) dto: z.infer<typeof UpdateCargoSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.updateCargo(id, dto, user)
  }

  @Delete('cargos/:id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_DELETE)
  deleteCargo(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.deleteCargo(id, user)
  }

  // ── Employees CRUD ───────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(PERMISSIONS.EMPLOYEES_VIEW)
  findAll(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.findAll(companyId ?? user.companyId, user, branchId, search)
  }

  @Get(':id/analytics')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_VIEW)
  getAnalytics(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.getAnalytics(id, user)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_VIEW)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.findOne(id, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EMPLOYEES_CREATE)
  create(
    @Body(new ZodValidationPipe(CreateEmployeeSchema)) dto: z.infer<typeof CreateEmployeeSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEmployeeSchema)) dto: z.infer<typeof UpdateEmployeeSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_DELETE)
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.deactivate(id, user)
  }
}

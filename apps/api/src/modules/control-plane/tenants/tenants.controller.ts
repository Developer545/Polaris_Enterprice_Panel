import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards } from '@nestjs/common'
import {
  TenantsService,
  CreateTenantSchema,
  UpdateTenantSchema,
  UpdateModulesSchema,
  UpdateDteTypesSchema,
  ProvisionTenantSchema,
  type CreateTenantDto,
  type UpdateTenantDto,
  type UpdateModulesDto,
  type UpdateDteTypesDto,
  type ProvisionTenantDto,
} from './tenants.service'
import { AdminJwtGuard } from '../../../common/guards/admin-jwt.guard'
import { AdminRolesGuard } from '../../../common/guards/admin-roles.guard'
import { AdminRoute } from '../../../common/decorators/admin.decorator'
import { RequireAdminRoles } from '../../../common/decorators/admin-roles.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'

@AdminRoute()
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@Controller('control-plane/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll() {
    return this.tenantsService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id)
  }

  @Post()
  @RequireAdminRoles('SUPER_ADMIN')
  create(@Body(new ZodValidationPipe(CreateTenantSchema)) dto: CreateTenantDto) {
    return this.tenantsService.create(dto)
  }

  @Put(':id')
  @RequireAdminRoles('SUPER_ADMIN')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTenantSchema)) dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, dto)
  }

  @Patch(':id/modules')
  @RequireAdminRoles('SUPER_ADMIN')
  updateModules(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateModulesSchema)) dto: UpdateModulesDto,
  ) {
    return this.tenantsService.updateModules(id, dto)
  }

  @Patch(':id/dte-types')
  @RequireAdminRoles('SUPER_ADMIN')
  updateDteTypes(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDteTypesSchema)) dto: UpdateDteTypesDto,
  ) {
    return this.tenantsService.updateDteTypes(id, dto)
  }

  @Post(':id/provision')
  @RequireAdminRoles('SUPER_ADMIN')
  provisionTenant(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ProvisionTenantSchema)) dto: ProvisionTenantDto,
  ) {
    return this.tenantsService.provisionTenant(id, dto)
  }

  @Get(':id/branches')
  getTenantBranches(@Param('id') id: string) {
    return this.tenantsService.getTenantBranches(id)
  }

  @Get(':id/users')
  getTenantUsers(@Param('id') id: string) {
    return this.tenantsService.getTenantUsers(id)
  }
}

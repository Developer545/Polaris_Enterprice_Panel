import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common'
import {
  CatalogsAdminService,
  CreateDepartamentoSchema, UpdateDepartamentoSchema,
  CreateMunicipioSchema, UpdateMunicipioSchema,
  CreateActividadSchema, UpdateActividadSchema,
  CreateDistritoSchema, UpdateDistritoSchema,
  type CreateDepartamentoDto, type UpdateDepartamentoDto,
  type CreateMunicipioDto, type UpdateMunicipioDto,
  type CreateActividadDto, type UpdateActividadDto,
  type CreateDistritoDto, type UpdateDistritoDto,
} from './catalogs-admin.service'
import { AdminJwtGuard } from '../../../common/guards/admin-jwt.guard'
import { AdminRolesGuard } from '../../../common/guards/admin-roles.guard'
import { AdminRoute } from '../../../common/decorators/admin.decorator'
import { RequireAdminRoles } from '../../../common/decorators/admin-roles.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'

@AdminRoute()
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@Controller('control-plane/catalogs')
export class CatalogsAdminController {
  constructor(private readonly svc: CatalogsAdminService) {}

  // ── Departamentos ───────────────────────────────────────────────────────

  @Get('departamentos')
  findAllDepartamentos() {
    return this.svc.findAllDepartamentos()
  }

  @Get('departamentos/:id')
  findDepartamento(@Param('id') id: string) {
    return this.svc.findDepartamento(id)
  }

  @Post('departamentos')
  @RequireAdminRoles('SUPER_ADMIN')
  createDepartamento(
    @Body(new ZodValidationPipe(CreateDepartamentoSchema)) dto: CreateDepartamentoDto,
  ) {
    return this.svc.createDepartamento(dto)
  }

  @Put('departamentos/:id')
  @RequireAdminRoles('SUPER_ADMIN')
  updateDepartamento(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDepartamentoSchema)) dto: UpdateDepartamentoDto,
  ) {
    return this.svc.updateDepartamento(id, dto)
  }

  @Patch('departamentos/:id/toggle')
  @RequireAdminRoles('SUPER_ADMIN')
  toggleDepartamento(@Param('id') id: string) {
    return this.svc.toggleDepartamento(id)
  }

  // ── Municipios ──────────────────────────────────────────────────────────

  @Get('municipios')
  findAllMunicipios(@Query('departamentoCod') departamentoCod?: string) {
    return this.svc.findAllMunicipios(departamentoCod)
  }

  @Get('municipios/:id')
  findMunicipio(@Param('id') id: string) {
    return this.svc.findMunicipio(id)
  }

  @Post('municipios')
  @RequireAdminRoles('SUPER_ADMIN')
  createMunicipio(
    @Body(new ZodValidationPipe(CreateMunicipioSchema)) dto: CreateMunicipioDto,
  ) {
    return this.svc.createMunicipio(dto)
  }

  @Put('municipios/:id')
  @RequireAdminRoles('SUPER_ADMIN')
  updateMunicipio(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMunicipioSchema)) dto: UpdateMunicipioDto,
  ) {
    return this.svc.updateMunicipio(id, dto)
  }

  @Patch('municipios/:id/toggle')
  @RequireAdminRoles('SUPER_ADMIN')
  toggleMunicipio(@Param('id') id: string) {
    return this.svc.toggleMunicipio(id)
  }

  // ── Actividades Económicas ──────────────────────────────────────────────

  @Get('actividades')
  findAllActividades() {
    return this.svc.findAllActividades()
  }

  @Get('actividades/:id')
  findActividad(@Param('id') id: string) {
    return this.svc.findActividad(id)
  }

  @Post('actividades')
  @RequireAdminRoles('SUPER_ADMIN')
  createActividad(
    @Body(new ZodValidationPipe(CreateActividadSchema)) dto: CreateActividadDto,
  ) {
    return this.svc.createActividad(dto)
  }

  @Put('actividades/:id')
  @RequireAdminRoles('SUPER_ADMIN')
  updateActividad(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateActividadSchema)) dto: UpdateActividadDto,
  ) {
    return this.svc.updateActividad(id, dto)
  }

  @Patch('actividades/:id/toggle')
  @RequireAdminRoles('SUPER_ADMIN')
  toggleActividad(@Param('id') id: string) {
    return this.svc.toggleActividad(id)
  }

  // ── Distritos ───────────────────────────────────────────────────────────

  @Get('distritos')
  findAllDistritos(
    @Query('departamentoCod') departamentoCod?: string,
    @Query('municipioCod') municipioCod?: string,
  ) {
    return this.svc.findAllDistritos(departamentoCod, municipioCod)
  }

  @Get('distritos/:id')
  findDistrito(@Param('id') id: string) {
    return this.svc.findDistrito(id)
  }

  @Post('distritos')
  @RequireAdminRoles('SUPER_ADMIN')
  createDistrito(
    @Body(new ZodValidationPipe(CreateDistritoSchema)) dto: CreateDistritoDto,
  ) {
    return this.svc.createDistrito(dto)
  }

  @Put('distritos/:id')
  @RequireAdminRoles('SUPER_ADMIN')
  updateDistrito(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDistritoSchema)) dto: UpdateDistritoDto,
  ) {
    return this.svc.updateDistrito(id, dto)
  }

  @Patch('distritos/:id/toggle')
  @RequireAdminRoles('SUPER_ADMIN')
  toggleDistrito(@Param('id') id: string) {
    return this.svc.toggleDistrito(id)
  }
}

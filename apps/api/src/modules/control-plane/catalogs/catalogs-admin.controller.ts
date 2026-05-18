import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common'
import {
  CatalogsAdminService,
  CreateDepartamentoSchema, UpdateDepartamentoSchema,
  CreateMunicipioSchema, UpdateMunicipioSchema,
  CreateActividadSchema, UpdateActividadSchema,
  type CreateDepartamentoDto, type UpdateDepartamentoDto,
  type CreateMunicipioDto, type UpdateMunicipioDto,
  type CreateActividadDto, type UpdateActividadDto,
} from './catalogs-admin.service'
import { AdminJwtGuard } from '../../../common/guards/admin-jwt.guard'
import { AdminRoute } from '../../../common/decorators/admin.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'

@AdminRoute()
@UseGuards(AdminJwtGuard)
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
  createDepartamento(
    @Body(new ZodValidationPipe(CreateDepartamentoSchema)) dto: CreateDepartamentoDto,
  ) {
    return this.svc.createDepartamento(dto)
  }

  @Put('departamentos/:id')
  updateDepartamento(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDepartamentoSchema)) dto: UpdateDepartamentoDto,
  ) {
    return this.svc.updateDepartamento(id, dto)
  }

  @Patch('departamentos/:id/toggle')
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
  createMunicipio(
    @Body(new ZodValidationPipe(CreateMunicipioSchema)) dto: CreateMunicipioDto,
  ) {
    return this.svc.createMunicipio(dto)
  }

  @Put('municipios/:id')
  updateMunicipio(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMunicipioSchema)) dto: UpdateMunicipioDto,
  ) {
    return this.svc.updateMunicipio(id, dto)
  }

  @Patch('municipios/:id/toggle')
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
  createActividad(
    @Body(new ZodValidationPipe(CreateActividadSchema)) dto: CreateActividadDto,
  ) {
    return this.svc.createActividad(dto)
  }

  @Put('actividades/:id')
  updateActividad(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateActividadSchema)) dto: UpdateActividadDto,
  ) {
    return this.svc.updateActividad(id, dto)
  }

  @Patch('actividades/:id/toggle')
  toggleActividad(@Param('id') id: string) {
    return this.svc.toggleActividad(id)
  }
}

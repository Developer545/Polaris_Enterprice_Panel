import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode,
} from '@nestjs/common'
import {
  LicensesService,
  CreateLicenseSchema,         type CreateLicenseDto,
  UpdateLicenseStatusSchema,   type UpdateLicenseStatusDto,
  UpdateLicenseModulesSchema,  type UpdateLicenseModulesDto,
  ValidateLicenseSchema,       type ValidateLicenseDto,
  HeartbeatSchema,             type HeartbeatDto,
  ResetHwidSchema,             type ResetHwidDto,
} from './licenses.service'
import { AdminJwtGuard }     from '../../../common/guards/admin-jwt.guard'
import { AdminRolesGuard }   from '../../../common/guards/admin-roles.guard'
import { AdminRoute }        from '../../../common/decorators/admin.decorator'
import { RequireAdminRoles } from '../../../common/decorators/admin-roles.decorator'
import { Public }            from '../../../common/decorators/public.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'

// ── Admin endpoints (requieren JWT de panel) ──────────────────────────────────
@AdminRoute()
@UseGuards(AdminJwtGuard, AdminRolesGuard)
@Controller('control-plane/licenses')
export class LicensesAdminController {
  constructor(private readonly service: LicensesService) {}

  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  /** Crea licencia. La clave en texto plano se retorna UNA SOLA VEZ en la respuesta. */
  @Post()
  @RequireAdminRoles('SUPER_ADMIN')
  create(@Body(new ZodValidationPipe(CreateLicenseSchema)) dto: CreateLicenseDto) {
    return this.service.create(dto)
  }

  @Patch(':id/status')
  @RequireAdminRoles('SUPER_ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateLicenseStatusSchema)) dto: UpdateLicenseStatusDto,
  ) {
    return this.service.updateStatus(id, dto)
  }

  /** Cambia módulos habilitados para la licencia — SUPER_ADMIN */
  @Patch(':id/modules')
  @RequireAdminRoles('SUPER_ADMIN')
  updateModules(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateLicenseModulesSchema)) dto: UpdateLicenseModulesDto,
  ) {
    return this.service.updateModules(id, dto)
  }

  /** Desvincula HWID — permite activar en nueva máquina — SUPER_ADMIN */
  @Patch(':id/hwid/reset')
  @RequireAdminRoles('SUPER_ADMIN')
  resetHwid(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ResetHwidSchema)) _dto: ResetHwidDto,
  ) {
    return this.service.resetHwid(id)
  }

  @Delete(':id')
  @RequireAdminRoles('SUPER_ADMIN')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}

// ── Endpoints públicos — llamados por Electron ────────────────────────────────
@Controller('licenses')
export class LicensesPublicController {
  constructor(private readonly service: LicensesService) {}

  /** Activación inicial + validación en cada startup */
  @Public()
  @Post('validate')
  @HttpCode(200)
  validate(@Body(new ZodValidationPipe(ValidateLicenseSchema)) dto: ValidateLicenseDto) {
    return this.service.validate(dto)
  }

  /** Heartbeat diario — contadores DTE + refresh de permisos */
  @Public()
  @Post('heartbeat')
  @HttpCode(200)
  heartbeat(@Body(new ZodValidationPipe(HeartbeatSchema)) dto: HeartbeatDto) {
    return this.service.heartbeat(dto)
  }
}

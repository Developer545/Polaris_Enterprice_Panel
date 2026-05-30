import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, Req, HttpException, HttpStatus,
} from '@nestjs/common'
import { createHash } from 'crypto'
import {
  LicensesService,
  CreateLicenseSchema,         type CreateLicenseDto,
  UpdateLicenseStatusSchema,   type UpdateLicenseStatusDto,
  UpdateLicenseModulesSchema,  type UpdateLicenseModulesDto,
  ValidateLicenseSchema,       type ValidateLicenseDto,
  HeartbeatSchema,             type HeartbeatDto,
  SyncLicenseSchema,           type SyncLicenseDto,
  ResetHwidSchema,             type ResetHwidDto,
  CreateBackupCommandSchema,   type CreateBackupCommandDto,
} from './licenses.service'
import { AdminJwtGuard }     from '../../../common/guards/admin-jwt.guard'
import { AdminRolesGuard }   from '../../../common/guards/admin-roles.guard'
import { AdminRoute }        from '../../../common/decorators/admin.decorator'
import { RequireAdminRoles } from '../../../common/decorators/admin-roles.decorator'
import { Public }            from '../../../common/decorators/public.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'

type RateBucket = { count: number; resetAt: number }

const rateBuckets = new Map<string, RateBucket>()

function hashRatePart(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function getClientIp(req: any): string {
  const forwarded = req?.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req?.ip ?? req?.socket?.remoteAddress ?? 'unknown'
}

function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  bucket.count += 1
  if (bucket.count > limit) {
    throw new HttpException('Demasiados intentos. Intente de nuevo más tarde.', HttpStatus.TOO_MANY_REQUESTS)
  }
}

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

  @Post(':id/commands/backup')
  @RequireAdminRoles('SUPER_ADMIN')
  requestBackup(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateBackupCommandSchema)) dto: CreateBackupCommandDto,
  ) {
    return this.service.requestBackupCommand(id, dto)
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
  validate(
    @Req() req: any,
    @Body(new ZodValidationPipe(ValidateLicenseSchema)) dto: ValidateLicenseDto,
  ) {
    const ip = getClientIp(req)
    assertRateLimit(`license:validate:ip:${ip}`, 30, 60_000)
    assertRateLimit(`license:validate:key:${ip}:${hashRatePart(dto.licenseKey)}`, 8, 60_000)
    return this.service.validate(dto)
  }

  /** Heartbeat diario — contadores DTE + refresh de permisos */
  @Public()
  @Post('heartbeat')
  @HttpCode(200)
  heartbeat(
    @Req() req: any,
    @Body(new ZodValidationPipe(HeartbeatSchema)) dto: HeartbeatDto,
  ) {
    const ip = getClientIp(req)
    assertRateLimit(`license:heartbeat:ip:${ip}`, 60, 60_000)
    assertRateLimit(`license:heartbeat:key:${ip}:${hashRatePart(dto.licenseKey)}`, 20, 60_000)
    return this.service.heartbeat(dto)
  }

  /** Sync compacto: licencia + módulos + heartbeat + comandos pendientes */
  @Public()
  @Post('sync')
  @HttpCode(200)
  sync(
    @Req() req: any,
    @Body(new ZodValidationPipe(SyncLicenseSchema)) dto: SyncLicenseDto,
  ) {
    const ip = getClientIp(req)
    assertRateLimit(`license:sync:ip:${ip}`, 40, 60_000)
    assertRateLimit(`license:sync:key:${ip}:${hashRatePart(dto.licenseKey)}`, 10, 60_000)
    return this.service.sync(dto)
  }
}

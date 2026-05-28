import {
  Body, Controller, ForbiddenException, Get, Headers, HttpCode, Post,
  UnauthorizedException,
} from '@nestjs/common'
import {
  LocalSetupService,
  LocalSetupSchema, type LocalSetupDto,
  LocalResetAdminSchema, type LocalResetAdminDto,
  LocalBackupSchema, type LocalBackupDto,
} from './local-setup.service'
import { Public } from '../../common/decorators/public.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'

function assertLocalBundle() {
  if (process.env.IS_LOCAL_BUNDLE !== '1') {
    throw new ForbiddenException('Endpoint disponible solo en instalación local')
  }
}

function assertLocalSetupToken(token: string | undefined) {
  assertLocalBundle()
  const expected = process.env.LOCAL_SETUP_TOKEN
  if (!expected || token !== expected) {
    throw new UnauthorizedException('Token local inválido')
  }
}

@Controller('setup')
export class LocalSetupController {
  constructor(private readonly service: LocalSetupService) {}

  @Public()
  @Get('status')
  status() {
    assertLocalBundle()
    return this.service.getStatus()
  }

  @Public()
  @Post('init')
  @HttpCode(200)
  init(
    @Headers('x-local-setup-token') token: string | undefined,
    @Body(new ZodValidationPipe(LocalSetupSchema)) dto: LocalSetupDto,
  ) {
    assertLocalSetupToken(token)
    return this.service.init(dto)
  }

  /**
   * Reinstalación: actualiza email/nombre/contraseña del admin existente.
   * Solo disponible en instalación local. Sin autenticación porque se llama
   * antes del primer login.
   */
  @Public()
  @Post('reset-admin')
  @HttpCode(200)
  resetAdmin(
    @Headers('x-local-setup-token') token: string | undefined,
    @Body(new ZodValidationPipe(LocalResetAdminSchema)) dto: LocalResetAdminDto,
  ) {
    assertLocalSetupToken(token)
    return this.service.resetAdmin(dto)
  }

  @Public()
  @Post('backup')
  @HttpCode(200)
  backup(
    @Headers('x-local-setup-token') token: string | undefined,
    @Body(new ZodValidationPipe(LocalBackupSchema)) dto: LocalBackupDto,
  ) {
    assertLocalSetupToken(token)
    return this.service.createBackup(dto)
  }
}

@Controller('local-backups')
export class LocalBackupController {
  constructor(private readonly service: LocalSetupService) {}

  @Post()
  @HttpCode(200)
  create(@Body(new ZodValidationPipe(LocalBackupSchema)) dto: LocalBackupDto) {
    assertLocalBundle()
    return this.service.createBackup(dto)
  }
}

import { Controller, Get, Post, Body, ForbiddenException, HttpCode } from '@nestjs/common'
import {
  LocalSetupService,
  LocalSetupSchema, type LocalSetupDto,
  LocalResetAdminSchema, type LocalResetAdminDto,
} from './local-setup.service'
import { Public } from '../../common/decorators/public.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'

function assertLocalBundle() {
  if (process.env.IS_LOCAL_BUNDLE !== '1') {
    throw new ForbiddenException('Endpoint disponible solo en instalación local')
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
  init(@Body(new ZodValidationPipe(LocalSetupSchema)) dto: LocalSetupDto) {
    assertLocalBundle()
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
  resetAdmin(@Body(new ZodValidationPipe(LocalResetAdminSchema)) dto: LocalResetAdminDto) {
    assertLocalBundle()
    return this.service.resetAdmin(dto)
  }
}

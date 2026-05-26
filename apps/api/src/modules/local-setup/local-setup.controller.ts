import { Controller, Get, Post, Body, ForbiddenException, HttpCode } from '@nestjs/common'
import { LocalSetupService, LocalSetupSchema, type LocalSetupDto } from './local-setup.service'
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
}

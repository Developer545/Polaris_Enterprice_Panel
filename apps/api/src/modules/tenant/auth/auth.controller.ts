import { Controller, Post, Get, Body, Req, Res, UseGuards, HttpCode } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'
import { AuthService } from './auth.service'
import { Public } from '../../../common/decorators/public.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { LoginSchema, type LoginDto, type JwtAccessPayload } from '@pos-dte/shared-types'
import { REFRESH_COOKIE } from '../../../config/constants'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.authService.login(dto, reply)
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE]
    return this.authService.refresh(token ?? '', reply)
  }

  @Post('logout')
  @HttpCode(200)
  logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE]
    return this.authService.logout(token, reply)
  }

  @Get('me')
  me(@CurrentUser() user: JwtAccessPayload) {
    return this.authService.me(user.sub)
  }

  // Returns tenant-level info (dbStrategy, slug) — safe to expose, no secrets
  @Get('tenant-info')
  tenantInfo() {
    const { slug, dbStrategy, modules, dteAllowedTypes } = getCurrentTenant()
    return {
      slug,
      dbStrategy,
      modules,
      dteAllowedTypes,
      localBundle: process.env.IS_LOCAL_BUNDLE === '1',
    }
  }
}

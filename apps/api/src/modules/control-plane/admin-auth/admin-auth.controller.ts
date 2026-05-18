import { Controller, Post, Body, Res, HttpCode, UseGuards } from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { AdminAuthService } from './admin-auth.service'
import { AdminJwtGuard } from '../../../common/guards/admin-jwt.guard'
import { AdminRoute } from '../../../common/decorators/admin.decorator'
import { Public } from '../../../common/decorators/public.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { AdminLoginSchema, type AdminLoginDto } from '@pos-dte/shared-types'

@Controller('control-plane/admin-auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(AdminLoginSchema)) dto: AdminLoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.adminAuthService.login(dto, reply)
  }

  @AdminRoute()
  @UseGuards(AdminJwtGuard)
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    return this.adminAuthService.logout(reply)
  }
}

import { Controller, Get, Post, Body, Param, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { DteService, AnulacionSchema, RetornoSchema, OperacionEspecialSchema } from './dte.service'
import { ContingencyService, ContingenciaSchema } from './contingency.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { PERMISSIONS } from '@pos-dte/shared-types'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireModule('dte')
@RequireLocalModule('dte')
@Controller('dte')
export class DteController {
  constructor(
    private readonly svc: DteService,
    private readonly contingency: ContingencyService,
  ) {}

  @Get('sale/:saleId')
  @RequirePermissions(PERMISSIONS.DTE_VIEW)
  findBySale(@Param('saleId') saleId: string, @CurrentUser() user: JwtAccessPayload) {
    const { tenantId, dbUrl } = getCurrentTenant()
    return this.svc.findBySale(saleId, user, tenantId, dbUrl)
  }

  @Get('pdf/:saleId')
  @RequirePermissions(PERMISSIONS.DTE_VIEW)
  async downloadPdf(
    @Param('saleId') saleId: string,
    @CurrentUser() user: JwtAccessPayload,
    @Res() reply: FastifyReply,
  ) {
    const { tenantId, dbUrl } = getCurrentTenant()
    const buffer = await this.svc.downloadPdf(saleId, user, tenantId, dbUrl)
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="DTE_${saleId}.pdf"`)
      .send(buffer)
  }

  @Post('resend-email/:saleId')
  @RequirePermissions(PERMISSIONS.DTE_VIEW)
  resendEmail(@Param('saleId') saleId: string, @CurrentUser() user: JwtAccessPayload) {
    const { tenantId, dbUrl } = getCurrentTenant()
    return this.svc.resendEmail(saleId, user, tenantId, dbUrl)
  }

  @Post('anular')
  @RequirePermissions(PERMISSIONS.DTE_ANULAR)
  anular(
    @Body(new ZodValidationPipe(AnulacionSchema)) dto: z.infer<typeof AnulacionSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    const { tenantId, dbUrl } = getCurrentTenant()
    return this.svc.anular(dto, user, tenantId, dbUrl)
  }

  @Post('retorno')
  @RequirePermissions(PERMISSIONS.DTE_EMIT)
  retorno(
    @Body(new ZodValidationPipe(RetornoSchema)) dto: z.infer<typeof RetornoSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    const { tenantId, dbUrl } = getCurrentTenant()
    return this.svc.emitirRetorno(dto, user, tenantId, dbUrl)
  }

  @Post('operacion-especial')
  @RequirePermissions(PERMISSIONS.DTE_EMIT)
  operacionEspecial(
    @Body(new ZodValidationPipe(OperacionEspecialSchema)) dto: z.infer<typeof OperacionEspecialSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    const { tenantId, dbUrl } = getCurrentTenant()
    return this.svc.emitirOperacionEspecial(dto, user, tenantId, dbUrl)
  }

  @Get('contingencia/status')
  @RequirePermissions(PERMISSIONS.DTE_VIEW)
  contingenciaStatus(@CurrentUser() user: JwtAccessPayload) {
    const { tenantId, dbUrl } = getCurrentTenant()
    return this.contingency.getStatus({
      tenantId,
      dbUrl,
      ...ContingencyService.scopeFromUser(user),
    })
  }

  @Post('contingencia')
  @RequirePermissions(PERMISSIONS.DTE_EMIT)
  contingencia(
    @Body(new ZodValidationPipe(ContingenciaSchema)) dto: z.infer<typeof ContingenciaSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    const { tenantId, dbUrl } = getCurrentTenant()
    return this.contingency.transmit(
      { tenantId, dbUrl, ...ContingencyService.scopeFromUser(user) },
      dto,
    )
  }
}

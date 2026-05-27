import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { DteService, AnulacionSchema } from './dte.service'
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
  constructor(private readonly svc: DteService) {}

  @Get('sale/:saleId')
  @RequirePermissions(PERMISSIONS.DTE_VIEW)
  findBySale(@Param('saleId') saleId: string, @CurrentUser() user: JwtAccessPayload) {
    const { tenantId, dbUrl } = getCurrentTenant()
    return this.svc.findBySale(saleId, user, tenantId, dbUrl)
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
}

import { Controller, Get, Post, Body, Param, Request } from '@nestjs/common'
import { DteService, AnulacionSchema } from './dte.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('dte')
export class DteController {
  constructor(private readonly svc: DteService) {}

  @Get('sale/:saleId')
  @RequirePermissions(PERMISSIONS.DTE_VIEW)
  findBySale(@Param('saleId') saleId: string) {
    const { tenantId, dbUrl } = getCurrentTenant()
    return this.svc.findBySale(saleId, tenantId, dbUrl)
  }

  @Post('anular')
  @RequirePermissions(PERMISSIONS.DTE_ANULAR)
  anular(@Body(new ZodValidationPipe(AnulacionSchema)) dto: z.infer<typeof AnulacionSchema>) {
    const { tenantId, dbUrl } = getCurrentTenant()
    return this.svc.anular(dto, tenantId, dbUrl)
  }
}

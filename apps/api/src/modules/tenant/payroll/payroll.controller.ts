import { Controller, Get, Post, Put, Body, Param, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { PayrollService, CreatePeriodSchema } from './payroll.service'
import { PayrollPdfService } from './payroll-pdf.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireModule('planilla')
@RequireLocalModule('planilla')
@Controller('payroll')
export class PayrollController {
  constructor(
    private readonly svc: PayrollService,
    private readonly pdf: PayrollPdfService,
  ) {}

  // ── Periods ────────────────────────────────────────────────────────────────

  @Get('periods')
  @RequirePermissions(PERMISSIONS.PAYROLL_VIEW)
  findPeriods(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId?: string) {
    return this.svc.findPeriods(companyId ?? user.companyId, user)
  }

  @Get('periods/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_VIEW)
  findPeriod(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.findPeriod(id, user)
  }

  @Post('periods')
  @RequirePermissions(PERMISSIONS.PAYROLL_CREATE)
  createPeriod(
    @Body(new ZodValidationPipe(CreatePeriodSchema)) dto: z.infer<typeof CreatePeriodSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.createPeriod(dto, user)
  }

  // ── Generation ─────────────────────────────────────────────────────────────

  @Post('periods/:id/generate')
  @RequirePermissions(PERMISSIONS.PAYROLL_CREATE)
  generatePayroll(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.generatePayroll(id, user)
  }

  // ── Workflow ───────────────────────────────────────────────────────────────

  @Put('periods/:id/approve')
  @RequirePermissions(PERMISSIONS.PAYROLL_APPROVE)
  approvePeriod(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.approvePeriod(id, user)
  }

  @Put('periods/:id/pay')
  @RequirePermissions(PERMISSIONS.PAYROLL_APPROVE)
  markPaid(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.markPaid(id, user)
  }

  // ── PDF boletas ────────────────────────────────────────────────────────────

  /** GET /payroll/items/:itemId/boleta — single pay slip PDF */
  @Get('items/:itemId/boleta')
  @RequirePermissions(PERMISSIONS.PAYROLL_VIEW)
  async downloadBoleta(
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtAccessPayload,
    @Res() res: Response,
  ) {
    const { item, period, company } = await this.svc.getItemForPdf(itemId, user)
    const buffer = await this.pdf.generateBoleta(item, period, company)
    const empName = `${item.employee?.firstName ?? ''}_${item.employee?.lastName ?? ''}`.trim().replace(/\s+/g, '_')
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="boleta_${empName}_${period.name?.replace(/\s+/g, '_') ?? 'planilla'}.pdf"`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }

  /** GET /payroll/periods/:id/boletas — all pay slips for a period (multi-page PDF) */
  @Get('periods/:id/boletas')
  @RequirePermissions(PERMISSIONS.PAYROLL_VIEW)
  async downloadAllBoletas(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
    @Res() res: Response,
  ) {
    const { period, company } = await this.svc.getPeriodForPdf(id, user)
    const buffer = await this.pdf.generateAllBoletas(period, company)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="boletas_${period.name?.replace(/\s+/g, '_') ?? 'planilla'}.pdf"`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }
}

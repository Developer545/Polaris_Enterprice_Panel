import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common'
import { PayrollService, CreatePeriodSchema } from './payroll.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('payroll')
export class PayrollController {
  constructor(private readonly svc: PayrollService) {}

  // ── Periods ────────────────────────────────────────────────────────────────

  @Get('periods')
  @RequirePermissions(PERMISSIONS.PAYROLL_VIEW)
  findPeriods(@Query('companyId') companyId: string) {
    return this.svc.findPeriods(companyId)
  }

  @Get('periods/:id')
  @RequirePermissions(PERMISSIONS.PAYROLL_VIEW)
  findPeriod(@Param('id') id: string) {
    return this.svc.findPeriod(id)
  }

  @Post('periods')
  @RequirePermissions(PERMISSIONS.PAYROLL_CREATE)
  createPeriod(
    @Body(new ZodValidationPipe(CreatePeriodSchema)) dto: z.infer<typeof CreatePeriodSchema>,
  ) {
    return this.svc.createPeriod(dto)
  }

  // ── Generation ─────────────────────────────────────────────────────────────

  @Post('periods/:id/generate')
  @RequirePermissions(PERMISSIONS.PAYROLL_CREATE)
  generatePayroll(@Param('id') id: string) {
    return this.svc.generatePayroll(id)
  }

  // ── Workflow ───────────────────────────────────────────────────────────────

  @Put('periods/:id/approve')
  @RequirePermissions(PERMISSIONS.PAYROLL_APPROVE)
  approvePeriod(@Param('id') id: string) {
    return this.svc.approvePeriod(id)
  }

  @Put('periods/:id/pay')
  @RequirePermissions(PERMISSIONS.PAYROLL_APPROVE)
  markPaid(@Param('id') id: string) {
    return this.svc.markPaid(id)
  }
}

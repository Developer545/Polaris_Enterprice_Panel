import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common'
import { PayrollService, CreatePeriodSchema } from './payroll.service'
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
  constructor(private readonly svc: PayrollService) {}

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
}

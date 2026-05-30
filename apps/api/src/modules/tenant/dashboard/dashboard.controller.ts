import { Controller, Get, Query } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'

@RequireModule('pos')
@RequireLocalModule('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  // Consolidated owner panel. Service rejects non-owners (canViewAllBranches).
  @Get('consolidated')
  @RequirePermissions(PERMISSIONS.BRANCH_VIEW_ALL)
  getConsolidated(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('period') period?: 'today' | 'month',
  ) {
    return this.svc.getConsolidated(companyId ?? user.companyId, user, period ?? 'today')
  }

  /**
   * Extended owner dashboard with free date range.
   * Returns: panel KPIs + evolution + gastos por categoría + CxP + planilla.
   */
  @Get('extended')
  @RequirePermissions(PERMISSIONS.BRANCH_VIEW_ALL)
  getExtended(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
  ) {
    const now = new Date()
    const fromDate = from
      ? new Date(from + 'T00:00:00.000Z')
      : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
    const toDate = to
      ? new Date(to + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return this.svc.getExtended(
      companyId ?? user.companyId,
      user,
      fromDate,
      toDate,
      branchId && branchId !== 'all' ? branchId : undefined,
    )
  }
}

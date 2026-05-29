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
}

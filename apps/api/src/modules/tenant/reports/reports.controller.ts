import { Controller, Get, Query, Res, ParseIntPipe, DefaultValuePipe } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { ReportsService } from './reports.service'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('sales')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  async downloadSales(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() reply?: FastifyReply,
  ) {
    const buffer = await this.svc.salesXlsx(companyId ?? user.companyId, user, from, to, branchId)
    const date = new Date().toISOString().slice(0, 10)
    reply!
      .header('Content-Type', XLSX_MIME)
      .header('Content-Disposition', `attachment; filename="reporte_ventas_${date}.xlsx"`)
      .send(buffer)
  }

  @Get('inventory')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  async downloadInventory(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Res() reply?: FastifyReply,
  ) {
    const buffer = await this.svc.inventoryXlsx(companyId ?? user.companyId, user, branchId)
    const date = new Date().toISOString().slice(0, 10)
    reply!
      .header('Content-Type', XLSX_MIME)
      .header('Content-Disposition', `attachment; filename="reporte_inventario_${date}.xlsx"`)
      .send(buffer)
  }

  @Get('expenses')
  @RequirePermissions(PERMISSIONS.EXPENSES_VIEW)
  async downloadExpenses(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() reply?: FastifyReply,
  ) {
    const buffer = await this.svc.expensesXlsx(companyId ?? user.companyId, user, from, to, branchId)
    const date = new Date().toISOString().slice(0, 10)
    reply!
      .header('Content-Type', XLSX_MIME)
      .header('Content-Disposition', `attachment; filename="reporte_gastos_${date}.xlsx"`)
      .send(buffer)
  }

  @Get('iva-ventas')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  async ivaVentas(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1), ParseIntPipe) month?: number,
    @Query('year',  new DefaultValuePipe(new Date().getFullYear()),  ParseIntPipe) year?:  number,
  ) {
    return this.svc.ivaBookVentas(companyId ?? user.companyId, user, month!, year!)
  }

  @Get('iva-compras')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  async ivaCompras(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('month', new DefaultValuePipe(new Date().getMonth() + 1), ParseIntPipe) month?: number,
    @Query('year',  new DefaultValuePipe(new Date().getFullYear()),  ParseIntPipe) year?:  number,
  ) {
    return this.svc.ivaBookCompras(companyId ?? user.companyId, user, month!, year!)
  }
}

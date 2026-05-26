import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import {
  ExpensesService,
  CreateExpenseCategorySchema,
  UpdateExpenseCategorySchema,
  CreateExpenseSchema,
  UpdateExpenseSchema,
} from './expenses.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireModule('gastos')
@RequireLocalModule('gastos')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly svc: ExpensesService) {}

  // ─── Categories ──────────────────────────────────────────────────────────────

  @Get('categories')
  @RequirePermissions(PERMISSIONS.EXPENSES_VIEW)
  findAllCategories(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId?: string) {
    return this.svc.findAllCategories(companyId ?? user.companyId, user)
  }

  @Post('categories')
  @RequirePermissions(PERMISSIONS.EXPENSES_CREATE)
  createCategory(
    @Body(new ZodValidationPipe(CreateExpenseCategorySchema)) dto: z.infer<typeof CreateExpenseCategorySchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.createCategory(dto, user)
  }

  @Put('categories/:id')
  @RequirePermissions(PERMISSIONS.EXPENSES_EDIT)
  updateCategory(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateExpenseCategorySchema)) dto: z.infer<typeof UpdateExpenseCategorySchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.updateCategory(id, dto, user)
  }

  @Delete('categories/:id')
  @RequirePermissions(PERMISSIONS.EXPENSES_DELETE)
  removeCategory(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.removeCategory(id, user)
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(PERMISSIONS.EXPENSES_VIEW)
  findAll(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.findAll(companyId ?? user.companyId, user, categoryId, from, to)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EXPENSES_VIEW)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.findOne(id, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EXPENSES_CREATE)
  create(
    @Body(new ZodValidationPipe(CreateExpenseSchema)) dto: z.infer<typeof CreateExpenseSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.EXPENSES_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateExpenseSchema)) dto: z.infer<typeof UpdateExpenseSchema>,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.EXPENSES_DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtAccessPayload) {
    return this.svc.remove(id, user)
  }
}

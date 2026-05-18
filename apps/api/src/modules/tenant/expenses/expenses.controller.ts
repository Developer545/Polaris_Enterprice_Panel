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
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly svc: ExpensesService) {}

  // ─── Categories ──────────────────────────────────────────────────────────────

  @Get('categories')
  @RequirePermissions(PERMISSIONS.EXPENSES_VIEW)
  findAllCategories(@Query('companyId') companyId: string) {
    return this.svc.findAllCategories(companyId)
  }

  @Post('categories')
  @RequirePermissions(PERMISSIONS.EXPENSES_CREATE)
  createCategory(
    @Body(new ZodValidationPipe(CreateExpenseCategorySchema)) dto: z.infer<typeof CreateExpenseCategorySchema>,
  ) {
    return this.svc.createCategory(dto)
  }

  @Put('categories/:id')
  @RequirePermissions(PERMISSIONS.EXPENSES_EDIT)
  updateCategory(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateExpenseCategorySchema)) dto: z.infer<typeof UpdateExpenseCategorySchema>,
  ) {
    return this.svc.updateCategory(id, dto)
  }

  @Delete('categories/:id')
  @RequirePermissions(PERMISSIONS.EXPENSES_DELETE)
  removeCategory(@Param('id') id: string) {
    return this.svc.removeCategory(id)
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(PERMISSIONS.EXPENSES_VIEW)
  findAll(
    @Query('companyId') companyId: string,
    @Query('categoryId') categoryId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.findAll(companyId, categoryId, from, to)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EXPENSES_VIEW)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EXPENSES_CREATE)
  create(@Body(new ZodValidationPipe(CreateExpenseSchema)) dto: z.infer<typeof CreateExpenseSchema>) {
    return this.svc.create(dto)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.EXPENSES_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateExpenseSchema)) dto: z.infer<typeof UpdateExpenseSchema>,
  ) {
    return this.svc.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.EXPENSES_DELETE)
  remove(@Param('id') id: string) {
    return this.svc.remove(id)
  }
}

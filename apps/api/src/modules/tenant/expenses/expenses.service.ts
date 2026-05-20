import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { Decimal } from '@prisma/client/runtime/library'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const CreateExpenseCategorySchema = z.object({
  companyId: z.string().cuid(),
  name: z.string().min(2),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6b7280'),
})

export const UpdateExpenseCategorySchema = CreateExpenseCategorySchema.partial().omit({ companyId: true })

export const CreateExpenseSchema = z.object({
  companyId: z.string().cuid(),
  categoryId: z.string().cuid().optional().nullable(),
  description: z.string().min(2),
  amount: z.number().positive(),
  date: z.string().datetime(),
  receiptUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const UpdateExpenseSchema = CreateExpenseSchema.partial().omit({ companyId: true })

export type CreateExpenseCategoryDto = z.infer<typeof CreateExpenseCategorySchema>
export type UpdateExpenseCategoryDto = z.infer<typeof UpdateExpenseCategorySchema>
export type CreateExpenseDto = z.infer<typeof CreateExpenseSchema>
export type UpdateExpenseDto = z.infer<typeof UpdateExpenseSchema>

@Injectable()
export class ExpensesService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  private async assertCategoryAccess(db: ReturnType<ExpensesService['getDb']>, tenantId: string, companyId: string, categoryId?: string | null) {
    if (!categoryId) return
    const category = await db.expenseCategory.findFirst({
      where: { id: categoryId, tenantId, companyId, isActive: true },
      select: { id: true },
    })
    if (!category) throw new BadRequestException('Categoria de gasto no pertenece a la empresa')
  }

  // ─── Categories ──────────────────────────────────────────────────────────────

  async findAllCategories(companyId: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    return db.expenseCategory.findMany({
      where: { tenantId, companyId, isActive: true },
      include: { _count: { select: { expenses: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async createCategory(dto: CreateExpenseCategoryDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)
    const exists = await db.expenseCategory.findFirst({
      where: { tenantId, companyId: dto.companyId, name: { equals: dto.name, mode: 'insensitive' } },
    })
    if (exists) throw new ConflictException('Ya existe una categoría con ese nombre')
    return db.expenseCategory.create({ data: { ...dto, tenantId } })
  }

  async updateCategory(id: string, dto: UpdateExpenseCategoryDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const category = await db.expenseCategory.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!category) throw new NotFoundException('Categoría no encontrada')
    return db.expenseCategory.update({ where: { id }, data: dto })
  }

  async removeCategory(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const category = await db.expenseCategory.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!category) throw new NotFoundException('Categoría no encontrada')
    await db.expenseCategory.update({ where: { id }, data: { isActive: false } })
    return { ok: true }
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────────

  async findAll(companyId: string, user: JwtAccessPayload, categoryId?: string, from?: string, to?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    await this.assertCategoryAccess(db, tenantId, companyId, categoryId)
    return db.expense.findMany({
      where: {
        tenantId,
        companyId,
        ...(categoryId ? { categoryId } : {}),
        ...(from || to ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        } : {}),
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    })
  }

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const expense = await db.expense.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      include: { category: true },
    })
    if (!expense) throw new NotFoundException('Gasto no encontrado')
    return expense
  }

  async create(dto: CreateExpenseDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)
    await this.assertCategoryAccess(db, tenantId, dto.companyId, dto.categoryId)
    return db.expense.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        categoryId: dto.categoryId ?? null,
        description: dto.description,
        amount: new Decimal(dto.amount),
        date: new Date(dto.date),
        receiptUrl: dto.receiptUrl ?? null,
        notes: dto.notes ?? null,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    })
  }

  async update(id: string, dto: UpdateExpenseDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const expense = await db.expense.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!expense) throw new NotFoundException('Gasto no encontrado')
    if (dto.categoryId !== undefined) await this.assertCategoryAccess(db, tenantId, user.companyId, dto.categoryId)

    const { amount, date, ...rest } = dto
    return db.expense.update({
      where: { id },
      data: {
        ...rest,
        ...(amount !== undefined ? { amount: new Decimal(amount) } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    })
  }

  async remove(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const expense = await db.expense.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!expense) throw new NotFoundException('Gasto no encontrado')
    await db.expense.delete({ where: { id } })
    return { ok: true }
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

export const CreateSalesGoalSchema = z.object({
  companyId: z.string().cuid(),
  groupId: z.string().cuid().optional().nullable(),
  name: z.string().min(1).max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  targetAmount: z.number().positive(),
  commissionBasis: z.enum(['SOLD', 'GOAL']).default('SOLD'),
  commissionPct: z.number().min(0).max(100).default(0),
  isActive: z.boolean().optional().default(true),
})

export const UpdateSalesGoalSchema = CreateSalesGoalSchema.partial().omit({ companyId: true })

export type CreateSalesGoalDto = z.infer<typeof CreateSalesGoalSchema>
export type UpdateSalesGoalDto = z.infer<typeof UpdateSalesGoalSchema>

@Injectable()
export class SalesGoalsService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  private assertAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  async findAll(companyId: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertAccess(user, companyId)
    const goals = await db.salesGoal.findMany({
      where: { tenantId, companyId },
      include: { group: { select: { id: true, name: true } } },
      orderBy: { startDate: 'desc' },
    })
    // For each goal, calculate actual sold amount in the date range
    const results = await Promise.all(goals.map(async (g) => {
      const soldAgg = await db.sale.aggregate({
        where: {
          tenantId,
          companyId,
          createdAt: { gte: g.startDate, lte: g.endDate },
          // Filter by group: if group has employees, filter sales by those employees
          ...(g.groupId ? {
            sellerEmployee: { groupId: g.groupId },
          } : {}),
        },
        _sum: { totalPagar: true },
      })
      const actualSold = Number(soldAgg._sum.totalPagar ?? 0)
      const target = Number(g.targetAmount)
      const progressPct = target > 0 ? Math.min(Math.round((actualSold / target) * 100), 100) : 0
      return {
        ...g,
        actualSold,
        progressPct,
        commissionBType: g.commissionBasis === 'SOLD'
          ? actualSold * Number(g.commissionPct) / 100
          : target * Number(g.commissionPct) / 100,
      }
    }))
    return results
  }

  async create(dto: CreateSalesGoalDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertAccess(user, dto.companyId)
    return db.salesGoal.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        groupId: dto.groupId ?? null,
        name: dto.name,
        startDate: dto.startDate,
        endDate: dto.endDate,
        targetAmount: new Decimal(dto.targetAmount),
        commissionBasis: dto.commissionBasis ?? 'SOLD',
        commissionPct: new Decimal(dto.commissionPct ?? 0),
        isActive: dto.isActive ?? true,
      },
      include: { group: { select: { id: true, name: true } } },
    })
  }

  async update(id: string, dto: UpdateSalesGoalDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const goal = await db.salesGoal.findFirst({ where: { id, tenantId } })
    if (!goal) throw new NotFoundException('Meta no encontrada')
    this.assertAccess(user, goal.companyId)
    return db.salesGoal.update({
      where: { id },
      data: {
        ...(dto.groupId !== undefined && { groupId: dto.groupId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate }),
        ...(dto.targetAmount !== undefined && { targetAmount: new Decimal(dto.targetAmount) }),
        ...(dto.commissionBasis !== undefined && { commissionBasis: dto.commissionBasis }),
        ...(dto.commissionPct !== undefined && { commissionPct: new Decimal(dto.commissionPct) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { group: { select: { id: true, name: true } } },
    })
  }

  async remove(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const goal = await db.salesGoal.findFirst({ where: { id, tenantId } })
    if (!goal) throw new NotFoundException('Meta no encontrada')
    this.assertAccess(user, goal.companyId)
    return db.salesGoal.delete({ where: { id } })
  }
}

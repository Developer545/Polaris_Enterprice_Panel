import { Injectable, NotFoundException } from '@nestjs/common'
import { ControlPlaneClient } from '../../../infrastructure/prisma/control-plane.client'
import { z } from 'zod'

export const CreatePlanSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  maxCompanies: z.number().int().min(1).default(1),
  maxBranches: z.number().int().min(1).default(1),
  maxUsers: z.number().int().min(1).default(5),
  features: z.record(z.boolean()).default({}),
  isActive: z.boolean().default(true),
})

export type CreatePlanDto = z.infer<typeof CreatePlanSchema>

@Injectable()
export class PlansService {
  constructor(private readonly cpClient: ControlPlaneClient) {}

  findAll() {
    return this.cpClient.plan.findMany({ orderBy: { price: 'asc' } })
  }

  async findOne(id: string) {
    const plan = await this.cpClient.plan.findUnique({ where: { id } })
    if (!plan) throw new NotFoundException('Plan no encontrado')
    return plan
  }

  create(dto: CreatePlanDto) {
    return this.cpClient.plan.create({ data: dto })
  }

  async update(id: string, dto: Partial<CreatePlanDto>) {
    await this.findOne(id)
    return this.cpClient.plan.update({ where: { id }, data: dto })
  }

  /** Seed default plans — called from seed script */
  async seedDefaults() {
    const defaults = [
      { name: 'Básico', price: 29.99, maxCompanies: 1, maxBranches: 1, maxUsers: 5, features: { dte: true } },
      { name: 'Pro', price: 59.99, maxCompanies: 3, maxBranches: 5, maxUsers: 15, features: { dte: true, reports: true } },
      { name: 'Enterprise', price: 99.99, maxCompanies: -1, maxBranches: -1, maxUsers: -1, features: { dte: true, reports: true, api: true } },
    ]
    for (const plan of defaults) {
      await this.cpClient.plan.upsert({
        where: { name: plan.name },
        update: plan,
        create: plan,
      })
    }
  }
}

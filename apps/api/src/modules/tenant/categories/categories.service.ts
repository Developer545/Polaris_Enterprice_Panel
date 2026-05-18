import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { z } from 'zod'

export const CreateCategorySchema = z.object({
  companyId: z.string().cuid(),
  name: z.string().min(2),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const UpdateCategorySchema = CreateCategorySchema.partial().omit({ companyId: true }).extend({
  isActive: z.boolean().optional(),
})

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>

@Injectable()
export class CategoriesService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  async findAll(companyId: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    return db.category.findMany({
      where: { tenantId, companyId, isActive: true },
      select: {
        id: true, name: true, description: true, color: true, isActive: true,
        _count: { select: { services: true } },
      },
      orderBy: { name: 'asc' },
    })
  }

  async create(dto: CreateCategoryDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const exists = await db.category.findFirst({
      where: { companyId: dto.companyId, name: dto.name },
    })
    if (exists) throw new ConflictException('Ya existe una categoría con ese nombre')
    return db.category.create({ data: { ...dto, tenantId } })
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const cat = await db.category.findFirst({ where: { id, tenantId } })
    if (!cat) throw new NotFoundException('Categoría no encontrada')
    return db.category.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const cat = await db.category.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { services: true } } },
    })
    if (!cat) throw new NotFoundException('Categoría no encontrada')
    if ((cat as any)._count.services > 0) {
      // Soft delete if has products
      await db.category.update({ where: { id }, data: { isActive: false } })
    } else {
      await db.category.delete({ where: { id } })
    }
    return { ok: true }
  }
}

import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
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

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  async findAll(companyId: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    return db.category.findMany({
      where: { tenantId, companyId, isActive: true },
      select: {
        id: true, name: true, description: true, color: true, isActive: true,
        _count: { select: { services: true } },
      },
      orderBy: { name: 'asc' },
    })
  }

  async create(dto: CreateCategoryDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)
    const exists = await db.category.findFirst({
      where: { tenantId, companyId: dto.companyId, name: dto.name },
    })
    if (exists) throw new ConflictException('Ya existe una categoría con ese nombre')
    return db.category.create({ data: { ...dto, tenantId } })
  }

  async update(id: string, dto: UpdateCategoryDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const cat = await db.category.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!cat) throw new NotFoundException('Categoría no encontrada')
    return db.category.update({ where: { id }, data: dto })
  }

  async remove(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const cat = await db.category.findFirst({
      where: { id, tenantId, companyId: user.companyId },
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

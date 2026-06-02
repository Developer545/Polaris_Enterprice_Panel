import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const CreateUnitSchema = z.object({
  companyId: z.string().min(1),
  name:      z.string().min(1).max(50),
  symbol:    z.string().max(10).optional().nullable(),
})

export const UpdateUnitSchema = CreateUnitSchema.partial().omit({ companyId: true })

export type CreateUnitDto = z.infer<typeof CreateUnitSchema>
export type UpdateUnitDto = z.infer<typeof UpdateUnitSchema>

@Injectable()
export class UnitsService {
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
    return db.unitOfMeasure.findMany({
      where:   { tenantId, companyId, isActive: true },
      select:  { id: true, name: true, symbol: true, isActive: true, createdAt: true,
                 _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async create(dto: CreateUnitDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertAccess(user, dto.companyId)
    const exists = await db.unitOfMeasure.findFirst({
      where: { tenantId, companyId: dto.companyId, name: dto.name },
    })
    if (exists) throw new ConflictException('Ya existe una unidad con ese nombre')
    return db.unitOfMeasure.create({ data: { ...dto, tenantId } })
  }

  async update(id: string, dto: UpdateUnitDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const unit = await db.unitOfMeasure.findFirst({
      where: { id, tenantId, companyId: user.companyId },
    })
    if (!unit) throw new NotFoundException('Unidad no encontrada')
    return db.unitOfMeasure.update({ where: { id }, data: dto })
  }

  async remove(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const unit = await db.unitOfMeasure.findFirst({
      where:   { id, tenantId, companyId: user.companyId },
      include: { _count: { select: { products: true } } },
    })
    if (!unit) throw new NotFoundException('Unidad no encontrada')
    if ((unit as any)._count.products > 0) {
      await db.unitOfMeasure.update({ where: { id }, data: { isActive: false } })
    } else {
      await db.unitOfMeasure.delete({ where: { id } })
    }
    return { ok: true }
  }
}

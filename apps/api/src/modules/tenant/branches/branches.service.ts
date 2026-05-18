import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { z } from 'zod'

export const CreateBranchSchema = z.object({
  companyId: z.string().cuid(),
  name: z.string().min(2),
  address: z.string().optional(),
  phone: z.string().optional(),
  codEstableMH: z.string().length(4, 'Código MH debe tener 4 caracteres').optional(),
  codPuntoVentaMH: z.string().length(4, 'Código punto venta debe tener 4 caracteres').optional(),
})

export const UpdateBranchSchema = CreateBranchSchema.partial().omit({ companyId: true }).extend({
  isActive: z.boolean().optional(),
})

export type CreateBranchDto = z.infer<typeof CreateBranchSchema>
export type UpdateBranchDto = z.infer<typeof UpdateBranchSchema>

@Injectable()
export class BranchesService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  async findAll(companyId?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    return db.branch.findMany({
      where: { tenantId, ...(companyId ? { companyId } : {}) },
      select: {
        id: true, name: true, address: true, phone: true,
        codEstableMH: true, codPuntoVentaMH: true, isActive: true, createdAt: true,
        company: { select: { id: true, name: true } },
        _count: { select: { users: true, cashRegisters: true } },
      },
      orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
    })
  }

  async findOne(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const branch = await db.branch.findFirst({
      where: { id, tenantId },
      include: {
        company: { select: { id: true, name: true } },
        users: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    })
    if (!branch) throw new NotFoundException('Sucursal no encontrada')
    return branch
  }

  async create(dto: CreateBranchDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    if (dto.codEstableMH) {
      const exists = await db.branch.findFirst({
        where: { companyId: dto.companyId, codEstableMH: dto.codEstableMH },
      })
      if (exists) throw new ConflictException('Código de establecimiento MH ya existe en esta empresa')
    }

    return db.branch.create({ data: { ...dto, tenantId } })
  }

  async update(id: string, dto: UpdateBranchDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const branch = await db.branch.findFirst({ where: { id, tenantId } })
    if (!branch) throw new NotFoundException('Sucursal no encontrada')
    return db.branch.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const branch = await db.branch.findFirst({ where: { id, tenantId } })
    if (!branch) throw new NotFoundException('Sucursal no encontrada')
    await db.branch.update({ where: { id }, data: { isActive: false } })
    return { ok: true }
  }
}

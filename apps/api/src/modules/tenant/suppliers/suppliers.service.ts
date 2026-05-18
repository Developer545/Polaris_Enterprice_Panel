import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { z } from 'zod'

export const CreateSupplierSchema = z.object({
  companyId: z.string().cuid(),
  name: z.string().min(2),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  nit: z.string().optional().nullable(),
  nrc: z.string().optional().nullable(),
  actividadEconomica: z.string().optional().nullable(),
  actividadEconomicaCodigo: z.string().optional().nullable(),
  paymentTermDays: z.number().int().nonnegative().default(30),
  notes: z.string().optional().nullable(),
})

export const UpdateSupplierSchema = CreateSupplierSchema.partial().omit({ companyId: true })

export type CreateSupplierDto = z.infer<typeof CreateSupplierSchema>
export type UpdateSupplierDto = z.infer<typeof UpdateSupplierSchema>

@Injectable()
export class SuppliersService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  async findAll(companyId: string, search?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    return db.supplier.findMany({
      where: {
        tenantId,
        companyId,
        isActive: true,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { contactName: { contains: search, mode: 'insensitive' } },
            { nit: { contains: search } },
            { nrc: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true, name: true, contactName: true, email: true, phone: true,
        nit: true, nrc: true, paymentTermDays: true, isActive: true, createdAt: true,
      },
      orderBy: { name: 'asc' },
      take: 100,
    })
  }

  async findOne(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const supplier = await db.supplier.findFirst({ where: { id, tenantId } })
    if (!supplier) throw new NotFoundException('Proveedor no encontrado')
    return supplier
  }

  async create(dto: CreateSupplierDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    if (dto.nit) {
      const exists = await db.supplier.findFirst({
        where: { companyId: dto.companyId, nit: dto.nit },
      })
      if (exists) throw new ConflictException('Ya existe un proveedor con ese NIT')
    }

    return db.supplier.create({ data: { ...dto, tenantId } })
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const supplier = await db.supplier.findFirst({ where: { id, tenantId } })
    if (!supplier) throw new NotFoundException('Proveedor no encontrado')
    return db.supplier.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const supplier = await db.supplier.findFirst({ where: { id, tenantId } })
    if (!supplier) throw new NotFoundException('Proveedor no encontrado')
    await db.supplier.update({ where: { id }, data: { isActive: false } })
    return { ok: true }
  }
}

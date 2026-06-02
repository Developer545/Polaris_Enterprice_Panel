import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const CreateSupplierSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(2),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  departamentoCod: z.string().optional().nullable(),
  municipioCod: z.string().optional().nullable(),
  distritoCod: z.string().optional().nullable(),
  nit: z.string().optional().nullable(),
  nrc: z.string().optional().nullable(),
  tipoDocumento: z.string().optional().nullable(),
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

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  async findAll(companyId: string, user: JwtAccessPayload, search?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
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

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const supplier = await db.supplier.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!supplier) throw new NotFoundException('Proveedor no encontrado')
    return supplier
  }

  async create(dto: CreateSupplierDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)

    if (dto.nit) {
      const exists = await db.supplier.findFirst({
        where: { tenantId, companyId: dto.companyId, nit: dto.nit },
      })
      if (exists) throw new ConflictException('Ya existe un proveedor con ese NIT')
    }

    return db.supplier.create({ data: { ...dto, tenantId } })
  }

  async update(id: string, dto: UpdateSupplierDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const supplier = await db.supplier.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!supplier) throw new NotFoundException('Proveedor no encontrado')
    return db.supplier.update({ where: { id }, data: dto })
  }

  async remove(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const supplier = await db.supplier.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      select: {
        id: true,
        _count: { select: { purchaseOrders: true } },
      },
    })
    if (!supplier) throw new NotFoundException('Proveedor no encontrado')

    const ordersCount = (supplier as any)._count.purchaseOrders as number

    if (ordersCount > 0) {
      // Proveedor con historial de compras: suspender (soft delete) — conserva integridad histórica
      await db.supplier.update({ where: { id }, data: { isActive: false } })
    } else {
      // Sin órdenes de compra: eliminar físicamente
      await db.supplier.delete({ where: { id } })
    }
    return { ok: true }
  }
}

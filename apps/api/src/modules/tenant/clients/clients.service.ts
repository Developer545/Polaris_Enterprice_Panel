import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { z } from 'zod'

export const CreateClientSchema = z.object({
  companyId: z.string().cuid(),
  name: z.string().min(2),
  comercialName: z.string().optional().nullable(),   // Nombre comercial (Jurídica)
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  departamentoCod: z.string().optional().nullable(), // Código CAT-012 Hacienda
  municipioCod: z.string().optional().nullable(),    // Código dentro del depto
  // DTE fields
  tipoDocumento: z.enum(['36', '13', '02', '03', '37']).optional().nullable(), // NIT, DUI, Pasaporte, CCR, NRC
  numDocumento: z.string().optional().nullable(),
  nrc: z.string().optional().nullable(),
  actividadEconomica: z.string().optional().nullable(),
  actividadEconomicaCodigo: z.string().optional().nullable(),
  esCreditoFiscal: z.boolean().default(false),
})

export const UpdateClientSchema = CreateClientSchema.partial().omit({ companyId: true })

export type CreateClientDto = z.infer<typeof CreateClientSchema>
export type UpdateClientDto = z.infer<typeof UpdateClientSchema>

@Injectable()
export class ClientsService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  async findAll(companyId: string, search?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    return db.client.findMany({
      where: {
        tenantId,
        companyId,
        isActive: true,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { numDocumento: { contains: search } },
            { nrc: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true, name: true, comercialName: true, email: true, phone: true,
        address: true, departamentoCod: true, municipioCod: true,
        tipoDocumento: true, numDocumento: true, nrc: true,
        actividadEconomica: true, actividadEconomicaCodigo: true,
        esCreditoFiscal: true, isActive: true, createdAt: true,
      },
      orderBy: { name: 'asc' },
      take: 100,
    })
  }

  async findOne(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const client = await db.client.findFirst({ where: { id, tenantId } })
    if (!client) throw new NotFoundException('Cliente no encontrado')
    return client
  }

  async create(dto: CreateClientDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    if (dto.numDocumento && dto.tipoDocumento) {
      const exists = await db.client.findFirst({
        where: { companyId: dto.companyId, numDocumento: dto.numDocumento, tipoDocumento: dto.tipoDocumento },
      })
      if (exists) throw new ConflictException('Ya existe un cliente con ese número de documento')
    }

    return db.client.create({ data: { ...dto, tenantId } })
  }

  async update(id: string, dto: UpdateClientDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const client = await db.client.findFirst({ where: { id, tenantId } })
    if (!client) throw new NotFoundException('Cliente no encontrado')
    return db.client.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const client = await db.client.findFirst({ where: { id, tenantId } })
    if (!client) throw new NotFoundException('Cliente no encontrado')
    await db.client.update({ where: { id }, data: { isActive: false } })
    return { ok: true }
  }

  // Returns the "consumidor final" generic client (auto-created)
  async getConsumidorFinal(companyId: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    let cf = await db.client.findFirst({
      where: { companyId, tenantId, numDocumento: '0000000000000' },
    })
    if (!cf) {
      cf = await db.client.create({
        data: {
          tenantId, companyId,
          name: 'Consumidor Final',
          tipoDocumento: '13',
          numDocumento: '0000000000000',
          esCreditoFiscal: false,
        },
      })
    }
    return cf
  }
}

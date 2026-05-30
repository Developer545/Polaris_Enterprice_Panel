import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { buildBranchWhere, resolveWriteBranchId } from '../../../common/branch-scope.util'
import { z } from 'zod'

export const CreateClientSchema = z.object({
  companyId: z.string().cuid(),
  branchId: z.string().optional().nullable(),
  name: z.string().min(2),
  comercialName: z.string().optional().nullable(),   // Nombre comercial (Jurídica)
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  departamentoCod: z.string().optional().nullable(), // Código CAT-012 Hacienda
  municipioCod: z.string().optional().nullable(),    // Código dentro del depto
  distritoCod: z.string().optional().nullable(),
  // DTE fields
  tipoDocumento: z.enum(['36', '13', '02', '03', '37']).optional().nullable(), // NIT, DUI, Pasaporte, CCR, NRC
  numDocumento: z.string().optional().nullable(),
  nrc: z.string().optional().nullable(),
  actividadEconomica: z.string().optional().nullable(),
  actividadEconomicaCodigo: z.string().optional().nullable(),
  esCreditoFiscal: z.boolean().default(false),
  esGranContribuyente: z.boolean().default(false),
  retieneIva1: z.boolean().default(false),
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

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  async findAll(companyId: string, user: JwtAccessPayload, search?: string, branchId?: string, page = 1, limit = 50) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    const where = {
      tenantId,
      companyId,
      isActive: true,
      ...buildBranchWhere(user, branchId),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { numDocumento: { contains: search } },
          { nrc: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    }
    const select = {
      id: true, branchId: true, name: true, comercialName: true, email: true, phone: true,
      address: true, departamentoCod: true, municipioCod: true, distritoCod: true,
      tipoDocumento: true, numDocumento: true, nrc: true,
      actividadEconomica: true, actividadEconomicaCodigo: true,
      esCreditoFiscal: true, esGranContribuyente: true, retieneIva1: true,
      isActive: true, createdAt: true,
    }
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      db.client.findMany({ where, select, orderBy: { name: 'asc' }, skip, take: limit }),
      db.client.count({ where }),
    ])
    return { data, total, page, limit }
  }

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const client = await db.client.findFirst({
      where: { id, tenantId, companyId: user.companyId, ...buildBranchWhere(user) },
    })
    if (!client) throw new NotFoundException('Cliente no encontrado')
    return client
  }

  async create(dto: CreateClientDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)

    if (dto.numDocumento && dto.tipoDocumento) {
      const exists = await db.client.findFirst({
        where: { tenantId, companyId: dto.companyId, numDocumento: dto.numDocumento, tipoDocumento: dto.tipoDocumento },
      })
      if (exists) throw new ConflictException('Ya existe un cliente con ese número de documento')
    }

    const branchId = resolveWriteBranchId(user, dto.branchId ?? undefined)
    return db.client.create({ data: { ...dto, branchId, tenantId } })
  }

  async update(id: string, dto: UpdateClientDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const client = await db.client.findFirst({
      where: { id, tenantId, companyId: user.companyId, ...buildBranchWhere(user) },
    })
    if (!client) throw new NotFoundException('Cliente no encontrado')
    return db.client.update({ where: { id }, data: dto })
  }

  async remove(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const client = await db.client.findFirst({
      where: { id, tenantId, companyId: user.companyId, ...buildBranchWhere(user) },
    })
    if (!client) throw new NotFoundException('Cliente no encontrado')
    await db.client.update({ where: { id }, data: { isActive: false } })
    return { ok: true }
  }

  // Returns the "consumidor final" generic client (auto-created)
  async getConsumidorFinal(companyId: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
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

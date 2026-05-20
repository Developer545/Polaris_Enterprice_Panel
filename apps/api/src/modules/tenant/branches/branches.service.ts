import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
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

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  async findAll(user: JwtAccessPayload, companyId?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    if (companyId) this.assertCompanyAccess(user, companyId)
    return db.branch.findMany({
      where: { tenantId, companyId: companyId ?? user.companyId },
      select: {
        id: true, name: true, address: true, phone: true,
        codEstableMH: true, codPuntoVentaMH: true, isActive: true, createdAt: true,
        company: { select: { id: true, name: true } },
        _count: { select: { users: true, cashRegisters: true } },
      },
      orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
    })
  }

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const branch = await db.branch.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      include: {
        company: { select: { id: true, name: true } },
        users: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    })
    if (!branch) throw new NotFoundException('Sucursal no encontrada')
    return branch
  }

  async create(dto: CreateBranchDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)

    if (dto.codEstableMH) {
      const exists = await db.branch.findFirst({
        where: { tenantId, companyId: dto.companyId, codEstableMH: dto.codEstableMH },
      })
      if (exists) throw new ConflictException('Código de establecimiento MH ya existe en esta empresa')
    }

    return db.branch.create({ data: { ...dto, tenantId } })
  }

  async update(id: string, dto: UpdateBranchDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const branch = await db.branch.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!branch) throw new NotFoundException('Sucursal no encontrada')

    const updated = await db.branch.update({ where: { id }, data: dto })

    // Keep DteNumberControl in sync when MH codes change.
    // If codEstableMH or codPuntoVentaMH changed, update all existing
    // DteNumberControl records for this branch so future numeroControl
    // strings are built with the correct codes.
    const codesChanged =
      (dto.codEstableMH   !== undefined && dto.codEstableMH   !== branch.codEstableMH) ||
      (dto.codPuntoVentaMH !== undefined && dto.codPuntoVentaMH !== branch.codPuntoVentaMH)

    if (codesChanged) {
      const syncData: Record<string, string> = {}
      if (dto.codEstableMH)    syncData.codEstable    = dto.codEstableMH
      if (dto.codPuntoVentaMH) syncData.codPuntoVenta = dto.codPuntoVentaMH

      await db.dteNumberControl.updateMany({
        where: { branchId: id, tenantId },
        data: syncData,
      })
    }

    return updated
  }

  async remove(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const branch = await db.branch.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!branch) throw new NotFoundException('Sucursal no encontrada')
    await db.branch.update({ where: { id }, data: { isActive: false } })
    return { ok: true }
  }
}

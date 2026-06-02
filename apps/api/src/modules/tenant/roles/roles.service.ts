import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

const VALID_PERMISSIONS = Object.values(PERMISSIONS)

export const CreateRoleSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  permissions: z.record(z.string(), z.boolean()),
})

export const UpdateRoleSchema = CreateRoleSchema.partial().omit({ companyId: true })

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>
export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>

@Injectable()
export class RolesService {
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
    return db.role.findMany({
      where: { tenantId, companyId },
      select: {
        id: true, name: true, description: true, permissions: true, isSystem: true, createdAt: true,
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const role = await db.role.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!role) throw new NotFoundException('Rol no encontrado')
    return role
  }

  async create(dto: CreateRoleDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)

    const exists = await db.role.findFirst({
      where: { tenantId, companyId: dto.companyId, name: dto.name },
    })
    if (exists) throw new ConflictException('Ya existe un rol con ese nombre')

    // Validate permissions keys
    const invalidKeys = Object.keys(dto.permissions).filter(k => !VALID_PERMISSIONS.includes(k as any))
    if (invalidKeys.length) throw new BadRequestException(`Permisos inválidos: ${invalidKeys.join(', ')}`)

    return db.role.create({ data: { ...dto, tenantId, permissions: dto.permissions } })
  }

  async update(id: string, dto: UpdateRoleDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const role = await db.role.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!role) throw new NotFoundException('Rol no encontrado')
    if (role.isSystem) throw new BadRequestException('Roles del sistema no se pueden modificar')

    if (dto.permissions) {
      const invalidKeys = Object.keys(dto.permissions).filter(k => !VALID_PERMISSIONS.includes(k as any))
      if (invalidKeys.length) throw new BadRequestException(`Permisos inválidos: ${invalidKeys.join(', ')}`)
    }

    return db.role.update({ where: { id }, data: dto as any })
  }

  async remove(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const role = await db.role.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      include: { _count: { select: { users: true } } },
    })
    if (!role) throw new NotFoundException('Rol no encontrado')
    if (role.isSystem) throw new BadRequestException('Roles del sistema no se pueden eliminar')
    if ((role as any)._count.users > 0) throw new BadRequestException('No se puede eliminar un rol asignado a usuarios')

    await db.role.delete({ where: { id } })
    return { ok: true }
  }

  // Seed default roles for a new company
  async seedDefaults(companyId: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const defaults = [
      {
        name: 'Administrador',
        description: 'Acceso total',
        isSystem: true,
        permissions: Object.fromEntries(VALID_PERMISSIONS.map(p => [p, true])),
      },
      {
        name: 'Cajero',
        description: 'Operaciones de caja y ventas',
        isSystem: true,
        permissions: {
          [PERMISSIONS.POS_CREATE]: true,
          [PERMISSIONS.POS_VIEW]: true,
          [PERMISSIONS.CLIENTS_VIEW]: true,
          [PERMISSIONS.CLIENTS_CREATE]: true,
          [PERMISSIONS.PRODUCTS_VIEW]: true,
          [PERMISSIONS.INVENTORY_VIEW]: true,
          [PERMISSIONS.ACCOUNTS_RECEIVABLE_VIEW]: true,
          [PERMISSIONS.ACCOUNTS_RECEIVABLE_CREATE]: true,
          [PERMISSIONS.CASH_REGISTER_OPEN]: true,
          [PERMISSIONS.CASH_REGISTER_CLOSE]: true,
        },
      },
      {
        name: 'Supervisor',
        description: 'Acceso a reportes y gestión de caja',
        isSystem: true,
        permissions: {
          [PERMISSIONS.POS_VIEW]: true,
          [PERMISSIONS.SALES_VIEW]: true,
          [PERMISSIONS.CLIENTS_VIEW]: true,
          [PERMISSIONS.PRODUCTS_VIEW]: true,
          [PERMISSIONS.INVENTORY_VIEW]: true,
          [PERMISSIONS.ACCOUNTS_RECEIVABLE_VIEW]: true,
          [PERMISSIONS.ACCOUNTS_RECEIVABLE_EDIT]: true,
          [PERMISSIONS.CASH_REGISTER_VIEW]: true,
          [PERMISSIONS.REPORTS_VIEW]: true,
        },
      },
    ]

    await db.role.createMany({
      data: defaults.map(r => ({ ...r, companyId, tenantId, permissions: r.permissions as any })),
      skipDuplicates: true,
    })
  }
}

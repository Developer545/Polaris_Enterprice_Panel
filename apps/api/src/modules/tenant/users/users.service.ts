import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { ControlPlaneClient } from '../../../infrastructure/prisma/control-plane.client'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().optional(),
  roleId: z.string().cuid(),
  companyId: z.string().cuid(),
  branchIds: z.array(z.string().cuid()).optional(),
})

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
})

export type CreateUserDto = z.infer<typeof CreateUserSchema>
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>

@Injectable()
export class UsersService {
  constructor(
    private readonly clientFactory: TenantClientFactory,
    private readonly cpClient: ControlPlaneClient,
  ) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  private async validateCompanyRelations(
    db: ReturnType<TenantClientFactory['getClient']>,
    tenantId: string,
    companyId: string,
    roleId?: string,
    branchIds?: string[],
  ) {
    if (roleId) {
      const role = await db.role.findFirst({ where: { id: roleId, tenantId, companyId }, select: { id: true } })
      if (!role) throw new BadRequestException('Rol no pertenece a esta empresa')
    }
    if (branchIds?.length) {
      const count = await db.branch.count({ where: { id: { in: branchIds }, tenantId, companyId } })
      if (count !== branchIds.length) throw new BadRequestException('Una o más sucursales no pertenecen a esta empresa')
    }
  }

  async findAll(companyId: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    return db.user.findMany({
      where: { tenantId, companyId },
      select: {
        id: true, name: true, email: true, phone: true, avatar: true,
        isActive: true, lastLoginAt: true, createdAt: true,
        role: { select: { id: true, name: true } },
        branches: { select: { branch: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const found = await db.user.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      include: {
        role: true,
        branches: { include: { branch: true } },
      },
    })
    if (!found) throw new NotFoundException('Usuario no encontrado')
    return found
  }

  async create(dto: CreateUserDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)
    await this.validateCompanyRelations(db, tenantId, dto.companyId, dto.roleId, dto.branchIds)

    // Verificar límite de usuarios según plan del tenant
    const tenantRecord = await this.cpClient.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: { select: { maxUsers: true } } },
    })
    const maxUsers = tenantRecord?.plan?.maxUsers ?? 5
    if (maxUsers > 0) {
      const currentUsers = await db.user.count({
        where: { tenantId, isActive: true },
      })
      if (currentUsers >= maxUsers) {
        throw new BadRequestException(
          `Tu plan permite máximo ${maxUsers} usuario(s). Actualiza tu plan para agregar más.`
        )
      }
    }

    const exists = await db.user.findFirst({
      where: { tenantId, email: dto.email, companyId: dto.companyId },
    })
    if (exists) throw new ConflictException('Email ya registrado en esta empresa')

    const password = await bcrypt.hash(dto.password, 12)
    const { branchIds, ...userData } = dto

    const createdUser = await db.user.create({
      data: { ...userData, password, tenantId },
    })

    if (branchIds?.length) {
      await db.userBranch.createMany({
        data: branchIds.map((branchId) => ({ userId: createdUser.id, branchId })),
        skipDuplicates: true,
      })
    }

    return { id: createdUser.id, name: createdUser.name, email: createdUser.email }
  }

  async update(id: string, dto: UpdateUserDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    await this.findOne(id, user) // throws if not found
    await this.validateCompanyRelations(db, tenantId, user.companyId, dto.roleId, dto.branchIds)

    const { branchIds, password, ...rest } = dto
    const data: Record<string, unknown> = { ...rest }
    if (password) data.password = await bcrypt.hash(password, 12)

    const updatedUser = await db.user.update({ where: { id }, data })

    if (branchIds !== undefined) {
      await db.userBranch.deleteMany({ where: { userId: id } })
      if (branchIds.length) {
        await db.userBranch.createMany({
          data: branchIds.map((branchId) => ({ userId: id, branchId })),
        })
      }
    }

    return { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email }
  }

  async remove(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    await this.findOne(id, user)
    const db = this.getDb()
    await db.user.update({ where: { id }, data: { isActive: false } })
    return { ok: true }
  }
}

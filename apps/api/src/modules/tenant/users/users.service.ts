import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
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
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  async findAll(companyId: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
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

  async findOne(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const user = await db.user.findFirst({
      where: { id, tenantId },
      include: {
        role: true,
        branches: { include: { branch: true } },
      },
    })
    if (!user) throw new NotFoundException('Usuario no encontrado')
    return user
  }

  async create(dto: CreateUserDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const exists = await db.user.findFirst({
      where: { email: dto.email, companyId: dto.companyId },
    })
    if (exists) throw new ConflictException('Email ya registrado en esta empresa')

    const password = await bcrypt.hash(dto.password, 12)
    const { branchIds, ...userData } = dto

    const user = await db.user.create({
      data: { ...userData, password, tenantId },
    })

    if (branchIds?.length) {
      await db.userBranch.createMany({
        data: branchIds.map((branchId) => ({ userId: user.id, branchId })),
        skipDuplicates: true,
      })
    }

    return { id: user.id, name: user.name, email: user.email }
  }

  async update(id: string, dto: UpdateUserDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    await this.findOne(id) // throws if not found

    const { branchIds, password, ...rest } = dto
    const data: Record<string, unknown> = { ...rest }
    if (password) data.password = await bcrypt.hash(password, 12)

    const user = await db.user.update({ where: { id }, data })

    if (branchIds !== undefined) {
      await db.userBranch.deleteMany({ where: { userId: id } })
      if (branchIds.length) {
        await db.userBranch.createMany({
          data: branchIds.map((branchId) => ({ userId: id, branchId })),
        })
      }
    }

    return { id: user.id, name: user.name, email: user.email }
  }

  async remove(id: string) {
    const { tenantId } = getCurrentTenant()
    await this.findOne(id)
    const db = this.getDb()
    await db.user.update({ where: { id }, data: { isActive: false } })
    return { ok: true }
  }
}

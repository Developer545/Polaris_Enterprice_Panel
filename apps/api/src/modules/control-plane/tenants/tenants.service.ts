import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { ControlPlaneClient } from '../../../infrastructure/prisma/control-plane.client'
import { EncryptionService } from '../../../infrastructure/crypto/encryption.service'
import { RedisService } from '../../../infrastructure/redis/redis.service'
import { z } from 'zod'

export const CreateTenantSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  planId: z.string().cuid(),
  dbStrategy: z.enum(['NEON_SHARED', 'NEON_DEDICATED', 'LOCAL_DEDICATED']),
  dbUrl: z.string().optional(),
})

export const UpdateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  planId: z.string().cuid().optional(),
  status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
  dbStrategy: z.enum(['NEON_SHARED', 'NEON_DEDICATED', 'LOCAL_DEDICATED']).optional(),
  dbUrl: z.string().optional(),
})

export type CreateTenantDto = z.infer<typeof CreateTenantSchema>
export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>

@Injectable()
export class TenantsService {
  constructor(
    private readonly cpClient: ControlPlaneClient,
    private readonly encryption: EncryptionService,
    private readonly redis: RedisService,
  ) {}

  async findAll() {
    return this.cpClient.tenant.findMany({
      include: { plan: { select: { name: true, price: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { id },
      include: { plan: true, companies: true },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    return tenant
  }

  async create(dto: CreateTenantDto) {
    const exists = await this.cpClient.tenant.findUnique({ where: { slug: dto.slug } })
    if (exists) throw new ConflictException(`Slug '${dto.slug}' ya existe`)

    const planExists = await this.cpClient.plan.findUnique({ where: { id: dto.planId } })
    if (!planExists) throw new BadRequestException('Plan no encontrado')

    if (dto.dbStrategy !== 'NEON_SHARED' && !dto.dbUrl) {
      throw new BadRequestException('dbUrl requerido para estrategia DEDICATED')
    }

    const encryptedDbUrl = dto.dbUrl ? this.encryption.encrypt(dto.dbUrl) : null

    return this.cpClient.tenant.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        planId: dto.planId,
        dbStrategy: dto.dbStrategy,
        dbUrl: encryptedDbUrl,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days trial
      },
    })
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id)

    const data: Record<string, unknown> = { ...dto }
    if (dto.dbUrl) data.dbUrl = this.encryption.encrypt(dto.dbUrl)
    else delete data.dbUrl

    // Invalidate Redis cache
    const tenant = await this.cpClient.tenant.findUnique({ where: { id }, select: { slug: true } })
    if (tenant) await this.redis.del(`tenant:${tenant.slug}`)

    return this.cpClient.tenant.update({ where: { id }, data })
  }

  async updateAppVersion(id: string, version: string) {
    return this.cpClient.tenant.update({
      where: { id },
      data: { appVersion: version, lastSeenAt: new Date() },
    })
  }

  async addCompany(tenantId: string, companyRef: string, name: string) {
    return this.cpClient.tenantCompany.create({
      data: { tenantId, companyRef, name },
    })
  }
}

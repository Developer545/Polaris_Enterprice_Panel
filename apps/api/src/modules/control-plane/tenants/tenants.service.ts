import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { ControlPlaneClient } from '../../../infrastructure/prisma/control-plane.client'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { EncryptionService } from '../../../infrastructure/crypto/encryption.service'
import { RedisService } from '../../../infrastructure/redis/redis.service'
import { getEnv } from '../../../config/env'
import { ALL_MODULE_IDS, BASE_MODULES, DTE_TYPE_VALUES, moduleMapFromIds } from '@pos-dte/shared-types'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'

export const CreateTenantSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  planId: z.string().min(1),
  dbStrategy: z.enum(['NEON_SHARED', 'NEON_DEDICATED', 'LOCAL_DEDICATED']),
  dbUrl: z.string().optional(),
})

export const UpdateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  planId: z.string().min(1).optional(),
  status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
  dbStrategy: z.enum(['NEON_SHARED', 'NEON_DEDICATED', 'LOCAL_DEDICATED']).optional(),
  dbUrl: z.string().optional(),
  dteMonthlyQuota: z.number().int().min(0).optional(),
})

export const UpdateModulesSchema = z.object({
  modules: z.record(z.boolean()),
})

export const UpdateDteTypesSchema = z.object({
  dteAllowedTypes: z.array(z.enum(DTE_TYPE_VALUES)),
})

export const ProvisionTenantSchema = z.object({
  companyName: z.string().min(2),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
})

export const CreateTenantUserSchema = z.object({
  name:      z.string().min(2),
  email:     z.string().email(),
  password:  z.string().min(6),
  companyId: z.string().min(1),
  roleId:    z.string().min(1),
  phone:     z.string().optional(),
})

export const CreateTenantRoleSchema = z.object({
  name:        z.string().min(2),
  companyId:   z.string().min(1),
  description: z.string().optional(),
  permissions: z.record(z.string(), z.boolean()).default({}),
})

export const UpdateTenantRoleSchema = z.object({
  name:        z.string().min(2).optional(),
  description: z.string().optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
})

export type CreateTenantDto = z.infer<typeof CreateTenantSchema>
export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>
export type UpdateModulesDto = z.infer<typeof UpdateModulesSchema>
export type UpdateDteTypesDto = z.infer<typeof UpdateDteTypesSchema>
export type ProvisionTenantDto = z.infer<typeof ProvisionTenantSchema>
export type CreateTenantUserDto = z.infer<typeof CreateTenantUserSchema>
export type CreateTenantRoleDto = z.infer<typeof CreateTenantRoleSchema>
export type UpdateTenantRoleDto = z.infer<typeof UpdateTenantRoleSchema>

// Default module configuration for new tenants
const DEFAULT_MODULES: Record<string, boolean> = moduleMapFromIds(BASE_MODULES)

@Injectable()
export class TenantsService {
  constructor(
    private readonly cpClient: ControlPlaneClient,
    private readonly clientFactory: TenantClientFactory,
    private readonly encryption: EncryptionService,
    private readonly redis: RedisService,
  ) {}

  private getTenantDb(tenant: { dbStrategy: string; dbUrl: string | null }) {
    if (tenant.dbStrategy === 'NEON_SHARED') {
      return this.clientFactory.getClient(getEnv().SHARED_TENANT_DATABASE_URL)
    }
    if (!tenant.dbUrl) throw new BadRequestException('URL de BD no configurada para este tenant')
    return this.clientFactory.getClient(this.encryption.decrypt(tenant.dbUrl))
  }

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
        trialEndsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        modules: DEFAULT_MODULES,
        dteAllowedTypes: ['01', '03'],
      },
    })
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id)

    const data: Record<string, unknown> = { ...dto }
    if (dto.dbUrl) data.dbUrl = this.encryption.encrypt(dto.dbUrl)
    else delete data.dbUrl

    const tenant = await this.cpClient.tenant.findUnique({ where: { id }, select: { slug: true } })
    if (tenant) await this.redis.del(`tenant:${tenant.slug}`)

    return this.cpClient.tenant.update({ where: { id }, data })
  }

  async updateModules(id: string, dto: UpdateModulesDto) {
    await this.findOne(id)
    const tenant = await this.cpClient.tenant.findUnique({ where: { id }, select: { slug: true } })
    if (tenant) await this.redis.del(`tenant:${tenant.slug}`)
    const modules = Object.fromEntries(
      ALL_MODULE_IDS.map((moduleId) => [
        moduleId,
        (BASE_MODULES as readonly string[]).includes(moduleId) || dto.modules[moduleId] === true,
      ]),
    )
    return this.cpClient.tenant.update({ where: { id }, data: { modules } })
  }

  async updateDteTypes(id: string, dto: UpdateDteTypesDto) {
    await this.findOne(id)
    const tenant = await this.cpClient.tenant.findUnique({ where: { id }, select: { slug: true } })
    if (tenant) await this.redis.del(`tenant:${tenant.slug}`)
    return this.cpClient.tenant.update({ where: { id }, data: { dteAllowedTypes: dto.dteAllowedTypes } })
  }

  // Create initial company + admin role + admin user + branch in tenant DB
  async provisionTenant(id: string, dto: ProvisionTenantDto) {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { id },
      select: { id: true, slug: true, dbStrategy: true, dbUrl: true, provisioned: true },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    if (tenant.provisioned) throw new ConflictException('Este tenant ya fue aprovisionado')

    const db = this.getTenantDb(tenant)

    // Create company
    const company = await db.company.create({
      data: { tenantId: id, name: dto.companyName },
    })

    // Create default admin role
    const adminRole = await db.role.create({
      data: {
        tenantId: id,
        companyId: company.id,
        name: 'Administrador',
        description: 'Rol de administrador con acceso completo',
        isSystem: true,
        permissions: { all: true },
      },
    })

    // Create branch
    const branch = await db.branch.create({
      data: { tenantId: id, companyId: company.id, name: 'Sucursal Principal' },
    })

    // Hash password and create admin user
    const hash = await bcrypt.hash(dto.adminPassword, 12)
    const user = await db.user.create({
      data: {
        tenantId: id,
        companyId: company.id,
        email: dto.adminEmail,
        password: hash,
        name: dto.adminName,
        roleId: adminRole.id,
      },
    })

    // Assign user to branch
    await db.userBranch.create({
      data: { userId: user.id, branchId: branch.id },
    })

    // Register company in control-plane
    await this.cpClient.tenantCompany.create({
      data: { tenantId: id, companyRef: company.id, name: dto.companyName },
    })

    // Mark tenant as provisioned
    await this.cpClient.tenant.update({ where: { id }, data: { provisioned: true } })

    return {
      ok: true,
      companyId: company.id,
      branchId: branch.id,
      userId: user.id,
      // No retornar password — el usuario debe usar "olvidé mi contraseña" para activar su cuenta
      credentials: {
        email: dto.adminEmail,
        slug: tenant.slug,
      },
    }
  }

  // Read tenant's branches from tenant DB (admin visibility)
  async getTenantBranches(id: string) {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { id },
      select: { dbStrategy: true, dbUrl: true },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    const db = this.getTenantDb(tenant)
    return db.branch.findMany({
      where: { tenantId: id },
      include: { company: { select: { name: true } } },
      orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
    })
  }

  // Read tenant's users from tenant DB (admin visibility)
  async getTenantUsers(id: string) {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { id },
      select: { dbStrategy: true, dbUrl: true },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    const db = this.getTenantDb(tenant)
    return db.user.findMany({
      where: { tenantId: id },
      select: {
        id: true, name: true, email: true, isActive: true,
        createdAt: true, lastLoginAt: true,
        company: { select: { name: true } },
        role: { select: { name: true } },
        branches: { include: { branch: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    })
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

  // ─── Tenant users management (admin panel) ───────────────────────────────────

  async createTenantUser(tenantId: string, dto: CreateTenantUserDto) {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { id: tenantId },
      select: { dbStrategy: true, dbUrl: true },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    const db = this.getTenantDb(tenant)

    const exists = await db.user.findFirst({
      where: { tenantId, email: dto.email, companyId: dto.companyId },
    })
    if (exists) throw new ConflictException('Ya existe un usuario con ese email en esta empresa')

    const password = await bcrypt.hash(dto.password, 12)

    const user = await db.user.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        email:     dto.email,
        password,
        name:      dto.name,
        phone:     dto.phone,
        roleId:    dto.roleId,
        isActive:  true,
      },
    })

    return { id: user.id, name: user.name, email: user.email, companyId: user.companyId, roleId: user.roleId }
  }

  // ─── Tenant roles management (admin panel) ───────────────────────────────────

  async getTenantRoles(tenantId: string) {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { id: tenantId },
      select: { dbStrategy: true, dbUrl: true },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    const db = this.getTenantDb(tenant)
    return db.role.findMany({
      where: { tenantId },
      select: {
        id: true, name: true, description: true, permissions: true,
        isSystem: true, createdAt: true,
        company: { select: { id: true, name: true } },
        _count: { select: { users: true } },
      },
      orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
    })
  }

  async createTenantRole(tenantId: string, dto: CreateTenantRoleDto) {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { id: tenantId },
      select: { dbStrategy: true, dbUrl: true },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    const db = this.getTenantDb(tenant)

    const exists = await db.role.findFirst({
      where: { tenantId, companyId: dto.companyId, name: dto.name },
    })
    if (exists) throw new ConflictException('Ya existe un rol con ese nombre en esta empresa')

    return db.role.create({
      data: {
        tenantId,
        companyId:   dto.companyId,
        name:        dto.name,
        description: dto.description,
        permissions: dto.permissions,
      },
    })
  }

  async updateTenantRole(tenantId: string, roleId: string, dto: UpdateTenantRoleDto) {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { id: tenantId },
      select: { dbStrategy: true, dbUrl: true },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    const db = this.getTenantDb(tenant)

    const role = await db.role.findFirst({ where: { id: roleId, tenantId } })
    if (!role) throw new NotFoundException('Rol no encontrado en este tenant')
    if (role.isSystem) throw new BadRequestException('Roles del sistema no se pueden modificar')

    return db.role.update({ where: { id: roleId }, data: dto as any })
  }

  async deleteTenantRole(tenantId: string, roleId: string) {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { id: tenantId },
      select: { dbStrategy: true, dbUrl: true },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    const db = this.getTenantDb(tenant)

    const role = await db.role.findFirst({
      where: { id: roleId, tenantId },
      include: { _count: { select: { users: true } } },
    })
    if (!role) throw new NotFoundException('Rol no encontrado en este tenant')
    if (role.isSystem) throw new BadRequestException('Roles del sistema no se pueden eliminar')
    if ((role as any)._count.users > 0) {
      throw new ConflictException('No se puede eliminar un rol que tiene usuarios asignados')
    }

    await db.role.delete({ where: { id: roleId } })
    return { ok: true }
  }

  // ─── Tenant companies list (for user-creation selector) ──────────────────────

  async getTenantCompanies(tenantId: string) {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { id: tenantId },
      select: { dbStrategy: true, dbUrl: true },
    })
    if (!tenant) throw new NotFoundException('Tenant no encontrado')
    const db = this.getTenantDb(tenant)
    return db.company.findMany({
      where: { tenantId },
      select: { id: true, name: true, comercialName: true },
      orderBy: { name: 'asc' },
    })
  }
}

import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common'
import { ControlPlaneClient } from '../../infrastructure/prisma/control-plane.client'
import { TenantClientFactory } from '../../infrastructure/prisma/tenant-client.factory'
import { getEnv } from '../../config/env'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'

export const LocalSetupSchema = z.object({
  licenseKey: z.string().nullable().optional(),
  companyName: z.string().min(2, 'Nombre de empresa requerido'),
  adminName: z.string().min(2, 'Nombre del administrador requerido'),
  adminEmail: z.string().email('Correo inválido'),
  adminPassword: z.string().min(8, 'Contraseña mínimo 8 caracteres'),
})

export type LocalSetupDto = z.infer<typeof LocalSetupSchema>

const LOCAL_TENANT_SLUG = 'local'

const DEFAULT_MODULES: Record<string, boolean> = {
  pos: true,
  dte: true,
  inventario: true,
  compras: true,
  gastos: true,
  reportes: true,
}

@Injectable()
export class LocalSetupService {
  constructor(
    private readonly cpClient: ControlPlaneClient,
    private readonly clientFactory: TenantClientFactory,
  ) {}

  async getStatus() {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { slug: LOCAL_TENANT_SLUG },
      select: { id: true, provisioned: true, name: true },
    })
    return {
      initialized: !!tenant?.provisioned,
      tenantName: tenant?.name ?? null,
    }
  }

  async init(dto: LocalSetupDto) {
    const existing = await this.cpClient.tenant.findUnique({
      where: { slug: LOCAL_TENANT_SLUG },
      select: { id: true, provisioned: true },
    })

    if (existing?.provisioned) {
      throw new ConflictException('Polaris Local ya fue inicializado')
    }

    const env = getEnv()
    const db = this.clientFactory.getClient(env.SHARED_TENANT_DATABASE_URL)

    // Reusar tenant existente sin provisionar, o crear uno nuevo
    let tenantId = existing?.id

    if (!tenantId) {
      // Crear plan local si no existe ninguno
      let plan = await this.cpClient.plan.findFirst()
      if (!plan) {
        plan = await this.cpClient.plan.create({
          data: { name: 'Polaris Local', price: 0 },
        })
      }

      const tenant = await this.cpClient.tenant.create({
        data: {
          slug: LOCAL_TENANT_SLUG,
          name: dto.companyName,
          email: dto.adminEmail,
          planId: plan.id,
          dbStrategy: 'NEON_SHARED',
          status: 'ACTIVE',
          modules: DEFAULT_MODULES,
          dteAllowedTypes: ['01', '03', '05', '06'],
        },
      })
      tenantId = tenant.id
    }

    try {
      // Crear empresa
      const company = await db.company.create({
        data: { tenantId, name: dto.companyName },
      })

      // Crear rol administrador
      const adminRole = await db.role.create({
        data: {
          tenantId,
          companyId: company.id,
          name: 'Administrador',
          description: 'Acceso completo al sistema',
          isSystem: true,
          permissions: { all: true },
        },
      })

      // Crear sucursal principal
      const branch = await db.branch.create({
        data: { tenantId, companyId: company.id, name: 'Sucursal Principal' },
      })

      // Crear usuario administrador
      const hash = await bcrypt.hash(dto.adminPassword, 12)
      const user = await db.user.create({
        data: {
          tenantId,
          companyId: company.id,
          email: dto.adminEmail,
          password: hash,
          name: dto.adminName,
          roleId: adminRole.id,
        },
      })

      // Asignar usuario a sucursal
      await db.userBranch.create({
        data: { userId: user.id, branchId: branch.id },
      })

      // Registrar empresa en control-plane
      await this.cpClient.tenantCompany.create({
        data: { tenantId, companyRef: company.id, name: dto.companyName },
      })

      // Marcar como aprovisionado
      await this.cpClient.tenant.update({
        where: { id: tenantId },
        data: { name: dto.companyName, provisioned: true },
      })

      return {
        ok: true,
        slug: LOCAL_TENANT_SLUG,
        companyId: company.id,
        branchId: branch.id,
        credentials: { email: dto.adminEmail, slug: LOCAL_TENANT_SLUG },
      }
    } catch (err: any) {
      // Limpiar tenant creado si el provisionamiento falla
      if (!existing) {
        await this.cpClient.tenant.delete({ where: { id: tenantId } }).catch(() => { /* ignore */ })
      }
      throw new InternalServerErrorException(err.message ?? 'Error al inicializar Polaris Local')
    }
  }
}

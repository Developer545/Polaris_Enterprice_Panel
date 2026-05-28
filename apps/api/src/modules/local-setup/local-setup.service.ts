import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { ControlPlaneClient } from '../../infrastructure/prisma/control-plane.client'
import { TenantClientFactory } from '../../infrastructure/prisma/tenant-client.factory'
import { getEnv } from '../../config/env'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'
import { BASE_MODULES, moduleMapFromIds } from '@pos-dte/shared-types'
import { execFile } from 'child_process'
import { createHash } from 'crypto'
import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import { promisify } from 'util'

export const LocalSetupSchema = z.object({
  licenseKey: z.string().nullable().optional(),
  companyName: z.string().min(2, 'Nombre de empresa requerido'),
  adminName: z.string().min(2, 'Nombre del administrador requerido'),
  adminEmail: z.string().email('Correo inválido'),
  adminPassword: z.string().min(8, 'Contraseña mínimo 8 caracteres'),
})

export type LocalSetupDto = z.infer<typeof LocalSetupSchema>

export const LocalResetAdminSchema = z.object({
  adminEmail: z.string().email('Correo inválido'),
  adminPassword: z.string().min(8, 'Contraseña mínimo 8 caracteres'),
  adminName: z.string().min(2, 'Nombre del administrador requerido').optional(),
})

export type LocalResetAdminDto = z.infer<typeof LocalResetAdminSchema>

export const LocalBackupSchema = z.object({
  reason:    z.string().max(240).optional(),
  commandId: z.string().optional(),
})

export type LocalBackupDto = z.infer<typeof LocalBackupSchema>

const LOCAL_TENANT_SLUG = 'local'

const DEFAULT_MODULES: Record<string, boolean> = moduleMapFromIds(BASE_MODULES)
const execFileAsync = promisify(execFile)

function safeTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function pgDump(databaseUrl: string, outputFile: string): Promise<void> {
  const url = new URL(databaseUrl)
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''))
  const username = decodeURIComponent(url.username)
  const password = decodeURIComponent(url.password)
  const pgDumpPath = process.env.PG_DUMP_PATH || 'pg_dump'

  await execFileAsync(pgDumpPath, [
    '--format=custom',
    '--no-owner',
    '--no-acl',
    '--host', url.hostname,
    '--port', url.port || '5432',
    '--username', username,
    '--file', outputFile,
    database,
  ], {
    env: { ...process.env, PGPASSWORD: password },
    windowsHide: true,
    timeout: 30 * 60 * 1000,
    maxBuffer: 1024 * 1024,
  })
}

@Injectable()
export class LocalSetupService {
  constructor(
    private readonly cpClient: ControlPlaneClient,
    private readonly clientFactory: TenantClientFactory,
  ) {}

  async resetAdmin(dto: LocalResetAdminDto) {
    const tenant = await this.cpClient.tenant.findUnique({
      where: { slug: LOCAL_TENANT_SLUG },
      select: { id: true, provisioned: true },
    })

    if (!tenant?.provisioned) {
      throw new NotFoundException('Polaris Local no ha sido inicializado')
    }

    const env = getEnv()
    const db = this.clientFactory.getClient(env.SHARED_TENANT_DATABASE_URL)

    // Buscar rol admin del sistema para ubicar al primer administrador
    const adminRole = await db.role.findFirst({
      where: { tenantId: tenant.id, isSystem: true },
      select: { id: true },
    })

    const user = await db.user.findFirst({
      where: {
        tenantId: tenant.id,
        ...(adminRole ? { roleId: adminRole.id } : {}),
      },
      select: { id: true },
    })

    if (!user) {
      throw new NotFoundException('Usuario administrador no encontrado en el sistema')
    }

    const hash = await bcrypt.hash(dto.adminPassword, 12)
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        email: dto.adminEmail,
        ...(dto.adminName ? { name: dto.adminName } : {}),
      },
    })

    return { ok: true }
  }

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

  async createBackup(dto: LocalBackupDto = {}) {
    const env = getEnv()
    const backupRoot = process.env.LOCAL_BACKUP_DIR ?? path.join(process.cwd(), 'backups')
    const stamp = safeTimestamp()
    const backupDir = path.join(backupRoot, `polaris-backup-${stamp}`)

    await fsp.mkdir(backupDir, { recursive: true })

    const controlFile = path.join(backupDir, 'control-plane.dump')
    const tenantFile = path.join(backupDir, 'tenant.dump')

    try {
      await pgDump(env.CONTROL_PLANE_DATABASE_URL, controlFile)
      await pgDump(env.SHARED_TENANT_DATABASE_URL, tenantFile)

      const manifest = {
        version: 1,
        createdAt: new Date().toISOString(),
        reason: dto.reason ?? null,
        commandId: dto.commandId ?? null,
        files: [
          {
            name: 'control-plane.dump',
            bytes: (await fsp.stat(controlFile)).size,
            sha256: await sha256File(controlFile),
          },
          {
            name: 'tenant.dump',
            bytes: (await fsp.stat(tenantFile)).size,
            sha256: await sha256File(tenantFile),
          },
        ],
      }

      await fsp.writeFile(
        path.join(backupDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf8',
      )

      return {
        ok: true,
        backupDir,
        manifest,
      }
    } catch (err: any) {
      throw new InternalServerErrorException(
        `No se pudo crear el backup local: ${err?.message ?? String(err)}`,
      )
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

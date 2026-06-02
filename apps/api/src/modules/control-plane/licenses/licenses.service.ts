import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common'
import { ControlPlaneClient } from '../../../infrastructure/prisma/control-plane.client'
import { getEnv } from '../../../config/env'
import { createHmac, createSign, randomBytes } from 'crypto'
import { z } from 'zod'
import type { Prisma } from '@pos-dte/db/control-plane'
import {
  ALL_MODULE_IDS,
  BASE_MODULES,
  normalizeModuleIds,
} from '@pos-dte/shared-types'

// ─── Base32 sin chars confusos (sin 0, 1, I, O) ──────────────────────────────
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateLicenseKey(): string {
  const bytes = randomBytes(10)
  let num = BigInt('0x' + bytes.toString('hex'))
  let raw = ''
  for (let i = 0; i < 16; i++) {
    raw = B32[Number(num & 31n)] + raw
    num >>= 5n
  }
  return raw.match(/.{4}/g)!.join('-')
}

function hashKey(rawKey: string): string {
  const secret = getEnv().LICENSE_HMAC_SECRET
  const normalized = rawKey.replace(/-/g, '').toUpperCase()
  return createHmac('sha256', secret).update(normalized).digest('hex')
}

function previewKey(rawKey: string): string {
  const parts = rawKey.split('-')
  return `${parts[0]}-****-****-${parts[3]}`
}

/**
 * Firma los permisos de módulos.
 * - ECDSA P-256 si LICENSE_EC_PRIVATE_KEY_B64 está configurado (producción)
 *   → la clave privada NUNCA sale del servidor; el cliente verifica con clave pública embebida
 * - HMAC-SHA256 fallback (desarrollo local sin key configurada)
 *
 * El payload incluye validatedAt para que firmas viejas no puedan reutilizarse
 * después de un reset de HWID o cambio de módulos.
 */
function signModulePermissions(
  modules: string[],
  hwid: string | null,
  validatedAt: string,
  plan: string,
  expiresAt: Date | null,
  licenseRevision: number,
): string {
  const env = getEnv()
  const payload = JSON.stringify({
    modules:   [...modules].sort(),
    hwid:      hwid ?? '',
    validatedAt,
    plan,
    expiresAt: expiresAt?.toISOString() ?? null,
    licenseRevision,
  })

  if (env.LICENSE_EC_PRIVATE_KEY_B64) {
    const pem  = Buffer.from(env.LICENSE_EC_PRIVATE_KEY_B64, 'base64').toString('utf8')
    const sign = createSign('SHA256')
    sign.update(payload)
    sign.end()
    return 'ec:' + sign.sign(pem, 'base64')
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('LICENSE_EC_PRIVATE_KEY_B64 is required in production')
  }

  // Fallback HMAC — solo en desarrollo (sin clave EC configurada)
  return 'hmac:' + createHmac('sha256', env.LICENSE_HMAC_SECRET).update(payload).digest('hex')
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CreateLicenseSchema = z.object({
  label:          z.string().min(1).max(120).optional(),
  plan:           z.string().default('LOCAL'),
  enabledModules: z.array(z.string()).default([...BASE_MODULES]),
  expiresAt:      z.string().datetime().optional().nullable(),
  notes:          z.string().max(500).optional().nullable(),
})

export const UpdateLicenseStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']),
})

export const UpdateLicenseModulesSchema = z.object({
  enabledModules: z.array(z.enum(ALL_MODULE_IDS)),
})

export const ValidateLicenseSchema = z.object({
  licenseKey: z.string().min(4),
  hwid:       z.string().min(8),   // machine ID hash del cliente
})

export const HeartbeatSchema = z.object({
  licenseKey: z.string().min(4),
  hwid:       z.string().min(8),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  stats:      z.record(z.string(), z.number().int().min(0)), // { "01": 5, "03": 2 }
})

const CommandResultSchema = z.object({
  id:     z.string().min(1),
  status: z.enum(['RUNNING', 'SUCCEEDED', 'FAILED']),
  result: z.record(z.unknown()).optional(),
  error:  z.string().max(1000).optional(),
})

export const SyncLicenseSchema = z.object({
  licenseKey:      z.string().min(4),
  hwid:            z.string().min(8),
  currentRevision: z.number().int().min(0).optional(),
  appVersion:      z.string().max(40).optional(),
  lastBackupAt:    z.string().datetime().optional().nullable(),
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  stats:           z.record(z.string(), z.number().int().min(0)).optional(),
  commandResults:  z.array(CommandResultSchema).max(10).optional(),
})

export const ResetHwidSchema = z.object({
  reason: z.string().min(3).optional(),
})

export const CreateBackupCommandSchema = z.object({
  reason: z.string().max(240).optional(),
})

export type CreateLicenseDto       = z.infer<typeof CreateLicenseSchema>
export type UpdateLicenseStatusDto = z.infer<typeof UpdateLicenseStatusSchema>
export type UpdateLicenseModulesDto = z.infer<typeof UpdateLicenseModulesSchema>
export type ValidateLicenseDto     = z.infer<typeof ValidateLicenseSchema>
export type HeartbeatDto           = z.infer<typeof HeartbeatSchema>
export type SyncLicenseDto         = z.infer<typeof SyncLicenseSchema>
export type ResetHwidDto           = z.infer<typeof ResetHwidSchema>
export type CreateBackupCommandDto = z.infer<typeof CreateBackupCommandSchema>

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class LicensesService {
  constructor(private readonly cp: ControlPlaneClient) {}

  private signedPermissionsResponse(
    license: {
      enabledModules: string[]
      hwid: string | null
      plan: string
      expiresAt: Date | null
      licenseRevision: number
    },
    validatedAt: string,
    modules = normalizeModuleIds(license.enabledModules),
  ) {
    const normalizedModules = normalizeModuleIds(modules)
    return {
      enabledModules: normalizedModules,
      signature: signModulePermissions(
        normalizedModules,
        license.hwid,
        validatedAt,
        license.plan,
        license.expiresAt,
        license.licenseRevision,
      ),
      validatedAt,
      expiresAt: license.expiresAt,
      plan: license.plan,
      licenseRevision: license.licenseRevision,
    }
  }

  findAll() {
    return this.cp.license.findMany({
      include: { tenant: { select: { id: true, slug: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const lic = await this.cp.license.findUnique({
      where: { id },
      include: {
        tenant:     { select: { id: true, slug: true, name: true } },
        dailyStats: { orderBy: { date: 'desc' }, take: 30 },
        commands:   { orderBy: { requestedAt: 'desc' }, take: 20 },
      },
    })
    if (!lic) throw new NotFoundException('Licencia no encontrada')
    return lic
  }

  /** Genera clave, guarda hash, retorna clave en texto plano UNA SOLA VEZ */
  async create(dto: CreateLicenseDto) {
    const rawKey    = generateLicenseKey()
    const keyHash   = hashKey(rawKey)
    const keyPreview = previewKey(rawKey)

    const existing = await this.cp.license.findUnique({ where: { keyHash } })
    if (existing) throw new ConflictException('Colisión de hash — intente de nuevo')

    const license = await this.cp.license.create({
      data: {
        keyHash,
        keyPreview,
        label:          dto.label ?? null,
        plan:           dto.plan,
        enabledModules: normalizeModuleIds(dto.enabledModules),
        expiresAt:      dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes:          dto.notes ?? null,
      },
    })

    // rawKey se retorna SOLO AQUI — nunca recuperable
    return { ...license, rawKey }
  }

  async updateStatus(id: string, dto: UpdateLicenseStatusDto) {
    await this.findOne(id)
    return this.cp.license.update({
      where: { id },
      data:  { status: dto.status, licenseRevision: { increment: 1 } },
    })
  }

  async updateModules(id: string, dto: UpdateLicenseModulesDto) {
    await this.findOne(id)
    return this.cp.license.update({
      where: { id },
      data:  {
        enabledModules: normalizeModuleIds(dto.enabledModules),
        licenseRevision: { increment: 1 },
      },
    })
  }

  /** Desvincula HWID — el cliente puede activar en una nueva máquina */
  async resetHwid(id: string) {
    await this.findOne(id)
    return this.cp.license.update({ where: { id }, data: { hwid: null } })
  }

  async requestBackupCommand(id: string, dto: CreateBackupCommandDto) {
    await this.findOne(id)
    return this.cp.licenseCommand.create({
      data: {
        licenseId: id,
        type:      'BACKUP_DATABASE',
        payload:   {
          reason: dto.reason ?? null,
          requestedBy: 'panel',
          requestedAt: new Date().toISOString(),
        },
      },
    })
  }

  async remove(id: string) {
    const license = await this.findOne(id)
    const archivedNote = `[${new Date().toISOString()}] Licencia archivada desde el panel.`
    return this.cp.license.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        licenseRevision: { increment: 1 },
        notes: [license.notes, archivedNote].filter(Boolean).join('\n'),
      },
    })
  }

  private async applyCommandResults(
    licenseId: string,
    results: SyncLicenseDto['commandResults'] = [],
  ) {
    const now = new Date()
    for (const item of results) {
      const baseData = {
        result: item.result ? (item.result as Prisma.InputJsonValue) : undefined,
        error:  item.error ?? null,
      }

      if (item.status === 'RUNNING') {
        await this.cp.licenseCommand.updateMany({
          where: { id: item.id, licenseId, status: { in: ['PENDING', 'RUNNING'] } },
          data:  {
            ...baseData,
            status:    'RUNNING',
            startedAt: now,
          },
        })
        continue
      }

      await this.cp.licenseCommand.updateMany({
        where: { id: item.id, licenseId, status: { in: ['PENDING', 'RUNNING'] } },
        data:  {
          ...baseData,
          status:      item.status,
          completedAt: now,
        },
      })
    }
  }

  private async claimPendingCommands(licenseId: string) {
    const now = new Date()
    const leaseExpiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const claimableWhere = {
      licenseId,
      OR: [
        {
          status: 'PENDING' as const,
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
        },
        {
          status: 'RUNNING' as const,
          leaseExpiresAt: { lt: now },
        },
      ],
    }

    const pending = await this.cp.licenseCommand.findMany({
      where: claimableWhere,
      orderBy: { requestedAt: 'asc' },
      take: 5,
    })

    const commands = []
    for (const command of pending) {
      const claimed = await this.cp.licenseCommand.updateMany({
        where: {
          id: command.id,
          ...claimableWhere,
        },
        data: {
          status: 'RUNNING',
          leasedAt: now,
          leaseExpiresAt,
          startedAt: command.startedAt ?? now,
          attempts: { increment: 1 },
        },
      })

      if (claimed.count === 0) continue
      commands.push({
        id: command.id,
        type: command.type,
        payload: command.payload,
        attempt: command.attempts + 1,
        requestedAt: command.requestedAt,
      })
    }

    return commands
  }

  // ── Endpoints públicos (llamados desde Electron) ────────────────────────────

  /** Activación + validación con HWID — llamado en primer uso y startup */
  async validate(dto: ValidateLicenseDto) {
    const keyHash = hashKey(dto.licenseKey)
    const license = await this.cp.license.findUnique({ where: { keyHash } })

    if (!license) return { valid: false, reason: 'not_found', message: 'Licencia no encontrada' }

    if (license.status === 'SUSPENDED') {
      const validatedAt = new Date().toISOString()
      return {
        valid: false,
        reason: 'suspended',
        action: 'BLOCK',
        message: 'Licencia suspendida',
        ...this.signedPermissionsResponse(license, validatedAt, BASE_MODULES),
      }
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      const expired = await this.cp.license.update({ where: { id: license.id }, data: { status: 'EXPIRED' } })
      const validatedAt = new Date().toISOString()
      return {
        valid: false,
        reason: 'expired',
        action: 'BLOCK',
        message: 'Licencia vencida',
        ...this.signedPermissionsResponse(expired, validatedAt, BASE_MODULES),
      }
    }
    if (license.status === 'EXPIRED') {
      const validatedAt = new Date().toISOString()
      return {
        valid: false,
        reason: 'expired',
        action: 'BLOCK',
        message: 'Licencia vencida',
        ...this.signedPermissionsResponse(license, validatedAt, BASE_MODULES),
      }
    }

    // HWID binding
    if (license.hwid && license.hwid !== dto.hwid) {
      return {
        valid:  false,
        reason: 'hwid_mismatch',
        message: 'Licencia vinculada a otra máquina. Contacte soporte para transferencia.',
      }
    }

    const now = new Date()
    const updated = await this.cp.license.update({
      where: { id: license.id },
      data: {
        status:      'ACTIVE',
        hwid:        dto.hwid,              // bind HWID en primera activación
        activatedAt: license.activatedAt ?? now,
        lastSeenAt:  now,
      },
    })

    // validatedAt generado en servidor — incluido en firma para prevenir replay attacks
    const validatedAt = now.toISOString()
    const permissions = this.signedPermissionsResponse(updated, validatedAt)

    return {
      valid:          true,
      ...permissions,   // cliente guarda esto para verificar permisos offline
    }
  }

  /** Heartbeat diario — contadores DTE + refresh de permisos */
  async heartbeat(dto: HeartbeatDto) {
    const keyHash = hashKey(dto.licenseKey)
    const license = await this.cp.license.findUnique({ where: { keyHash } })

    if (!license) return { valid: false, reason: 'not_found', message: 'Licencia no encontrada' }
    if (license.status === 'SUSPENDED') {
      const validatedAt = new Date().toISOString()
      return {
        valid: false,
        reason: 'suspended',
        action: 'BLOCK',
        ...this.signedPermissionsResponse(license, validatedAt, BASE_MODULES),
      }
    }
    if (license.expiresAt && license.expiresAt < new Date()) {
      const expired = await this.cp.license.update({ where: { id: license.id }, data: { status: 'EXPIRED' } })
      const validatedAt = new Date().toISOString()
      return {
        valid: false,
        reason: 'expired',
        action: 'BLOCK',
        ...this.signedPermissionsResponse(expired, validatedAt, BASE_MODULES),
      }
    }
    if (license.status === 'EXPIRED') {
      const validatedAt = new Date().toISOString()
      return {
        valid: false,
        reason: 'expired',
        action: 'BLOCK',
        ...this.signedPermissionsResponse(license, validatedAt, BASE_MODULES),
      }
    }

    // HWID check
    if (license.hwid && license.hwid !== dto.hwid) {
      return { valid: false, reason: 'HWID mismatch', action: 'BLOCK' }
    }

    // Grabar stats del día
    const date = new Date(dto.date)
    await this.cp.dteDailyLog.upsert({
      where: { licenseId_date: { licenseId: license.id, date } },
      create: { licenseId: license.id, date, stats: dto.stats },
      update: { stats: dto.stats },
    })

    // Actualizar lastSeenAt
    const now     = new Date()
    const updated = await this.cp.license.update({
      where: { id: license.id },
      data:  { lastSeenAt: now },
    })

    const validatedAt = now.toISOString()
    const permissions = this.signedPermissionsResponse(updated, validatedAt)

    return {
      valid: true,
      ...permissions,
    }
  }

  /**
   * Sincronizacion compacta para Electron Local.
   * Este endpoint reemplaza el patron validate + heartbeat cuando el cliente ya
   * esta activado: refresca permisos, registra lastSeenAt y puede recibir stats.
   */
  async sync(dto: SyncLicenseDto) {
    const keyHash = hashKey(dto.licenseKey)
    const license = await this.cp.license.findUnique({ where: { keyHash } })

    if (!license) return { valid: false, reason: 'not_found', message: 'Licencia no encontrada' }

    if (license.status === 'SUSPENDED') {
      const validatedAt = new Date().toISOString()
      return {
        valid: false,
        reason: 'suspended',
        action: 'BLOCK',
        ...this.signedPermissionsResponse(license, validatedAt, BASE_MODULES),
      }
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      const expired = await this.cp.license.update({
        where: { id: license.id },
        data:  { status: 'EXPIRED', licenseRevision: { increment: 1 } },
      })
      const validatedAt = new Date().toISOString()
      return {
        valid: false,
        reason: 'expired',
        action: 'BLOCK',
        ...this.signedPermissionsResponse(expired, validatedAt, BASE_MODULES),
      }
    }

    if (license.status === 'EXPIRED') {
      const validatedAt = new Date().toISOString()
      return {
        valid: false,
        reason: 'expired',
        action: 'BLOCK',
        ...this.signedPermissionsResponse(license, validatedAt, BASE_MODULES),
      }
    }

    if (license.hwid && license.hwid !== dto.hwid) {
      return { valid: false, reason: 'hwid_mismatch', action: 'BLOCK' }
    }

    await this.applyCommandResults(license.id, dto.commandResults)

    if (dto.date && dto.stats) {
      const date = new Date(dto.date)
      await this.cp.dteDailyLog.upsert({
        where: { licenseId_date: { licenseId: license.id, date } },
        create: { licenseId: license.id, date, stats: dto.stats },
        update: { stats: dto.stats },
      })
    }

    const now = new Date()
    const updated = await this.cp.license.update({
      where: { id: license.id },
      data: {
        status:      'ACTIVE',
        hwid:        dto.hwid,
        activatedAt: license.activatedAt ?? now,
        lastSeenAt:  now,
      },
    })

    const validatedAt = now.toISOString()
    return {
      valid: true,
      nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      commands: await this.claimPendingCommands(updated.id),
      ...this.signedPermissionsResponse(updated, validatedAt),
    }
  }
}

import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common'
import { ControlPlaneClient } from '../../../infrastructure/prisma/control-plane.client'
import { getEnv } from '../../../config/env'
import { createHmac, randomBytes } from 'crypto'
import { z } from 'zod'

// ─── Base32 sin chars confusos (sin 0, 1, I, O) ──────────────────────────────
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const ALL_MODULES = [
  'pos', 'ventas', 'clientes', 'inventario', 'servicios',  // base — siempre incluidos
  'compras', 'proveedores', 'cxp',                          // compras
  'gastos',                                                  // gastos
  'empleados', 'planilla',                                   // RRHH
  'cxc',                                                     // cuentas por cobrar
  'sucursales',                                              // sucursales adicionales
  'reportes_avanzados',                                      // reportes premium
] as const

const BASE_MODULES: string[] = ['pos', 'ventas', 'clientes', 'inventario', 'servicios']

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

/** Firma HMAC de los módulos + hwid — el cliente no puede falsificarlos */
function signModulePermissions(modules: string[], hwid: string | null): string {
  const secret = getEnv().LICENSE_HMAC_SECRET
  const payload = JSON.stringify({ modules: modules.sort(), hwid: hwid ?? '' })
  return createHmac('sha256', secret).update(payload).digest('hex')
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CreateLicenseSchema = z.object({
  label:          z.string().min(1).max(120).optional(),
  plan:           z.string().default('LOCAL'),
  enabledModules: z.array(z.string()).default(BASE_MODULES),
  expiresAt:      z.string().datetime().optional().nullable(),
  notes:          z.string().max(500).optional().nullable(),
})

export const UpdateLicenseStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']),
})

export const UpdateLicenseModulesSchema = z.object({
  enabledModules: z.array(z.enum(ALL_MODULES)),
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

export const ResetHwidSchema = z.object({
  reason: z.string().min(3).optional(),
})

export type CreateLicenseDto       = z.infer<typeof CreateLicenseSchema>
export type UpdateLicenseStatusDto = z.infer<typeof UpdateLicenseStatusSchema>
export type UpdateLicenseModulesDto = z.infer<typeof UpdateLicenseModulesSchema>
export type ValidateLicenseDto     = z.infer<typeof ValidateLicenseSchema>
export type HeartbeatDto           = z.infer<typeof HeartbeatSchema>
export type ResetHwidDto           = z.infer<typeof ResetHwidSchema>

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class LicensesService {
  constructor(private readonly cp: ControlPlaneClient) {}

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
        enabledModules: dto.enabledModules,
        expiresAt:      dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes:          dto.notes ?? null,
      },
    })

    // rawKey se retorna SOLO AQUI — nunca recuperable
    return { ...license, rawKey }
  }

  async updateStatus(id: string, dto: UpdateLicenseStatusDto) {
    await this.findOne(id)
    return this.cp.license.update({ where: { id }, data: { status: dto.status } })
  }

  async updateModules(id: string, dto: UpdateLicenseModulesDto) {
    await this.findOne(id)
    return this.cp.license.update({
      where: { id },
      data:  { enabledModules: dto.enabledModules },
    })
  }

  /** Desvincula HWID — el cliente puede activar en una nueva máquina */
  async resetHwid(id: string) {
    await this.findOne(id)
    return this.cp.license.update({ where: { id }, data: { hwid: null } })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.cp.license.delete({ where: { id } })
  }

  // ── Endpoints públicos (llamados desde Electron) ────────────────────────────

  /** Activación + validación con HWID — llamado en primer uso y startup */
  async validate(dto: ValidateLicenseDto) {
    const keyHash = hashKey(dto.licenseKey)
    const license = await this.cp.license.findUnique({ where: { keyHash } })

    if (!license) return { valid: false, reason: 'Licencia no encontrada' }

    if (license.status === 'SUSPENDED') return { valid: false, reason: 'Licencia suspendida' }

    if (license.expiresAt && license.expiresAt < new Date()) {
      await this.cp.license.update({ where: { id: license.id }, data: { status: 'EXPIRED' } })
      return { valid: false, reason: 'Licencia vencida' }
    }
    if (license.status === 'EXPIRED') return { valid: false, reason: 'Licencia vencida' }

    // HWID binding
    if (license.hwid && license.hwid !== dto.hwid) {
      return {
        valid:  false,
        reason: 'Licencia vinculada a otra máquina. Contacte soporte para transferencia.',
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

    const signature = signModulePermissions(updated.enabledModules, updated.hwid)

    return {
      valid:          true,
      plan:           updated.plan,
      enabledModules: updated.enabledModules,
      signature,                             // cliente guarda esto para verificar permisos offline
      expiresAt:      updated.expiresAt,
    }
  }

  /** Heartbeat diario — contadores DTE + refresh de permisos */
  async heartbeat(dto: HeartbeatDto) {
    const keyHash = hashKey(dto.licenseKey)
    const license = await this.cp.license.findUnique({ where: { keyHash } })

    if (!license) return { valid: false, reason: 'Licencia no encontrada' }
    if (license.status === 'SUSPENDED') return { valid: false, action: 'BLOCK' }
    if (license.status === 'EXPIRED') return { valid: false, action: 'BLOCK' }

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
    const updated = await this.cp.license.update({
      where: { id: license.id },
      data:  { lastSeenAt: new Date() },
    })

    const signature = signModulePermissions(updated.enabledModules, updated.hwid)

    return {
      valid:          true,
      enabledModules: updated.enabledModules,
      signature,
    }
  }
}

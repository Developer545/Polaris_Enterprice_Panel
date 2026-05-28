/**
 * local-module.guard.ts
 * ──────────────────────
 * Guard para la versión desktop (IS_LOCAL_BUNDLE=1).
 *
 * Lee el archivo de permisos JSON escrito por el proceso Electron principal
 * (ruta en env var LOCAL_PERMISSIONS_FILE) y:
 *   1. Verifica la firma ECDSA P-256 del panel (clave pública embebida)
 *   2. Bloquea endpoints de módulos premium no habilitados en la licencia
 *
 * Si no es modo local, el guard deja pasar todo (los tenants cloud usan
 * TenantModuleGuard en su lugar).
 *
 * El archivo se cachea en memoria por CACHE_TTL_MS para no golpear disco
 * en cada request.
 */

import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { LOCAL_MODULE_KEY } from '../decorators/local-module.decorator'
import { createHash, createVerify } from 'crypto'
import { execSync } from 'child_process'
import { cpus, hostname, networkInterfaces } from 'os'
import fs from 'fs'

// ─── Clave pública ECDSA P-256 embebida ───────────────────────────────────────
// La clave privada NUNCA sale del servidor.
// Si rotan la clave, actualizar aquí y re-deploy.
const EC_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEdIzu+EYClQdXelkcJgF5WoKi7zIU
VgE6gat9OBNeTQMwY/LcqdyTStbugerBGnFCCOBY4N27YxPtb4H/r2np6A==
-----END PUBLIC KEY-----`

type PermissionsFile = {
  enabledModules: string[]
  signature:      string
  validatedAt:    string
  expiresAt:      string | null
  plan:           string
  hwid:           string
  licenseRevision: number
}

const GRACE_DAYS   = 30
const CACHE_TTL_MS = 30_000 // re-lee disco máximo cada 30 s
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

// Módulos base disponibles sin licencia válida
const BASE_MODULES = [
  'dashboard',
  'pos',
  'ventas',
  'dte',
  'turnos_caja',
  'clientes',
  'proveedores',
  'inventario',
  'productos',
  'servicios',
]

// ─── Cache en memoria ─────────────────────────────────────────────────────────
let _cachedModules:  string[] | null = null
let _cacheExpiresAt: number          = 0
let _hwidCache: string | null = null

const GENERIC_SERIALS = new Set([
  'to be filled by o.e.m.',
  'default string',
  'not specified',
  'base board serial number',
  'chassis serial number',
  'system serial number',
  'none', 'n/a', 'unknown',
  '0000000000000000',
  '00000000-0000-0000-0000-000000000000',
])

function generateLocalHwid(): string {
  if (_hwidCache) return _hwidCache

  const parts: string[] = []

  if (process.platform === 'win32') {
    try {
      const out = execSync('wmic baseboard get serialnumber /value', {
        encoding: 'utf8', timeout: 5000, windowsHide: true,
      })
      const val = out.match(/SerialNumber=([^\r\n]+)/i)?.[1]?.trim() ?? ''
      if (val && val.length > 3 && !GENERIC_SERIALS.has(val.toLowerCase())) {
        parts.push('mb:' + val)
      }
    } catch { /* ignore */ }

    try {
      const out = execSync('wmic cpu get processorid /value', {
        encoding: 'utf8', timeout: 5000, windowsHide: true,
      })
      const val = out.match(/ProcessorId=([^\r\n]+)/i)?.[1]?.trim() ?? ''
      if (val && val.length > 3 && !GENERIC_SERIALS.has(val.toLowerCase())) {
        parts.push('cpu:' + val)
      }
    } catch { /* ignore */ }
  }

  parts.push('host:' + hostname())
  for (const ifaceList of Object.values(networkInterfaces())) {
    for (const iface of ifaceList ?? []) {
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        parts.push('mac:' + iface.mac)
        break
      }
    }
    if (parts.some((p) => p.startsWith('mac:'))) break
  }
  parts.push('cpumodel:' + (cpus()[0]?.model ?? ''))

  _hwidCache = createHash('sha256').update(parts.join('||')).digest('hex')
  return _hwidCache
}

function ageInDays(isoDate: string): number | null {
  const ts = Date.parse(isoDate)
  if (!Number.isFinite(ts)) return null
  if (ts - Date.now() > MAX_CLOCK_SKEW_MS) return null
  return (Date.now() - ts) / 86_400_000
}

function isLicenseExpired(perms: PermissionsFile): boolean {
  if (!perms.expiresAt) return false
  const ts = Date.parse(perms.expiresAt)
  return !Number.isFinite(ts) || ts <= Date.now()
}

// ─── ECDSA signature verification ────────────────────────────────────────────
function verifyPermissionsSignature(perms: PermissionsFile): boolean {
  try {
    if (perms.hwid !== generateLocalHwid()) return false

    const payload = JSON.stringify({
      modules:     [...perms.enabledModules].sort(),
      hwid:        perms.hwid ?? '',
      validatedAt: perms.validatedAt,
      plan:        perms.plan,
      expiresAt:   perms.expiresAt ?? null,
      licenseRevision: perms.licenseRevision,
    })

    if (perms.signature.startsWith('ec:')) {
      const verify = createVerify('SHA256')
      verify.update(payload)
      verify.end()
      return verify.verify(EC_PUBLIC_KEY, perms.signature.slice(3), 'base64')
    }

    console.warn('[local-module] Legacy/unknown signature rejected — online revalidation required')

    return false
  } catch {
    return false
  }
}

function readLocalPermissions(): PermissionsFile | null {
  const filePath = process.env.LOCAL_PERMISSIONS_FILE
  if (!filePath) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as PermissionsFile
  } catch {
    return null
  }
}

function getActiveModules(): string[] {
  // Retornar cache si aún vigente
  if (_cachedModules && Date.now() < _cacheExpiresAt) {
    return _cachedModules
  }

  const perms = readLocalPermissions()

  let modules: string[]

  if (!perms) {
    modules = BASE_MODULES
  } else if (!verifyPermissionsSignature(perms)) {
    // Firma inválida → archivo manipulado → degradar a módulos base
    console.warn('[local-module] ⚠️  Permissions signature INVALID — reverting to base modules. Possible tampering detected.')
    modules = BASE_MODULES
  } else if (isLicenseExpired(perms)) {
    console.warn('[local-module] License expired — base modules only')
    modules = BASE_MODULES
  } else {
    const age = ageInDays(perms.validatedAt)
    if (age === null || age >= GRACE_DAYS) {
    // Cache expirado — modo degradado
      console.warn('[local-module] Permissions cache expired/invalid — base modules only')
      modules = BASE_MODULES
    } else {
      modules = perms.enabledModules
    }
  }

  _cachedModules  = modules
  _cacheExpiresAt = Date.now() + CACHE_TTL_MS
  return modules
}

@Injectable()
export class LocalModuleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    // Solo activo en modo bundle local
    if (process.env.IS_LOCAL_BUNDLE !== '1') return true

    const requiredModule = this.reflector.getAllAndOverride<string>(LOCAL_MODULE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])

    // Sin @RequireLocalModule → permitir
    if (!requiredModule) return true

    const enabled = getActiveModules()
    if (!enabled.includes(requiredModule)) {
      throw new ForbiddenException(
        `El módulo "${requiredModule}" no está habilitado en su licencia. ` +
        `Contacte a soporte para activar este módulo.`,
      )
    }

    return true
  }
}

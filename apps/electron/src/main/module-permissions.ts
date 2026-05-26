/**
 * module-permissions.ts
 * ─────────────────────
 * Gestiona los permisos de módulos firmados por el panel central.
 *
 * Flujo:
 *   1. Startup → intenta refresh si cache > 7 días
 *   2. Si panel no responde → usa cache (válido hasta 30 días)
 *   3. Si cache > 30 días sin internet → modo degradado (solo módulos base)
 *   4. Cada noche → heartbeat con contadores DTE del día
 */

import { createHash } from 'crypto'
import { networkInterfaces, cpus, hostname } from 'os'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import Store from 'electron-store'

// ─── Constantes ───────────────────────────────────────────────────────────────

const BASE_MODULES = ['pos', 'ventas', 'clientes', 'inventario', 'servicios']

const CACHE_VALID_DAYS  = 7   // refresh obligatorio después de 7 días
const CACHE_GRACE_DAYS  = 30  // modo offline hasta 30 días
const HEARTBEAT_HOUR    = 23  // hora del heartbeat nocturno (23:00)

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ModulePermissions = {
  enabledModules: string[]
  signature:      string         // HMAC-SHA256 firmado por el panel
  validatedAt:    string         // ISO timestamp
  expiresAt:      string | null
  plan:           string
  hwid:           string
}

type StoreSchema = {
  modulePermissions?: ModulePermissions
  licenseKey?:        string
  panelUrl?:          string
}

// ─── Store ────────────────────────────────────────────────────────────────────

const store = new Store<StoreSchema>({ name: 'polaris-local' })

// ─── HWID ─────────────────────────────────────────────────────────────────────

/**
 * Genera un HWID estable a partir de información de hardware.
 * Usa hostname + primer MAC + modelo de CPU — sin deps externos.
 */
export function generateHwid(): string {
  const host = hostname()

  const ifaces  = networkInterfaces()
  let mac = ''
  outer:
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        mac = iface.mac
        break outer
      }
    }
  }

  const cpu = cpus()[0]?.model ?? ''

  const raw = `${host}::${mac}::${cpu}`
  return createHash('sha256').update(raw).digest('hex')
}

// ─── Permisos ─────────────────────────────────────────────────────────────────

export function savePermissions(perms: ModulePermissions): void {
  store.set('modulePermissions', perms)
  // También escribe JSON en disco para que el NestJS local pueda leerlo
  writePermissionsFile(perms)
}

export function loadPermissions(): ModulePermissions | null {
  return store.get('modulePermissions') ?? null
}

export function saveLicenseInfo(licenseKey: string, panelUrl: string): void {
  store.set('licenseKey', licenseKey)
  store.set('panelUrl', panelUrl)
}

export function loadLicenseInfo(): { licenseKey: string; panelUrl: string } | null {
  const licenseKey = store.get('licenseKey')
  const panelUrl   = store.get('panelUrl')
  if (!licenseKey || !panelUrl) return null
  return { licenseKey, panelUrl }
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function ageInDays(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / 86_400_000
}

export function isCacheStale(perms: ModulePermissions): boolean {
  return ageInDays(perms.validatedAt) >= CACHE_VALID_DAYS
}

export function isCacheExpired(perms: ModulePermissions): boolean {
  return ageInDays(perms.validatedAt) >= CACHE_GRACE_DAYS
}

/**
 * Devuelve módulos activos según el estado del cache.
 * Si cache expirado: solo módulos base (modo degradado).
 */
export function getEnabledModules(): string[] {
  const perms = loadPermissions()
  if (!perms) return BASE_MODULES
  if (isCacheExpired(perms)) {
    console.warn('[permissions] Cache expirado — modo degradado, solo módulos base')
    return BASE_MODULES
  }
  return perms.enabledModules
}

// ─── Refresh desde panel ──────────────────────────────────────────────────────

/**
 * Llama a POST {panelUrl}/licenses/validate para obtener permisos frescos.
 * Retorna true si se actualizó el cache.
 */
export async function refreshPermissionsFromPanel(
  licenseKey: string,
  hwid:       string,
  panelUrl:   string,
): Promise<boolean> {
  try {
    const res = await fetch(`${panelUrl}/licenses/validate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ licenseKey, hwid }),
      signal:  AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.warn(`[permissions] Panel respondió ${res.status} — usando cache local`)
      return false
    }

    const body = await res.json() as {
      valid:          boolean
      reason?:        string
      plan?:          string
      enabledModules?: string[]
      signature?:     string
      expiresAt?:     string | null
    }

    if (!body.valid) {
      console.warn(`[permissions] Licencia inválida: ${body.reason}`)
      return false
    }

    savePermissions({
      enabledModules: body.enabledModules ?? BASE_MODULES,
      signature:      body.signature ?? '',
      validatedAt:    new Date().toISOString(),
      expiresAt:      body.expiresAt ?? null,
      plan:           body.plan ?? 'LOCAL',
      hwid,
    })
    console.log(`[permissions] Permisos actualizados — módulos: ${(body.enabledModules ?? BASE_MODULES).join(', ')}`)
    return true
  } catch (err: any) {
    console.warn(`[permissions] No se pudo contactar el panel: ${err.message}`)
    return false
  }
}

/**
 * Ejecuta refresh solo si el cache está desactualizado (> 7 días).
 * Silencioso si el panel no responde (usa cache).
 */
export async function refreshIfStale(): Promise<void> {
  const info  = loadLicenseInfo()
  const perms = loadPermissions()

  if (!info) return  // nunca activado

  if (perms && !isCacheStale(perms)) {
    console.log(`[permissions] Cache vigente — módulos: ${perms.enabledModules.join(', ')}`)
    return
  }

  const hwid = perms?.hwid ?? generateHwid()
  await refreshPermissionsFromPanel(info.licenseKey, hwid, info.panelUrl)
}

// ─── Archivo de permisos para NestJS local ────────────────────────────────────

function getPermissionsFilePath(): string {
  return path.join(app.getPath('userData'), 'local-permissions.json')
}

function writePermissionsFile(perms: ModulePermissions): void {
  try {
    fs.writeFileSync(getPermissionsFilePath(), JSON.stringify(perms, null, 2), 'utf8')
  } catch (err: any) {
    console.error('[permissions] Error escribiendo archivo de permisos:', err.message)
  }
}

/** Retorna la ruta del archivo — se pasa al proceso NestJS como env var */
export function getPermissionsFilePath_Public(): string {
  return getPermissionsFilePath()
}

// ─── Heartbeat nocturno ───────────────────────────────────────────────────────

let heartbeatTimer: NodeJS.Timeout | null = null

/**
 * Programa el heartbeat diario a las 23:00 (o en 60s en dev).
 */
export function scheduleHeartbeat(localApiUrl: string): void {
  if (heartbeatTimer) clearTimeout(heartbeatTimer)

  const delay = msUntilHour(HEARTBEAT_HOUR)
  console.log(`[heartbeat] Programado en ${Math.round(delay / 60_000)} minutos`)

  heartbeatTimer = setTimeout(async () => {
    await sendHeartbeat(localApiUrl)
    scheduleHeartbeat(localApiUrl)  // reprogramar para el día siguiente
  }, delay)
}

export function cancelHeartbeat(): void {
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer)
    heartbeatTimer = null
  }
}

// localApiUrl reservado para v2 (stats DTE reales)
async function sendHeartbeat(_localApiUrl: string): Promise<void> {
  const info  = loadLicenseInfo()
  const perms = loadPermissions()
  if (!info || !perms) {
    console.log('[heartbeat] Sin licencia activada — omitiendo heartbeat')
    return
  }

  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const date = yesterday.toISOString().slice(0, 10)

    // TODO v2: obtener contadores DTE reales desde la BD local
    // Por ahora se envían vacíos — el panel igual refresca los módulos
    const stats: Record<string, number> = {}

    // Enviar al panel
    const res = await fetch(`${info.panelUrl}/licenses/heartbeat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        licenseKey: info.licenseKey,
        hwid:       perms.hwid,
        date,
        stats,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (res.ok) {
      const body = await res.json() as {
        valid:          boolean
        enabledModules?: string[]
        signature?:     string
      }
      if (body.valid && body.enabledModules) {
        // Actualizar permisos con los datos frescos del heartbeat
        savePermissions({
          ...perms,
          enabledModules: body.enabledModules,
          signature:      body.signature ?? perms.signature,
          validatedAt:    new Date().toISOString(),
        })
        console.log('[heartbeat] Permisos actualizados vía heartbeat')
      }
      console.log(`[heartbeat] OK — fecha: ${date}, stats:`, stats)
    } else {
      console.warn(`[heartbeat] Panel respondió ${res.status}`)
    }
  } catch (err: any) {
    console.warn(`[heartbeat] Error (se reintentará mañana): ${err.message}`)
  }
}

function msUntilHour(hour: number): number {
  if (process.env.NODE_ENV !== 'production') return 60_000  // 1 minuto en dev

  const now   = new Date()
  const target = new Date(now)
  target.setHours(hour, 0, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}

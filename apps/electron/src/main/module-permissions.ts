/**
 * module-permissions.ts — v2
 * ──────────────────────────
 * Sistema de licencia vinculado al hardware con 3 capas de seguridad:
 *
 * 1. HWID v2: Motherboard serial (WMI) + CPU ProcessorId + fallbacks
 *    → prácticamente imposible de falsificar sin clonar físicamente el hardware
 *
 * 2. AES-256-GCM encrypted store (polaris-license-v2.dat)
 *    → la clave de cifrado se deriva del HWID con HKDF-SHA256
 *    → copiar el archivo a otra PC = HWID diferente = imposible descifrar
 *
 * 3. ECDSA P-256 signature del panel
 *    → la clave privada NUNCA sale del servidor
 *    → modificar los módulos manualmente = firma inválida = denegado
 *
 * Flujo normal:
 *   1. Startup → desencriptar store con HWID derivado
 *   2. Verificar firma ECDSA → si falla → modo base (sin licencia)
 *   3. Si cache > 1 día → refresh desde panel
 *   4. Cada noche a las 23:00 → heartbeat con panel
 */

import {
  createHash,
  createCipheriv,
  createDecipheriv,
  createVerify,
  hkdfSync,
  randomBytes,
} from 'crypto'
import { execSync }                    from 'child_process'
import { networkInterfaces, cpus, hostname } from 'os'
import path                            from 'path'
import fs                              from 'fs'
import { app }                         from 'electron'

// ─── Constantes ───────────────────────────────────────────────────────────────

const BASE_MODULES     = [
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
const CACHE_VALID_DAYS = 1
const CACHE_GRACE_DAYS = 30
const HEARTBEAT_HOUR   = 23
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

/** Archivo cifrado binario — sustituye polaris-local.json */
const STORE_FILE = 'polaris-license-v2.dat'
/** JSON plano para que el proceso NestJS local lo lea */
const PERMS_FILE = 'local-permissions.json'
/** Salt para derivación de clave — cambiar invalida TODOS los stores existentes */
const DERIVE_SALT = 'polaris-license-binding-v2-2025'
/** Cabecera mágica del formato cifrado ('PLv2') */
const MAGIC = Buffer.from([0x50, 0x4c, 0x76, 0x32])

// ─── Clave pública ECDSA P-256 embebida ───────────────────────────────────────
// La clave privada vive SOLO en el servidor (env var LICENSE_EC_PRIVATE_KEY_B64).
// Esta clave pública es segura para incrustar en el binario — es pública por definición.
const EC_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEdIzu+EYClQdXelkcJgF5WoKi7zIU
VgE6gat9OBNeTQMwY/LcqdyTStbugerBGnFCCOBY4N27YxPtb4H/r2np6A==
-----END PUBLIC KEY-----`

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ModulePermissions = {
  enabledModules: string[]
  signature:      string      // ECDSA P-256 con prefijo 'ec:'
  validatedAt:    string      // ISO — generado por el servidor, incluido en la firma
  expiresAt:      string | null
  plan:           string
  hwid:           string
  licenseRevision: number
  lastPanelSyncAt?: string
}

type EncryptedStoreData = {
  licenseKey?:        string
  panelUrl?:          string
  modulePermissions?: ModulePermissions
}

type PanelCommand = {
  id: string
  type: 'BACKUP_DATABASE' | string
  payload?: Record<string, unknown>
  attempt?: number
  requestedAt?: string
}

type CommandResult = {
  id: string
  status: 'SUCCEEDED' | 'FAILED'
  result?: Record<string, unknown>
  error?: string
}

// ─── HWID v2 — Hardware Identity ─────────────────────────────────────────────

/** Valores que indican serial genérico/vacío — ignorar en HWID */
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

let _hwidCache: string | null = null

/**
 * Genera un HWID estable vinculado al hardware físico.
 * En Windows usa WMI para leer serial de motherboard + CPU ProcessorId.
 * Complementa con hostname + MAC + modelo de CPU como fallback.
 * El resultado se cachea en memoria (una sola llamada WMI por proceso).
 */
export function generateHwid(): string {
  if (_hwidCache) return _hwidCache

  const parts: string[] = []

  if (process.platform === 'win32') {
    // Capa 1: Serial de placa madre — sobrevive reinstalación del SO
    try {
      const out = execSync('wmic baseboard get serialnumber /value', {
        encoding: 'utf8', timeout: 5000, windowsHide: true,
      })
      const val = out.match(/SerialNumber=([^\r\n]+)/i)?.[1]?.trim() ?? ''
      if (val && val.length > 3 && !GENERIC_SERIALS.has(val.toLowerCase())) {
        parts.push('mb:' + val)
      }
    } catch { /* WMI no disponible — continúa con fallback */ }

    // Capa 2: CPU ProcessorId — único por procesador físico
    try {
      const out = execSync('wmic cpu get processorid /value', {
        encoding: 'utf8', timeout: 5000, windowsHide: true,
      })
      const val = out.match(/ProcessorId=([^\r\n]+)/i)?.[1]?.trim() ?? ''
      if (val && val.length > 3 && !GENERIC_SERIALS.has(val.toLowerCase())) {
        parts.push('cpu:' + val)
      }
    } catch { /* ignorar */ }
  }

  // Capa 3: Identificadores de SO (fallback cross-platform)
  parts.push('host:' + hostname())

  const ifaces = networkInterfaces()
  for (const ifaceList of Object.values(ifaces)) {
    for (const iface of ifaceList ?? []) {
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        parts.push('mac:' + iface.mac)
        break
      }
    }
    if (parts.some(p => p.startsWith('mac:'))) break
  }

  parts.push('cpumodel:' + (cpus()[0]?.model ?? ''))

  const raw = parts.join('||')
  _hwidCache = createHash('sha256').update(raw).digest('hex')
  return _hwidCache
}

// ─── Derivación de clave ──────────────────────────────────────────────────────

/** HKDF-SHA256: hwid → clave AES-256 de 32 bytes */
function deriveKey(hwid: string): Buffer {
  return Buffer.from(
    hkdfSync(
      'sha256',
      Buffer.from(hwid, 'hex'), // IKM: 32 bytes del hash HWID
      Buffer.from(DERIVE_SALT),
      Buffer.from('polaris-aes-256-gcm-key-v2'),
      32,
    )
  )
}

// ─── Store cifrado ────────────────────────────────────────────────────────────

function getStorePath(): string {
  return path.join(app.getPath('userData'), STORE_FILE)
}

function getPermsPath(): string {
  return path.join(app.getPath('userData'), PERMS_FILE)
}

/**
 * Cifra y escribe el store en disco.
 * Formato binario: [MAGIC(4)][IV(12)][GCM_TAG(16)][CIPHERTEXT(N)]
 */
function writeEncryptedStore(data: EncryptedStoreData, hwid: string): void {
  const key      = deriveKey(hwid)
  const iv       = randomBytes(12)
  const cipher   = createCipheriv('aes-256-gcm', key, iv)
  const plain    = Buffer.from(JSON.stringify(data), 'utf8')
  const enc      = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag      = cipher.getAuthTag()

  const out = Buffer.concat([MAGIC, iv, tag, enc])
  fs.mkdirSync(path.dirname(getStorePath()), { recursive: true })
  fs.writeFileSync(getStorePath(), out)
}

/**
 * Lee y descifra el store.
 * Retorna null si el archivo no existe, el HWID es incorrecto (otra PC)
 * o el archivo fue manipulado.
 */
function readEncryptedStore(hwid: string): EncryptedStoreData | null {
  try {
    const raw = fs.readFileSync(getStorePath())
    // Validación de tamaño mínimo: MAGIC(4) + IV(12) + TAG(16) + al menos 2 bytes
    if (raw.length < 34) return null
    if (!raw.subarray(0, 4).equals(MAGIC)) return null

    const iv  = raw.subarray(4, 16)   // 12 bytes
    const tag = raw.subarray(16, 32)  // 16 bytes
    const enc = raw.subarray(32)

    const key      = deriveKey(hwid)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)

    const plain = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
    return JSON.parse(plain) as EncryptedStoreData
  } catch {
    // AES-GCM falla si el tag no coincide (HWID distinto o archivo manipulado)
    return null
  }
}

/** Intenta migrar desde el formato antiguo polaris-local.json (texto plano) */
function migrateFromLegacy(): EncryptedStoreData {
  const legacyPath = path.join(app.getPath('userData'), 'polaris-local.json')
  if (!fs.existsSync(legacyPath)) return {}

  try {
    const raw  = fs.readFileSync(legacyPath, 'utf8')
    const old  = JSON.parse(raw) as {
      licenseKey?: string
      panelUrl?:   string
      modulePermissions?: ModulePermissions
    }

    const data: EncryptedStoreData = {
      licenseKey:        old.licenseKey,
      panelUrl:          old.panelUrl,
      modulePermissions: old.modulePermissions,
    }

    // Guardar en nuevo formato cifrado
    writeEncryptedStore(data, generateHwid())

    // Renombrar archivo viejo (no borrar — por si algo falla)
    try { fs.renameSync(legacyPath, legacyPath + '.migrated') } catch { /* ignorar */ }

    console.log('[permissions] Migrado de polaris-local.json → store cifrado v2')
    return data
  } catch (err) {
    console.warn('[permissions] Error al migrar legacy store:', err)
    return {}
  }
}

function loadStore(): EncryptedStoreData {
  const storePath = getStorePath()

  if (!fs.existsSync(storePath)) {
    return migrateFromLegacy()
  }

  const hwid = generateHwid()
  const data = readEncryptedStore(hwid)

  if (data === null) {
    console.warn('[permissions] Store cifrado no se pudo descifrar — ¿PC diferente o archivo corrupto?')
    return {}
  }

  return data
}

function saveStore(data: EncryptedStoreData): void {
  writeEncryptedStore(data, generateHwid())
}

// ─── Verificación de firma ECDSA ──────────────────────────────────────────────

function verifySignature(perms: ModulePermissions): boolean {
  try {
    if (perms.hwid !== generateHwid()) return false

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

    console.warn('[permissions] Firma legacy/no reconocida — requiere revalidación online')

    return false
  } catch {
    return false
  }
}

// ─── API pública (misma interfaz que v1) ──────────────────────────────────────

export function savePermissions(perms: ModulePermissions): void {
  const data = loadStore()
  data.modulePermissions = perms
  saveStore(data)
  writePermissionsFile(perms)
}

export function loadPermissions(): ModulePermissions | null {
  const data  = loadStore()
  const perms = data.modulePermissions
  if (!perms) return null

  if (!verifySignature(perms)) {
    console.warn('[permissions] ⚠️  Firma inválida — posible manipulación detectada')
    return null
  }

  return perms
}

export function saveLicenseInfo(licenseKey: string, panelUrl: string): void {
  const data  = loadStore()
  data.licenseKey = licenseKey
  data.panelUrl   = panelUrl
  saveStore(data)
}

export function loadLicenseInfo(): { licenseKey: string; panelUrl: string } | null {
  const data = loadStore()
  if (!data.licenseKey || !data.panelUrl) return null
  return { licenseKey: data.licenseKey, panelUrl: data.panelUrl }
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function ageInDays(isoDate: string): number | null {
  const ts = Date.parse(isoDate)
  if (!Number.isFinite(ts)) return null
  if (ts - Date.now() > MAX_CLOCK_SKEW_MS) return null
  return (Date.now() - ts) / 86_400_000
}

export function isCacheStale(perms: ModulePermissions): boolean {
  const age = ageInDays(perms.lastPanelSyncAt ?? perms.validatedAt)
  return age === null || age >= CACHE_VALID_DAYS
}

export function isCacheExpired(perms: ModulePermissions): boolean {
  const age = ageInDays(perms.validatedAt)
  return age === null || age >= CACHE_GRACE_DAYS
}

function isLicenseExpired(perms: ModulePermissions): boolean {
  if (!perms.expiresAt) return false
  const ts = Date.parse(perms.expiresAt)
  return !Number.isFinite(ts) || ts <= Date.now()
}

export function getEnabledModules(): string[] {
  const perms = loadPermissions()
  if (!perms) return BASE_MODULES
  if (isLicenseExpired(perms)) {
    console.warn('[permissions] Licencia vencida — modo degradado, solo módulos base')
    return BASE_MODULES
  }
  if (isCacheExpired(perms)) {
    console.warn('[permissions] Cache expirado — modo degradado, solo módulos base')
    return BASE_MODULES
  }
  return perms.enabledModules
}

// ─── Refresh desde panel ──────────────────────────────────────────────────────

async function reportCommandResults(
  panelUrl: string,
  licenseKey: string,
  hwid: string,
  results: CommandResult[],
): Promise<void> {
  if (results.length === 0) return

  try {
    await fetch(`${panelUrl}/licenses/sync`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ licenseKey, hwid, commandResults: results }),
      signal:  AbortSignal.timeout(10_000),
    })
  } catch (err: any) {
    console.warn(`[permissions] No se pudo reportar resultado de comandos: ${err.message}`)
  }
}

async function processPanelCommands(
  localApiUrl: string | undefined,
  panelUrl: string,
  licenseKey: string,
  hwid: string,
  commands: PanelCommand[] = [],
): Promise<void> {
  if (!localApiUrl || commands.length === 0) return

  const results: CommandResult[] = []
  for (const command of commands) {
    try {
      if (command.type !== 'BACKUP_DATABASE') {
        results.push({
          id: command.id,
          status: 'FAILED',
          error: `Comando no soportado: ${command.type}`,
        })
        continue
      }

      const res = await fetch(`${localApiUrl}/api/setup/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Local-Setup-Token': process.env.LOCAL_SETUP_TOKEN ?? '',
        },
        body: JSON.stringify({
          commandId: command.id,
          reason: typeof command.payload?.reason === 'string'
            ? command.payload.reason
            : 'Solicitud remota desde panel',
        }),
        signal: AbortSignal.timeout(30 * 60_000),
      })

      const body = await res.json().catch(() => ({})) as Record<string, unknown>
      if (!res.ok) {
        throw new Error(String((body as any)?.message ?? `HTTP ${res.status}`))
      }

      results.push({
        id: command.id,
        status: 'SUCCEEDED',
        result: body,
      })
    } catch (err: any) {
      results.push({
        id: command.id,
        status: 'FAILED',
        error: err?.message ?? String(err),
      })
    }
  }

  await reportCommandResults(panelUrl, licenseKey, hwid, results)
}

export async function refreshPermissionsFromPanel(
  licenseKey: string,
  hwid:       string,
  panelUrl:   string,
  localApiUrl?: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${panelUrl}/licenses/sync`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        licenseKey,
        hwid,
        currentRevision: loadPermissions()?.licenseRevision ?? 0,
      }),
      signal:  AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.warn(`[permissions] Panel respondió ${res.status} — usando cache local`)
      return false
    }

    const body = await res.json() as {
      valid:           boolean
      reason?:         string
      action?:         string
      plan?:           string
      enabledModules?: string[]
      signature?:      string
      validatedAt?:    string
      expiresAt?:      string | null
      licenseRevision?: number
      commands?:       PanelCommand[]
    }

    if (!body.valid && body.action === 'BLOCK' && body.signature && body.validatedAt) {
      savePermissions({
        enabledModules: body.enabledModules ?? BASE_MODULES,
        signature:      body.signature,
        validatedAt:    body.validatedAt,
        expiresAt:      body.expiresAt ?? null,
        plan:           body.plan ?? 'LOCAL',
        hwid,
        licenseRevision: body.licenseRevision ?? 1,
        lastPanelSyncAt: body.validatedAt,
      })
      console.warn(`[permissions] Licencia bloqueada por panel: ${body.reason}`)
      return true
    }

    if (!body.valid) {
      console.warn(`[permissions] Licencia inválida: ${body.reason}`)
      return false
    }

    if (!body.signature || !body.validatedAt) {
      console.warn('[permissions] Panel no devolvió firma/timestamp — rechazando permisos')
      return false
    }

    savePermissions({
      enabledModules: body.enabledModules ?? BASE_MODULES,
      signature:      body.signature,
      validatedAt:    body.validatedAt,
      expiresAt:      body.expiresAt      ?? null,
      plan:           body.plan           ?? 'LOCAL',
      hwid,
      licenseRevision: body.licenseRevision ?? 1,
      lastPanelSyncAt: body.validatedAt,
    })
    await processPanelCommands(localApiUrl, panelUrl, licenseKey, hwid, body.commands)
    console.log(`[permissions] Permisos actualizados — módulos: ${(body.enabledModules ?? BASE_MODULES).join(', ')}`)
    return true
  } catch (err: any) {
    console.warn(`[permissions] No se pudo contactar el panel: ${err.message}`)
    return false
  }
}

export async function refreshIfStale(localApiUrl?: string): Promise<void> {
  const info  = loadLicenseInfo()
  const perms = loadPermissions()

  if (!info) return

  if (perms && !isCacheStale(perms)) {
    console.log(`[permissions] Cache vigente — módulos: ${perms.enabledModules.join(', ')}`)
    return
  }

  const hwid = perms?.hwid ?? generateHwid()
  await refreshPermissionsFromPanel(info.licenseKey, hwid, info.panelUrl, localApiUrl)
}

// ─── Archivo de permisos para NestJS local ────────────────────────────────────

function writePermissionsFile(perms: ModulePermissions): void {
  try {
    fs.writeFileSync(getPermsPath(), JSON.stringify(perms, null, 2), 'utf8')
  } catch (err: any) {
    console.error('[permissions] Error escribiendo archivo de permisos:', err.message)
  }
}

export function getPermissionsFilePath_Public(): string {
  return getPermsPath()
}

// ─── Heartbeat nocturno ───────────────────────────────────────────────────────

let heartbeatTimer: NodeJS.Timeout | null = null

export function scheduleHeartbeat(localApiUrl: string): void {
  if (heartbeatTimer) clearTimeout(heartbeatTimer)

  const delay = msUntilHour(HEARTBEAT_HOUR)
  console.log(`[heartbeat] Programado en ${Math.round(delay / 60_000)} minutos`)

  heartbeatTimer = setTimeout(async () => {
    await sendHeartbeat(localApiUrl)
    scheduleHeartbeat(localApiUrl)
  }, delay)
}

export function cancelHeartbeat(): void {
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer)
    heartbeatTimer = null
  }
}

async function sendHeartbeat(localApiUrl: string): Promise<void> {
  const info  = loadLicenseInfo()
  const perms = loadPermissions()
  if (!info || !perms) {
    console.log('[heartbeat] Sin licencia activada — omitiendo heartbeat')
    return
  }

  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const date  = yesterday.toISOString().slice(0, 10)
    const stats: Record<string, number> = {}

    const res = await fetch(`${info.panelUrl}/licenses/sync`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        licenseKey: info.licenseKey,
        hwid:       perms.hwid,
        date,
        stats,
        currentRevision: perms.licenseRevision,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (res.ok) {
      const body = await res.json() as {
        valid:           boolean
        reason?:         string
        action?:         string
        plan?:           string
        enabledModules?: string[]
        signature?:      string
        validatedAt?:    string
        expiresAt?:      string | null
        licenseRevision?: number
        commands?:       PanelCommand[]
      }
      if (body.action === 'BLOCK' && body.signature && body.validatedAt) {
        savePermissions({
          ...perms,
          enabledModules: body.enabledModules ?? BASE_MODULES,
          signature:      body.signature,
          validatedAt:    body.validatedAt,
          expiresAt:      body.expiresAt ?? perms.expiresAt,
          plan:           body.plan ?? perms.plan,
          licenseRevision: body.licenseRevision ?? perms.licenseRevision ?? 1,
          lastPanelSyncAt: body.validatedAt,
        })
        console.warn(`[heartbeat] Licencia bloqueada por panel: ${body.reason}`)
      } else if (body.valid && body.enabledModules && body.signature && body.validatedAt) {
        savePermissions({
          ...perms,
          enabledModules: body.enabledModules,
          signature:      body.signature,
          validatedAt:    body.validatedAt,
          expiresAt:      body.expiresAt ?? perms.expiresAt,
          licenseRevision: body.licenseRevision ?? perms.licenseRevision ?? 1,
          lastPanelSyncAt: body.validatedAt,
        })
        console.log('[heartbeat] Permisos actualizados vía heartbeat')
      }
      await processPanelCommands(localApiUrl, info.panelUrl, info.licenseKey, perms.hwid, body.commands)
      console.log(`[heartbeat] OK — fecha: ${date}, stats:`, stats)
    } else {
      console.warn(`[heartbeat] Panel respondió ${res.status}`)
    }
  } catch (err: any) {
    console.warn(`[heartbeat] Error (se reintentará mañana): ${err.message}`)
  }
}

function msUntilHour(hour: number): number {
  if (process.env.NODE_ENV !== 'production') return 60_000

  const now    = new Date()
  const target = new Date(now)
  target.setHours(hour, 0, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}

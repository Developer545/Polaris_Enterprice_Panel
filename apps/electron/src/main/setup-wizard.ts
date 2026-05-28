import { BrowserWindow, ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'
import net from 'net'
import { Client } from 'pg'
import { generateHwid, loadLicenseInfo } from './module-permissions'
// @ts-ignore — Vite ?raw is valid but not typed in SSR tsconfig
import wizardHtml from './setup-wizard.html?raw'

const PANEL_URL = process.env.LICENSE_PANEL_URL ?? 'https://polaris-api.speeddan.com'
const PG_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_-]{0,40}$/

export type SetupResult = {
  licenseKey: string | null
  postgres: {
    host: string
    port: number
    user: string
    password: string
    controlDatabase: string
    tenantDatabase: string
  }
  companyName: string
  adminName: string
  adminEmail: string
  adminPassword: string
}

function configPath(): string {
  return path.join(app.getPath('userData'), 'local-server.json')
}

function quotePgIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function quotePgLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

export function isFirstRun(): boolean {
  return !fs.existsSync(configPath())
}

export async function showSetupWizard(): Promise<SetupResult> {
  const tmpHtml = path.join(os.tmpdir(), 'polaris-setup-wizard.html')
  fs.writeFileSync(tmpHtml, wizardHtml, 'utf8')

  return new Promise<SetupResult>((resolve, reject) => {
    const win = new BrowserWindow({
      width: 780,
      height: 620,
      resizable: false,
      frame: false,
      center: true,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false,
      },
    })

    win.loadFile(tmpHtml)
    win.once('ready-to-show', () => win.show())

    const channels: string[] = []

    function handle(ch: string, fn: Parameters<typeof ipcMain.handle>[1]) {
      ipcMain.handle(ch, fn)
      channels.push(ch)
    }

    function cleanup() {
      for (const ch of channels) ipcMain.removeHandler(ch)
      try { fs.unlinkSync(tmpHtml) } catch { /* ignore */ }
    }

    win.on('closed', () => {
      cleanup()
      reject(new Error('Configuración cancelada'))
    })

    handle('setup:get-hwid', () => generateHwid())

    // Devuelve la licencia guardada (si existe) para pre-rellenar en reinstalación
    handle('setup:get-existing-license', () => {
      const info = loadLicenseInfo()
      return { licenseKey: info?.licenseKey ?? null }
    })

    handle('setup:check-pg', async (_, cfg: { host: string; port: number }) => {
      return new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const sock = new net.Socket()
        const timeout = setTimeout(() => {
          sock.destroy()
          resolve({ ok: false, error: 'Tiempo de espera agotado' })
        }, 4000)
        sock.connect(cfg.port, cfg.host, () => {
          clearTimeout(timeout)
          sock.destroy()
          resolve({ ok: true })
        })
        sock.on('error', (err) => {
          clearTimeout(timeout)
          resolve({ ok: false, error: err.message })
        })
      })
    })

    handle('setup:validate-license', async (_, key: string) => {
      const hwid = generateHwid()
      try {
        const res = await fetch(`${PANEL_URL}/licenses/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key, hwid }),
          signal: AbortSignal.timeout(8000),
        })
        const data = await res.json().catch(() => ({})) as any
        if (!res.ok) {
          if (data?.reason === 'hwid_mismatch') {
            return { ok: false, hwidMismatch: true, error: 'hwid_mismatch' }
          }
          return { ok: false, error: data?.message ?? 'Contraseña no válida' }
        }
        if (!data?.valid) {
          if (data?.reason === 'hwid_mismatch') {
            return { ok: false, hwidMismatch: true, error: 'hwid_mismatch' }
          }
          return { ok: false, error: data?.reason ?? 'Contraseña no válida' }
        }
        if (!data?.signature || !data?.validatedAt) {
          return { ok: false, error: 'El servidor de activación no devolvió una firma válida.' }
        }
        return { ok: true, data }
      } catch {
        // Panel no disponible — no permitir bypass en primer arranque
        return { ok: false, offline: true, error: 'Sin conexión al servidor de activación. Necesitas internet para activar tu licencia por primera vez.' }
      }
    })

    handle('setup:auto-config-db', async (_, opts: {
      host: string; port: number; adminPassword: string; dbName: string
    }) => {
      const { host, port, adminPassword, dbName } = opts
      if (!PG_IDENTIFIER_RE.test(dbName)) {
        return { ok: false, error: 'Nombre de base de datos inválido' }
      }

      const appUser     = 'pos_dte'
      const appPassword = crypto.randomBytes(20).toString('hex')
      const controlDb   = `${dbName}_control`
      const tenantDb    = `${dbName}_tenant`
      const appUserSql  = quotePgIdent(appUser)

      const admin = new Client({
        host, port,
        user: 'postgres',
        password: adminPassword,
        database: 'postgres',
        connectionTimeoutMillis: 8000,
      })
      try {
        await admin.connect()

        // Crear usuario (o actualizar contraseña si ya existe)
        const userExists = await admin.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [appUser])
        if ((userExists.rowCount ?? 0) > 0) {
          await admin.query(`ALTER USER ${appUserSql} WITH PASSWORD ${quotePgLiteral(appPassword)}`)
        } else {
          await admin.query(`CREATE USER ${appUserSql} WITH PASSWORD ${quotePgLiteral(appPassword)}`)
        }

        // Crear BD control
        const ctrlExists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [controlDb])
        if ((ctrlExists.rowCount ?? 0) === 0) {
          await admin.query(`CREATE DATABASE ${quotePgIdent(controlDb)} OWNER ${appUserSql}`)
        } else {
          await admin.query(`ALTER DATABASE ${quotePgIdent(controlDb)} OWNER TO ${appUserSql}`)
        }

        // Crear BD datos
        const tenantExists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [tenantDb])
        if ((tenantExists.rowCount ?? 0) === 0) {
          await admin.query(`CREATE DATABASE ${quotePgIdent(tenantDb)} OWNER ${appUserSql}`)
        } else {
          await admin.query(`ALTER DATABASE ${quotePgIdent(tenantDb)} OWNER TO ${appUserSql}`)
        }

        await admin.query(`GRANT ALL PRIVILEGES ON DATABASE ${quotePgIdent(controlDb)} TO ${appUserSql}`)
        await admin.query(`GRANT ALL PRIVILEGES ON DATABASE ${quotePgIdent(tenantDb)} TO ${appUserSql}`)

        // PostgreSQL 15+ requiere GRANT explícito en schema public
        const grantSchema = async (dbName: string) => {
          const c = new Client({ host, port, user: 'postgres', password: adminPassword, database: dbName, connectionTimeoutMillis: 6000 })
          try {
            await c.connect()
            await c.query(`GRANT ALL ON SCHEMA public TO ${appUserSql}`)
            await c.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${appUserSql}`)
            await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${appUserSql}`)
          } finally { await c.end().catch(() => {}) }
        }
        await grantSchema(controlDb)
        await grantSchema(tenantDb)

        // Verificación final: conectar como pos_dte a ambas BDs para confirmar
        const verifyDb = async (db: string) => {
          const c = new Client({
            host, port,
            user:     appUser,
            password: appPassword,
            database: db,
            connectionTimeoutMillis: 6000,
          })
          try {
            await c.connect()
            await c.query('SELECT 1')
          } finally {
            await c.end().catch(() => {})
          }
        }
        await verifyDb(controlDb)
        await verifyDb(tenantDb)

        return {
          ok:          true,
          controlDb,
          tenantDb,
          config: { host, port, user: appUser, password: appPassword, controlDatabase: controlDb, tenantDatabase: tenantDb },
        }
      } catch (err: any) {
        return { ok: false, error: err.message ?? String(err) }
      } finally {
        await admin.end().catch(() => {})
      }
    })

    // Guarda config + permanece en paso 4 (NO cierra ventana aún)
    let pendingPayload: SetupResult | null = null
    handle('setup:complete', (_, payload: SetupResult) => {
      try {
        const serverConfig = {
          postgres: payload.postgres,
          dteQueueDriver: 'local',
          jwtAccessSecret: crypto.randomBytes(32).toString('hex'),
          jwtRefreshSecret: crypto.randomBytes(32).toString('hex'),
          jwtAdminSecret: crypto.randomBytes(32).toString('hex'),
          encryptionKey: crypto.randomBytes(32).toString('hex'),
          localSetupToken: crypto.randomBytes(32).toString('hex'),
        }
        fs.mkdirSync(path.dirname(configPath()), { recursive: true })
        fs.writeFileSync(configPath(), JSON.stringify(serverConfig, null, 2), 'utf8')
        pendingPayload = payload
        return { ok: true }
      } catch (err: any) {
        return { ok: false, error: err.message ?? String(err) }
      }
    })

    // Usuario presionó "Abrir Polaris" en paso 4 → cerrar wizard y continuar
    handle('setup:open', () => {
      if (!pendingPayload) return { ok: false, error: 'Sin datos pendientes' }
      const payload = pendingPayload
      cleanup()
      win.removeAllListeners('closed')
      win.close()
      resolve(payload)
      return { ok: true }
    })

    handle('setup:quit', () => {
      cleanup()
      app.quit()
    })
  })
}

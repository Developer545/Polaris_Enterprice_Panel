import { BrowserWindow, ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'
import { Client } from 'pg'
// @ts-ignore — Vite ?raw is valid but not typed in SSR tsconfig
import wizardHtml from './setup-wizard.html?raw'

const PANEL_URL = 'https://polaris-enterprice-panel.onrender.com'

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

    handle('setup:validate-license', async (_, key: string) => {
      try {
        const res = await fetch(`${PANEL_URL}/api/licenses/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key }),
          signal: AbortSignal.timeout(8000),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return { ok: false, error: (data as any).message ?? 'Licencia inválida' }
        return { ok: true, data }
      } catch {
        // Panel offline — allow anyway, license checked on next online start
        return { ok: true, data: {} }
      }
    })

    handle('setup:test-db', async (_, cfg: {
      host: string; port: number; user: string; password: string; database: string
    }) => {
      const client = new Client({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        connectionTimeoutMillis: 6000,
      })
      try {
        await client.connect()
        await client.query('SELECT 1')
        return { ok: true }
      } catch (err: any) {
        return { ok: false, error: err.message ?? String(err) }
      } finally {
        await client.end().catch(() => { /* ignore */ })
      }
    })

    handle('setup:complete', (_, payload: SetupResult) => {
      try {
        const serverConfig = {
          postgres: payload.postgres,
          dteQueueDriver: 'local',
          jwtAccessSecret: crypto.randomBytes(32).toString('hex'),
          jwtRefreshSecret: crypto.randomBytes(32).toString('hex'),
          jwtAdminSecret: crypto.randomBytes(32).toString('hex'),
          encryptionKey: crypto.randomBytes(32).toString('hex'),
        }
        fs.mkdirSync(path.dirname(configPath()), { recursive: true })
        fs.writeFileSync(configPath(), JSON.stringify(serverConfig, null, 2), 'utf8')

        cleanup()
        win.removeAllListeners('closed')
        win.close()
        resolve(payload)
        return { ok: true }
      } catch (err: any) {
        return { ok: false, error: err.message ?? String(err) }
      }
    })

    handle('setup:quit', () => {
      cleanup()
      app.quit()
    })
  })
}

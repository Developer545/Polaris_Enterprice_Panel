import { app, BrowserWindow, dialog, Menu } from 'electron'
import path from 'path'
import fs from 'fs'
import { createMainWindow } from './window'
import { setupTray } from './tray'
import { setupUpdater } from './updater'
import { setupPrintIpc } from './ipc/print.ipc'
import { getWebUrl, setupConfigIpc } from './ipc/config.ipc'
import { setupDrawerIpc } from './ipc/drawer.ipc'
import { setupNotifyIpc } from './ipc/notify.ipc'
import { setupDialogIpc } from './ipc/dialog.ipc'
import { setupWindowIpc } from './ipc/window.ipc'
import { setupShortcuts, teardownShortcuts } from './shortcuts'
import { isLocalBundle, startLocalServices, stopLocalServices } from './local-services'
import { isFirstRun, showSetupWizard, type SetupResult } from './setup-wizard'
import {
  generateHwid,
  saveLicenseInfo,
  savePermissions,
  refreshIfStale,
  scheduleHeartbeat,
  cancelHeartbeat,
  getPermissionsFilePath_Public,
} from './module-permissions'

const isDev = process.env.NODE_ENV === 'development'

// ── Pending provisioning helpers ─────────────────────────────────────────────
// Persiste los datos del wizard antes de arrancar servicios. Si la app crashea
// o el usuario la cierra mientras los servicios inician, el próximo arranque
// recupera estos datos y reintenta el provisionamiento sin mostrar el wizard.
function pendingSetupPath(): string {
  return path.join(app.getPath('userData'), 'pending_setup.json')
}
function savePendingSetup(setup: SetupResult): void {
  try {
    fs.mkdirSync(path.dirname(pendingSetupPath()), { recursive: true })
    fs.writeFileSync(pendingSetupPath(), JSON.stringify(setup, null, 2), 'utf8')
  } catch (e) {
    console.warn('[main] No se pudo guardar pending_setup.json:', e)
  }
}
function loadPendingSetup(): SetupResult | null {
  try {
    if (!fs.existsSync(pendingSetupPath())) return null
    return JSON.parse(fs.readFileSync(pendingSetupPath(), 'utf8')) as SetupResult
  } catch {
    return null
  }
}
function clearPendingSetup(): void {
  try { fs.unlinkSync(pendingSetupPath()) } catch { /* ignore */ }
}

// ── Ventana de carga ──────────────────────────────────────────────────────────
// Se muestra inmediatamente después de cerrar el wizard mientras los servicios
// locales (NestJS + Next.js) inician (30–60 s en primer arranque).
function createLoadingWindow(): BrowserWindow {
  const html = encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0f0f12;color:#e8e8ec;font-family:-apple-system,'Segoe UI',sans-serif;
     display:flex;align-items:center;justify-content:center;height:100vh;
     flex-direction:column;gap:14px;user-select:none}
.logo{font-size:20px;font-weight:700;color:#f47920}
.logo span{color:#888;font-weight:400;font-size:13px}
.sp{width:32px;height:32px;border:3px solid #2a2a36;border-top-color:#f47920;
    border-radius:50%;animation:s .8s linear infinite}
p{font-size:13px;color:#888;margin:0}
small{font-size:11px;color:#444;margin:0}
@keyframes s{to{transform:rotate(360deg)}}
</style></head><body>
<div class="logo">Polaris <span>Enterprise</span></div>
<div class="sp"></div>
<p>Iniciando servicios locales...</p>
<small>El primer arranque puede tardar 30–60 segundos</small>
</body></html>`)

  const win = new BrowserWindow({
    width: 400,
    height: 210,
    resizable: false,
    frame: false,
    center: true,
    show: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })
  win.loadURL(`data:text/html;charset=utf-8,${html}`)
  return win
}

// Panel central — URL base
const PANEL_URL = process.env.LICENSE_PANEL_URL ?? 'https://polaris-api.speeddan.com'

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let mainWindow: BrowserWindow | null = null

app.whenReady().then(async () => {
  app.setAsDefaultProtocolClient('polaris')
  Menu.setApplicationMenu(null)
  setupConfigIpc()

  if (isLocalBundle()) {
    // Primera ejecución — mostrar wizard de configuración
    let setupResult: SetupResult | null = null
    if (isFirstRun()) {
      try {
        setupResult = await showSetupWizard()
        // Persistir ANTES de arrancar servicios: si la app crashea o el usuario
        // la cierra mientras los servicios inician, el próximo arranque recupera
        // estos datos y reintenta el provisionamiento sin mostrar el wizard.
        savePendingSetup(setupResult)
      } catch {
        // Usuario cerró el wizard sin completar
        app.quit()
        return
      }
    } else {
      // Rearranque normal — comprobar si hay un provisionamiento pendiente
      // (ocurre cuando la app cerró antes de que provisionLocalTenant() terminara)
      const pending = loadPendingSetup()
      if (pending) {
        console.log('[main] pending_setup.json encontrado — reintentando provisionamiento')
        setupResult = pending
      }
    }

    // Mostrar ventana de carga inmediatamente — el usuario ve que algo está pasando
    // mientras NestJS + Next.js arrancan (30–60 s en primer arranque)
    const loadingWin = createLoadingWindow()

    try {
      // Pasar ruta del archivo de permisos al proceso NestJS
      process.env.LOCAL_PERMISSIONS_FILE = getPermissionsFilePath_Public()

      const localServices = await startLocalServices()
      process.env.API_URL = localServices.apiUrl
      process.env.WEB_URL = localServices.webUrl

      // Si primer arranque — guardar licencia y activar HWID en panel
      if (setupResult?.licenseKey) {
        const hwid = generateHwid()
        saveLicenseInfo(setupResult.licenseKey, PANEL_URL)

        // Activar licencia en panel (bind HWID + obtener módulos)
        const res = await fetch(`${PANEL_URL}/licenses/validate`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ licenseKey: setupResult.licenseKey, hwid }),
          signal:  AbortSignal.timeout(10_000),
        }).catch(() => null)

        if (res?.ok) {
          const body = await res.json() as {
            valid:           boolean
            enabledModules?: string[]
            signature?:      string
            validatedAt?:    string
            expiresAt?:      string | null
            licenseRevision?: number
            plan?:           string
          }
          if (body.valid && body.signature && body.validatedAt) {
            savePermissions({
              enabledModules: body.enabledModules ?? [
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
              ],
              signature:      body.signature,
              validatedAt:    body.validatedAt, // usar el del servidor — es el que está firmado
              expiresAt:      body.expiresAt   ?? null,
              plan:           body.plan        ?? 'LOCAL',
              hwid,
              licenseRevision: body.licenseRevision ?? 1,
              lastPanelSyncAt: body.validatedAt,
            })
            console.log('[main] Licencia activada — módulos:', body.enabledModules?.join(', '))
          } else if (body.valid) {
            console.warn('[main] El panel no devolvió firma/timestamp — permisos rechazados')
          } else {
            console.warn('[main] Licencia inválida:', (body as any).reason)
          }
        } else {
          console.warn('[main] No se pudo contactar el panel — se usarán módulos base offline')
        }
      } else {
        // Arranque normal — refresh si cache > 7 días
        await refreshIfStale(localServices.apiUrl)
      }

      // Provisionar empresa + usuario admin (primer arranque o reintento)
      if (setupResult) {
        const provisioned = await provisionLocalTenant(localServices.apiUrl, setupResult)
        // Solo borrar pending si el provisionamiento fue exitoso
        if (provisioned) clearPendingSetup()
      }

      // Programar heartbeat nocturno
      scheduleHeartbeat(localServices.apiUrl)
    } catch (err: any) {
      if (!loadingWin.isDestroyed()) loadingWin.close()
      dialog.showErrorBox(
        'Base local no disponible',
        `No se pudo iniciar Polaris Local.\n\nVerifique que PostgreSQL esté instalado, encendido y configurado correctamente.\n\nDetalle: ${err?.message ?? String(err)}`,
      )
      app.quit()
      return
    }

    // Cerrar ventana de carga antes de abrir la ventana principal
    if (!loadingWin.isDestroyed()) loadingWin.close()
  }

  const webUrl = isDev ? (process.env.WEB_URL ?? 'http://localhost:3010') : getWebUrl()
  mainWindow = await createMainWindow(webUrl)
  setupTray(mainWindow)
  setupUpdater(mainWindow)
  setupPrintIpc()
  setupDrawerIpc()
  setupNotifyIpc()
  setupDialogIpc(mainWindow)
  setupWindowIpc(mainWindow)
  setupShortcuts(mainWindow)
})

// Handle second instance (deep links on Windows)
app.on('second-instance', (_, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    const url = commandLine.find((arg) => arg.startsWith('polaris://'))
    if (url) mainWindow.webContents.send('deep-link', url)
  }
})

// Retorna true si el provisionamiento fue exitoso (para saber si borrar pending_setup.json)
async function provisionLocalTenant(apiUrl: string, setup: SetupResult): Promise<boolean> {
  // Reintentar hasta 5 veces — la API puede tardar un poco en iniciar
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`${apiUrl}/api/setup/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Local-Setup-Token': process.env.LOCAL_SETUP_TOKEN ?? '',
        },
        body: JSON.stringify({
          licenseKey:    setup.licenseKey,
          companyName:   setup.companyName,
          adminName:     setup.adminName,
          adminEmail:    setup.adminEmail,
          adminPassword: setup.adminPassword,
        }),
        signal: AbortSignal.timeout(12_000),
      })

      if (res.status === 409) {
        // Reinstalación — tenant ya existe, actualizar credenciales del admin
        console.log('[local:setup] tenant ya existe (409) — actualizando contraseña del admin')
        try {
          const resetRes = await fetch(`${apiUrl}/api/setup/reset-admin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Local-Setup-Token': process.env.LOCAL_SETUP_TOKEN ?? '',
            },
            body: JSON.stringify({
              adminEmail:    setup.adminEmail,
              adminPassword: setup.adminPassword,
              adminName:     setup.adminName,
            }),
            signal: AbortSignal.timeout(8_000),
          })
          if (resetRes.ok) {
            console.log('[local:setup] credenciales admin actualizadas correctamente')
          } else {
            const errBody = await resetRes.json().catch(() => ({})) as any
            console.warn('[local:setup] no se pudo actualizar credenciales admin:', errBody?.message ?? resetRes.status)
          }
        } catch (err: any) {
          console.warn('[local:setup] error actualizando credenciales admin:', err.message)
        }
        return true
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as any
        const msg = body?.message ?? `HTTP ${res.status}`
        if (attempt < 5) {
          console.warn(`[local:setup] intento ${attempt} falló: ${msg} — reintentando...`)
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
        // Último intento fallido — mostrar diálogo (no fatal, app sigue abriendo)
        dialog.showErrorBox(
          'Error al inicializar empresa',
          `No se pudo crear el perfil de tu empresa en Polaris.\n\nDetalle: ${msg}\n\nSi el problema persiste, desinstala y vuelve a instalar Polaris.`,
        )
        return false
      }

      console.log('[local:setup] tenant provisionado correctamente')
      return true
    } catch (err: any) {
      if (attempt < 5) {
        console.warn(`[local:setup] intento ${attempt} error: ${err.message} — reintentando...`)
        await new Promise(r => setTimeout(r, 2000))
      } else {
        dialog.showErrorBox(
          'Error al inicializar empresa',
          `No se pudo conectar con el servidor local de Polaris.\n\nDetalle: ${err.message}\n\nAsegúrate de que PostgreSQL esté encendido y vuelve a intentarlo.`,
        )
        return false
      }
    }
  }
  return false
}

app.on('will-quit', () => {
  teardownShortcuts()
  cancelHeartbeat()
  stopLocalServices()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

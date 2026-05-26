import { app, BrowserWindow, dialog, Menu } from 'electron'
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
  loadPermissions,
} from './module-permissions'

const isDev = process.env.NODE_ENV === 'development'

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
      } catch {
        // Usuario cerró el wizard sin completar
        app.quit()
        return
      }
    }

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
            expiresAt?:      string | null
            plan?:           string
          }
          if (body.valid) {
            savePermissions({
              enabledModules: body.enabledModules ?? ['pos', 'ventas', 'clientes', 'inventario', 'servicios'],
              signature:      body.signature ?? '',
              validatedAt:    new Date().toISOString(),
              expiresAt:      body.expiresAt ?? null,
              plan:           body.plan ?? 'LOCAL',
              hwid,
            })
            console.log('[main] Licencia activada — módulos:', body.enabledModules?.join(', '))
          } else {
            console.warn('[main] Licencia inválida:', (body as any).reason)
          }
        } else {
          console.warn('[main] No se pudo contactar el panel — se usarán módulos base offline')
        }
      } else {
        // Arranque normal — refresh si cache > 7 días
        await refreshIfStale()
      }

      // Provisionar empresa + usuario admin en primer arranque
      if (setupResult) {
        await provisionLocalTenant(localServices.apiUrl, setupResult)
      }

      // Programar heartbeat nocturno
      scheduleHeartbeat(localServices.apiUrl)
    } catch (err: any) {
      dialog.showErrorBox(
        'Base local no disponible',
        `No se pudo iniciar Polaris Local.\n\nVerifique que PostgreSQL esté instalado, encendido y configurado correctamente.\n\nDetalle: ${err?.message ?? String(err)}`,
      )
      app.quit()
      return
    }
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

async function provisionLocalTenant(apiUrl: string, setup: SetupResult): Promise<void> {
  try {
    const res = await fetch(`${apiUrl}/api/setup/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: setup.licenseKey,
        companyName: setup.companyName,
        adminName: setup.adminName,
        adminEmail: setup.adminEmail,
        adminPassword: setup.adminPassword,
      }),
    })
    if (!res.ok && res.status !== 409) {
      const err = await res.json().catch(() => ({}))
      console.error('[local:setup] provision failed:', (err as any).message ?? `HTTP ${res.status}`)
    }
  } catch (err: any) {
    console.error('[local:setup] provision error:', err.message)
  }
}

app.on('will-quit', () => {
  teardownShortcuts()
  cancelHeartbeat()
  stopLocalServices()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

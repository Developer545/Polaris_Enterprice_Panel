import { autoUpdater } from 'electron-updater'
import { BrowserWindow, app, ipcMain } from 'electron'
import log from 'electron-log'
import { isLocalBundle } from './local-services'

export function setupUpdater(mainWindow: BrowserWindow): void {
  // Local bundle se actualiza mediante nuevo instalador descargado desde la landing page.
  // El auto-updater no aplica porque no existe un canal 'local' en los releases de GitHub.
  if (isLocalBundle()) return

  autoUpdater.logger = log
  autoUpdater.channel = process.env.POS_DTE_UPDATE_CHANNEL ?? 'latest'
  // Flujo manual: el usuario decide cuándo descargar e instalar.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  const send = (channel: string, payload?: unknown) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload)
  }

  // ── IPC expuesto al renderer ────────────────────────────────────────────────
  ipcMain.handle('app:get-version', () => app.getVersion())

  ipcMain.handle('app:check-update', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { ok: true, version: result?.updateInfo?.version ?? null }
    } catch (err: any) {
      log.error('check-update error:', err)
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle('app:download-update', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (err: any) {
      log.error('download-update error:', err)
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle('app:install-update', () => autoUpdater.quitAndInstall())

  // ── Eventos → renderer (UpdateBanner) ─────────────────────────────────────────
  autoUpdater.on('update-available', (info) => {
    send('update-available', { version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    send('update-not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    send('update-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    // Sin diálogo forzado: el renderer muestra el botón "Reiniciar para instalar".
    send('update-downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    log.error('Updater error:', err)
    send('update-error', { message: err?.message ?? String(err) })
  })

  // Chequeo silencioso al inicio (sin descargar). Si hay versión, el renderer
  // muestra el botón "Actualizar".
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000)
}

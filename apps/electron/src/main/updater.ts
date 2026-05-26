import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import log from 'electron-log'
import { isLocalBundle } from './local-services'

export function setupUpdater(mainWindow: BrowserWindow): void {
  // Local bundle se actualiza mediante nuevo instalador descargado desde la landing page.
  // El auto-updater no aplica porque no existe un canal 'local' en los releases de GitHub.
  if (isLocalBundle()) return

  autoUpdater.logger = log
  autoUpdater.channel = process.env.POS_DTE_UPDATE_CHANNEL ?? 'latest'
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Called by web app "Reiniciar ahora" button
  ipcMain.handle('app:install-update', () => autoUpdater.quitAndInstall())

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', { version: info.version })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update-downloaded', { version: info.version })
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Actualización lista',
        message: `Versión ${info.version} descargada. ¿Instalar y reiniciar ahora?`,
        buttons: ['Instalar ahora', 'Más tarde'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
  })

  autoUpdater.on('error', (err) => log.error('Updater error:', err))

  // Check on startup (5s delay to not block initial load)
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 5000)
}

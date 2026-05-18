import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog } from 'electron'
import log from 'electron-log'

export function setupUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

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

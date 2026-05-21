import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'
import { setupTray } from './tray'
import { setupUpdater } from './updater'
import { setupPrintIpc } from './ipc/print.ipc'
import { setupConfigIpc } from './ipc/config.ipc'
import { setupDrawerIpc } from './ipc/drawer.ipc'
import { setupNotifyIpc } from './ipc/notify.ipc'
import { setupDialogIpc } from './ipc/dialog.ipc'
import { setupWindowIpc } from './ipc/window.ipc'
import { setupShortcuts, teardownShortcuts } from './shortcuts'

const isDev = process.env.NODE_ENV === 'development'
const WEB_URL = isDev ? 'http://localhost:3010' : 'https://polaris-web-sooty.vercel.app'

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let mainWindow: BrowserWindow | null = null

app.whenReady().then(async () => {
  app.setAsDefaultProtocolClient('polaris')

  mainWindow = await createMainWindow(WEB_URL)
  setupTray(mainWindow)
  setupUpdater(mainWindow)
  setupPrintIpc()
  setupConfigIpc()
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

app.on('will-quit', () => teardownShortcuts())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

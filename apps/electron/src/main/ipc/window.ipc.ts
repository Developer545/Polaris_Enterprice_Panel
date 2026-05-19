import { ipcMain, BrowserWindow, app } from 'electron'

export function setupWindowIpc(mainWindow: BrowserWindow): void {
  ipcMain.handle('window:minimize', () => mainWindow.minimize())

  ipcMain.handle('window:maximize-toggle', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.handle('window:fullscreen-toggle', () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })

  ipcMain.handle('window:is-maximized', () => mainWindow.isMaximized())

  ipcMain.handle('window:is-fullscreen', () => mainWindow.isFullScreen())

  ipcMain.handle('window:quit', () => {
    ;(mainWindow as any).__setForceQuit?.()
    app.quit()
  })

  // Push state changes to renderer so titlebar buttons stay in sync
  mainWindow.on('maximize', () =>
    mainWindow.webContents.send('window:state', { maximized: true, fullscreen: false }),
  )
  mainWindow.on('unmaximize', () =>
    mainWindow.webContents.send('window:state', { maximized: false, fullscreen: false }),
  )
  mainWindow.on('enter-full-screen', () =>
    mainWindow.webContents.send('window:state', { maximized: false, fullscreen: true }),
  )
  mainWindow.on('leave-full-screen', () =>
    mainWindow.webContents.send('window:state', { maximized: mainWindow.isMaximized(), fullscreen: false }),
  )
}

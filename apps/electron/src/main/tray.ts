import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron'
import path from 'path'

let tray: Tray | null = null

export function setupTray(mainWindow: BrowserWindow): void {
  const iconPath = path.join(__dirname, '../../resources/icon.ico')
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('Polaris Enterprise')

  const menu = Menu.buildFromTemplate([
    { label: 'Abrir Polaris', click: () => { mainWindow.show(); mainWindow.focus() } },
    { type: 'separator' },
    {
      label: 'Verificar actualizaciones',
      click: () => mainWindow.webContents.send('check-update'),
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        ;(mainWindow as any).__setForceQuit?.()
        app.quit()
      },
    },
  ])

  tray.setContextMenu(menu)
  tray.on('double-click', () => { mainWindow.show(); mainWindow.focus() })
}

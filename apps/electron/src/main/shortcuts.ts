import { globalShortcut, BrowserWindow } from 'electron'
import { openCashDrawer } from './ipc/drawer.ipc'

/**
 * Global keyboard shortcuts — active even when window is not focused.
 *
 * F12 → open cash drawer (configurable via electron-store key 'drawerShortcut')
 */
export function setupShortcuts(mainWindow: BrowserWindow): void {
  const drawerKey = getDrawerShortcut()

  const registered = globalShortcut.register(drawerKey, async () => {
    const result = await openCashDrawer()

    // Notify renderer so POS UI can show feedback toast
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('shortcut:drawer', result)
    }
  })

  if (!registered) {
    console.warn(`[Shortcuts] Could not register drawer shortcut: ${drawerKey}`)
  }
}

export function teardownShortcuts(): void {
  globalShortcut.unregisterAll()
}

function getDrawerShortcut(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Store = require('electron-store')
    const store = new Store({ name: 'pos-dte-config' })
    return (store.get('drawerShortcut') as string | undefined) ?? 'F12'
  } catch {
    return 'F12'
  }
}

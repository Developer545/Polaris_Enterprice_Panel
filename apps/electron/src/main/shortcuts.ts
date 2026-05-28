import { globalShortcut, BrowserWindow, ipcMain } from 'electron'
import { openCashDrawer } from './ipc/drawer.ipc'
import { printLastReceipt } from './ipc/print.ipc'
import { SimpleStore } from './simple-store'

/**
 * Global keyboard shortcuts — active even when window is not focused.
 *
 * F12 → open cash drawer  (configurable via store key 'drawerShortcut')
 * F11 → reprint last ticket (configurable via store key 'printShortcut')
 */
export function setupShortcuts(mainWindow: BrowserWindow): void {
  const send = (channel: string, data: unknown) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send(channel, data)
  }

  // ── Cash drawer ────────────────────────────────────────────────────────────
  const drawerKey = getShortcut('drawerShortcut', 'F12')
  const drawerOk = globalShortcut.register(drawerKey, async () => {
    send('shortcut:drawer', await openCashDrawer())
  })
  if (!drawerOk) console.warn(`[Shortcuts] Could not register drawer shortcut: ${drawerKey}`)

  // ── Reprint last ticket ────────────────────────────────────────────────────
  const printKey = getShortcut('printShortcut', 'F11')
  const printOk = globalShortcut.register(printKey, async () => {
    send('shortcut:print', await printLastReceipt())
  })
  if (!printOk) console.warn(`[Shortcuts] Could not register print shortcut: ${printKey}`)

  ipcMain.handle('shortcuts:status', () => ({
    drawer: { key: drawerKey, registered: drawerOk },
    print: { key: printKey, registered: printOk },
  }))
}

export function teardownShortcuts(): void {
  globalShortcut.unregisterAll()
}

function getShortcut(key: string, fallback: string): string {
  try {
    const store = new SimpleStore({ name: 'pos-dte-config' })
    return (store.get(key) as string | undefined) ?? fallback
  } catch {
    return fallback
  }
}

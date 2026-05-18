import { ipcMain, safeStorage } from 'electron'
import Store from 'electron-store'

const store = new Store({
  name: 'pos-dte-config',
  defaults: {
    printerInterface: 'usb',
    printerType: 'EPSON',
    cashDrawerPort: 'COM1',
  },
})

export function setupConfigIpc(): void {
  ipcMain.handle('config:get', (_, key: string) => store.get(key))

  ipcMain.handle('config:set', (_, key: string, value: unknown) => { store.set(key, value) })

  ipcMain.handle('config:get-secure', (_, key: string) => {
    const raw = store.get(`secure.${key}`) as string | undefined
    if (!raw || !safeStorage.isEncryptionAvailable()) return null
    try { return safeStorage.decryptString(Buffer.from(raw, 'base64')) } catch { return null }
  })

  ipcMain.handle('config:set-secure', (_, key: string, value: string) => {
    const encrypted = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(value).toString('base64')
      : value
    store.set(`secure.${key}`, encrypted)
  })

  ipcMain.handle('config:app-version', () => app.getVersion())
}

// Import app for version
import { app } from 'electron'

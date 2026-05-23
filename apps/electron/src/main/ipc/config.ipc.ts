import { ipcMain, safeStorage } from 'electron'
import { app } from 'electron'
import Store from 'electron-store'

// Production NestJS API URL — overridable via electron-store for enterprise deployments
const DEFAULT_API_URL = process.env.API_URL ?? 'https://polaris-enterprice-panel.onrender.com'

const store = new Store({
  name: 'pos-dte-config',
  defaults: {
    printerInterface: 'usb',
    printerType: 'EPSON',
    cashDrawerPort: 'COM1',
  },
})

export function getApiUrl(): string {
  const override = store.get('apiUrl') as string | undefined
  return override?.trim() || DEFAULT_API_URL
}

export function setupConfigIpc(): void {
  // Sync IPC — called by preload before page scripts run to inject __API_URL__
  ipcMain.on('config:get-api-url', (event) => {
    event.returnValue = getApiUrl()
  })

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

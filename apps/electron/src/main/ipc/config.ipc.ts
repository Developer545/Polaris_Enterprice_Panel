import { ipcMain, safeStorage, dialog } from 'electron'
import { app } from 'electron'
import { SimpleStore } from '../simple-store'
import fs from 'fs'
import path from 'path'

// Production NestJS API URL — overridable via electron-store for enterprise deployments
const REMOTE_API_URL = 'https://polaris-enterprice-panel.onrender.com'
const REMOTE_WEB_URL = 'https://polaris-web-sooty.vercel.app'
const CONFIG_KEYS = new Set(['apiUrl', 'webUrl', 'printerInterface', 'printerType', 'printerAddress', 'cashDrawerPort', 'imagesDir'])
const SECURE_CONFIG_KEYS = new Set(['apiToken', 'licenseKey'])

const store = new SimpleStore({
  name: 'pos-dte-config',
  defaults: {
    printerInterface: 'usb',
    printerType: 'EPSON',
    cashDrawerPort: 'COM1',
  },
})

export function getApiUrl(): string {
  const override = store.get('apiUrl') as string | undefined
  return normalizeHttpUrl(override?.trim())
    ?? normalizeHttpUrl(process.env.API_URL)
    ?? normalizeHttpUrl(readLocalDefaults().apiUrl)
    ?? REMOTE_API_URL
}

export function getWebUrl(): string {
  const override = store.get('webUrl') as string | undefined
  return normalizeHttpUrl(override?.trim())
    ?? normalizeHttpUrl(process.env.WEB_URL)
    ?? normalizeHttpUrl(readLocalDefaults().webUrl)
    ?? REMOTE_WEB_URL
}

function readLocalDefaults(): { apiUrl?: string; webUrl?: string } {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'local-config.json'),
    path.join(process.cwd(), 'local-config.json'),
    app.isReady() ? path.join(app.getPath('userData'), 'local-config.json') : '',
  ].filter(Boolean)

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
      return {
        apiUrl: typeof parsed.apiUrl === 'string' ? parsed.apiUrl : undefined,
        webUrl: typeof parsed.webUrl === 'string' ? parsed.webUrl : undefined,
      }
    } catch {
      // Ignore malformed local defaults and continue to store/env/remote defaults.
    }
  }
  return {}
}

function normalizeHttpUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function assertAllowedKey(key: string, allowed: Set<string>) {
  if (!allowed.has(key)) throw new Error(`Config key not allowed: ${key}`)
}

export function setupConfigIpc(): void {
  // Sync IPC — called by preload before page scripts run to inject __API_URL__
  ipcMain.on('config:get-api-url', (event) => {
    event.returnValue = getApiUrl()
  })

  ipcMain.handle('config:get', (_, key: string) => {
    assertAllowedKey(key, CONFIG_KEYS)
    return store.get(key)
  })

  ipcMain.handle('config:set', (_, key: string, value: unknown) => {
    assertAllowedKey(key, CONFIG_KEYS)
    if (key === 'apiUrl' || key === 'webUrl') {
      const normalized = normalizeHttpUrl(String(value ?? ''))
      if (!normalized) throw new Error('URL must be http or https')
      store.set(key, normalized)
      return
    }
    store.set(key, value)
  })

  ipcMain.handle('config:get-secure', (_, key: string) => {
    assertAllowedKey(key, SECURE_CONFIG_KEYS)
    const raw = store.get(`secure.${key}`) as string | undefined
    if (!raw || !safeStorage.isEncryptionAvailable()) return null
    try { return safeStorage.decryptString(Buffer.from(raw, 'base64')) } catch { return null }
  })

  ipcMain.handle('config:set-secure', (_, key: string, value: string) => {
    assertAllowedKey(key, SECURE_CONFIG_KEYS)
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage is not available')
    const encrypted = safeStorage.encryptString(value).toString('base64')
    store.set(`secure.${key}`, encrypted)
  })

  ipcMain.handle('config:app-version', () => app.getVersion())

  // Selector de carpeta para imágenes locales (Electron Local)
  ipcMain.handle('config:select-images-dir', async () => {
    const result = await dialog.showOpenDialog({
      title:       'Seleccionar carpeta para imágenes de productos',
      properties:  ['openDirectory', 'createDirectory'],
      buttonLabel: 'Seleccionar carpeta',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const selectedDir = result.filePaths[0]
    store.set('imagesDir', selectedDir)
    // Crear subcarpeta imagenes_polaris automáticamente
    const imagesPolaris = path.join(selectedDir, 'imagenes_polaris')
    if (!fs.existsSync(imagesPolaris)) {
      fs.mkdirSync(imagesPolaris, { recursive: true })
    }
    return selectedDir
  })

  // Exponer IMAGES_BASE_DIR al proceso API local (para .env dinámico)
  ipcMain.handle('config:get-images-dir', () => {
    return store.get('imagesDir') as string | undefined ?? null
  })
}

export function getImagesDir(): string | null {
  const store = new SimpleStore({ name: 'pos-dte-config', defaults: {} })
  return (store.get('imagesDir') as string | undefined) ?? null
}

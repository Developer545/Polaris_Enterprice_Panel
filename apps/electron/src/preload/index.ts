import { contextBridge, ipcRenderer } from 'electron'
import type { PrintReceiptPayload, PrintTestPayload } from '../main/ipc/print.ipc'
import type { NotifyPayload } from '../main/ipc/notify.ipc'
import type { SavePdfPayload } from '../main/ipc/dialog.ipc'

// Inject API URL before any Next.js script runs.
// Uses sendSync so it's guaranteed synchronous — no race with hydration.
;(window as any).__API_URL__ = ipcRenderer.sendSync('config:get-api-url') as string

// Inject initial OS theme so providers can read it synchronously (no flash)
;(window as any).__PREFERS_DARK__ = ipcRenderer.sendSync('theme:get-sync') as boolean

const electronAPI = {
  // ── Config ───────────────────────────────────────────────────────────────
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
    getSecure: (key: string) => ipcRenderer.invoke('config:get-secure', key),
    setSecure: (key: string, value: string) => ipcRenderer.invoke('config:set-secure', key, value),
    appVersion: () => ipcRenderer.invoke('config:app-version'),
  },

  // ── Printer ──────────────────────────────────────────────────────────────
  printer: {
    printReceipt: (payload: PrintReceiptPayload) =>
      ipcRenderer.invoke('print:receipt', payload),
    printTest: (payload: PrintTestPayload) =>
      ipcRenderer.invoke('print:test', payload),
    status: () => ipcRenderer.invoke('print:status'),
    /** Store last receipt in main — enables F11 reprint shortcut */
    setLastReceipt: (payload: PrintReceiptPayload) =>
      ipcRenderer.invoke('print:set-last-receipt', payload),
    onPrintShortcut: (cb: (result: { ok: boolean; error?: string }) => void) => {
      ipcRenderer.on('shortcut:print', (_e, result) => cb(result))
    },
  },

  // ── Cash Drawer ──────────────────────────────────────────────────────────
  drawer: {
    open: (port?: string, pin?: 0 | 1) =>
      ipcRenderer.invoke('drawer:open', port, pin),
    listPorts: () => ipcRenderer.invoke('drawer:list-ports'),
    onShortcut: (cb: (result: { ok: boolean; error?: string }) => void) => {
      ipcRenderer.on('shortcut:drawer', (_e, result) => cb(result))
    },
  },

  // ── Dialog / File system ─────────────────────────────────────────────────
  shortcuts: {
    status: () => ipcRenderer.invoke('shortcuts:status'),
  },

  dialog: {
    savePdf: (payload: SavePdfPayload) => ipcRenderer.invoke('dialog:save-pdf', payload),
    openFile: (opts: { title?: string; extensions?: string[]; multiSelections?: boolean }) =>
      ipcRenderer.invoke('dialog:open-file', opts),
    showInFolder: (filePath: string) => ipcRenderer.invoke('dialog:show-in-folder', filePath),
  },

  // ── Notifications ────────────────────────────────────────────────────────
  notify: {
    show: (payload: NotifyPayload) => ipcRenderer.invoke('notify:show', payload),
    isSupported: () => ipcRenderer.invoke('notify:supported'),
  },

  // ── Window controls ──────────────────────────────────────────────────────
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximizeToggle: () => ipcRenderer.invoke('window:maximize-toggle'),
    fullscreenToggle: () => ipcRenderer.invoke('window:fullscreen-toggle'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
    isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen') as Promise<boolean>,
    quit: () => ipcRenderer.invoke('window:quit'),
    onStateChange: (cb: (state: { maximized: boolean; fullscreen: boolean }) => void) => {
      ipcRenderer.on('window:state', (_e, state) => cb(state))
    },
  },

  // ── OS Theme ─────────────────────────────────────────────────────────────
  theme: {
    /** Initial value — injected synchronously via __PREFERS_DARK__ before hydration */
    isDark: () => !!(window as any).__PREFERS_DARK__,
    onThemeChange: (cb: (dark: boolean) => void) => {
      ipcRenderer.on('theme:changed', (_e, dark) => cb(dark))
    },
  },

  // ── App / Updater ────────────────────────────────────────────────────────
  app: {
    onUpdateAvailable: (cb: (info: { version: string }) => void) => {
      ipcRenderer.on('update-available', (_e, info) => cb(info))
    },
    onUpdateProgress: (cb: (p: { percent: number; transferred: number; total: number }) => void) => {
      ipcRenderer.on('update-progress', (_e, p) => cb(p))
    },
    onUpdateDownloaded: (cb: (info: { version: string }) => void) => {
      ipcRenderer.on('update-downloaded', (_e, info) => cb(info))
    },
    onUpdateNotAvailable: (cb: () => void) => {
      ipcRenderer.on('update-not-available', () => cb())
    },
    onUpdateError: (cb: (info: { message: string }) => void) => {
      ipcRenderer.on('update-error', (_e, info) => cb(info))
    },
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
    checkUpdate: (): Promise<{ ok: boolean; version?: string | null; error?: string }> =>
      ipcRenderer.invoke('app:check-update'),
    downloadUpdate: (): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('app:download-update'),
    installUpdate: () => ipcRenderer.invoke('app:install-update'),
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel)
    },
  },
}

contextBridge.exposeInMainWorld('electron', electronAPI)

export type ElectronAPI = typeof electronAPI

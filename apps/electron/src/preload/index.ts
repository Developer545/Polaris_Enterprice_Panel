import { contextBridge, ipcRenderer } from 'electron'
import type { PrintReceiptPayload, PrintTestPayload } from '../main/ipc/print.ipc'
import type { NotifyPayload } from '../main/ipc/notify.ipc'

// Inject API URL before any Next.js script runs.
// Uses sendSync so it's guaranteed synchronous — no race with hydration.
;(window as any).__API_URL__ = ipcRenderer.sendSync('config:get-api-url') as string

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
  },

  // ── Cash Drawer ──────────────────────────────────────────────────────────
  drawer: {
    open: (port?: string, pin?: 0 | 1) =>
      ipcRenderer.invoke('drawer:open', port, pin),
    listPorts: () => ipcRenderer.invoke('drawer:list-ports'),
  },

  // ── Notifications ────────────────────────────────────────────────────────
  notify: {
    show: (payload: NotifyPayload) => ipcRenderer.invoke('notify:show', payload),
    isSupported: () => ipcRenderer.invoke('notify:supported'),
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
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel)
    },
  },
}

contextBridge.exposeInMainWorld('electron', electronAPI)

export type ElectronAPI = typeof electronAPI

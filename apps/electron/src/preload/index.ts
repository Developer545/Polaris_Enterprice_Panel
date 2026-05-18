import { contextBridge, ipcRenderer } from 'electron'
import type { PrintReceiptPayload, PrintTestPayload } from '../main/ipc/print.ipc'

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

  // ── App / Updater ────────────────────────────────────────────────────────
  app: {
    onUpdateAvailable: (cb: (info: { version: string }) => void) => {
      ipcRenderer.on('update-available', (_e, info) => cb(info))
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

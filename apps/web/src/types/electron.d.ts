// Type declaration for window.electron — injected by Electron preload script.
// Optional because it does not exist in the standard browser (web-only mode).

interface ElectronAPI {
  config: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
    getSecure: (key: string) => Promise<unknown>
    setSecure: (key: string, value: string) => Promise<void>
    appVersion: () => Promise<string>
  }
  printer: {
    printReceipt: (payload: unknown) => Promise<unknown>
    printTest: (payload: unknown) => Promise<unknown>
    status: () => Promise<unknown>
    setLastReceipt: (payload: unknown) => Promise<void>
    onPrintShortcut: (cb: (result: { ok: boolean; error?: string }) => void) => void
  }
  drawer: {
    open: (port?: string, pin?: 0 | 1) => Promise<unknown>
    listPorts: () => Promise<unknown>
    onShortcut: (cb: (result: { ok: boolean; error?: string }) => void) => void
  }
  dialog: {
    savePdf: (payload: unknown) => Promise<unknown>
    openFile: (opts: { title?: string; extensions?: string[]; multiSelections?: boolean }) => Promise<unknown>
    showInFolder: (filePath: string) => Promise<void>
  }
  notify: {
    show: (payload: unknown) => Promise<void>
    isSupported: () => Promise<boolean>
  }
  window: {
    minimize: () => Promise<void>
    maximizeToggle: () => Promise<void>
    fullscreenToggle: () => Promise<void>
    isMaximized: () => Promise<boolean>
    isFullscreen: () => Promise<boolean>
    quit: () => Promise<void>
    onStateChange: (cb: (state: { maximized: boolean; fullscreen: boolean }) => void) => void
  }
  theme: {
    isDark: () => boolean
    onThemeChange: (cb: (dark: boolean) => void) => void
  }
  app: {
    onUpdateAvailable: (cb: (info: { version: string }) => void) => void
    onUpdateProgress: (cb: (p: { percent: number; transferred: number; total: number }) => void) => void
    onUpdateDownloaded: (cb: (info: { version: string }) => void) => void
    installUpdate: () => Promise<void>
    removeAllListeners: (channel: string) => void
  }
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}

export {}

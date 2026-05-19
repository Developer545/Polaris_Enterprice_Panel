/**
 * True when the web app runs inside the Electron shell.
 * Use to conditionally show/hide native features (printer, drawer, etc.)
 */
export const isElectron =
  typeof window !== 'undefined' && !!(window as any).electron

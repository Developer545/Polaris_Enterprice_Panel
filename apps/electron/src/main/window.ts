import { BrowserWindow, shell, session } from 'electron'
import path from 'path'

const SPLASH_MIN_MS = 10_000

export async function createMainWindow(webUrl: string): Promise<BrowserWindow> {
  const isDev = process.env.NODE_ENV === 'development'

  // Splash: loads instantly from local file
  const splash = new BrowserWindow({
    width: 400,
    height: 240,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    backgroundColor: '#0f0f0f',
  })
  splash.loadFile(path.join(__dirname, '../../resources/splash.html'))

  // Main window (hidden until ready)
  const main = new BrowserWindow({
    title: 'Polaris',
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    backgroundColor: '#f5f5f5',
    // Native title bar with Windows controls (close/min/max)
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: !isDev, // relax in dev so localhost HTTP works
    },
  })

  // CSP: dev allows localhost HTTP, prod restricts to HTTPS
  const csp = isDev
    ? "default-src 'self' http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: http://localhost:* blob:; font-src 'self' data: https:; connect-src 'self' http://localhost:* ws://localhost:* https: wss:;"
    : "default-src 'self' https: wss:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss:;"

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })

  // Register all event listeners BEFORE loadURL to avoid race conditions
  let mainReady = false
  let splashDone = false

  const tryShowWindow = () => {
    if (!mainReady || !splashDone) return
    if (!splash.isDestroyed()) splash.destroy()
    if (!main.isVisible()) {
      main.show()
      main.focus()
    }
  }

  // Enforce minimum splash duration (10s)
  setTimeout(() => {
    splashDone = true
    tryShowWindow()
  }, SPLASH_MIN_MS)

  main.once('ready-to-show', () => {
    mainReady = true
    tryShowWindow()
  })

  // Fallback: show window after 15s even if ready-to-show never fires
  const fallbackTimer = setTimeout(() => {
    mainReady = true
    splashDone = true
    tryShowWindow()
  }, 15_000)

  main.once('ready-to-show', () => clearTimeout(fallbackTimer))

  // Offline fallback
  main.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[Window] did-fail-load code=${code} desc=${desc}`)
    if (code !== -3) { // -3 = aborted (navigation, not a real error)
      clearTimeout(fallbackTimer)
      main.loadFile(path.join(__dirname, '../../resources/offline.html'))
    }
  })

  // Open external links in browser
  main.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Minimize to tray on X (don't quit)
  let forceQuit = false
  main.on('close', (e) => {
    if (!forceQuit) {
      e.preventDefault()
      main.hide()
    }
  })

  ;(main as any).__setForceQuit = () => { forceQuit = true }

  // Load URL after listeners are set up
  main.loadURL(webUrl).catch((err) => {
    console.error('[Window] loadURL failed:', err)
    clearTimeout(fallbackTimer)
    main.loadFile(path.join(__dirname, '../../resources/offline.html'))
  })

  return main
}

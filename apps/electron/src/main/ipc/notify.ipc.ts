import { ipcMain, Notification } from 'electron'
import path from 'path'

const ICON = path.join(__dirname, '../../../resources/icon.ico')

export type NotifyPayload = {
  title: string
  body: string
  /** Optional — controls sound. Default: true */
  silent?: boolean
  /** Optional urgency tag shown in subtitle on Windows 10+ */
  subtitle?: string
}

export function setupNotifyIpc(): void {
  ipcMain.handle('notify:show', (_e, payload: NotifyPayload) => {
    if (!Notification.isSupported()) return { ok: false, error: 'Notificaciones no soportadas' }

    try {
      const n = new Notification({
        title: payload.title,
        body: payload.body,
        icon: ICON,
        silent: payload.silent ?? false,
        subtitle: payload.subtitle,
        timeoutType: 'default',
      })
      n.show()
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'Error al mostrar notificación' }
    }
  })

  ipcMain.handle('notify:supported', () => Notification.isSupported())
}

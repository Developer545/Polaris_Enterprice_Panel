import { ipcMain } from 'electron'
import { SerialPort } from 'serialport'

// ESC/POS cash drawer open command
// Pin 2: ESC p 0 25 250
// Pin 5: ESC p 1 25 250
const DRAWER_CMD_PIN2 = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa])
const DRAWER_CMD_PIN5 = Buffer.from([0x1b, 0x70, 0x01, 0x19, 0xfa])

export function setupDrawerIpc(): void {
  ipcMain.handle('drawer:open', async (_, port?: string, pin: 0 | 1 = 0) => {
    const targetPort = port ?? getCashDrawerPort()
    if (!targetPort) return { ok: false, error: 'Puerto de caja no configurado' }

    return new Promise((resolve) => {
      let serial: SerialPort | null = null

      try {
        serial = new SerialPort(
          { path: targetPort, baudRate: 9600, autoOpen: false },
        )

        serial.open((openErr) => {
          if (openErr) {
            resolve({ ok: false, error: `No se pudo abrir ${targetPort}: ${openErr.message}` })
            return
          }

          const cmd = pin === 1 ? DRAWER_CMD_PIN5 : DRAWER_CMD_PIN2

          serial!.write(cmd, (writeErr) => {
            if (writeErr) {
              serial!.close()
              resolve({ ok: false, error: `Error al escribir: ${writeErr.message}` })
              return
            }

            serial!.drain((drainErr) => {
              serial!.close()
              if (drainErr) {
                resolve({ ok: false, error: `Error drain: ${drainErr.message}` })
              } else {
                resolve({ ok: true })
              }
            })
          })
        })
      } catch (err: any) {
        try { serial?.close() } catch { /* ignore */ }
        resolve({ ok: false, error: err?.message ?? 'Error desconocido' })
      }
    })
  })

  ipcMain.handle('drawer:list-ports', async () => {
    try {
      const ports = await SerialPort.list()
      return {
        ok: true,
        ports: ports.map((p) => ({
          path: p.path,
          manufacturer: p.manufacturer,
          serialNumber: p.serialNumber,
        })),
      }
    } catch (err: any) {
      return { ok: false, ports: [], error: err?.message }
    }
  })
}

function getCashDrawerPort(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Store = require('electron-store')
    const store = new Store({ name: 'pos-dte-config' })
    return store.get('cashDrawerPort') as string | undefined
  } catch {
    return undefined
  }
}

import { ipcMain } from 'electron'
import path from 'path'
import { SimpleStore } from '../simple-store'

// ESC/POS cash drawer open command
// Pin 2: ESC p 0 25 250
// Pin 5: ESC p 1 25 250
const DRAWER_CMD_PIN2 = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa])
const DRAWER_CMD_PIN5 = Buffer.from([0x1b, 0x70, 0x01, 0x19, 0xfa])

export type DrawerResult = { ok: true } | { ok: false; error: string }

export async function openCashDrawer(port?: string, pin: 0 | 1 = 0): Promise<DrawerResult> {
  const targetPort = port ?? getCashDrawerPort()
  if (!targetPort) return { ok: false, error: 'Puerto de caja no configurado' }
  const SerialPort = await loadSerialPort()

  return new Promise((resolve) => {
    let serial: any = null

    try {
      serial = new SerialPort({ path: targetPort, baudRate: 9600, autoOpen: false })

      serial.open((openErr: Error | null) => {
        if (openErr) {
          resolve({ ok: false, error: `No se pudo abrir ${targetPort}: ${openErr.message}` })
          return
        }

        const cmd = pin === 1 ? DRAWER_CMD_PIN5 : DRAWER_CMD_PIN2

        serial!.write(cmd, (writeErr: Error | null) => {
          if (writeErr) {
            serial!.close()
            resolve({ ok: false, error: `Error al escribir: ${writeErr.message}` })
            return
          }

          serial!.drain((drainErr: Error | null) => {
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
}

export function setupDrawerIpc(): void {
  ipcMain.handle('drawer:open', async (_, port?: string, pin: 0 | 1 = 0) =>
    openCashDrawer(port, pin),
  )

  ipcMain.handle('drawer:list-ports', async () => {
    try {
      const SerialPort = await loadSerialPort()
      const ports = await SerialPort.list()
      return {
        ok: true,
        ports: ports.map((p: { path: string; manufacturer?: string; serialNumber?: string }) => ({
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

async function loadSerialPort(): Promise<any> {
  try {
    return (await import('serialport')).SerialPort
  } catch {
    // Local packaged builds keep runtime service dependencies in resources/local.
    // This fallback keeps app startup independent from native serial bindings.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(path.join(process.resourcesPath, 'local', 'node_modules', 'serialport')).SerialPort
  }
}

function getCashDrawerPort(): string | undefined {
  try {
    const store = new SimpleStore({ name: 'pos-dte-config' })
    return store.get('cashDrawerPort') as string | undefined
  } catch {
    return undefined
  }
}

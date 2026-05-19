import { ipcMain } from 'electron'
import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer'

export interface PrintReceiptPayload {
  businessName: string
  branchName: string
  address?: string
  nit?: string
  nrc?: string
  cashierName: string
  saleNumber: string
  date: string
  tipoDte: string   // 'CF' | 'CCF' | 'NC'
  items: Array<{
    description: string
    qty: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  iva: number
  total: number
  paymentMethod: string
  amountPaid?: number
  change?: number
  footer?: string
}

export interface PrintTestPayload {
  printerInterface: string
  printerType: string
  address?: string
}

// ── Last receipt store ────────────────────────────────────────────────────────
let _lastReceipt: PrintReceiptPayload | null = null

export function setLastReceipt(payload: PrintReceiptPayload): void {
  _lastReceipt = payload
}

export function printLastReceipt(): Promise<{ ok: boolean; error?: string }> {
  if (!_lastReceipt) return Promise.resolve({ ok: false, error: 'No hay ticket previo en memoria' })
  return executePrint(_lastReceipt)
}

// ── Core print logic ──────────────────────────────────────────────────────────
export async function executePrint(payload: PrintReceiptPayload): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig()
  const printer = buildPrinter(
    config.printerInterface ?? 'usb',
    config.printerType ?? 'EPSON',
    config.printerAddress,
  )

  const isConnected = await printer.isPrinterConnected()
  if (!isConnected) return { ok: false, error: 'Impresora no conectada' }

  try {
    await _doPrint(printer, payload)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Error de impresión' }
  }
}

async function _doPrint(printer: ThermalPrinter, payload: PrintReceiptPayload): Promise<void> {
  // Header
  printer.alignCenter()
  printer.bold(true)
  printer.setTextSize(1, 1)
  printer.println(payload.businessName)
  printer.bold(false)
  printer.setTextNormal()
  if (payload.address) printer.println(payload.address)
  if (payload.nit) printer.println(`NIT: ${payload.nit}`)
  if (payload.nrc) printer.println(`NRC: ${payload.nrc}`)
  printer.drawLine()

  // Document type
  printer.alignCenter()
  printer.bold(true)
  const docLabel =
    payload.tipoDte === 'CCF' ? 'CREDITO FISCAL'
    : payload.tipoDte === 'NC' ? 'NOTA DE CREDITO'
    : 'CONSUMIDOR FINAL'
  printer.println(docLabel)
  printer.bold(false)
  printer.println(`No. ${payload.saleNumber}`)
  printer.println(payload.date)
  printer.drawLine()

  // Branch / cashier
  printer.alignLeft()
  printer.println(`Sucursal: ${payload.branchName}`)
  printer.println(`Cajero:   ${payload.cashierName}`)
  printer.drawLine()

  // Items header
  printer.tableCustom([
    { text: 'Descripcion', align: 'LEFT', width: 0.45 },
    { text: 'Cant', align: 'RIGHT', width: 0.1 },
    { text: 'Precio', align: 'RIGHT', width: 0.2 },
    { text: 'Total', align: 'RIGHT', width: 0.25 },
  ])
  printer.drawLine()

  // Items
  for (const item of payload.items) {
    printer.tableCustom([
      { text: item.description.substring(0, 22), align: 'LEFT', width: 0.45 },
      { text: String(item.qty), align: 'RIGHT', width: 0.1 },
      { text: formatMoney(item.unitPrice), align: 'RIGHT', width: 0.2 },
      { text: formatMoney(item.total), align: 'RIGHT', width: 0.25 },
    ])
  }

  printer.drawLine()

  // Totals
  printer.alignRight()
  printer.println(`Subtotal: ${formatMoney(payload.subtotal)}`)
  printer.println(`IVA 13%:  ${formatMoney(payload.iva)}`)
  printer.bold(true)
  printer.setTextSize(1, 1)
  printer.println(`TOTAL:    ${formatMoney(payload.total)}`)
  printer.bold(false)
  printer.setTextNormal()
  printer.drawLine()

  // Payment
  printer.alignLeft()
  printer.println(`Forma de pago: ${payload.paymentMethod}`)
  if (payload.amountPaid != null) printer.println(`Efectivo:      ${formatMoney(payload.amountPaid)}`)
  if (payload.change != null && payload.change > 0) printer.println(`Cambio:        ${formatMoney(payload.change)}`)

  printer.drawLine()

  // Footer
  printer.alignCenter()
  printer.println(payload.footer ?? 'Gracias por su compra')
  printer.println('Speeddan System')

  printer.cut()
  await printer.execute()
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
export function setupPrintIpc(): void {
  ipcMain.handle('print:receipt', async (_, payload: PrintReceiptPayload) => {
    setLastReceipt(payload)
    return executePrint(payload)
  })

  ipcMain.handle('print:set-last-receipt', (_, payload: PrintReceiptPayload) => {
    setLastReceipt(payload)
  })

  ipcMain.handle('print:test', async (_, payload: PrintTestPayload) => {
    const printer = buildPrinter(payload.printerInterface, payload.printerType, payload.address)
    const isConnected = await printer.isPrinterConnected()
    if (!isConnected) return { ok: false, error: 'Impresora no conectada' }

    try {
      printer.alignCenter()
      printer.bold(true)
      printer.println('--- PRUEBA DE IMPRESION ---')
      printer.bold(false)
      printer.println('POS DTE El Salvador')
      printer.println('Speeddan System')
      printer.drawLine()
      printer.println('Impresora configurada correctamente')
      printer.cut()
      await printer.execute()
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'Error de impresion' }
    }
  })

  ipcMain.handle('print:status', async () => {
    const config = getConfig()
    const printer = buildPrinter(
      config.printerInterface ?? 'usb',
      config.printerType ?? 'EPSON',
      config.printerAddress,
    )
    const connected = await printer.isPrinterConnected()
    return { connected }
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildPrinter(iface: string, type: string, address?: string) {
  const printerType = type === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON

  const opts: ConstructorParameters<typeof ThermalPrinter>[0] = {
    type: printerType,
    interface: address ?? 'printer:default',
    characterSet: CharacterSet.PC858_EURO,
    breakLine: BreakLine.WORD,
    removeSpecialCharacters: false,
    lineCharacter: '-',
  }

  if (iface === 'network' && address) {
    opts.interface = `tcp://${address}`
  } else if (iface === 'serial' && address) {
    opts.interface = address
  } else {
    opts.interface = address ?? 'printer:default'
  }

  return new ThermalPrinter(opts)
}

function formatMoney(n: number): string {
  return `$${Number(n).toFixed(2)}`
}

function getConfig(): { printerInterface?: string; printerType?: string; printerAddress?: string } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Store = require('electron-store')
    const store = new Store({ name: 'pos-dte-config' })
    return {
      printerInterface: store.get('printerInterface') as string | undefined,
      printerType: store.get('printerType') as string | undefined,
      printerAddress: store.get('printerAddress') as string | undefined,
    }
  } catch {
    return {}
  }
}

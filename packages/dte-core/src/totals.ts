import Decimal from 'decimal.js'

// Configure Decimal for DTE calculations (2 decimal places, ROUND_HALF_UP)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export const IVA_RATE = new Decimal('0.13')

export interface SaleLineInput {
  quantity: number | string
  unitPrice: number | string
  discount?: number | string
  isExempt?: boolean
  isNotSubject?: boolean
}

export interface SaleLineTotals {
  quantity: Decimal
  unitPrice: Decimal
  discount: Decimal
  subtotalBruto: Decimal  // quantity * unitPrice
  ventaGravada: Decimal
  ventaExenta: Decimal
  ventaNoSujeta: Decimal
  ivaItem: Decimal        // IVA incluido en venta gravada (para CF)
}

/**
 * Calculate totals for a single sale line
 * For CF (Factura): prices are IVA-inclusive, ivaItem = ventaGravada * 13/113
 * For CCF (Crédito Fiscal): prices are IVA-exclusive, ivaItem = ventaGravada * 0.13
 */
export function calcLineTotals(
  input: SaleLineInput,
  tipoDte: '01' | '03' | '05' | '06',
): SaleLineTotals {
  const qty = new Decimal(input.quantity)
  const price = new Decimal(input.unitPrice)
  const discount = new Decimal(input.discount ?? 0)

  const subtotalBruto = qty.mul(price).minus(discount)

  let ventaGravada = new Decimal(0)
  let ventaExenta = new Decimal(0)
  let ventaNoSujeta = new Decimal(0)
  let ivaItem = new Decimal(0)

  if (input.isNotSubject) {
    ventaNoSujeta = subtotalBruto
  } else if (input.isExempt) {
    ventaExenta = subtotalBruto
  } else {
    ventaGravada = subtotalBruto
    if (tipoDte === '01' || tipoDte === '05') {
      // CF: precio incluye IVA → IVA = gravada * 13/113
      ivaItem = ventaGravada.mul(13).div(113).toDecimalPlaces(2)
    } else {
      // CCF: precio sin IVA → IVA = gravada * 13%
      ivaItem = ventaGravada.mul(IVA_RATE).toDecimalPlaces(2)
    }
  }

  return {
    quantity: qty,
    unitPrice: price,
    discount,
    subtotalBruto,
    ventaGravada: ventaGravada.toDecimalPlaces(2),
    ventaExenta: ventaExenta.toDecimalPlaces(2),
    ventaNoSujeta: ventaNoSujeta.toDecimalPlaces(2),
    ivaItem,
  }
}

export interface SaleSummaryInput {
  lines: SaleLineTotals[]
  conditionOp?: number
}

export interface SaleSummary {
  totalNoSuj: Decimal
  totalExenta: Decimal
  totalGravada: Decimal
  subTotalVentas: Decimal
  totalDescu: Decimal
  subTotal: Decimal
  totalIva: Decimal
  montoTotalOperacion: Decimal
  totalPagar: Decimal
}

export function calcSaleSummary(input: SaleSummaryInput): SaleSummary {
  const totalNoSuj = input.lines
    .reduce((a, l) => a.plus(l.ventaNoSujeta), new Decimal(0))
    .toDecimalPlaces(2)
  const totalExenta = input.lines
    .reduce((a, l) => a.plus(l.ventaExenta), new Decimal(0))
    .toDecimalPlaces(2)
  const totalGravada = input.lines
    .reduce((a, l) => a.plus(l.ventaGravada), new Decimal(0))
    .toDecimalPlaces(2)
  const totalDescu = input.lines
    .reduce((a, l) => a.plus(l.discount), new Decimal(0))
    .toDecimalPlaces(2)
  const totalIva = input.lines
    .reduce((a, l) => a.plus(l.ivaItem), new Decimal(0))
    .toDecimalPlaces(2)

  const subTotalVentas = totalNoSuj.plus(totalExenta).plus(totalGravada)
  const subTotal = subTotalVentas.minus(totalDescu)
  const montoTotalOperacion = subTotal.toDecimalPlaces(2)
  const totalPagar = montoTotalOperacion

  return {
    totalNoSuj,
    totalExenta,
    totalGravada,
    subTotalVentas,
    totalDescu,
    subTotal,
    totalIva,
    montoTotalOperacion,
    totalPagar,
  }
}

/** Convert number to Spanish words for totalLetras */
export function numberToWords(amount: Decimal): string {
  // Simplified — use a proper library in production (e.g. written-number)
  const cents = amount.minus(amount.floor()).mul(100).toFixed(0)
  const intPart = amount.floor().toNumber()
  return `${intPart.toString().toUpperCase()} ${cents}/100 DÓLARES`
}

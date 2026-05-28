import Decimal from 'decimal.js'

// Configure Decimal for DTE calculations (2 decimal places, ROUND_HALF_UP)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export const IVA_RATE = new Decimal('0.13')
export const IVA_RETENTION_RATE = new Decimal('0.01')
export const IVA_RETENTION_MIN_BASE = new Decimal('100')

export interface SaleLineInput {
  quantity: number | string
  unitPrice: number | string
  discount?: number | string
  isExempt?: boolean
  isNotSubject?: boolean
  priceIncludesIva?: boolean
}

export interface SaleLineTotals {
  quantity: Decimal
  unitPrice: Decimal
  discount: Decimal
  subtotalBruto: Decimal  // quantity * unitPrice before line discount
  ventaGravada: Decimal
  ventaExenta: Decimal
  ventaNoSujeta: Decimal
  ivaItem: Decimal
}

export type SaleTipoDteForTotals = '01' | '03' | '05' | '06'

function defaultPriceIncludesIva(tipoDte: SaleTipoDteForTotals): boolean {
  return tipoDte === '01'
}

/**
 * Calculate totals for a single sale line.
 * CF (01): unitPrice is the final consumer price with IVA included.
 * CCF (03): unitPrice is the taxable base; IVA is added visibly.
 * NC/ND (05/06): default to base prices because they usually adjust CCFs.
 */
export function calcLineTotals(
  input: SaleLineInput,
  tipoDte: SaleTipoDteForTotals,
): SaleLineTotals {
  const qty = new Decimal(input.quantity)
  const price = new Decimal(input.unitPrice)
  const discount = new Decimal(input.discount ?? 0)

  const subtotalBruto = qty.mul(price)
  if (discount.greaterThan(subtotalBruto)) {
    throw new Error('El descuento de linea no puede ser mayor que el subtotal')
  }
  const taxableAmount = subtotalBruto.minus(discount)
  const priceIncludesIva = input.priceIncludesIva ?? defaultPriceIncludesIva(tipoDte)

  let ventaGravada = new Decimal(0)
  let ventaExenta = new Decimal(0)
  let ventaNoSujeta = new Decimal(0)
  let ivaItem = new Decimal(0)

  if (input.isNotSubject) {
    ventaNoSujeta = taxableAmount
  } else if (input.isExempt) {
    ventaExenta = taxableAmount
  } else {
    ventaGravada = taxableAmount
    ivaItem = priceIncludesIva
      ? ventaGravada.mul(IVA_RATE).div(new Decimal(1).plus(IVA_RATE)).toDecimalPlaces(2)
      : ventaGravada.mul(IVA_RATE).toDecimalPlaces(2)
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
  tipoDte: SaleTipoDteForTotals
  ivaRete1?: number | string | Decimal
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
  ivaRete1: Decimal
  montoTotalOperacion: Decimal
  totalPagar: Decimal
}

export interface IvaRetentionInput {
  tipoDte: SaleTipoDteForTotals
  taxableBase: number | string | Decimal
  buyerRetainsIva1: boolean
  sellerSubjectToRetention?: boolean
  sellerIsGranContribuyente?: boolean
}

export function calcIvaRetention1(input: IvaRetentionInput): Decimal {
  if (input.tipoDte !== '03') return new Decimal(0)
  if (!input.buyerRetainsIva1) return new Decimal(0)
  if (input.sellerSubjectToRetention === false) return new Decimal(0)
  if (input.sellerIsGranContribuyente) return new Decimal(0)

  const taxableBase = new Decimal(input.taxableBase).toDecimalPlaces(2)
  if (taxableBase.lessThan(IVA_RETENTION_MIN_BASE)) return new Decimal(0)

  return taxableBase.mul(IVA_RETENTION_RATE).toDecimalPlaces(2)
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
  const ivaRete1 = new Decimal(input.ivaRete1 ?? 0).toDecimalPlaces(2)

  const subTotalVentas = totalNoSuj.plus(totalExenta).plus(totalGravada).toDecimalPlaces(2)
  // Line amounts are already net of line discounts; do not discount them twice.
  const subTotal = subTotalVentas
  const montoTotalOperacion = input.tipoDte === '01'
    ? subTotal.toDecimalPlaces(2)
    : subTotal.plus(totalIva).toDecimalPlaces(2)
  const totalPagar = montoTotalOperacion.minus(ivaRete1).toDecimalPlaces(2)
  if (totalPagar.lessThan(0)) throw new Error('La retencion no puede ser mayor que el total de la operacion')

  return {
    totalNoSuj,
    totalExenta,
    totalGravada,
    subTotalVentas,
    totalDescu,
    subTotal,
    totalIva,
    ivaRete1,
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

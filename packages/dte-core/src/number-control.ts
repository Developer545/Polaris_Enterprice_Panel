import type { TipoDte } from '@pos-dte/shared-types'

/**
 * Generate DTE numeroControl
 * Format: DTE-{tipoDte}-{codEstable}{codPuntoVenta}-{sequence 15 digits}
 * Example: DTE-01-M001P001-000000000000001
 */
export function buildNumeroControl(params: {
  tipoDte: TipoDte
  codEstable: string
  codPuntoVenta: string
  sequence: number
}): string {
  const { tipoDte, codEstable, codPuntoVenta, sequence } = params
  const seq = String(sequence).padStart(15, '0')
  return `DTE-${tipoDte}-${codEstable}${codPuntoVenta}-${seq}`
}

/**
 * Validate numeroControl format
 */
export function validateNumeroControl(numeroControl: string): boolean {
  return /^DTE-\d{2}-\w{4}\w{4}-\d{15}$/.test(numeroControl)
}

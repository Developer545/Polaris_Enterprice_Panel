/**
 * Format a number as currency (USD)
 * @example fmt(12.5) → '$12.50'
 */
export const fmt = (n: number | string | null | undefined): string =>
  n != null ? `$${Number(n).toFixed(2)}` : '—'

import type { TipoDte } from '@pos-dte/shared-types';
/**
 * Generate DTE numeroControl
 * Format: DTE-{tipoDte}-{codEstable}{codPuntoVenta}-{sequence 15 digits}
 * Example: DTE-01-M001P001-000000000000001
 */
export declare function buildNumeroControl(params: {
    tipoDte: TipoDte;
    codEstable: string;
    codPuntoVenta: string;
    sequence: number;
}): string;
/**
 * Validate numeroControl format
 */
export declare function validateNumeroControl(numeroControl: string): boolean;

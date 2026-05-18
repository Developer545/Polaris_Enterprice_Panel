import Decimal from 'decimal.js';
export declare const IVA_RATE: Decimal;
export interface SaleLineInput {
    quantity: number | string;
    unitPrice: number | string;
    discount?: number | string;
    isExempt?: boolean;
    isNotSubject?: boolean;
}
export interface SaleLineTotals {
    quantity: Decimal;
    unitPrice: Decimal;
    discount: Decimal;
    subtotalBruto: Decimal;
    ventaGravada: Decimal;
    ventaExenta: Decimal;
    ventaNoSujeta: Decimal;
    ivaItem: Decimal;
}
/**
 * Calculate totals for a single sale line
 * For CF (Factura): prices are IVA-inclusive, ivaItem = ventaGravada * 13/113
 * For CCF (Crédito Fiscal): prices are IVA-exclusive, ivaItem = ventaGravada * 0.13
 */
export declare function calcLineTotals(input: SaleLineInput, tipoDte: '01' | '03' | '05' | '06'): SaleLineTotals;
export interface SaleSummaryInput {
    lines: SaleLineTotals[];
    conditionOp?: number;
}
export interface SaleSummary {
    totalNoSuj: Decimal;
    totalExenta: Decimal;
    totalGravada: Decimal;
    subTotalVentas: Decimal;
    totalDescu: Decimal;
    subTotal: Decimal;
    totalIva: Decimal;
    montoTotalOperacion: Decimal;
    totalPagar: Decimal;
}
export declare function calcSaleSummary(input: SaleSummaryInput): SaleSummary;
/** Convert number to Spanish words for totalLetras */
export declare function numberToWords(amount: Decimal): string;

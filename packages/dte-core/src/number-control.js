"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNumeroControl = buildNumeroControl;
exports.validateNumeroControl = validateNumeroControl;
/**
 * Generate DTE numeroControl
 * Format: DTE-{tipoDte}-{codEstable}{codPuntoVenta}-{sequence 15 digits}
 * Example: DTE-01-M001P001-000000000000001
 */
function buildNumeroControl(params) {
    const { tipoDte, codEstable, codPuntoVenta, sequence } = params;
    const seq = String(sequence).padStart(15, '0');
    return `DTE-${tipoDte}-${codEstable}${codPuntoVenta}-${seq}`;
}
/**
 * Validate numeroControl format
 */
function validateNumeroControl(numeroControl) {
    return /^DTE-\d{2}-\w{4}\w{4}-\d{15}$/.test(numeroControl);
}
//# sourceMappingURL=number-control.js.map
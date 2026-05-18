"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IVA_RATE = void 0;
exports.calcLineTotals = calcLineTotals;
exports.calcSaleSummary = calcSaleSummary;
exports.numberToWords = numberToWords;
const decimal_js_1 = __importDefault(require("decimal.js"));
// Configure Decimal for DTE calculations (2 decimal places, ROUND_HALF_UP)
decimal_js_1.default.set({ precision: 20, rounding: decimal_js_1.default.ROUND_HALF_UP });
exports.IVA_RATE = new decimal_js_1.default('0.13');
/**
 * Calculate totals for a single sale line
 * For CF (Factura): prices are IVA-inclusive, ivaItem = ventaGravada * 13/113
 * For CCF (Crédito Fiscal): prices are IVA-exclusive, ivaItem = ventaGravada * 0.13
 */
function calcLineTotals(input, tipoDte) {
    const qty = new decimal_js_1.default(input.quantity);
    const price = new decimal_js_1.default(input.unitPrice);
    const discount = new decimal_js_1.default(input.discount ?? 0);
    const subtotalBruto = qty.mul(price).minus(discount);
    let ventaGravada = new decimal_js_1.default(0);
    let ventaExenta = new decimal_js_1.default(0);
    let ventaNoSujeta = new decimal_js_1.default(0);
    let ivaItem = new decimal_js_1.default(0);
    if (input.isNotSubject) {
        ventaNoSujeta = subtotalBruto;
    }
    else if (input.isExempt) {
        ventaExenta = subtotalBruto;
    }
    else {
        ventaGravada = subtotalBruto;
        if (tipoDte === '01' || tipoDte === '05') {
            // CF: precio incluye IVA → IVA = gravada * 13/113
            ivaItem = ventaGravada.mul(13).div(113).toDecimalPlaces(2);
        }
        else {
            // CCF: precio sin IVA → IVA = gravada * 13%
            ivaItem = ventaGravada.mul(exports.IVA_RATE).toDecimalPlaces(2);
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
    };
}
function calcSaleSummary(input) {
    const totalNoSuj = input.lines
        .reduce((a, l) => a.plus(l.ventaNoSujeta), new decimal_js_1.default(0))
        .toDecimalPlaces(2);
    const totalExenta = input.lines
        .reduce((a, l) => a.plus(l.ventaExenta), new decimal_js_1.default(0))
        .toDecimalPlaces(2);
    const totalGravada = input.lines
        .reduce((a, l) => a.plus(l.ventaGravada), new decimal_js_1.default(0))
        .toDecimalPlaces(2);
    const totalDescu = input.lines
        .reduce((a, l) => a.plus(l.discount), new decimal_js_1.default(0))
        .toDecimalPlaces(2);
    const totalIva = input.lines
        .reduce((a, l) => a.plus(l.ivaItem), new decimal_js_1.default(0))
        .toDecimalPlaces(2);
    const subTotalVentas = totalNoSuj.plus(totalExenta).plus(totalGravada);
    const subTotal = subTotalVentas.minus(totalDescu);
    const montoTotalOperacion = subTotal.toDecimalPlaces(2);
    const totalPagar = montoTotalOperacion;
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
    };
}
/** Convert number to Spanish words for totalLetras */
function numberToWords(amount) {
    // Simplified — use a proper library in production (e.g. written-number)
    const cents = amount.minus(amount.floor()).mul(100).toFixed(0);
    const intPart = amount.floor().toNumber();
    return `${intPart.toString().toUpperCase()} ${cents}/100 DÓLARES`;
}
//# sourceMappingURL=totals.js.map
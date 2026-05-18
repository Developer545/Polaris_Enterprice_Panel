"use strict";
// DTE El Salvador — shared types between API and frontend
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATALOGO_AMBIENTE = exports.CATALOGO_CONDICION_OPERACION = exports.CATALOGO_FORMA_PAGO = exports.CATALOGO_TIPO_ITEM = exports.CATALOGO_TIPO_DTE = void 0;
// ─── Catálogos Hacienda (valores más usados) ──────────────────────────────────
exports.CATALOGO_TIPO_DTE = {
    '01': 'Factura',
    '03': 'Comprobante de Crédito Fiscal',
    '05': 'Nota de Crédito',
    '06': 'Nota de Débito',
    '14': 'Factura de Exportación',
    '11': 'Factura de Sujeto Excluido',
};
exports.CATALOGO_TIPO_ITEM = {
    1: 'Bien',
    2: 'Servicio',
    3: 'Ambos',
    4: 'Otros cargos',
};
exports.CATALOGO_FORMA_PAGO = {
    '01': 'Billetes y monedas',
    '02': 'Tarjeta débito',
    '03': 'Tarjeta crédito',
    '04': 'Cheque',
    '05': 'Transferencia-Depósito bancario',
    '06': 'Dinero electrónico',
    '07': 'Vales / Bonos',
    '08': 'Giro postal',
    '09': 'Pago a cuenta / Anticipo',
    '99': 'Otros',
};
exports.CATALOGO_CONDICION_OPERACION = {
    1: 'Contado',
    2: 'A Crédito',
    3: 'Otro',
};
exports.CATALOGO_AMBIENTE = {
    '00': 'Pruebas',
    '01': 'Producción',
};
//# sourceMappingURL=dte.types.js.map
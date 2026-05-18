"use strict";
// Catálogos oficiales Ministerio de Hacienda El Salvador
// Fuente: Guía de Integración Factura Electrónica SV
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEPARTAMENTOS = exports.CAT_022_TIPO_DOCUMENTO_RECEPTOR = exports.CAT_019_CONDICION_OPERACION = exports.CAT_017_FORMA_PAGO = exports.CAT_014_UNIDAD_MEDIDA = exports.CAT_005_TIPO_ITEM = exports.CAT_002_TIPO_DTE = exports.CAT_001_AMBIENTE = void 0;
exports.CAT_001_AMBIENTE = {
    PRUEBAS: '00',
    PRODUCCION: '01',
};
exports.CAT_002_TIPO_DTE = {
    FACTURA: '01',
    FACTURA_SUJETO_EXCLUIDO: '03', // Note: in some docs 03 is CCF, check official catalog
    CCF: '03',
    NOTA_REMISION: '04',
    NOTA_CREDITO: '05',
    NOTA_DEBITO: '06',
    COMPROBANTE_LIQUIDACION: '07',
    DOC_CONTABLE_LIQUIDACION: '08',
    FACTURA_EXPORTACION: '11',
    COMPROBANTE_DONACION: '14',
    COMPROBANTE_RETENCION: '15',
};
exports.CAT_005_TIPO_ITEM = {
    BIEN: 1,
    SERVICIO: 2,
    AMBOS: 3,
    OTROS_CARGOS: 4,
};
exports.CAT_014_UNIDAD_MEDIDA = {
    // Most common values
    UNIDAD: 59,
    METRO: 1,
    KILOGRAMO: 5,
    LITRO: 6,
    CAJA: 26,
    PAQUETE: 99,
    SERVICIO: 99,
    OTRO: 99,
};
exports.CAT_017_FORMA_PAGO = {
    EFECTIVO: '01',
    TARJETA_DEBITO: '02',
    TARJETA_CREDITO: '03',
    CHEQUE: '04',
    TRANSFERENCIA: '05',
    DINERO_ELECTRONICO: '06',
    VALES_BONOS: '07',
    GIRO_POSTAL: '08',
    ANTICIPO: '09',
    OTROS: '99',
};
exports.CAT_019_CONDICION_OPERACION = {
    CONTADO: 1,
    CREDITO: 2,
    OTRO: 3,
};
exports.CAT_022_TIPO_DOCUMENTO_RECEPTOR = {
    NIT: '36',
    DUI: '13',
    OTRO: '37',
    PASAPORTE: '03',
    CARNET_RESIDENTE: '02',
    NRC: '36', // alias
};
// Departamentos El Salvador
exports.DEPARTAMENTOS = {
    '01': 'Ahuachapán',
    '02': 'Santa Ana',
    '03': 'Sonsonate',
    '04': 'Chalatenango',
    '05': 'La Libertad',
    '06': 'San Salvador',
    '07': 'Cuscatlán',
    '08': 'La Paz',
    '09': 'Cabañas',
    '10': 'San Vicente',
    '11': 'Usulután',
    '12': 'San Miguel',
    '13': 'Morazán',
    '14': 'La Unión',
};
//# sourceMappingURL=index.js.map
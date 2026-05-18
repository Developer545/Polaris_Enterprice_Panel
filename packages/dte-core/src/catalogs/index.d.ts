export declare const CAT_001_AMBIENTE: {
    readonly PRUEBAS: "00";
    readonly PRODUCCION: "01";
};
export declare const CAT_002_TIPO_DTE: {
    readonly FACTURA: "01";
    readonly FACTURA_SUJETO_EXCLUIDO: "03";
    readonly CCF: "03";
    readonly NOTA_REMISION: "04";
    readonly NOTA_CREDITO: "05";
    readonly NOTA_DEBITO: "06";
    readonly COMPROBANTE_LIQUIDACION: "07";
    readonly DOC_CONTABLE_LIQUIDACION: "08";
    readonly FACTURA_EXPORTACION: "11";
    readonly COMPROBANTE_DONACION: "14";
    readonly COMPROBANTE_RETENCION: "15";
};
export declare const CAT_005_TIPO_ITEM: {
    readonly BIEN: 1;
    readonly SERVICIO: 2;
    readonly AMBOS: 3;
    readonly OTROS_CARGOS: 4;
};
export declare const CAT_014_UNIDAD_MEDIDA: {
    readonly UNIDAD: 59;
    readonly METRO: 1;
    readonly KILOGRAMO: 5;
    readonly LITRO: 6;
    readonly CAJA: 26;
    readonly PAQUETE: 99;
    readonly SERVICIO: 99;
    readonly OTRO: 99;
};
export declare const CAT_017_FORMA_PAGO: {
    readonly EFECTIVO: "01";
    readonly TARJETA_DEBITO: "02";
    readonly TARJETA_CREDITO: "03";
    readonly CHEQUE: "04";
    readonly TRANSFERENCIA: "05";
    readonly DINERO_ELECTRONICO: "06";
    readonly VALES_BONOS: "07";
    readonly GIRO_POSTAL: "08";
    readonly ANTICIPO: "09";
    readonly OTROS: "99";
};
export declare const CAT_019_CONDICION_OPERACION: {
    readonly CONTADO: 1;
    readonly CREDITO: 2;
    readonly OTRO: 3;
};
export declare const CAT_022_TIPO_DOCUMENTO_RECEPTOR: {
    readonly NIT: "36";
    readonly DUI: "13";
    readonly OTRO: "37";
    readonly PASAPORTE: "03";
    readonly CARNET_RESIDENTE: "02";
    readonly NRC: "36";
};
export declare const DEPARTAMENTOS: Record<string, string>;

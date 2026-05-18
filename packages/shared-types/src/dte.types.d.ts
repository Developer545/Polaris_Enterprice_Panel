export type TipoDte = '01' | '03' | '05' | '06' | '14' | '11';
export type DteAmbiente = '00' | '01';
export type DteEstado = 'DRAFT' | 'GENERATED' | 'SCHEMA_VALIDATED' | 'SIGNED' | 'SENDING' | 'PROCESSED' | 'PROCESSED_WITH_OBSERVATIONS' | 'REJECTED' | 'CONNECTION_ERROR' | 'CONTINGENCY' | 'ANNULLED';
export declare const CATALOGO_TIPO_DTE: Record<TipoDte, string>;
export declare const CATALOGO_TIPO_ITEM: Record<number, string>;
export declare const CATALOGO_FORMA_PAGO: Record<string, string>;
export declare const CATALOGO_CONDICION_OPERACION: Record<number, string>;
export declare const CATALOGO_AMBIENTE: Record<DteAmbiente, string>;
export interface DteIdentificacion {
    version: number;
    ambiente: DteAmbiente;
    tipoDte: TipoDte;
    numeroControl: string;
    codigoGeneracion: string;
    tipoModelo: number;
    tipoOperacion: number;
    tipoContingencia: number | null;
    motivoContin: string | null;
    fecEmi: string;
    horEmi: string;
    tipoMoneda: string;
}
export interface DteEmisor {
    nit: string;
    nrc: string;
    nombre: string;
    codActividad: string;
    descActividad: string;
    nombreComercial?: string;
    tipoEstablecimiento: string;
    direccion: {
        departamento: string;
        municipio: string;
        complemento: string;
    };
    telefono?: string;
    correo: string;
    codEstableMH?: string;
    codEstable?: string;
    codPuntoVentaMH?: string;
    codPuntoVenta?: string;
}
export interface DteReceptor {
    tipoDocumento: string | null;
    numDocumento: string | null;
    nrc: string | null;
    nombre: string;
    codActividad: string | null;
    descActividad: string | null;
    direccion: {
        departamento: string;
        municipio: string;
        complemento: string;
    } | null;
    telefono: string | null;
    correo: string | null;
}
export interface DteCuerpoItem {
    numItem: number;
    tipoItem: number;
    numeroDocumento: string | null;
    cantidad: number;
    codigo: string | null;
    codTributo: string | null;
    uniMedida: number;
    descripcion: string;
    precioUni: number;
    montoDescu: number;
    ventaNoSuj: number;
    ventaExenta: number;
    ventaGravada: number;
    tributos: string[] | null;
    psv: number;
    noGravado: number;
    ivaItem: number;
}
export interface DteResumen {
    totalNoSuj: number;
    totalExenta: number;
    totalGravada: number;
    subTotalVentas: number;
    descuNoSuj: number;
    descuExenta: number;
    descuGravada: number;
    porcentajeDescuento: number;
    totalDescu: number;
    subTotal: number;
    ivaRete1: number;
    reteRenta: number;
    montoTotalOperacion: number;
    totalNoGravado: number;
    totalPagar: number;
    totalLetras: string;
    totalIva: number;
    saldoFavor: number;
    condicionOperacion: number;
    pagos: Array<{
        codigo: string;
        montoPago: number;
        referencia: string | null;
        plazo: string | null;
        periodo: number | null;
    }>;
    numPagoElectronico: string | null;
}
export interface DteJson {
    identificacion: DteIdentificacion;
    documentoRelacionado: unknown | null;
    emisor: DteEmisor;
    receptor: DteReceptor;
    otrosDocumentos: unknown | null;
    ventaTercero: unknown | null;
    cuerpoDocumento: DteCuerpoItem[];
    resumen: DteResumen;
    extension: unknown | null;
    apendice: unknown[] | null;
}
export interface HaciendaAuthResponse {
    status: 'OK' | 'ERROR';
    body: {
        user: string;
        token: string;
        tokenType: string;
    };
}
export interface HaciendaRecepcionResponse {
    version: number;
    ambiente: DteAmbiente;
    versionApp: number;
    estado: 'PROCESADO' | 'RECHAZADO' | 'CONTINGENCIA';
    codigoGeneracion: string;
    selloRecibido: string | null;
    fhProcesamiento: string;
    codigoMsg: string;
    descripcionMsg: string;
    observaciones: string[];
}

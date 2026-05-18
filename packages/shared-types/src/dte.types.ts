// DTE El Salvador — shared types between API and frontend

export type TipoDte = '01' | '03' | '05' | '06' | '14' | '11'
// 01=Factura CF, 03=CCF, 05=NC, 06=ND, 14=Exportación, 11=Factura Suj.Excluido

export type DteAmbiente = '00' | '01' // 00=pruebas, 01=producción

export type DteEstado =
  | 'DRAFT'
  | 'GENERATED'
  | 'SCHEMA_VALIDATED'
  | 'SIGNED'
  | 'SENDING'
  | 'PROCESSED'
  | 'PROCESSED_WITH_OBSERVATIONS'
  | 'REJECTED'
  | 'CONNECTION_ERROR'
  | 'CONTINGENCY'
  | 'ANNULLED'

// ─── Catálogos Hacienda (valores más usados) ──────────────────────────────────

export const CATALOGO_TIPO_DTE: Record<TipoDte, string> = {
  '01': 'Factura',
  '03': 'Comprobante de Crédito Fiscal',
  '05': 'Nota de Crédito',
  '06': 'Nota de Débito',
  '14': 'Factura de Exportación',
  '11': 'Factura de Sujeto Excluido',
}

export const CATALOGO_TIPO_ITEM: Record<number, string> = {
  1: 'Bien',
  2: 'Servicio',
  3: 'Ambos',
  4: 'Otros cargos',
}

export const CATALOGO_FORMA_PAGO: Record<string, string> = {
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
}

export const CATALOGO_CONDICION_OPERACION: Record<number, string> = {
  1: 'Contado',
  2: 'A Crédito',
  3: 'Otro',
}

export const CATALOGO_AMBIENTE: Record<DteAmbiente, string> = {
  '00': 'Pruebas',
  '01': 'Producción',
}

// ─── DTE JSON structure (simplified for frontend display) ────────────────────

export interface DteIdentificacion {
  version: number
  ambiente: DteAmbiente
  tipoDte: TipoDte
  numeroControl: string
  codigoGeneracion: string
  tipoModelo: number
  tipoOperacion: number
  tipoContingencia: number | null
  motivoContin: string | null
  fecEmi: string   // YYYY-MM-DD
  horEmi: string   // HH:mm:ss
  tipoMoneda: string
}

export interface DteEmisor {
  nit: string
  nrc: string
  nombre: string
  codActividad: string
  descActividad: string
  nombreComercial?: string
  tipoEstablecimiento: string
  direccion: { departamento: string; municipio: string; complemento: string }
  telefono?: string
  correo: string
  codEstableMH?: string
  codEstable?: string
  codPuntoVentaMH?: string
  codPuntoVenta?: string
}

export interface DteReceptor {
  tipoDocumento: string | null
  numDocumento: string | null
  nrc: string | null
  nombre: string
  codActividad: string | null
  descActividad: string | null
  direccion: { departamento: string; municipio: string; complemento: string } | null
  telefono: string | null
  correo: string | null
}

export interface DteCuerpoItem {
  numItem: number
  tipoItem: number
  numeroDocumento: string | null
  cantidad: number
  codigo: string | null
  codTributo: string | null
  uniMedida: number
  descripcion: string
  precioUni: number
  montoDescu: number
  ventaNoSuj: number
  ventaExenta: number
  ventaGravada: number
  tributos: string[] | null
  psv: number
  noGravado: number
  ivaItem: number
}

export interface DteResumen {
  totalNoSuj: number
  totalExenta: number
  totalGravada: number
  subTotalVentas: number
  descuNoSuj: number
  descuExenta: number
  descuGravada: number
  porcentajeDescuento: number
  totalDescu: number
  subTotal: number
  ivaRete1: number
  reteRenta: number
  montoTotalOperacion: number
  totalNoGravado: number
  totalPagar: number
  totalLetras: string
  totalIva: number
  saldoFavor: number
  condicionOperacion: number
  pagos: Array<{
    codigo: string
    montoPago: number
    referencia: string | null
    plazo: string | null
    periodo: number | null
  }>
  numPagoElectronico: string | null
}

export interface DteJson {
  identificacion: DteIdentificacion
  documentoRelacionado: unknown | null
  emisor: DteEmisor
  receptor: DteReceptor
  otrosDocumentos: unknown | null
  ventaTercero: unknown | null
  cuerpoDocumento: DteCuerpoItem[]
  resumen: DteResumen
  extension: unknown | null
  apendice: unknown[] | null
}

// ─── Hacienda API responses ───────────────────────────────────────────────────

export interface HaciendaAuthResponse {
  status: 'OK' | 'ERROR'
  body: {
    user: string
    token: string
    tokenType: string
  }
}

export interface HaciendaRecepcionResponse {
  version: number
  ambiente: DteAmbiente
  versionApp: number
  estado: 'PROCESADO' | 'RECHAZADO' | 'CONTINGENCIA'
  codigoGeneracion: string
  selloRecibido: string | null
  fhProcesamiento: string
  codigoMsg: string
  descripcionMsg: string
  observaciones: string[]
}

// DTE El Salvador shared types between API and frontend.

/** Tipo provisional para Venta Simplificada — actualizar cuando MH formalice en CAT-003 */
export const VENTA_SIMPLIFICADA_TIPO_DTE = '16' as const

export const DTE_TYPE_VALUES = [
  '01',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '11',
  '14',
  '15',
  '16', // Venta Simplificada (provisional — código pendiente de CAT-003 oficial MH)
] as const

export type TipoDte = (typeof DTE_TYPE_VALUES)[number]

export const DTE_EVENT_TYPE_VALUES = ['17', '18'] as const
export type TipoEventoDte = (typeof DTE_EVENT_TYPE_VALUES)[number]

export const DTE_VERSION_BY_TYPE: Record<TipoDte, number> = {
  '01': 2,
  '03': 4,
  '04': 4,
  '05': 4,
  '06': 4,
  '07': 2,
  '08': 2,
  '09': 2,
  '11': 3,
  '14': 2,
  '15': 2,
  '16': 1, // VS provisional
}

export const DTE_SCHEMA_NAME_BY_TYPE: Record<TipoDte, string> = {
  '01': 'fe-f-v2',
  '03': 'fe-ccf-v4',
  '04': 'fe-nr-v4',
  '05': 'fe-nc-v4',
  '06': 'fe-nd-v4',
  '07': 'fe-cr-v2',
  '08': 'fe-cl-v2',
  '09': 'fe-dcl-v2',
  '11': 'fe-fex-v3',
  '14': 'fe-fse-v2',
  '15': 'fe-cd-v2',
  '16': 'fe-vs-v1', // VS provisional
}

export function isTipoDte(value: string): value is TipoDte {
  return (DTE_TYPE_VALUES as readonly string[]).includes(value)
}

export function getDteVersion(tipoDte: TipoDte): number {
  return DTE_VERSION_BY_TYPE[tipoDte]
}

export type DteAmbiente = '00' | '01'

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

export const CATALOGO_TIPO_DTE: Record<TipoDte, string> = {
  '01': 'Factura',
  '03': 'Comprobante de Credito Fiscal',
  '04': 'Nota de Remision',
  '05': 'Nota de Credito',
  '06': 'Nota de Debito',
  '07': 'Comprobante de Retencion',
  '08': 'Comprobante de Liquidacion',
  '09': 'Documento Contable de Liquidacion',
  '11': 'Factura de Exportacion',
  '14': 'Factura de Sujeto Excluido',
  '15': 'Comprobante de Donacion',
  '16': 'Venta Simplificada',
}

export const CATALOGO_TIPO_EVENTO_DTE: Record<TipoEventoDte, string> = {
  '17': 'Evento de Operaciones Especiales',
  '18': 'Evento de Retorno',
}

export const CATALOGO_TIPO_ITEM: Record<number, string> = {
  1: 'Bien',
  2: 'Servicio',
  3: 'Ambos',
  4: 'Otros tributos por item',
}

export const CATALOGO_FORMA_PAGO: Record<string, string> = {
  '01': 'Billetes y monedas',
  '02': 'Tarjeta Debito',
  '03': 'Tarjeta Credito',
  '04': 'Cheque',
  '05': 'Transferencia-Deposito bancario',
  '08': 'Dinero electronico',
  '09': 'Monedero electronico',
  '11': 'Bitcoin',
  '12': 'Otras criptomonedas',
  '13': 'Cuentas por pagar del receptor',
  '14': 'Giro bancario',
  '99': 'Otros',
}

export const CATALOGO_CONDICION_OPERACION: Record<number, string> = {
  1: 'Contado',
  2: 'A Credito',
  3: 'Otro',
}

export const CATALOGO_AMBIENTE: Record<DteAmbiente, string> = {
  '00': 'Pruebas',
  '01': 'Produccion',
}

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
  fecEmi: string
  horEmi: string
  tipoMoneda: string
}

export interface DteDireccion {
  departamento: string
  municipio: string
  distrito: string
  complemento: string
}

export interface DteEmisor {
  nit: string
  nrc: string
  nombre: string
  codActividad: string
  descActividad: string
  nombreComercial: string | null
  direccion: DteDireccion
  telefono: string
  correo: string
  codEstable: string
  codPuntoVenta: string
}

export interface DteReceptor {
  tipoDocumento?: string | null
  numDocumento?: string | null
  nit?: string | null
  nrc: string | null
  nombre: string | null
  codActividad: string | null
  descActividad: string | null
  nombreComercial?: string | null
  direccion: DteDireccion | null
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
  ivaItem?: number
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
  tributos: unknown[] | null
  subTotal: number
  ivaRete: number
  ivaPerci?: number
  reteRenta?: number
  montoTotalOperacion: number
  totalNoGravado: number
  totalPagar: number
  totalLetras: string
  totalIva?: number
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
  observaciones: string | null
}

export interface DteJson {
  identificacion: DteIdentificacion
  documentoRelacionado: unknown[] | null
  emisor: DteEmisor
  receptor: DteReceptor | null
  otrosDocumentos: unknown[] | null
  ventaTercero: unknown | null
  cuerpoDocumento: DteCuerpoItem[]
  resumen: DteResumen
  apendice: unknown[] | null
}

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

import {
  DTE_VERSION_BY_TYPE,
  type TipoDte,
} from '@pos-dte/shared-types'

type JsonSchema = Record<string, unknown>

const nullableObject: JsonSchema = {
  anyOf: [{ type: 'object' }, { type: 'null' }],
}

const nullableArray: JsonSchema = {
  anyOf: [{ type: 'array' }, { type: 'null' }],
}

const money = { type: 'number' }

const direccionSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['departamento', 'municipio', 'distrito', 'complemento'],
  properties: {
    departamento: { type: 'string', minLength: 2, maxLength: 2 },
    municipio: { type: 'string', minLength: 2, maxLength: 2 },
    distrito: { type: 'string', minLength: 2, maxLength: 2 },
    complemento: { type: 'string', minLength: 1 },
  },
}

const pagoSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['codigo', 'montoPago', 'referencia', 'plazo', 'periodo'],
  properties: {
    codigo: { anyOf: [{ type: 'string', minLength: 2, maxLength: 2 }, { type: 'null' }] },
    montoPago: money,
    referencia: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    plazo: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    periodo: { anyOf: [{ type: 'number' }, { type: 'null' }] },
  },
}

const tributoResumenSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['codigo', 'descripcion', 'valor'],
  properties: {
    codigo: { type: 'string', minLength: 2, maxLength: 2 },
    descripcion: { type: 'string', minLength: 1 },
    valor: money,
  },
}

function baseResumenProperties(tipoDte: TipoDte): Record<string, unknown> {
  return {
    totalNoSuj: money,
    totalExenta: money,
    totalGravada: money,
    subTotalVentas: money,
    descuNoSuj: money,
    descuExenta: money,
    descuGravada: money,
    porcentajeDescuento: money,
    totalDescu: money,
    tributos: { anyOf: [{ type: 'array', items: tributoResumenSchema }, { type: 'null' }] },
    subTotal: money,
    ...(tipoDte === '03' ? { ivaPerci: money } : {}),
    ivaRete: money,
    montoTotalOperacion: money,
    totalNoGravado: money,
    totalPagar: money,
    totalLetras: { type: 'string', minLength: 1 },
    ...(tipoDte === '01' ? { totalIva: money } : {}),
    saldoFavor: money,
    condicionOperacion: { type: 'integer' },
    pagos: { anyOf: [{ type: 'array', items: pagoSchema, minItems: 1 }, { type: 'null' }] },
    numPagoElectronico: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    observaciones: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
  }
}

function baseDteSchema(tipoDte: TipoDte): JsonSchema {
  const version = DTE_VERSION_BY_TYPE[tipoDte]
  const isFactura = tipoDte === '01'
  const isCcf = tipoDte === '03'

  return {
    $id: `sv-dte-${tipoDte}-v${version}`,
    type: 'object',
    additionalProperties: false,
    required: [
      'identificacion',
      'documentoRelacionado',
      'emisor',
      'receptor',
      'otrosDocumentos',
      'ventaTercero',
      'cuerpoDocumento',
      'resumen',
      'apendice',
    ],
    properties: {
      identificacion: {
        type: 'object',
        additionalProperties: false,
        required: [
          'version',
          'ambiente',
          'tipoDte',
          'numeroControl',
          'codigoGeneracion',
          'tipoModelo',
          'tipoOperacion',
          'tipoContingencia',
          'motivoContin',
          'fecEmi',
          'horEmi',
          'tipoMoneda',
        ],
        properties: {
          version: { const: version },
          ambiente: { enum: ['00', '01'] },
          tipoDte: { const: tipoDte },
          numeroControl: {
            type: 'string',
            pattern: `^DTE-${tipoDte}-[A-Za-z0-9]{8}-[0-9]{15}$`,
          },
          codigoGeneracion: {
            type: 'string',
            pattern: '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$',
          },
          tipoModelo: { enum: [1, 2] },
          tipoOperacion: { enum: [1, 2] },
          tipoContingencia: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
          motivoContin: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          fecEmi: { type: 'string', format: 'date' },
          horEmi: { type: 'string', pattern: '^\\d{2}:\\d{2}:\\d{2}$' },
          tipoMoneda: { const: 'USD' },
        },
      },
      documentoRelacionado: nullableArray,
      emisor: {
        type: 'object',
        additionalProperties: false,
        required: [
          'nit',
          'nrc',
          'nombre',
          'codActividad',
          'descActividad',
          'nombreComercial',
          'direccion',
          'telefono',
          'correo',
          'codEstable',
          'codPuntoVenta',
        ],
        properties: {
          nit: { type: 'string', minLength: 1 },
          nrc: { type: 'string', minLength: 1 },
          nombre: { type: 'string', minLength: 1 },
          codActividad: { type: 'string', minLength: 1 },
          descActividad: { type: 'string', minLength: 1 },
          nombreComercial: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          direccion: direccionSchema,
          telefono: { type: 'string' },
          correo: { type: 'string' },
          codEstable: { type: 'string', minLength: 4, maxLength: 4 },
          codPuntoVenta: { type: 'string', minLength: 4, maxLength: 4 },
        },
      },
      receptor: isFactura ? nullableObject : {
        type: 'object',
        additionalProperties: false,
        required: [
          'nit',
          'nrc',
          'nombre',
          'codActividad',
          'descActividad',
          'nombreComercial',
          'direccion',
          'telefono',
          'correo',
        ],
        properties: {
          nit: { type: 'string', minLength: 1 },
          nrc: { type: 'string', minLength: 1 },
          nombre: { type: 'string', minLength: 1 },
          codActividad: { type: 'string', minLength: 1 },
          descActividad: { type: 'string', minLength: 1 },
          nombreComercial: { type: 'string', minLength: 1 },
          direccion: direccionSchema,
          telefono: { type: 'string' },
          correo: { type: 'string' },
        },
      },
      otrosDocumentos: nullableArray,
      ventaTercero: nullableObject,
      cuerpoDocumento: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'numItem',
            'tipoItem',
            'numeroDocumento',
            'codigo',
            'codTributo',
            'descripcion',
            'cantidad',
            'uniMedida',
            'precioUni',
            'montoDescu',
            'ventaNoSuj',
            'ventaExenta',
            'ventaGravada',
            'tributos',
            'psv',
            'noGravado',
            ...(isFactura ? ['ivaItem'] : []),
          ],
          properties: {
            numItem: { type: 'integer', minimum: 1 },
            tipoItem: { type: 'integer' },
            numeroDocumento: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            cantidad: { type: 'number' },
            codigo: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            codTributo: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            uniMedida: { type: 'integer' },
            descripcion: { type: 'string', minLength: 1 },
            precioUni: { type: 'number' },
            montoDescu: { type: 'number' },
            ventaNoSuj: { type: 'number' },
            ventaExenta: { type: 'number' },
            ventaGravada: { type: 'number' },
            tributos: { anyOf: [{ type: 'array', items: { type: 'string', minLength: 2, maxLength: 2 } }, { type: 'null' }] },
            psv: { type: 'number' },
            noGravado: { type: 'number' },
            ...(isFactura ? { ivaItem: { type: 'number' } } : {}),
          },
        },
      },
      resumen: {
        type: 'object',
        additionalProperties: false,
        required: [
          'totalNoSuj',
          'totalExenta',
          'totalGravada',
          'subTotalVentas',
          'descuNoSuj',
          'descuExenta',
          'descuGravada',
          'porcentajeDescuento',
          'totalDescu',
          'tributos',
          'subTotal',
          ...(isCcf ? ['ivaPerci'] : []),
          'ivaRete',
          'montoTotalOperacion',
          'totalNoGravado',
          'totalPagar',
          'totalLetras',
          ...(isFactura ? ['totalIva'] : []),
          'saldoFavor',
          'condicionOperacion',
          'pagos',
          'numPagoElectronico',
          'observaciones',
        ],
        properties: baseResumenProperties(tipoDte),
      },
      apendice: nullableArray,
    },
  }
}

export const DTE_JSON_SCHEMAS: Record<TipoDte, JsonSchema> = {
  '01': baseDteSchema('01'),
  '03': baseDteSchema('03'),
  '04': baseDteSchema('04'),
  '05': baseDteSchema('05'),
  '06': baseDteSchema('06'),
  '07': baseDteSchema('07'),
  '08': baseDteSchema('08'),
  '09': baseDteSchema('09'),
  '11': baseDteSchema('11'),
  '14': baseDteSchema('14'),
  '15': baseDteSchema('15'),
}

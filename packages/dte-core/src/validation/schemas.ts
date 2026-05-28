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

function baseDteSchema(tipoDte: TipoDte): JsonSchema {
  const version = DTE_VERSION_BY_TYPE[tipoDte]

  return {
    $id: `sv-dte-${tipoDte}-v${version}`,
    type: 'object',
    additionalProperties: true,
    required: [
      'identificacion',
      'documentoRelacionado',
      'emisor',
      'receptor',
      'otrosDocumentos',
      'ventaTercero',
      'cuerpoDocumento',
      'resumen',
      'extension',
      'apendice',
    ],
    properties: {
      identificacion: {
        type: 'object',
        additionalProperties: true,
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
          tipoMoneda: { type: 'string', minLength: 3, maxLength: 3 },
        },
      },
      documentoRelacionado: nullableArray,
      emisor: {
        type: 'object',
        additionalProperties: true,
        required: [
          'nit',
          'nrc',
          'nombre',
          'codActividad',
          'descActividad',
          'tipoEstablecimiento',
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
          tipoEstablecimiento: { type: 'string', minLength: 1 },
          direccion: {
            type: 'object',
            additionalProperties: true,
            required: ['departamento', 'municipio', 'complemento'],
          },
          telefono: { type: 'string' },
          correo: { type: 'string' },
        },
      },
      receptor: tipoDte === '01' ? nullableObject : {
        type: 'object',
        additionalProperties: true,
        required: ['nombre'],
        properties: {
          nombre: { type: 'string', minLength: 1 },
        },
      },
      otrosDocumentos: nullableArray,
      ventaTercero: nullableObject,
      cuerpoDocumento: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: true,
          required: ['numItem', 'tipoItem', 'cantidad', 'descripcion', 'precioUni'],
          properties: {
            numItem: { type: 'integer', minimum: 1 },
            tipoItem: { type: 'integer' },
            cantidad: { type: 'number' },
            descripcion: { type: 'string', minLength: 1 },
            precioUni: { type: 'number' },
          },
        },
      },
      resumen: {
        type: 'object',
        additionalProperties: true,
        required: ['montoTotalOperacion', 'totalPagar', 'totalLetras'],
        properties: {
          montoTotalOperacion: { type: 'number' },
          totalPagar: { type: 'number' },
          totalLetras: { type: 'string', minLength: 1 },
        },
      },
      extension: nullableObject,
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

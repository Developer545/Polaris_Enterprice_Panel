import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAT_002_TIPO_DTE,
  CATALOGO_TIPO_DTE,
  DTE_VERSION_BY_TYPE,
  validateDteJson,
} from '../index'

function minimalDte(tipoDte: '01' | '03', version: number) {
  return {
    identificacion: {
      version,
      ambiente: '00',
      tipoDte,
      numeroControl: `DTE-${tipoDte}-M001P001-000000000000001`,
      codigoGeneracion: '11111111-1111-4111-8111-111111111111',
      tipoModelo: 1,
      tipoOperacion: 1,
      tipoContingencia: null,
      motivoContin: null,
      fecEmi: '2026-05-24',
      horEmi: '12:00:00',
      tipoMoneda: 'USD',
    },
    documentoRelacionado: null,
    emisor: {
      nit: '06140000000000',
      nrc: '1234567',
      nombre: 'Emisor de Prueba',
      codActividad: '62010',
      descActividad: 'Servicios informaticos',
      tipoEstablecimiento: '02',
      direccion: {
        departamento: '06',
        municipio: '14',
        complemento: 'San Salvador',
      },
      telefono: '22222222',
      correo: 'emisor@example.com',
    },
    receptor: tipoDte === '01' ? null : {
      nit: '06140000000001',
      nrc: '7654321',
      nombre: 'Cliente Contribuyente',
      codActividad: '62010',
      descActividad: 'Servicios informaticos',
      direccion: {
        departamento: '06',
        municipio: '14',
        complemento: 'San Salvador',
      },
      telefono: '22222223',
      correo: 'cliente@example.com',
    },
    otrosDocumentos: null,
    ventaTercero: null,
    cuerpoDocumento: [{
      numItem: 1,
      tipoItem: 2,
      cantidad: 1,
      descripcion: 'Servicio de prueba',
      precioUni: 100,
    }],
    resumen: {
      montoTotalOperacion: 113,
      totalPagar: 113,
      totalLetras: 'CIENTO TRECE DOLARES',
    },
    extension: null,
    apendice: null,
  }
}

test('CAT-002 uses the expected DTE codes', () => {
  assert.equal(CAT_002_TIPO_DTE.FACTURA, '01')
  assert.equal(CAT_002_TIPO_DTE.COMPROBANTE_CREDITO_FISCAL, '03')
  assert.equal(CAT_002_TIPO_DTE.NOTA_REMISION, '04')
  assert.equal(CAT_002_TIPO_DTE.COMPROBANTE_RETENCION, '07')
  assert.equal(CAT_002_TIPO_DTE.FACTURA_EXPORTACION, '11')
  assert.equal(CAT_002_TIPO_DTE.FACTURA_SUJETO_EXCLUIDO, '14')
  assert.equal(CAT_002_TIPO_DTE.COMPROBANTE_DONACION, '15')
})

test('shared labels cover every CAT-002 code', () => {
  for (const code of Object.values(CAT_002_TIPO_DTE)) {
    assert.ok(CATALOGO_TIPO_DTE[code], `missing label for ${code}`)
  }
})

test('validates a factura consumidor final payload', () => {
  const result = validateDteJson(minimalDte('01', DTE_VERSION_BY_TYPE['01']), '01')
  assert.equal(result.ok, true)
})

test('validates a comprobante de credito fiscal payload', () => {
  const result = validateDteJson(minimalDte('03', DTE_VERSION_BY_TYPE['03']), '03')
  assert.equal(result.ok, true)
})

test('rejects wrong DTE version before signing', () => {
  const result = validateDteJson(minimalDte('03', 1), '03')
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((issue) => issue.path === '/identificacion/version'))
})

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CAT_002_TIPO_DTE,
  CATALOGO_TIPO_DTE,
  DTE_VERSION_BY_TYPE,
  validateDteJson,
} from '../index'

function fullResumen(tipoDte: '01' | '03') {
  return {
    totalNoSuj: 0,
    totalExenta: 0,
    totalGravada: 100,
    subTotalVentas: 100,
    descuNoSuj: 0,
    descuExenta: 0,
    descuGravada: 0,
    porcentajeDescuento: 0,
    totalDescu: 0,
    tributos: tipoDte === '03' ? [{ codigo: '20', descripcion: 'Impuesto al Valor Agregado 13%', valor: 13 }] : null,
    subTotal: 100,
    ...(tipoDte === '03' ? { ivaPerci: 0 } : {}),
    ivaRete: 0,
    montoTotalOperacion: 113,
    totalNoGravado: 0,
    totalPagar: 113,
    totalLetras: 'CIENTO TRECE DOLARES',
    ...(tipoDte === '01' ? { totalIva: 13 } : {}),
    saldoFavor: 0,
    condicionOperacion: 1,
    pagos: [{ codigo: '01', montoPago: 113, referencia: null, plazo: null, periodo: null }],
    numPagoElectronico: null,
    observaciones: null,
  }
}

function minimalDte(tipoDte: '01' | '03', version: number) {
  const direccion = {
    departamento: '06',
    municipio: '23',
    distrito: '01',
    complemento: 'San Salvador',
  }

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
      nombreComercial: null,
      direccion,
      telefono: '22222222',
      correo: 'emisor@example.com',
      codEstable: 'M001',
      codPuntoVenta: 'P001',
    },
    receptor: tipoDte === '01' ? null : {
      nit: '06140000000001',
      nrc: '7654321',
      nombre: 'Cliente Contribuyente',
      codActividad: '62010',
      descActividad: 'Servicios informaticos',
      nombreComercial: 'Cliente Contribuyente',
      direccion,
      telefono: '22222223',
      correo: 'cliente@example.com',
    },
    otrosDocumentos: null,
    ventaTercero: null,
    cuerpoDocumento: [{
      numItem: 1,
      tipoItem: 2,
      numeroDocumento: null,
      cantidad: 1,
      codigo: null,
      codTributo: null,
      uniMedida: 59,
      descripcion: 'Servicio de prueba',
      precioUni: 100,
      montoDescu: 0,
      ventaNoSuj: 0,
      ventaExenta: 0,
      ventaGravada: 100,
      tributos: tipoDte === '03' ? ['20'] : null,
      psv: 0,
      noGravado: 0,
      ...(tipoDte === '01' ? { ivaItem: 13 } : {}),
    }],
    resumen: fullResumen(tipoDte),
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
  assert.equal(CAT_002_TIPO_DTE.EVENTO_OPERACIONES_ESPECIALES, '17')
  assert.equal(CAT_002_TIPO_DTE.EVENTO_RETORNO, '18')
})

test('shared labels cover every CAT-002 DTE code', () => {
  for (const code of Object.values(CAT_002_TIPO_DTE).filter((code) => code !== '17' && code !== '18')) {
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

test('rejects removed extension block from old schemas', () => {
  const payload = { ...minimalDte('01', DTE_VERSION_BY_TYPE['01']), extension: null }
  const result = validateDteJson(payload, '01')
  assert.equal(result.ok, false)
  assert.ok(result.issues.some((issue) => issue.path === '/'))
})

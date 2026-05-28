import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calcIvaRetention1,
  calcLineTotals,
  calcSaleSummary,
} from '../index'

function money(value: { toFixed(dp?: number): string }) {
  return value.toFixed(2)
}

test('CF treats product price as final price with IVA included', () => {
  const line = calcLineTotals({ quantity: 1, unitPrice: 1.13 }, '01')
  const summary = calcSaleSummary({ lines: [line], tipoDte: '01' })

  assert.equal(money(line.ventaGravada), '1.13')
  assert.equal(money(line.ivaItem), '0.13')
  assert.equal(money(summary.totalIva), '0.13')
  assert.equal(money(summary.totalPagar), '1.13')
})

test('CCF treats product price as taxable base and adds visible IVA', () => {
  const line = calcLineTotals({ quantity: 1, unitPrice: 100 }, '03')
  const summary = calcSaleSummary({ lines: [line], tipoDte: '03' })

  assert.equal(money(line.ventaGravada), '100.00')
  assert.equal(money(line.ivaItem), '13.00')
  assert.equal(money(summary.totalIva), '13.00')
  assert.equal(money(summary.totalPagar), '113.00')
})

test('line discounts are not subtracted twice from CCF totals', () => {
  const line = calcLineTotals({ quantity: 2, unitPrice: 10, discount: 5 }, '03')
  const summary = calcSaleSummary({ lines: [line], tipoDte: '03' })

  assert.equal(money(line.subtotalBruto), '20.00')
  assert.equal(money(line.discount), '5.00')
  assert.equal(money(line.ventaGravada), '15.00')
  assert.equal(money(line.ivaItem), '1.95')
  assert.equal(money(summary.totalDescu), '5.00')
  assert.equal(money(summary.subTotal), '15.00')
  assert.equal(money(summary.totalPagar), '16.95')
})

test('CF discount keeps IVA immersed in the final discounted amount', () => {
  const line = calcLineTotals({ quantity: 2, unitPrice: 1.13, discount: 0.13 }, '01')
  const summary = calcSaleSummary({ lines: [line], tipoDte: '01' })

  assert.equal(money(line.ventaGravada), '2.13')
  assert.equal(money(line.ivaItem), '0.25')
  assert.equal(money(summary.totalIva), '0.25')
  assert.equal(money(summary.totalPagar), '2.13')
})

test('exempt and not-subject lines do not generate IVA', () => {
  const exempt = calcLineTotals({ quantity: 1, unitPrice: 50, isExempt: true }, '03')
  const notSubject = calcLineTotals({ quantity: 1, unitPrice: 25, isNotSubject: true }, '03')
  const summary = calcSaleSummary({ lines: [exempt, notSubject], tipoDte: '03' })

  assert.equal(money(exempt.ventaExenta), '50.00')
  assert.equal(money(notSubject.ventaNoSujeta), '25.00')
  assert.equal(money(summary.totalIva), '0.00')
  assert.equal(money(summary.totalPagar), '75.00')
})

test('rejects discounts greater than line subtotal', () => {
  assert.throws(
    () => calcLineTotals({ quantity: 1, unitPrice: 10, discount: 10.01 }, '03'),
    /descuento de linea/i,
  )
})

test('does not apply IVA 1% retention below the legal threshold', () => {
  const retention = calcIvaRetention1({
    tipoDte: '03',
    taxableBase: 50,
    buyerRetainsIva1: true,
  })

  assert.equal(money(retention), '0.00')
})

test('applies IVA 1% retention over taxable base when buyer retains', () => {
  const retention = calcIvaRetention1({
    tipoDte: '03',
    taxableBase: 500,
    buyerRetainsIva1: true,
  })

  assert.equal(money(retention), '5.00')
})

test('CCF total subtracts IVA 1% retention from amount to collect', () => {
  const line = calcLineTotals({ quantity: 1, unitPrice: 500 }, '03')
  const retention = calcIvaRetention1({
    tipoDte: '03',
    taxableBase: line.ventaGravada,
    buyerRetainsIva1: true,
  })
  const summary = calcSaleSummary({ lines: [line], tipoDte: '03', ivaRete1: retention })

  assert.equal(money(summary.montoTotalOperacion), '565.00')
  assert.equal(money(summary.ivaRete1), '5.00')
  assert.equal(money(summary.totalPagar), '560.00')
})

test('does not apply IVA 1% retention to consumidor final invoices', () => {
  const retention = calcIvaRetention1({
    tipoDte: '01',
    taxableBase: 500,
    buyerRetainsIva1: true,
  })

  assert.equal(money(retention), '0.00')
})

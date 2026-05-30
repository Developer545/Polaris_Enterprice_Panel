/**
 * print-receipt.ts
 * Generates and opens a print window for POS receipts.
 * Two formats: 80mm thermal ticket and Carta/A4 original (CF/CCF).
 */

const PAGO_LABELS: Record<string, string> = {
  '01': 'Efectivo',
  '02': 'Tarjeta débito',
  '03': 'Tarjeta crédito',
  '04': 'Cheque',
  '05': 'Transferencia bancaria',
  '08': 'Dinero electrónico',
  '09': 'Monedero electrónico',
  '11': 'Bitcoin',
  '12': 'Criptomoneda',
  '13': 'Cuentas por pagar',
  '14': 'Giro bancario',
  '99': 'Otros',
}

export interface PrintCompany {
  name: string
  comercialName?: string | null
  nit?: string | null
  nrc?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  actividadEconomica?: string | null
  logoUrl?: string | null
}

export interface PrintSale {
  id: string
  tipoDte: string
  createdAt: string
  totalGravada: number | string
  totalIva: number | string
  totalPagar: number | string
  ivaRete1?: number | string | null
  totalDescuento?: number | string | null
  totalNoSuj?: number | string | null
  totalExenta?: number | string | null
  items: Array<{
    productName: string
    quantity: number | string
    unitPrice: number | string
    discount?: number | string | null
    ventaGravada?: number | string | null
    ivaItem?: number | string | null
  }>
  payments: Array<{
    formaPago: string
    amount: number | string
    reference?: string | null
  }>
  client?: {
    name?: string | null
    numDocumento?: string | null
    nit?: string | null
    nrc?: string | null
    email?: string | null
    address?: string | null
    actividadEconomica?: string | null
    actividadEconomicaCodigo?: string | null
    comercialName?: string | null
    departamentoCod?: string | null
    municipioCod?: string | null
  } | null
  branch?: { name?: string | null } | null
  dteDocument?: {
    numeroControl?: string | null
    codigoGeneracion?: string | null
    selloRecibido?: string | null
    status?: string | null
  } | null
}

export interface PrintContext {
  sale: PrintSale
  company: PrintCompany
  branchName?: string
  cashierName?: string
  amountPaid?: number
  change?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function n(v: number | string | null | undefined, dp = 2): string {
  return Number(v ?? 0).toFixed(dp)
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-SV', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function pagoLabel(code: string): string {
  return PAGO_LABELS[code] ?? code
}

function dteLabel(tipo: string): string {
  const m: Record<string, string> = {
    '01': 'FACTURA CONSUMIDOR FINAL',
    '03': 'COMPROBANTE DE CRÉDITO FISCAL',
    '05': 'NOTA DE CRÉDITO',
    '06': 'NOTA DE DÉBITO',
  }
  return m[tipo] ?? `DOCUMENTO ${tipo}`
}

function printHtml(html: string) {
  const w = window.open('', '_blank', 'width=700,height=900,toolbar=0,location=0,menubar=0,scrollbars=1')
  if (!w) {
    alert('Permitir ventanas emergentes en el navegador para imprimir.')
    return
  }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 600)
}

// ─── 80mm Thermal Ticket ──────────────────────────────────────────────────────

export function printTicket80mm(ctx: PrintContext) {
  const { sale, company, branchName, cashierName, amountPaid, change } = ctx
  const isCcf  = sale.tipoDte === '03'
  const dteDoc = sale.dteDocument

  const itemsHtml = sale.items.map(item => {
    const qty   = Number(item.quantity)
    const price = Number(item.unitPrice)
    const disc  = Number(item.discount ?? 0)
    const line  = isCcf
      ? (qty * price - disc)        // precio sin IVA para CCF
      : (qty * price - disc)        // precio con IVA incluido para CF
    const name  = item.productName.length > 22
      ? item.productName.substring(0, 22) + '…'
      : item.productName
    return `
      <tr>
        <td colspan="2" style="padding-top:4px;font-weight:600">${name}</td>
      </tr>
      <tr>
        <td style="color:#555">${qty} x $${n(price)}</td>
        <td style="text-align:right;font-weight:700">$${n(line)}</td>
      </tr>
      ${disc > 0 ? `<tr><td style="color:#999;font-size:10px">Desc: $${n(disc)}</td><td></td></tr>` : ''}
    `
  }).join('')

  const paymentsHtml = sale.payments.map(p => `
    <tr>
      <td>${pagoLabel(p.formaPago)}</td>
      <td style="text-align:right">$${n(p.amount)}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${isCcf ? 'CCF' : 'CF'} #${dteDoc?.numeroControl ?? sale.id.slice(-8)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11.5px;
    width: 74mm;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: 700; }
  .sm     { font-size: 10px; }
  .xs     { font-size: 9px; }
  .dashed { border-top: 1px dashed #000; margin: 5px 0; }
  .solid  { border-top: 1.5px solid #000; margin: 5px 0; }
  table   { width: 100%; border-collapse: collapse; }
  td      { padding: 1px 0; vertical-align: top; line-height: 1.4; }
  .tipo-badge {
    display: inline-block;
    border: 1.5px solid #000;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .total-row td { font-size: 13px; font-weight: 700; padding-top: 4px; }
  .dte-code { font-size: 9px; word-break: break-all; color: #333; line-height: 1.5; }
  @media screen {
    body { border: 1px dashed #ccc; padding: 8px; margin: 8px; }
  }
</style>
</head>
<body>

<!-- ── HEADER ── -->
<div class="center">
  <div class="bold" style="font-size:14px;line-height:1.3">${company.comercialName ?? company.name}</div>
  ${company.name !== (company.comercialName ?? company.name) ? `<div class="sm">${company.name}</div>` : ''}
  ${company.nit  ? `<div class="sm">NIT: ${company.nit}</div>`  : ''}
  ${company.nrc  ? `<div class="sm">NRC: ${company.nrc}</div>`  : ''}
  ${company.address ? `<div class="sm">${company.address}</div>` : ''}
  ${company.phone   ? `<div class="sm">Tel: ${company.phone}</div>` : ''}
</div>

<div class="dashed"></div>

<div class="center">
  <span class="tipo-badge">${sale.tipoDte} - ${isCcf ? 'CCF' : 'CF'}</span>
</div>

${branchName ? `<div class="sm center">${branchName}</div>` : ''}
<div class="sm center">${fmtDate(sale.createdAt)}</div>
${cashierName ? `<div class="sm center">Cajero: ${cashierName}</div>` : ''}

<div class="dashed"></div>

<!-- ── CLIENT (CCF only) ── -->
${isCcf && sale.client ? `
<div class="sm"><span class="bold">Cliente:</span> ${sale.client.name ?? '—'}</div>
${sale.client.nit ? `<div class="sm">NIT: ${sale.client.nit}</div>` : ''}
${sale.client.nrc ? `<div class="sm">NRC: ${sale.client.nrc}</div>` : ''}
<div class="dashed"></div>
` : ''}

<!-- ── ITEMS ── -->
<table>${itemsHtml}</table>

<div class="solid"></div>

<!-- ── TOTALS ── -->
<table>
  ${isCcf ? `
  <tr><td class="sm">Total Gravado</td><td class="sm right">$${n(sale.totalGravada)}</td></tr>
  <tr><td class="sm">IVA 13%</td><td class="sm right">$${n(sale.totalIva)}</td></tr>
  ${Number(sale.ivaRete1 ?? 0) > 0
    ? `<tr><td class="sm">IVA Retención</td><td class="sm right">-$${n(sale.ivaRete1)}</td></tr>`
    : ''}
  ` : `
  <tr><td class="sm">Subtotal gravado</td><td class="sm right">$${n(sale.totalGravada)}</td></tr>
  <tr><td class="sm">IVA incluido</td><td class="sm right">$${n(sale.totalIva)}</td></tr>
  `}
  ${Number(sale.totalDescuento ?? 0) > 0
    ? `<tr><td class="sm">Descuento</td><td class="sm right">-$${n(sale.totalDescuento)}</td></tr>`
    : ''}
  <tr class="total-row"><td>TOTAL</td><td class="right">$${n(sale.totalPagar)}</td></tr>
</table>

<div class="dashed"></div>

<!-- ── PAYMENTS ── -->
<table>
  <tr><td class="sm bold" colspan="2">Forma de pago</td></tr>
  ${paymentsHtml}
  ${amountPaid != null && amountPaid > 0
    ? `<tr><td class="sm">Recibido</td><td class="sm right">$${n(amountPaid)}</td></tr>
       <tr><td class="sm bold">Vuelto</td><td class="sm right bold">$${n(Math.max(0, change ?? 0))}</td></tr>`
    : ''}
</table>

${dteDoc ? `
<div class="dashed"></div>
<div class="xs dte-code">
  <div><b>N° Control:</b> ${dteDoc.numeroControl ?? '—'}</div>
  <div><b>Cód. Generación:</b> ${dteDoc.codigoGeneracion ?? '—'}</div>
  ${dteDoc.selloRecibido ? `<div><b>Sello MH:</b> ${dteDoc.selloRecibido}</div>` : `<div style="color:#888">(DTE en proceso de transmisión)</div>`}
</div>
` : ''}

<div class="dashed"></div>
<div class="center xs" style="margin-top:4px;line-height:1.6">
  Documento tributario electrónico<br>
  emitido conforme a leyes tributarias<br>
  de El Salvador.
</div>
<div class="center sm bold" style="margin-top:6px">¡Gracias por su compra!</div>
<div style="height:16px"></div>

</body>
</html>`

  printHtml(html)
}

// ─── Carta / A4 Original ──────────────────────────────────────────────────────

export function printCartaA4(ctx: PrintContext) {
  const { sale, company, branchName, cashierName, amountPaid, change } = ctx
  const isCcf  = sale.tipoDte === '03'
  const dteDoc = sale.dteDocument
  const title  = dteLabel(sale.tipoDte)

  const itemsHtml = sale.items.map((item, i) => {
    const qty   = Number(item.quantity)
    const price = Number(item.unitPrice)
    const disc  = Number(item.discount ?? 0)
    const grav  = Number(item.ventaGravada ?? (qty * price - disc))
    const iva   = Number(item.ivaItem ?? 0)
    return `
      <tr style="border-bottom:1px solid #eee">
        <td style="padding:5px 4px;text-align:center">${i + 1}</td>
        <td style="padding:5px 8px">${item.productName}</td>
        <td style="padding:5px 4px;text-align:center">${qty % 1 === 0 ? qty : qty.toFixed(4)}</td>
        <td style="padding:5px 8px;text-align:right">$${n(price)}</td>
        ${isCcf ? `
          <td style="padding:5px 8px;text-align:right">${disc > 0 ? '$' + n(disc) : '—'}</td>
          <td style="padding:5px 8px;text-align:right">$${n(grav)}</td>
          <td style="padding:5px 8px;text-align:right">$${n(iva)}</td>
        ` : `
          <td style="padding:5px 8px;text-align:right">${disc > 0 ? '$' + n(disc) : '—'}</td>
          <td style="padding:5px 8px;text-align:right">$${n(grav + (isCcf ? 0 : iva))}</td>
        `}
      </tr>
    `
  }).join('')

  const paymentsHtml = sale.payments.map(p => `
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
      <span>${pagoLabel(p.formaPago)}${p.reference ? ` (${p.reference})` : ''}</span>
      <span style="font-weight:600">$${n(p.amount)}</span>
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${title} - ${dteDoc?.numeroControl ?? sale.id}</title>
<style>
  @page { size: A4; margin: 15mm 18mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #111;
    background: #fff;
    line-height: 1.4;
  }
  .page { max-width: 175mm; margin: 0 auto; }
  h1.doc-title {
    font-size: 16px;
    font-weight: 800;
    text-align: center;
    letter-spacing: 1px;
    border: 2px solid #000;
    padding: 6px 0;
    margin-bottom: 14px;
  }
  .header-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    margin-bottom: 14px;
    align-items: start;
  }
  .company-name { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
  .label { font-weight: 600; }
  .section {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 12px;
  }
  .section-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #555;
    margin-bottom: 6px;
  }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 11.5px; }
  .info-grid .row { display: contents; }
  .info-grid .key { color: #555; }
  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 11.5px;
  }
  table.items thead tr {
    background: #111;
    color: #fff;
  }
  table.items thead th {
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
  }
  table.items thead th.right { text-align: right; }
  table.items thead th.center { text-align: center; }
  table.items tbody tr:nth-child(even) { background: #f9f9f9; }
  .totals-block {
    width: 220px;
    margin-left: auto;
    margin-bottom: 12px;
    font-size: 12px;
  }
  .totals-block .row {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    border-bottom: 1px solid #eee;
  }
  .totals-block .total-final {
    font-size: 15px;
    font-weight: 800;
    border-top: 2px solid #111;
    border-bottom: 2px solid #111;
    padding: 6px 0;
    margin-top: 2px;
  }
  .dte-block {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 10.5px;
    margin-bottom: 12px;
    background: #fafafa;
  }
  .dte-block .dte-row { display: flex; gap: 8px; margin-bottom: 3px; }
  .dte-block .dte-label { font-weight: 700; min-width: 120px; color: #555; }
  .dte-block .dte-val { word-break: break-all; }
  .signature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 24px;
  }
  .sig-box { border-top: 1px solid #000; padding-top: 6px; text-align: center; font-size: 11px; }
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%) rotate(-35deg);
    font-size: 72px;
    font-weight: 900;
    color: rgba(0,0,0,0.04);
    pointer-events: none;
    letter-spacing: 8px;
    z-index: 0;
  }
  .footer-legal {
    font-size: 10px;
    color: #666;
    text-align: center;
    margin-top: 16px;
    border-top: 1px solid #ddd;
    padding-top: 8px;
  }
  @media screen {
    body { background: #e5e5e5; }
    .page { background: #fff; padding: 20mm; margin: 20px auto; box-shadow: 0 2px 20px rgba(0,0,0,.15); }
    .watermark { display: none; }
  }
  @media print {
    body { background: #fff; }
  }
</style>
</head>
<body>
<div class="watermark">ORIGINAL</div>
<div class="page">

<!-- ── TITLE ── -->
<h1 class="doc-title">${title}</h1>

<!-- ── HEADER: Company + Doc info ── -->
<div class="header-grid">
  <div>
    <div class="company-name">${company.comercialName ?? company.name}</div>
    ${company.name !== (company.comercialName ?? company.name) ? `<div style="font-size:11px;color:#555">${company.name}</div>` : ''}
    ${company.actividadEconomica ? `<div style="font-size:11px;color:#555">${company.actividadEconomica}</div>` : ''}
    ${company.address ? `<div style="font-size:11px;margin-top:4px">${company.address}</div>` : ''}
    <div style="margin-top:6px;font-size:11.5px">
      ${company.nit ? `<span><b>NIT:</b> ${company.nit}</span>` : ''}
      ${company.nrc ? `<span style="margin-left:12px"><b>NRC:</b> ${company.nrc}</span>` : ''}
    </div>
    ${company.phone ? `<div style="font-size:11px">Tel: ${company.phone}</div>` : ''}
    ${company.email ? `<div style="font-size:11px">${company.email}</div>` : ''}
  </div>
  <div style="text-align:right;font-size:11.5px;min-width:160px">
    <div style="margin-bottom:6px">
      <div class="label">Fecha emisión:</div>
      <div>${fmtDate(sale.createdAt)}</div>
    </div>
    ${dteDoc?.numeroControl ? `
    <div style="margin-bottom:6px">
      <div class="label">N° Control:</div>
      <div style="font-family:monospace;font-size:10.5px">${dteDoc.numeroControl}</div>
    </div>` : ''}
    ${branchName ? `<div><span class="label">Sucursal:</span> ${branchName}</div>` : ''}
    ${cashierName ? `<div><span class="label">Cajero:</span> ${cashierName}</div>` : ''}
  </div>
</div>

<!-- ── CLIENT ── -->
<div class="section">
  <div class="section-title">${isCcf ? 'Datos del comprador' : 'Comprador'}</div>
  ${isCcf && sale.client ? `
    <div class="info-grid">
      <div><span class="key">Nombre:</span> ${sale.client.comercialName ?? sale.client.name ?? 'Consumidor Final'}</div>
      <div><span class="key">NIT:</span> ${sale.client.nit ?? '—'}</div>
      <div><span class="key">NRC:</span> ${sale.client.nrc ?? '—'}</div>
      ${sale.client.actividadEconomica ? `<div><span class="key">Actividad:</span> ${sale.client.actividadEconomica}</div>` : '<div></div>'}
      ${sale.client.address ? `<div colspan="2"><span class="key">Dirección:</span> ${sale.client.address}</div>` : ''}
      ${sale.client.email ? `<div><span class="key">Email:</span> ${sale.client.email}</div>` : '<div></div>'}
    </div>
  ` : `<div style="font-size:12px">Consumidor Final</div>`}
</div>

<!-- ── ITEMS TABLE ── -->
<table class="items">
  <thead>
    <tr>
      <th class="center" style="width:32px">#</th>
      <th>Descripción</th>
      <th class="center" style="width:56px">Cant.</th>
      <th class="right" style="width:72px">Precio unit.</th>
      <th class="right" style="width:60px">Descuento</th>
      ${isCcf ? `
        <th class="right" style="width:80px">Venta gravada</th>
        <th class="right" style="width:70px">IVA</th>
      ` : `
        <th class="right" style="width:80px">Total</th>
      `}
    </tr>
  </thead>
  <tbody>
    ${itemsHtml}
  </tbody>
</table>

<!-- ── TOTALS ── -->
<div class="totals-block">
  ${Number(sale.totalNoSuj ?? 0) > 0
    ? `<div class="row"><span>Total no sujeto</span><span>$${n(sale.totalNoSuj)}</span></div>`
    : ''}
  ${Number(sale.totalExenta ?? 0) > 0
    ? `<div class="row"><span>Total exento</span><span>$${n(sale.totalExenta)}</span></div>`
    : ''}
  <div class="row"><span>Total gravado</span><span>$${n(sale.totalGravada)}</span></div>
  ${Number(sale.totalDescuento ?? 0) > 0
    ? `<div class="row"><span>Total descuento</span><span>-$${n(sale.totalDescuento)}</span></div>`
    : ''}
  <div class="row"><span>IVA (13%)</span><span>$${n(sale.totalIva)}</span></div>
  ${Number(sale.ivaRete1 ?? 0) > 0
    ? `<div class="row"><span>IVA Retención (1%)</span><span>-$${n(sale.ivaRete1)}</span></div>`
    : ''}
  <div class="row total-final">
    <span>TOTAL A PAGAR</span>
    <span>$${n(sale.totalPagar)}</span>
  </div>
</div>

<!-- ── PAYMENTS ── -->
<div class="section" style="width:260px;margin-left:auto;margin-bottom:12px">
  <div class="section-title">Forma de pago</div>
  ${paymentsHtml}
  ${amountPaid != null && amountPaid > 0 ? `
    <div style="border-top:1px dashed #ccc;margin-top:6px;padding-top:6px;font-size:12px">
      <div style="display:flex;justify-content:space-between"><span>Recibido</span><span>$${n(amountPaid)}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700"><span>Vuelto</span><span>$${n(Math.max(0, change ?? 0))}</span></div>
    </div>
  ` : ''}
</div>

<!-- ── DTE INFO ── -->
${dteDoc ? `
<div class="dte-block">
  <div style="font-weight:700;margin-bottom:6px;font-size:11px">Información DTE — Ministerio de Hacienda</div>
  ${dteDoc.numeroControl ? `<div class="dte-row"><span class="dte-label">Número de control</span><span class="dte-val">${dteDoc.numeroControl}</span></div>` : ''}
  ${dteDoc.codigoGeneracion ? `<div class="dte-row"><span class="dte-label">Código de generación</span><span class="dte-val">${dteDoc.codigoGeneracion}</span></div>` : ''}
  ${dteDoc.selloRecibido
    ? `<div class="dte-row"><span class="dte-label">Sello recibido MH</span><span class="dte-val">${dteDoc.selloRecibido}</span></div>`
    : `<div class="dte-row"><span class="dte-label">Estado DTE</span><span class="dte-val" style="color:#c00">En proceso de transmisión a Hacienda</span></div>`
  }
</div>
` : ''}

<!-- ── SIGNATURES ── -->
<div class="signature-grid">
  <div class="sig-box">
    <div style="font-weight:600">Firma del emisor</div>
    <div style="color:#666">${company.comercialName ?? company.name}</div>
  </div>
  <div class="sig-box">
    <div style="font-weight:600">Firma del receptor</div>
    ${isCcf && sale.client?.name ? `<div style="color:#666">${sale.client.name}</div>` : '<div style="color:#aaa">Consumidor Final</div>'}
  </div>
</div>

<!-- ── FOOTER ── -->
<div class="footer-legal">
  Documento tributario electrónico emitido conforme al Art. 107 del Código Tributario de El Salvador y normativa vigente del Ministerio de Hacienda.
  ${sale.tipoDte === '01' ? 'No genera crédito fiscal.' : ''}
</div>

</div><!-- .page -->
</body>
</html>`

  printHtml(html)
}

/**
 * doc-viewer.ts
 * Client-side HTML document viewers — open in new tab, zero server cost.
 * Each function generates a self-contained HTML string and writes it to a new tab.
 * The tab includes a Print button; user can use browser "Save as PDF" from there.
 */

const PRIMARY   = '#1a365d'
const ACCENT    = '#2563eb'
const LIGHT     = '#eff6ff'
const BORDER    = '#dbeafe'
const TEXT      = '#1e293b'
const MUTED     = '#64748b'
const SUCCESS   = '#166534'
const SUCCESS_BG = '#dcfce7'
const DANGER    = '#991b1b'
const DANGER_BG = '#fee2e2'
const WARN_BG   = '#fef9c3'

const fmt = (n: any) => `$${Number(n ?? 0).toFixed(2)}`
const d2  = (n: any) => Number(n ?? 0).toFixed(2)

const TIPO_LABEL: Record<string, string> = {
  '01': 'FACTURA — CONSUMIDOR FINAL',
  '03': 'COMPROBANTE DE CRÉDITO FISCAL',
  '05': 'NOTA DE CRÉDITO',
  '06': 'NOTA DE DÉBITO',
  '16': 'VENTA SIMPLIFICADA',
}

const PAGO_LABEL: Record<string, string> = {
  '01': 'Efectivo', '02': 'Tarjeta débito', '03': 'Tarjeta crédito',
  '04': 'Cheque', '05': 'Transferencia', '08': 'Dinero electrónico',
  '09': 'Monedero electrónico', '11': 'Bitcoin', '12': 'Criptomoneda',
  '13': 'Cuentas por pagar', '14': 'Giro bancario', '99': 'Otros',
}

function openTab(html: string) {
  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

const BASE_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${TEXT};background:#f1f5f9;padding:20px}
  .page{max-width:820px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)}
  .header{background:${PRIMARY};color:#fff;padding:20px 28px;display:flex;justify-content:space-between;align-items:flex-start}
  .header h1{font-size:16px;margin-bottom:4px}
  .header p{font-size:10px;opacity:.8;margin-top:2px}
  .badge{background:${ACCENT};color:#fff;padding:6px 14px;border-radius:4px;text-align:center;font-size:11px;font-weight:bold;min-width:180px}
  .badge small{display:block;font-size:9px;opacity:.85;font-weight:normal;margin-top:2px}
  .body{padding:20px 28px}
  .section{margin-bottom:16px}
  .section-title{background:${PRIMARY};color:#fff;padding:4px 10px;font-size:9px;font-weight:bold;border-radius:3px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px}
  .field{margin-bottom:6px}
  .field label{display:block;font-size:9px;color:${MUTED};text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px}
  .field span{font-size:11px;font-weight:600;border-bottom:1px dotted #cbd5e1;padding-bottom:1px;display:block;min-height:15px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  table thead th{background:${PRIMARY};color:#fff;padding:5px 8px;text-align:left;font-size:9px;font-weight:bold}
  table thead th.r{text-align:right}
  table thead th.c{text-align:center}
  table tbody td{border-bottom:1px solid #e2e8f0;padding:5px 8px}
  table tbody td.r{text-align:right}
  table tbody td.c{text-align:center}
  table tbody tr:nth-child(even){background:${LIGHT}}
  .totals-box{display:flex;justify-content:flex-end;margin-top:10px}
  .totals-table{width:240px;font-size:10px}
  .totals-table td{padding:4px 8px;border:none}
  .totals-table .total-row{background:${ACCENT};color:#fff;font-weight:bold;font-size:12px;border-radius:3px}
  .totals-table .total-row td{padding:6px 8px}
  .info-box{background:${LIGHT};border:1px solid ${BORDER};border-radius:4px;padding:10px 14px;margin-bottom:12px}
  .ctrl-box{background:${LIGHT};border:1px solid ${BORDER};border-radius:4px;padding:10px 14px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .ctrl-box .full{grid-column:1/-1}
  .ctrl-box label{font-size:9px;color:${MUTED};text-transform:uppercase;display:block;margin-bottom:2px}
  .ctrl-box span{font-size:10px;font-weight:600;font-family:monospace;word-break:break-all}
  .footer-note{margin-top:16px;padding:10px 14px;background:#f8fafc;border-top:2px solid ${BORDER};font-size:9px;color:${MUTED};text-align:center;border-radius:0 0 8px 8px}
  .no-print{margin:0 auto 16px;max-width:820px;display:flex;gap:8px;justify-content:flex-end}
  .btn-print{background:${ACCENT};color:#fff;border:none;padding:8px 20px;border-radius:5px;font-size:12px;cursor:pointer;font-weight:600}
  .btn-close{background:#e2e8f0;color:${TEXT};border:none;padding:8px 16px;border-radius:5px;font-size:12px;cursor:pointer}
  .tag{display:inline-block;padding:2px 8px;border-radius:3px;font-size:9px;font-weight:bold}
  .tag-ok{background:${SUCCESS_BG};color:${SUCCESS}}
  .tag-warn{background:${WARN_BG};color:#854d0e}
  .tag-err{background:${DANGER_BG};color:${DANGER}}
  @media print{
    .no-print{display:none!important}
    body{background:#fff;padding:0}
    .page{box-shadow:none;border-radius:0}
  }
`

// ─── 1. DTE VIEWER ──────────────────────────────────────────────────────────
/**
 * Opens a styled HTML preview of a DTE document in a new tab.
 * @param dte  Full DteDocument record (jsonOriginal field must be present)
 * @param sale Optional sale context for extra data (client, items, payments)
 */
export function abrirDteHtml(dte: any, sale?: any) {
  const json: any = dte?.jsonOriginal ?? {}
  const idf  = json.identificacion  ?? {}
  const emisor = json.emisor        ?? {}
  const receptor = json.receptor    ?? {}
  const cuerpo: any[] = json.cuerpoDocumento ?? []
  const resumen = json.resumen      ?? {}
  const tipoDte: string = idf.tipoDte ?? dte?.tipoDte ?? '01'

  const items = cuerpo.length > 0 ? cuerpo : (sale?.items ?? [])
  const pagos: any[]  = resumen.pagos ?? sale?.payments?.map((p: any) => ({ codigo: p.formaPago, montoPago: p.amount })) ?? []

  const itemsHtml = items.map((item: any, idx: number) => {
    const isCCF = tipoDte === '03' || tipoDte === '05' || tipoDte === '06'
    const total = isCCF
      ? Number(item.ventaGravada ?? 0) + Number(item.ivaItem ?? 0)
      : Number(item.ventaGravada ?? item.ventaExenta ?? 0)
    return `
      <tr>
        <td class="c">${item.numItem ?? idx + 1}</td>
        <td>${item.descripcion ?? item.productName ?? '—'}</td>
        <td class="c">${Number(item.cantidad ?? item.quantity ?? 1).toFixed(2)}</td>
        <td class="r">${fmt(item.precioUni ?? item.unitPrice)}</td>
        ${isCCF ? `<td class="r">${fmt(item.ventaGravada)}</td><td class="r">${fmt(item.ivaItem)}</td>` : ''}
        <td class="r"><strong>${fmt(total)}</strong></td>
      </tr>`
  }).join('')

  const isCCF = ['03','05','06'].includes(tipoDte)
  const pagosHtml = pagos.map((p: any) =>
    `<span style="display:inline-block;background:${LIGHT};border:1px solid ${BORDER};border-radius:4px;padding:4px 12px;margin:3px;font-size:10px">
      ${PAGO_LABEL[p.codigo] ?? p.codigo}: <strong>${fmt(p.montoPago)}</strong>
    </span>`
  ).join('')

  const emisorDir = typeof emisor.direccion === 'object'
    ? [emisor.direccion?.complemento, emisor.direccion?.municipio, emisor.direccion?.departamento].filter(Boolean).join(', ')
    : emisor.direccion ?? ''

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>${TIPO_LABEL[tipoDte] ?? 'DTE'} — ${dte?.numeroControl ?? ''}</title>
  <style>${BASE_CSS}</style></head><body>
  <div class="no-print">
    <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
    <button class="btn-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div>
        <h1>${emisor.nombre ?? localStorage.getItem('companyName') ?? 'Empresa'}</h1>
        ${emisor.nit ? `<p>NIT: ${emisor.nit}${emisor.nrc ? ` &nbsp;|&nbsp; NRC: ${emisor.nrc}` : ''}</p>` : ''}
        ${emisorDir ? `<p>${emisorDir}</p>` : ''}
        ${emisor.telefono ? `<p>Tel: ${emisor.telefono}</p>` : ''}
        ${emisor.correo  ? `<p>${emisor.correo}</p>` : ''}
      </div>
      <div class="badge">
        ${TIPO_LABEL[tipoDte] ?? `DTE ${tipoDte}`}
        ${dte?.selloRecibido
          ? `<small class="tag tag-ok" style="display:inline">✓ ACEPTADO POR MH</small>`
          : `<small style="opacity:.7">⏳ Pendiente</small>`}
      </div>
    </div>
    <div class="body">
      <div class="ctrl-box">
        <div><label>Número de Control</label><span>${dte?.numeroControl ?? idf.numeroControl ?? '—'}</span></div>
        <div><label>Fecha de Emisión</label><span>${idf.fecEmi ?? ''} ${idf.horEmi ?? ''}</span></div>
        <div class="full"><label>Código de Generación</label><span>${dte?.codigoGeneracion ?? idf.codigoGeneracion ?? '—'}</span></div>
        ${dte?.selloRecibido ? `<div class="full"><label>Sello Recibido MH</label><span>${dte.selloRecibido}</span></div>` : ''}
      </div>

      <div class="section-title">Datos del ${isCCF ? 'Receptor' : 'Cliente'}</div>
      <div class="grid2 info-box">
        <div class="field"><label>Nombre</label><span>${receptor.nombre ?? sale?.client?.name ?? 'Consumidor Final'}</span></div>
        <div class="field"><label>Documento</label><span>${receptor.numDocumento ? `${receptor.tipoDocumento ?? ''}: ${receptor.numDocumento}` : '—'}</span></div>
        ${isCCF ? `<div class="field"><label>NRC</label><span>${receptor.nrc ?? '—'}</span></div>` : ''}
        ${receptor.correo ? `<div class="field"><label>Correo</label><span>${receptor.correo}</span></div>` : ''}
      </div>

      <div class="section-title">Detalle</div>
      <table>
        <thead><tr>
          <th class="c" style="width:36px">#</th>
          <th>Descripción</th>
          <th class="c">Cant.</th>
          <th class="r">Precio Unit.</th>
          ${isCCF ? '<th class="r">Gravada</th><th class="r">IVA</th>' : ''}
          <th class="r">Total</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="totals-box">
        <table class="totals-table">
          ${resumen.totalExenta > 0 ? `<tr><td>Venta Exenta</td><td class="r">${fmt(resumen.totalExenta)}</td></tr>` : ''}
          <tr><td>Venta Gravada</td><td class="r">${fmt(resumen.totalGravada ?? sale?.totalGravada)}</td></tr>
          <tr><td>IVA 13%</td><td class="r">${fmt(resumen.totalIva ?? sale?.totalIva)}</td></tr>
          ${Number(resumen.ivaRete1 ?? sale?.ivaRete1 ?? 0) > 0 ? `<tr><td>Retención IVA 1%</td><td class="r">-${fmt(resumen.ivaRete1 ?? sale?.ivaRete1)}</td></tr>` : ''}
          ${Number(resumen.totalDescu ?? sale?.totalDescuento ?? 0) > 0 ? `<tr><td>Descuento</td><td class="r">-${fmt(resumen.totalDescu ?? sale?.totalDescuento)}</td></tr>` : ''}
          <tr class="total-row"><td>TOTAL A PAGAR</td><td class="r">${fmt(resumen.totalPagar ?? sale?.totalPagar)}</td></tr>
        </table>
      </div>

      <div class="section-title" style="margin-top:14px">Forma de Pago</div>
      <div style="padding:8px 0">${pagosHtml || '—'}</div>
    </div>
    <div class="footer-note">
      Documento Tributario Electrónico — Art. 107 Código Tributario El Salvador &nbsp;|&nbsp;
      Impreso: ${new Date().toLocaleString('es-SV')}
    </div>
  </div>
  </body></html>`

  openTab(html)
}

// ─── 2. BOLETA DE PAGO VIEWER ────────────────────────────────────────────────
export function abrirBoletaHtml(item: any, period: any) {
  const emp = item.employee ?? {}
  const companyName = localStorage.getItem('companyName') ?? 'Empresa'
  const fullName = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()

  const ingresos = [
    { label: 'Salario Base', val: item.salaryBase },
    { label: 'Horas Extra', val: item.horasExtra, hide: !Number(item.horasExtra) },
    { label: 'Bonos', val: item.bonos, hide: !Number(item.bonos) },
    { label: 'Comisiones', val: item.comisiones, hide: !Number(item.comisiones) },
    { label: 'Aguinaldo', val: item.aguinaldo, hide: !Number(item.aguinaldo) },
    { label: 'Otros Ingresos', val: item.otrosIngresos, hide: !Number(item.otrosIngresos) },
  ].filter(r => !r.hide)

  const deducciones = [
    { label: 'ISSS Empleado (3%)', val: item.isssEmpleado },
    { label: 'AFP Empleado (7.25%)', val: item.afpEmpleado },
    { label: 'Renta Retenida (ISR)', val: item.rentaRetenida },
    { label: 'Otras Deducciones', val: item.otrosDeducciones, hide: !Number(item.otrosDeducciones) },
  ].filter(r => !r.hide)

  const patronales = [
    { label: 'ISSS Patronal (7.5%)', val: item.isssPatronal },
    { label: 'AFP Patronal (7.75%)', val: item.afpPatronal },
    { label: 'INSAFORP (1%)', val: item.insaforp },
  ]

  const rowsH = ingresos.map(r => `<tr><td>${r.label}</td><td class="r">${fmt(r.val)}</td></tr>`).join('')
  const rowsD = deducciones.map(r => `<tr><td>${r.label}</td><td class="r">${fmt(r.val)}</td></tr>`).join('')
  const rowsP = patronales.map(r => `<tr><td>${r.label}</td><td class="r">${fmt(r.val)}</td></tr>`).join('')

  const startDate = period?.startDate ? new Date(period.startDate).toLocaleDateString('es-SV') : ''
  const endDate   = period?.endDate   ? new Date(period.endDate).toLocaleDateString('es-SV')   : ''

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Boleta — ${fullName}</title>
  <style>${BASE_CSS}
  .boleta-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
  .col-title{font-size:9px;font-weight:bold;text-transform:uppercase;padding:4px 8px;color:#fff;border-radius:3px 3px 0 0}
  .col-ing{background:#1a365d}
  .col-ded{background:#991b1b}
  .neto-box{background:${SUCCESS_BG};border:2px solid #bbf7d0;border-radius:4px;padding:12px 20px;text-align:center;margin-top:12px}
  .neto-box .label{font-size:10px;color:${SUCCESS};font-weight:bold;text-transform:uppercase}
  .neto-box .amount{font-size:22px;font-weight:bold;color:${SUCCESS};margin-top:4px}
  </style></head><body>
  <div class="no-print">
    <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
    <button class="btn-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div>
        <h1>${companyName}</h1>
        <p>BOLETA DE PAGO DE SALARIO</p>
        <p>Art. 139 Código de Trabajo</p>
      </div>
      <div class="badge">${period?.name ?? 'Período'}<small>${startDate} — ${endDate}</small></div>
    </div>
    <div class="body">
      <div class="info-box grid3">
        <div class="field"><label>Empleado</label><span>${fullName}</span></div>
        <div class="field"><label>Cargo / Puesto</label><span>${emp.position ?? '—'}</span></div>
        <div class="field"><label>DUI</label><span>${emp.dui ?? '—'}</span></div>
        <div class="field"><label>AFP</label><span>${emp.afpInstitution ?? '—'}</span></div>
        <div class="field"><label>Fecha Pago</label><span>${period?.payDate ? new Date(period.payDate).toLocaleDateString('es-SV') : '—'}</span></div>
        <div class="field"><label>Salario Bruto</label><span>${fmt(item.totalBruto)}</span></div>
      </div>

      <div class="boleta-grid">
        <div>
          <div class="col-title col-ing">Ingresos</div>
          <table><tbody>${rowsH}
            <tr style="background:#dbeafe;font-weight:bold"><td>Total Bruto</td><td class="r">${fmt(item.totalBruto)}</td></tr>
          </tbody></table>
        </div>
        <div>
          <div class="col-title col-ded">Deducciones</div>
          <table><tbody>${rowsD}
            <tr style="background:#fee2e2;font-weight:bold"><td>Total Deducciones</td><td class="r">${fmt(item.totalDeducciones)}</td></tr>
          </tbody></table>
        </div>
      </div>

      <div class="neto-box">
        <div class="label">Salario Neto a Recibir</div>
        <div class="amount">${fmt(item.salarioNeto ?? item.salaryBase)}</div>
      </div>

      <details style="margin-top:12px">
        <summary style="cursor:pointer;font-size:10px;color:${MUTED};padding:4px 0">Ver aportes patronales (no afectan el neto)</summary>
        <table style="margin-top:6px;width:50%"><tbody>${rowsP}</tbody></table>
      </details>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:28px;padding-top:16px;border-top:1px solid ${BORDER}">
        <div style="text-align:center;font-size:10px;color:${MUTED}">
          <div style="border-top:1px solid #cbd5e1;padding-top:6px;margin-top:28px">Firma Empleador</div>
        </div>
        <div style="text-align:center;font-size:10px;color:${MUTED}">
          <div style="border-top:1px solid #cbd5e1;padding-top:6px;margin-top:28px">Firma Empleado &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
          <div style="margin-top:4px">DUI: ${emp.dui ?? '_______________'}</div>
        </div>
      </div>
    </div>
    <div class="footer-note">Impreso: ${new Date().toLocaleString('es-SV')}</div>
  </div>
  </body></html>`

  openTab(html)
}

// ─── 3. REPORTE DE VENTAS ────────────────────────────────────────────────────
export function abrirReporteVentasHtml(sales: any[], params?: { from?: string; to?: string; branchName?: string }) {
  const companyName = localStorage.getItem('companyName') ?? 'Empresa'
  const TIPO_SHORT: Record<string, string> = { '01':'CF', '03':'CCF', '05':'NC', '06':'ND', '16':'VS' }
  const total = sales.reduce((s, r) => s + Number(r.totalPagar ?? 0), 0)
  const dateRange = [params?.from, params?.to].filter(Boolean).join(' — ') || 'Todos los períodos'

  const rowsHtml = sales.map((s: any, idx: number) => `
    <tr>
      <td class="c">${idx + 1}</td>
      <td>${new Date(s.createdAt).toLocaleDateString('es-SV')}</td>
      <td><span class="tag" style="background:#dbeafe;color:#1e40af">${TIPO_SHORT[s.tipoDte] ?? s.tipoDte}</span></td>
      <td><code style="font-size:9px">${s.dteDocument?.numeroControl ?? '—'}</code></td>
      <td>${s.client?.name ?? 'Consumidor Final'}</td>
      <td>${s.branch?.name ?? '—'}</td>
      <td class="r">${fmt(s.totalGravada)}</td>
      <td class="r">${fmt(s.totalIva)}</td>
      <td class="r"><strong>${fmt(s.totalPagar)}</strong></td>
      <td class="c"><span class="tag ${s.dteDocument?.status === 'ACCEPTED' ? 'tag-ok' : s.dteDocument?.status === 'ANNULLED' ? 'tag-err' : 'tag-warn'}">${s.dteDocument?.status ?? '—'}</span></td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Reporte Ventas — ${companyName}</title>
  <style>${BASE_CSS}
  code{font-family:monospace;font-size:9px;background:#f1f5f9;padding:1px 4px;border-radius:2px}
  </style></head><body>
  <div class="no-print">
    <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
    <button class="btn-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div><h1>${companyName}</h1><p>REPORTE DE VENTAS DTE</p></div>
      <div class="badge">
        ${sales.length} documentos
        <small>${dateRange}</small>
        ${params?.branchName ? `<small>Sucursal: ${params.branchName}</small>` : ''}
      </div>
    </div>
    <div class="body">
      <div class="info-box grid3">
        <div class="field"><label>Total Ventas</label><span style="color:${ACCENT}">${fmt(total)}</span></div>
        <div class="field"><label>Período</label><span>${dateRange}</span></div>
        <div class="field"><label>Generado</label><span>${new Date().toLocaleString('es-SV')}</span></div>
      </div>
      <table>
        <thead><tr>
          <th class="c">#</th><th>Fecha</th><th class="c">Tipo</th><th>Nº Control</th>
          <th>Cliente</th><th>Sucursal</th>
          <th class="r">Gravada</th><th class="r">IVA</th><th class="r">Total</th><th class="c">Estado</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr style="background:${PRIMARY};color:#fff;font-weight:bold">
            <td colspan="6" style="padding:6px 8px;color:#fff">TOTALES</td>
            <td class="r" style="color:#fff">${fmt(sales.reduce((s,r)=>s+Number(r.totalGravada??0),0))}</td>
            <td class="r" style="color:#fff">${fmt(sales.reduce((s,r)=>s+Number(r.totalIva??0),0))}</td>
            <td class="r" style="color:#fff">${fmt(total)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="footer-note">Reporte generado el ${new Date().toLocaleString('es-SV')}</div>
  </div>
  </body></html>`

  openTab(html)
}

// ─── 4. REPORTE DE GASTOS ────────────────────────────────────────────────────
export function abrirReporteGastosHtml(gastos: any[], params?: { from?: string; to?: string }) {
  const companyName = localStorage.getItem('companyName') ?? 'Empresa'
  const total = gastos.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const dateRange = [params?.from, params?.to].filter(Boolean).join(' — ') || 'Todos los períodos'

  const rowsHtml = gastos.map((g: any, idx: number) => `
    <tr>
      <td class="c">${idx + 1}</td>
      <td>${new Date(g.date ?? g.createdAt).toLocaleDateString('es-SV')}</td>
      <td>${g.category?.name ?? g.categoryName ?? '—'}</td>
      <td>${g.description ?? '—'}</td>
      <td>${g.supplier?.name ?? g.supplierName ?? '—'}</td>
      <td class="r"><strong>${fmt(g.amount)}</strong></td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Reporte Gastos — ${companyName}</title>
  <style>${BASE_CSS}</style></head><body>
  <div class="no-print">
    <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
    <button class="btn-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div><h1>${companyName}</h1><p>REPORTE DE GASTOS</p></div>
      <div class="badge">${gastos.length} registros<small>${dateRange}</small></div>
    </div>
    <div class="body">
      <div class="info-box grid3">
        <div class="field"><label>Total Gastos</label><span style="color:${DANGER}">${fmt(total)}</span></div>
        <div class="field"><label>Período</label><span>${dateRange}</span></div>
        <div class="field"><label>Generado</label><span>${new Date().toLocaleString('es-SV')}</span></div>
      </div>
      <table>
        <thead><tr>
          <th class="c">#</th><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Proveedor</th><th class="r">Monto</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr style="background:${PRIMARY};color:#fff;font-weight:bold">
            <td colspan="5" style="padding:6px 8px;color:#fff">TOTAL</td>
            <td class="r" style="color:#fff">${fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="footer-note">Reporte generado el ${new Date().toLocaleString('es-SV')}</div>
  </div>
  </body></html>`

  openTab(html)
}

// ─── 5. REPORTE DE INVENTARIO ────────────────────────────────────────────────
export function abrirReporteInventarioHtml(products: any[], branchName?: string) {
  const companyName = localStorage.getItem('companyName') ?? 'Empresa'

  const rowsHtml = products.map((p: any, idx: number) => {
    const stock = Number(p.stock ?? 0)
    const min   = Number(p.minStock ?? 0)
    const isLow = stock <= min && min > 0
    const isOut = stock === 0
    const statusTag = isOut
      ? `<span class="tag tag-err">Sin stock</span>`
      : isLow
        ? `<span class="tag tag-warn">Stock bajo</span>`
        : `<span class="tag tag-ok">OK</span>`
    return `
      <tr>
        <td class="c">${idx + 1}</td>
        <td>${p.sku ?? '—'}</td>
        <td>${p.name}</td>
        <td>${p.category?.name ?? '—'}</td>
        <td class="r">${fmt(p.price)}</td>
        <td class="c ${isOut ? 'tag-err' : isLow ? 'tag-warn' : ''}" style="font-weight:bold">${stock}</td>
        <td class="c">${min || '—'}</td>
        <td class="c">${statusTag}</td>
        <td class="r">${fmt(stock * Number(p.cost ?? p.price ?? 0))}</td>
      </tr>`
  }).join('')

  const totalValor = products.reduce((s, p) => s + Number(p.stock ?? 0) * Number(p.cost ?? p.price ?? 0), 0)

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Inventario — ${companyName}</title>
  <style>${BASE_CSS}</style></head><body>
  <div class="no-print">
    <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
    <button class="btn-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div><h1>${companyName}</h1><p>REPORTE DE INVENTARIO</p></div>
      <div class="badge">
        ${products.length} productos
        ${branchName ? `<small>Sucursal: ${branchName}</small>` : ''}
        <small>${new Date().toLocaleDateString('es-SV')}</small>
      </div>
    </div>
    <div class="body">
      <div class="info-box grid3">
        <div class="field"><label>Productos</label><span>${products.length}</span></div>
        <div class="field"><label>Sin stock</label><span style="color:${DANGER}">${products.filter(p=>Number(p.stock??0)===0).length}</span></div>
        <div class="field"><label>Valor estimado (costo)</label><span style="color:${ACCENT}">${fmt(totalValor)}</span></div>
      </div>
      <table>
        <thead><tr>
          <th class="c">#</th><th>SKU</th><th>Nombre</th><th>Categoría</th>
          <th class="r">Precio</th><th class="c">Stock</th><th class="c">Mín.</th>
          <th class="c">Estado</th><th class="r">Valor</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr style="background:${PRIMARY};color:#fff;font-weight:bold">
            <td colspan="8" style="padding:6px 8px;color:#fff">VALOR TOTAL INVENTARIO</td>
            <td class="r" style="color:#fff">${fmt(totalValor)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="footer-note">Reporte generado el ${new Date().toLocaleString('es-SV')}</div>
  </div>
  </body></html>`

  openTab(html)
}

// ─── 6. REPORTE CxC / CxP AGING ─────────────────────────────────────────────
export function abrirAgingHtml(
  rows: any[],
  buckets: Record<string, number>,
  tipo: 'CxC' | 'CxP',
) {
  const companyName = localStorage.getItem('companyName') ?? 'Empresa'
  const entityLabel = tipo === 'CxC' ? 'Cliente' : 'Proveedor'

  const BUCKET_LABELS: Record<string, string> = {
    current: 'Vigente', d30: '1-30 días', d60: '31-60 días', d90: '61-90 días', d90plus: '+90 días',
  }
  const BUCKET_COLORS: Record<string, string> = {
    current: SUCCESS, d30: '#854d0e', d60: '#9a3412', d90: DANGER, d90plus: DANGER,
  }
  const BUCKET_BGS: Record<string, string> = {
    current: SUCCESS_BG, d30: WARN_BG, d60: '#ffedd5', d90: DANGER_BG, d90plus: DANGER_BG,
  }

  const bucketsHtml = Object.entries(BUCKET_LABELS).map(([key, label]) => `
    <div style="background:${BUCKET_BGS[key]};border-radius:4px;padding:10px 14px;text-align:center">
      <div style="font-size:9px;font-weight:bold;color:${BUCKET_COLORS[key]};text-transform:uppercase">${label}</div>
      <div style="font-size:16px;font-weight:bold;color:${BUCKET_COLORS[key]};margin-top:4px">${fmt(buckets[key] ?? 0)}</div>
    </div>`).join('')

  const rowsHtml = rows.map((r: any, idx: number) => `
    <tr>
      <td class="c">${idx + 1}</td>
      <td>${r.supplier?.name ?? r.client?.name ?? '—'}</td>
      <td>${r.description ?? '—'}</td>
      <td>${new Date(r.dueDate).toLocaleDateString('es-SV')}</td>
      <td class="r">${fmt(r.amount)}</td>
      <td class="r">${fmt(r.amountPaid)}</td>
      <td class="r"><strong>${fmt(r.pending ?? (Number(r.amount)-Number(r.amountPaid)))}</strong></td>
      <td class="c">${r.daysPast > 0 ? `<span class="tag tag-err">${r.daysPast}d</span>` : `<span class="tag tag-ok">vigente</span>`}</td>
      <td class="c"><span class="tag ${r.bucket==='current'?'tag-ok':r.bucket==='d90plus'?'tag-err':'tag-warn'}">${BUCKET_LABELS[r.bucket] ?? r.bucket}</span></td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Aging ${tipo} — ${companyName}</title>
  <style>${BASE_CSS}</style></head><body>
  <div class="no-print">
    <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
    <button class="btn-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div><h1>${companyName}</h1><p>REPORTE AGING — CUENTAS POR ${tipo === 'CxC' ? 'COBRAR' : 'PAGAR'}</p></div>
      <div class="badge">${rows.length} cuentas<small>${new Date().toLocaleDateString('es-SV')}</small></div>
    </div>
    <div class="body">
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px">${bucketsHtml}</div>
      <table>
        <thead><tr>
          <th class="c">#</th><th>${entityLabel}</th><th>Descripción</th><th>Vencimiento</th>
          <th class="r">Total</th><th class="r">Pagado</th><th class="r">Pendiente</th>
          <th class="c">Días</th><th class="c">Tramo</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr style="background:${PRIMARY};color:#fff;font-weight:bold">
            <td colspan="6" style="padding:6px 8px;color:#fff">TOTAL PENDIENTE</td>
            <td class="r" style="color:#fff">${fmt(buckets.total)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="footer-note">Reporte generado el ${new Date().toLocaleString('es-SV')}</div>
  </div>
  </body></html>`

  openTab(html)
}

// ─── 7. LIBRO IVA VENTAS (F-07 Sección I + II) ─────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto',
  'Septiembre','Octubre','Noviembre','Diciembre']
const TIPO_DTE_LABEL: Record<string, string> = { '01':'CF','03':'CCF','05':'NC','06':'ND' }

export function abrirLibroIvaVentasHtml(data: any) {
  const c  = data.company ?? {}
  const p  = data.period  ?? {}
  const tc = data.totalesContribuyentes ?? {}
  const tf = data.totalesConsumidores   ?? {}
  const contribuyentes: any[] = data.contribuyentes ?? []
  const consumidores:   any[] = data.consumidores   ?? []
  const periodo = `${MESES[(p.month ?? 1) - 1]} ${p.year}`

  const printBtn = `<div class="no-print">
    <button class="btn-close" onclick="window.close()">Cerrar</button>
    <button class="btn-print" onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>`

  const rowsI = contribuyentes.map((r: any, i: number) => `
    <tr style="${i%2===0?'':'background:#eff6ff'}">
      <td class="c">${r.correlativo}</td><td>${r.fecha}</td>
      <td style="font-family:monospace;font-size:8px">${r.numeroControl}</td>
      <td class="c">${TIPO_DTE_LABEL[r.tipoDte]??r.tipoDte}</td>
      <td>${r.nitReceptor}</td><td>${r.nombreReceptor}</td>
      <td class="r">${d2(r.totalExenta)}</td><td class="r">${d2(r.totalNoSuj)}</td>
      <td class="r">${d2(r.totalGravada)}</td><td class="r">${d2(r.totalIva)}</td>
      <td class="r">${d2(r.ivaRete1)}</td>
      <td class="r" style="font-weight:600">${d2(r.totalPagar)}</td>
    </tr>`).join('')

  const rowsII = consumidores.map((r: any, i: number) => `
    <tr style="${i%2===0?'':'background:#eff6ff'}">
      <td class="c">${r.correlativo}</td><td>${r.fecha}</td>
      <td style="font-family:monospace;font-size:8px">${r.numeroControl}</td>
      <td class="r">${d2(r.totalExenta)}</td><td class="r">${d2(r.totalNoSuj)}</td>
      <td class="r">${d2(r.totalGravada)}</td><td class="r">${d2(r.totalIva)}</td>
      <td class="r" style="font-weight:600">${d2(r.totalPagar)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Libro IVA Ventas</title>
  <style>${BASE_CSS}table thead th{font-size:8px}table tbody td{font-size:9px}
  .sb{margin:20px 0 8px;border-top:2px solid ${BORDER};padding-top:12px}
  .st{font-size:12px;font-weight:700;color:${PRIMARY};margin-bottom:8px}
  .lh{background:${PRIMARY};color:#fff;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-radius:3px}
  </style></head><body>
  ${printBtn}
  <div class="page" style="max-width:960px">
    <div class="header">
      <div><h1>${c.name}</h1>
        <p>NIT: ${c.nit||'—'} | NRC: ${c.nrc||'—'}</p>
        <p>LIBRO DE VENTAS — IMPUESTO AL VALOR AGREGADO (IVA)</p>
      </div>
      <div class="badge">${periodo}<small>F-07</small></div>
    </div>
    <div class="body">
      <div class="st">SECCIÓN I — VENTAS A CONTRIBUYENTES (CCF / NC / ND)</div>
      <div class="lh">
        <span style="font-weight:bold">LIBRO DE VENTAS A CONTRIBUYENTES</span>
        <span style="font-size:10px">NIT: ${c.nit||'—'} · Período: ${periodo}</span>
      </div>
      <table><thead><tr>
        <th class="c">N°</th><th>Fecha</th><th>N° Control DTE</th>
        <th class="c">Tipo</th><th>NIT Receptor</th><th>Nombre Receptor</th>
        <th class="r">Exentas</th><th class="r">No Suj.</th><th class="r">Gravadas</th>
        <th class="r">Déb.Fiscal</th><th class="r">Ret.1%</th><th class="r">Total</th>
      </tr></thead>
      <tbody>${rowsI||'<tr><td colspan="12" style="text-align:center;padding:12px;color:#888">Sin documentos CCF/NC/ND</td></tr>'}</tbody>
      <tfoot><tr style="background:${PRIMARY};color:#fff;font-weight:bold">
        <td colspan="6" style="padding:5px 8px">TOTALES SECCIÓN I</td>
        <td class="r">${d2(tc.exenta)}</td><td class="r">${d2(tc.noSuj)}</td>
        <td class="r">${d2(tc.gravada)}</td><td class="r">${d2(tc.iva)}</td>
        <td class="r">${d2(tc.ivaRete1)}</td><td class="r">${d2(tc.total)}</td>
      </tr></tfoot></table>
      <div class="sb"></div>
      <div class="st">SECCIÓN II — VENTAS A CONSUMIDORES FINALES (CF)</div>
      <div class="lh">
        <span style="font-weight:bold">LIBRO DE VENTAS A CONSUMIDORES FINALES</span>
        <span style="font-size:10px">NIT: ${c.nit||'—'} · Período: ${periodo}</span>
      </div>
      <table><thead><tr>
        <th class="c">N°</th><th>Fecha</th><th>N° Control DTE</th>
        <th class="r">Exentas</th><th class="r">No Suj.</th>
        <th class="r">Gravadas</th><th class="r">IVA Inc.</th><th class="r">Total</th>
      </tr></thead>
      <tbody>${rowsII||'<tr><td colspan="8" style="text-align:center;padding:12px;color:#888">Sin documentos CF</td></tr>'}</tbody>
      <tfoot><tr style="background:${PRIMARY};color:#fff;font-weight:bold">
        <td colspan="3" style="padding:5px 8px">TOTALES SECCIÓN II</td>
        <td class="r">${d2(tf.exenta)}</td><td class="r">${d2(tf.noSuj)}</td>
        <td class="r">${d2(tf.gravada)}</td><td class="r">${d2(tf.iva)}</td>
        <td class="r">${d2(tf.total)}</td>
      </tr></tfoot></table>
      <div class="sb"></div>
      <div class="st">RESUMEN CONSOLIDADO</div>
      <table style="max-width:520px"><thead><tr>
        <th>Categoría</th><th class="r">Exentas</th><th class="r">No Suj.</th>
        <th class="r">Gravadas</th><th class="r">IVA</th><th class="r">Total</th>
      </tr></thead><tbody>
        <tr><td>Ventas a Contribuyentes</td>
          <td class="r">${d2(tc.exenta)}</td><td class="r">${d2(tc.noSuj)}</td>
          <td class="r">${d2(tc.gravada)}</td><td class="r">${d2(tc.iva)}</td>
          <td class="r" style="font-weight:600">${d2(tc.total)}</td>
        </tr>
        <tr style="background:#eff6ff"><td>Ventas a Consumidores</td>
          <td class="r">${d2(tf.exenta)}</td><td class="r">${d2(tf.noSuj)}</td>
          <td class="r">${d2(tf.gravada)}</td><td class="r">${d2(tf.iva)}</td>
          <td class="r" style="font-weight:600">${d2(tf.total)}</td>
        </tr>
        <tr style="background:${PRIMARY};color:#fff;font-weight:bold">
          <td style="padding:5px 8px">GRAN TOTAL</td>
          <td class="r">${d2((tc.exenta||0)+(tf.exenta||0))}</td>
          <td class="r">${d2((tc.noSuj||0)+(tf.noSuj||0))}</td>
          <td class="r">${d2((tc.gravada||0)+(tf.gravada||0))}</td>
          <td class="r">${d2((tc.iva||0)+(tf.iva||0))}</td>
          <td class="r">${d2((tc.total||0)+(tf.total||0))}</td>
        </tr>
      </tbody></table>
    </div>
    <div class="footer-note">
      Libro de IVA generado el ${new Date().toLocaleString('es-SV')} — Ministerio de Hacienda El Salvador — F-07
    </div>
  </div></body></html>`
  openTab(html)
}

// ─── 8. LIBRO IVA COMPRAS (F-07 Sección III) ────────────────────────────────

export function abrirLibroIvaComprasHtml(data: any) {
  const c = data.company ?? {}
  const p = data.period  ?? {}
  const t = data.totales ?? {}
  const compras: any[] = data.compras ?? []
  const periodo = `${MESES[(p.month ?? 1) - 1]} ${p.year}`

  const printBtn = `<div class="no-print">
    <button class="btn-close" onclick="window.close()">Cerrar</button>
    <button class="btn-print" onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>`

  const rows = compras.map((r: any, i: number) => `
    <tr style="${i%2===0?'':'background:#eff6ff'}">
      <td class="c">${r.correlativo}</td><td>${r.fecha}</td>
      <td style="font-family:monospace;font-size:8px">${r.supplierDocNumber}</td>
      <td>${r.nitProveedor}</td><td>${r.nombreProveedor}</td>
      <td class="r">${d2(r.totalExenta)}</td><td class="r">${d2(r.totalNoSuj)}</td>
      <td class="r">${d2(r.totalGravada)}</td><td class="r">${d2(r.totalIva)}</td>
      <td class="r">${d2(r.ivaRete1)}</td>
      <td class="r" style="font-weight:600">${d2(r.total)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Libro IVA Compras</title>
  <style>${BASE_CSS}table thead th{font-size:8px}table tbody td{font-size:9px}
  .st{font-size:12px;font-weight:700;color:${PRIMARY};margin-bottom:8px}
  .lh{background:${PRIMARY};color:#fff;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-radius:3px}
  </style></head><body>
  ${printBtn}
  <div class="page" style="max-width:960px">
    <div class="header">
      <div><h1>${c.name}</h1>
        <p>NIT: ${c.nit||'—'} | NRC: ${c.nrc||'—'}</p>
        <p>LIBRO DE COMPRAS — IMPUESTO AL VALOR AGREGADO (IVA)</p>
      </div>
      <div class="badge">${periodo}<small>F-07 Secc.III</small></div>
    </div>
    <div class="body">
      <div class="st">SECCIÓN III — COMPRAS A CONTRIBUYENTES (CCF RECIBIDOS)</div>
      <div class="lh">
        <span style="font-weight:bold">LIBRO DE COMPRAS — CRÉDITO FISCAL</span>
        <span style="font-size:10px">NIT: ${c.nit||'—'} · Período: ${periodo}</span>
      </div>
      <table><thead><tr>
        <th class="c">N°</th><th>Fecha</th><th>N° Doc. Proveedor</th>
        <th>NIT Proveedor</th><th>Nombre Proveedor</th>
        <th class="r">Exentas</th><th class="r">No Suj.</th><th class="r">Gravadas</th>
        <th class="r">Créd.Fiscal</th><th class="r">Ret.IVA</th><th class="r">Total</th>
      </tr></thead>
      <tbody>${rows||'<tr><td colspan="11" style="text-align:center;padding:12px;color:#888">Sin compras recibidas en el período</td></tr>'}</tbody>
      <tfoot><tr style="background:${PRIMARY};color:#fff;font-weight:bold">
        <td colspan="5" style="padding:5px 8px">TOTALES</td>
        <td class="r">${d2(t.exenta)}</td><td class="r">${d2(t.noSuj)}</td>
        <td class="r">${d2(t.gravada)}</td><td class="r">${d2(t.iva)}</td>
        <td class="r">${d2(t.ivaRete1)}</td><td class="r">${d2(t.total)}</td>
      </tr></tfoot></table>
      <div style="display:flex;justify-content:flex-end;margin-top:16px">
        <table style="width:340px"><tbody>
          <tr><td>Total compras exentas</td><td class="r">${d2(t.exenta)}</td></tr>
          <tr style="background:#eff6ff"><td>Total compras no sujetas</td><td class="r">${d2(t.noSuj)}</td></tr>
          <tr><td>Total compras gravadas</td><td class="r">${d2(t.gravada)}</td></tr>
          <tr style="background:#eff6ff"><td>Total crédito fiscal (IVA 13%)</td><td class="r">${d2(t.iva)}</td></tr>
          <tr><td>Total IVA retenido (1%)</td><td class="r">${d2(t.ivaRete1)}</td></tr>
          <tr style="background:${PRIMARY};color:#fff;font-weight:bold">
            <td style="padding:6px 8px">TOTAL COMPRAS DEL PERÍODO</td>
            <td class="r" style="font-size:13px">${d2(t.total)}</td>
          </tr>
        </tbody></table>
      </div>
    </div>
    <div class="footer-note">
      Libro de IVA Compras generado el ${new Date().toLocaleString('es-SV')} — Ministerio de Hacienda El Salvador — F-07
    </div>
  </div></body></html>`
  openTab(html)
}

/**
 * DtePdfService
 * Generates a PDF buffer for a DTE (CF tipoDte=01 or CCF tipoDte=03).
 * Uses pdfkit — pure Node.js, no Chromium/Puppeteer dependency.
 */
import { Injectable, Logger } from '@nestjs/common'
import PDFDocument from 'pdfkit'

function n(val: any, dp = 2): string {
  const num = typeof val === 'object' && val !== null && 'toNumber' in val
    ? (val as any).toNumber()
    : Number(val ?? 0)
  return isNaN(num) ? '0.00' : num.toFixed(dp)
}

function fmt(val: any): string { return `$${n(val)}` }

const DTE_LABELS: Record<string, string> = {
  '01': 'FACTURA — CONSUMIDOR FINAL',
  '03': 'COMPROBANTE DE CRÉDITO FISCAL',
  '05': 'NOTA DE CRÉDITO',
  '06': 'NOTA DE DÉBITO',
  '16': 'VENTA SIMPLIFICADA',
}

@Injectable()
export class DtePdfService {
  private readonly logger = new Logger(DtePdfService.name)

  /**
   * Generates a PDF buffer for the given sale + DTE document.
   * @param sale  Full sale object (items, payments, client, branch, company)
   * @param dte   DteDocument record (numeroControl, codigoGeneracion, selloRecibido, tipoDte)
   * @returns     Buffer containing the PDF
   */
  async generate(sale: any, dte: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = []
        const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `DTE ${dte.numeroControl}` } })

        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const company = sale.company ?? {}
        const branch = sale.branch ?? {}
        const client = sale.client ?? null
        const items: any[] = sale.items ?? []
        const payments: any[] = sale.payments ?? []
        const tipoDte: string = dte.tipoDte ?? '01'
        const isNC  = tipoDte === '05'
        const isND  = tipoDte === '06'
        const isVS  = tipoDte === '16'
        const isCCF = tipoDte === '03'

        const primaryColor = '#1a365d'
        const accentColor = '#2b6cb0'
        const lightGray = '#f7fafc'
        const borderGray = '#e2e8f0'
        const textGray = '#4a5568'

        const pageW = doc.page.width
        const pageH = doc.page.height
        const margin = 40
        const contentW = pageW - margin * 2

        // ── Header background ──────────────────────────────────────────────
        doc.rect(0, 0, pageW, 110).fill(primaryColor)

        // Company name
        doc.fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(16)
          .text(company.name ?? 'Empresa', margin, 18, { width: contentW * 0.65 })

        if (company.comercialName && company.comercialName !== company.name) {
          doc.fontSize(10).font('Helvetica')
            .text(company.comercialName, margin, 38, { width: contentW * 0.65 })
        }

        doc.fontSize(9).font('Helvetica')
          .text([
            company.nit ? `NIT: ${company.nit}` : null,
            company.nrc ? `NRC: ${company.nrc}` : null,
            company.actividadEconomica ? company.actividadEconomica : null,
          ].filter(Boolean).join('   '), margin, 52, { width: contentW * 0.65 })

        doc.text([
          company.address,
          company.phone ? `Tel: ${company.phone}` : null,
          company.email,
        ].filter(Boolean).join('  |  '), margin, 65, { width: contentW * 0.65 })

        // DTE type badge (right side of header)
        const badgeX = pageW - margin - 200
        doc.rect(badgeX, 12, 200, 40).fill(accentColor)
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
          .text(DTE_LABELS[tipoDte] ?? `DTE ${tipoDte}`, badgeX + 6, 16, { width: 188, align: 'center' })

        // Branch name
        doc.fillColor('#cbd5e0').font('Helvetica').fontSize(8)
          .text(`Sucursal: ${branch.name ?? '—'}`, badgeX + 6, 56, { width: 188 })

        // ── DTE control box ────────────────────────────────────────────────
        const ctrlY = 118
        doc.rect(margin, ctrlY, contentW, 52).fill(lightGray).stroke(borderGray)

        const half = contentW / 2 - 10
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8)
          .text('NÚMERO DE CONTROL', margin + 8, ctrlY + 8)
        doc.fillColor(textGray).font('Helvetica').fontSize(9)
          .text(dte.numeroControl ?? '—', margin + 8, ctrlY + 20, { width: half })

        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8)
          .text('CÓDIGO DE GENERACIÓN', margin + half + 18, ctrlY + 8)
        doc.fillColor(textGray).font('Helvetica').fontSize(9)
          .text(dte.codigoGeneracion ?? '—', margin + half + 18, ctrlY + 20, { width: half })

        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8)
          .text('SELLO RECIBIDO', margin + 8, ctrlY + 34)
        doc.fillColor(textGray).font('Helvetica').fontSize(8)
          .text(dte.selloRecibido ?? 'Pendiente', margin + 8, ctrlY + 44, { width: contentW - 16 })

        // Date
        const fecEmi = new Date(sale.createdAt)
        const svDate = new Intl.DateTimeFormat('es-SV', {
          timeZone: 'America/El_Salvador',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: true,
        }).format(fecEmi)
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8)
          .text('FECHA EMISIÓN', margin + half + 18, ctrlY + 34)
        doc.fillColor(textGray).font('Helvetica').fontSize(9)
          .text(svDate, margin + half + 18, ctrlY + 44, { width: half })

        let y = ctrlY + 62

        // ── Documento relacionado (NC/ND) ─────────────────────────────────
        if ((isNC || isND) && sale.docRelNumeroControl) {
          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9)
            .text('DOCUMENTO RELACIONADO', margin, y)
          y += 12
          doc.rect(margin, y, contentW, 28).fill(lightGray).stroke(borderGray)
          const half2 = contentW / 2 - 10
          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(7)
            .text('NÚMERO DE CONTROL RELACIONADO', margin + 6, y + 5)
          doc.fillColor(textGray).font('Helvetica').fontSize(8)
            .text(sale.docRelNumeroControl ?? '—', margin + 6, y + 15, { width: half2 })
          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(7)
            .text('CÓDIGO DE GENERACIÓN', margin + half2 + 16, y + 5)
          doc.fillColor(textGray).font('Helvetica').fontSize(8)
            .text(sale.docRelCodigoGeneracion ?? '—', margin + half2 + 16, y + 15, { width: half2 })
          y += 36
        }

        // ── Client section ─────────────────────────────────────────────────
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10)
          .text(isCCF || isNC || isND ? 'DATOS DEL RECEPTOR' : 'CLIENTE', margin, y)
        y += 14

        const clientBoxH = (isCCF || isNC || isND) ? 70 : 30
        doc.rect(margin, y, contentW, clientBoxH).fill(lightGray).stroke(borderGray)

        const clientLabel = (label: string, val: string | null | undefined, x: number, iy: number, w: number) => {
          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(7).text(label, x, iy)
          doc.fillColor(textGray).font('Helvetica').fontSize(9).text(val ?? '—', x, iy + 10, { width: w - 4 })
        }

        if (isCCF || isNC || isND) {
          // CCF / NC / ND — full client fields
          const col = contentW / 3
          clientLabel('NOMBRE / RAZÓN SOCIAL', client?.name, margin + 6, y + 6, col * 1.5)
          clientLabel('NIT', client?.nit ?? client?.numDocumento, margin + col * 1.5 + 10, y + 6, col * 0.75)
          clientLabel('NRC', client?.nrc, margin + col * 2.25 + 10, y + 6, col * 0.75)
          clientLabel('ACTIVIDAD ECONÓMICA', client?.actividadEconomica, margin + 6, y + 38, col * 1.5)
          clientLabel('CORREO', client?.email, margin + col * 1.5 + 10, y + 38, col)
          clientLabel('DIRECCIÓN', client?.address, margin + 6, y + 52, contentW - 12)
          y += 80
        } else if (isVS) {
          // VS — siempre anónimo
          clientLabel('RECEPTOR', 'Consumidor Final (Anónimo)', margin + 6, y + 6, contentW - 12)
          y += 40
        } else {
          // CF
          clientLabel('CLIENTE', client?.name ?? 'Consumidor Final', margin + 6, y + 6, contentW / 2)
          if (client?.numDocumento) {
            clientLabel('DOCUMENTO', client.numDocumento, margin + contentW / 2 + 6, y + 6, contentW / 2)
          }
          y += 40
        }

        y += 4

        // ── Items table ────────────────────────────────────────────────────
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10).text('DETALLE', margin, y)
        y += 14

        // Table header
        const useCcfCols = isCCF || isNC || isND
        const cols = useCcfCols
          ? [
              { label: '#', w: 22, align: 'right' as const },
              { label: 'DESCRIPCIÓN', w: contentW - 22 - 60 - 70 - 70 - 70, align: 'left' as const },
              { label: 'CANT.', w: 50, align: 'right' as const },
              { label: 'PRECIO', w: 60, align: 'right' as const },
              { label: 'GRAVADA', w: 70, align: 'right' as const },
              { label: 'IVA', w: 60, align: 'right' as const },
              { label: 'TOTAL', w: 70, align: 'right' as const },
            ]
          : [
              { label: '#', w: 22, align: 'right' as const },
              { label: 'DESCRIPCIÓN', w: contentW - 22 - 60 - 70 - 80, align: 'left' as const },
              { label: 'CANT.', w: 50, align: 'right' as const },
              { label: 'PRECIO', w: 60, align: 'right' as const },
              { label: 'DESC.', w: 60, align: 'right' as const },
              { label: 'TOTAL', w: 80, align: 'right' as const },
            ]

        const rowH = 18
        doc.rect(margin, y, contentW, rowH).fill(primaryColor)
        let colX = margin
        for (const col of cols) {
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7)
            .text(col.label, colX + 3, y + 5, { width: col.w - 4, align: col.align })
          colX += col.w
        }
        y += rowH

        // Item rows
        let rowIdx = 0
        for (const item of items) {
          const rowBg = rowIdx % 2 === 0 ? '#ffffff' : lightGray
          doc.rect(margin, y, contentW, rowH).fill(rowBg).stroke(borderGray)

          colX = margin
          const vals = useCcfCols
            ? [
                String(rowIdx + 1),
                item.product?.name ?? item.productName ?? '—',
                n(item.quantity, 2),
                fmt(item.unitPrice),
                fmt(item.ventaGravada),
                fmt(item.ivaItem),
                fmt(Number(item.ventaGravada ?? 0) + Number(item.ivaItem ?? 0)),
              ]
            : [
                String(rowIdx + 1),
                item.product?.name ?? item.productName ?? '—',
                n(item.quantity, 2),
                fmt(item.unitPrice),
                fmt(item.discount),
                fmt(item.ventaGravada),
              ]

          for (let ci = 0; ci < cols.length; ci++) {
            const col = cols[ci]
            doc.fillColor(textGray).font('Helvetica').fontSize(8)
              .text(vals[ci] ?? '', colX + 3, y + 4, { width: col.w - 4, align: col.align, lineBreak: false })
            colX += col.w
          }

          y += rowH
          rowIdx++

          // Page break if near bottom
          if (y > pageH - 160) {
            doc.addPage()
            y = margin
          }
        }

        y += 8

        // ── Totals ─────────────────────────────────────────────────────────
        const totW = 220
        const totX = pageW - margin - totW

        const addTotRow = (label: string, val: string, bold = false) => {
          doc.rect(totX, y, totW, 18).fill(bold ? accentColor : lightGray).stroke(borderGray)
          doc.fillColor(bold ? '#ffffff' : textGray)
            .font(bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(bold ? 10 : 8)
            .text(label, totX + 6, y + 4, { width: totW / 2 - 6 })
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
            .text(val, totX + totW / 2, y + 4, { width: totW / 2 - 6, align: 'right' })
          y += 18
        }

        addTotRow('VENTA GRAVADA', fmt(sale.totalGravada))
        addTotRow('IVA 13%', fmt(sale.totalIva))
        if (Number(sale.ivaRete1 ?? 0) !== 0) {
          addTotRow('RETENCIÓN IVA 1%', `-${fmt(sale.ivaRete1)}`)
        }
        if (Number(sale.totalDescuento ?? 0) !== 0) {
          addTotRow('DESCUENTO', `-${fmt(sale.totalDescuento)}`)
        }
        addTotRow('TOTAL A PAGAR', fmt(sale.totalPagar), true)

        y += 12

        // ── Payments ───────────────────────────────────────────────────────
        const PAGO_LABELS: Record<string, string> = {
          '01': 'Efectivo', '02': 'Tarjeta débito', '03': 'Tarjeta crédito',
          '04': 'Cheque', '05': 'Transferencia bancaria', '08': 'Dinero electrónico',
          '09': 'Monedero electrónico', '11': 'Bitcoin', '12': 'Criptomoneda',
          '13': 'Cuentas por pagar', '14': 'Giro bancario', '99': 'Otros',
        }
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9)
          .text('FORMA DE PAGO', margin, y)
        y += 12
        for (const p of payments) {
          doc.fillColor(textGray).font('Helvetica').fontSize(9)
            .text(`${PAGO_LABELS[p.formaPago] ?? p.formaPago}: ${fmt(p.amount)}${p.reference ? `  Ref: ${p.reference}` : ''}`, margin, y)
          y += 14
        }

        y += 16

        // ── DTE footer watermark ───────────────────────────────────────────
        doc.rect(margin, y, contentW, 44).fill('#ebf8ff').stroke('#bee3f8')
        doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(10)
          .text('DOCUMENTO TRIBUTARIO ELECTRÓNICO', margin + 8, y + 8, { width: contentW - 16, align: 'center' })
        doc.fillColor(textGray).font('Helvetica').fontSize(8)
          .text(
            'Este documento ha sido firmado electrónicamente y transmitido al Ministerio de Hacienda de El Salvador conforme al Art. 107 del Código Tributario.',
            margin + 8, y + 22, { width: contentW - 16, align: 'center' },
          )

        y += 56

        // Signature grid (dueño / receptor)
        if (y < pageH - 80) {
          const sigW = (contentW - 40) / 2
          doc.moveTo(margin, y + 30).lineTo(margin + sigW, y + 30).stroke(borderGray)
          doc.fillColor(textGray).font('Helvetica').fontSize(8)
            .text('Firma Emisor', margin, y + 33, { width: sigW, align: 'center' })

          doc.moveTo(margin + sigW + 40, y + 30).lineTo(margin + sigW * 2 + 40, y + 30).stroke(borderGray)
          doc.text('Firma Receptor', margin + sigW + 40, y + 33, { width: sigW, align: 'center' })
        }

        doc.end()
      } catch (err) {
        reject(err)
      }
    })
  }
}

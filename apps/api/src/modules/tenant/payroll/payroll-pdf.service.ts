/**
 * PayrollPdfService
 * Generates a boleta de pago (pay slip) PDF for an individual payroll item.
 * Uses pdfkit — pure Node.js, no Chromium dependency.
 * Legal requirement (Art. 139 Código de Trabajo SV): must be kept 3 years.
 */
import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'

function n(val: any, dp = 2): string {
  const num = typeof val === 'object' && val !== null && 'toNumber' in val
    ? (val as any).toNumber()
    : Number(val ?? 0)
  return isNaN(num) ? '0.00' : num.toFixed(dp)
}

function fmt(val: any) { return `$${n(val)}` }

@Injectable()
export class PayrollPdfService {
  /**
   * Generates a boleta de pago PDF for a single payroll item.
   * @param item   PayrollItem with employee relation
   * @param period PayrollPeriod
   * @param company Company record
   */
  async generateBoleta(item: any, period: any, company: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = []
        const emp = item.employee ?? {}
        const fullName = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()

        const doc = new PDFDocument({
          size: [612, 396], // half-letter landscape (14cm × 21.6cm ≈ letter half)
          margin: 32,
          info: { Title: `Boleta de Pago — ${fullName}`, Author: company?.name ?? 'Sistema' },
        })

        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const W = doc.page.width
        const M = 32
        const CW = W - M * 2
        const primary = '#1a365d'
        const accent  = '#2b6cb0'
        const gray    = '#718096'
        const light   = '#f7fafc'
        const border  = '#e2e8f0'

        // ── Header ────────────────────────────────────────────────────────────
        doc.rect(0, 0, W, 64).fill(primary)
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
          .text(company?.comercialName ?? company?.name ?? 'Empresa', M, 10, { width: CW * 0.6 })
        doc.font('Helvetica').fontSize(9)
          .text(`NIT: ${company?.nit ?? '—'}  |  NRC: ${company?.nrc ?? '—'}`, M, 28, { width: CW * 0.6 })
        doc.fontSize(9)
          .text(company?.address ?? '', M, 40, { width: CW * 0.6 })

        doc.font('Helvetica-Bold').fontSize(14).fillColor('#f6e05e')
          .text('BOLETA DE PAGO', M + CW * 0.62, 14, { width: CW * 0.38, align: 'right' })
        doc.font('Helvetica').fontSize(9).fillColor('#e2e8f0')
          .text(period.name ?? '', M + CW * 0.62, 34, { width: CW * 0.38, align: 'right' })

        let y = 74

        // ── Employee info row ─────────────────────────────────────────────────
        doc.rect(M, y, CW, 48).fill(light).stroke(border)
        const colW = CW / 4
        const fields = [
          { label: 'Empleado',     value: fullName },
          { label: 'DUI',          value: emp.dui ?? '—' },
          { label: 'Cargo',        value: emp.position ?? '—' },
          { label: 'AFP',          value: emp.afpInstitution ?? '—' },
        ]
        fields.forEach((f, i) => {
          const x = M + i * colW + 8
          doc.fillColor(gray).font('Helvetica').fontSize(7).text(f.label, x, y + 6, { width: colW - 16 })
          doc.fillColor('#1a202c').font('Helvetica-Bold').fontSize(9).text(f.value, x, y + 18, { width: colW - 16, ellipsis: true })
        })
        y += 56

        // ── Columns: Ingresos | Deducciones ──────────────────────────────────
        const halfW = CW / 2 - 6
        const leftX = M
        const rightX = M + CW / 2 + 6

        // Column headers
        doc.rect(leftX, y, halfW, 18).fill(accent)
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
          .text('INGRESOS', leftX, y + 4, { width: halfW, align: 'center' })
        doc.rect(rightX, y, halfW, 18).fill('#c53030')
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
          .text('DEDUCCIONES', rightX, y + 4, { width: halfW, align: 'center' })
        y += 18

        // Ingresos rows
        const ingresos = [
          { label: 'Salario base',       value: item.salaryBase     },
          { label: 'Horas extra',        value: item.horasExtra     },
          { label: 'Bonos',              value: item.bonos          },
          { label: 'Comisiones',         value: item.comisiones     },
          { label: 'Aguinaldo',          value: item.aguinaldo      },
          { label: 'Otros ingresos',     value: item.otrosIngresos  },
        ]
        const deducciones = [
          { label: 'ISSS empleado',     value: item.isssEmpleado    },
          { label: 'AFP empleado',      value: item.afpEmpleado     },
          { label: 'Renta retenida',    value: item.rentaRetenida   },
          { label: 'Otras deducciones', value: item.otrosDeducciones},
        ]
        const rowH = 16
        const maxRows = Math.max(ingresos.length, deducciones.length)

        for (let i = 0; i < maxRows; i++) {
          const bg = i % 2 === 0 ? '#ffffff' : light
          doc.rect(leftX, y + i * rowH, halfW, rowH).fill(bg)
          doc.rect(rightX, y + i * rowH, halfW, rowH).fill(bg)
        }

        ingresos.forEach((r, i) => {
          const ry = y + i * rowH
          doc.fillColor(gray).font('Helvetica').fontSize(8).text(r.label, leftX + 6, ry + 4, { width: halfW * 0.6 })
          doc.fillColor('#1a202c').font('Helvetica-Bold').fontSize(8)
            .text(fmt(r.value), leftX + halfW * 0.6 + 6, ry + 4, { width: halfW * 0.35, align: 'right' })
        })
        deducciones.forEach((r, i) => {
          const ry = y + i * rowH
          doc.fillColor(gray).font('Helvetica').fontSize(8).text(r.label, rightX + 6, ry + 4, { width: halfW * 0.6 })
          doc.fillColor('#c53030').font('Helvetica-Bold').fontSize(8)
            .text(fmt(r.value), rightX + halfW * 0.6 + 6, ry + 4, { width: halfW * 0.35, align: 'right' })
        })

        y += maxRows * rowH + 6

        // ── Totals row ────────────────────────────────────────────────────────
        doc.rect(leftX, y, halfW, 22).fill(accent)
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
          .text('TOTAL BRUTO:', leftX + 6, y + 6, { width: halfW * 0.6 })
        doc.fontSize(10).text(fmt(item.totalBruto), leftX + halfW * 0.6 + 6, y + 5, { width: halfW * 0.35, align: 'right' })

        doc.rect(rightX, y, halfW, 22).fill('#9b2c2c')
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
          .text('TOTAL DEDUCCIONES:', rightX + 6, y + 6, { width: halfW * 0.6 })
        doc.fontSize(10).text(fmt(item.totalDeducciones), rightX + halfW * 0.6 + 6, y + 5, { width: halfW * 0.35, align: 'right' })

        y += 30

        // ── Salario neto highlight ────────────────────────────────────────────
        doc.rect(M, y, CW, 28).fill('#276749')
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12)
          .text('SALARIO NETO A RECIBIR:', M + 10, y + 7, { width: CW * 0.6 })
        doc.fontSize(14).text(fmt(item.salarioNeto), M + CW * 0.6, y + 6, { width: CW * 0.38, align: 'right' })

        y += 36

        // ── Carga patronal (informativo) ──────────────────────────────────────
        doc.fillColor(gray).font('Helvetica').fontSize(7)
          .text(
            `Carga patronal: ISSS ${fmt(item.isssPatronal)}  AFP ${fmt(item.afpPatronal)}  INSAFORP ${fmt(item.insaforp)}`,
            M, y, { width: CW }
          )
        y += 12
        doc.fillColor(border).font('Helvetica').fontSize(7)
          .text(`Período: ${period.name}  |  Generado: ${new Date().toLocaleDateString('es-SV')}  |  Conservar por 3 años (Art. 139 CT)`, M, y, { width: CW })

        doc.end()
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Generates a ZIP-style PDF with all boletas in a period (one page per employee).
   * Useful to print all boletas at once.
   */
  async generateAllBoletas(period: any, company: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = []
        const doc = new PDFDocument({
          size: [612, 396],
          margin: 32,
          autoFirstPage: false,
          info: { Title: `Boletas — ${period.name}`, Author: company?.name ?? 'Sistema' },
        })

        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const items: any[] = period.items ?? []
        for (const item of items) {
          doc.addPage()
          this._renderBoleta(doc, item, period, company)
        }

        doc.end()
      } catch (err) {
        reject(err)
      }
    })
  }

  private _renderBoleta(doc: PDFKit.PDFDocument, item: any, period: any, company: any) {
    const W = doc.page.width
    const M = 32
    const CW = W - M * 2
    const primary = '#1a365d'
    const accent  = '#2b6cb0'
    const gray    = '#718096'
    const light   = '#f7fafc'
    const border  = '#e2e8f0'

    const emp = item.employee ?? {}
    const fullName = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()

    doc.rect(0, 0, W, 64).fill(primary)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
      .text(company?.comercialName ?? company?.name ?? 'Empresa', M, 10, { width: CW * 0.6 })
    doc.font('Helvetica').fontSize(9)
      .text(`NIT: ${company?.nit ?? '—'}  |  NRC: ${company?.nrc ?? '—'}`, M, 28, { width: CW * 0.6 })
    doc.fontSize(9)
      .text(company?.address ?? '', M, 40, { width: CW * 0.6 })
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#f6e05e')
      .text('BOLETA DE PAGO', M + CW * 0.62, 14, { width: CW * 0.38, align: 'right' })
    doc.font('Helvetica').fontSize(9).fillColor('#e2e8f0')
      .text(period.name ?? '', M + CW * 0.62, 34, { width: CW * 0.38, align: 'right' })

    let y = 74

    doc.rect(M, y, CW, 48).fill(light).stroke(border)
    const colW = CW / 4
    const fields = [
      { label: 'Empleado', value: fullName },
      { label: 'DUI',      value: emp.dui ?? '—' },
      { label: 'Cargo',    value: emp.position ?? '—' },
      { label: 'AFP',      value: emp.afpInstitution ?? '—' },
    ]
    fields.forEach((f, i) => {
      const x = M + i * colW + 8
      doc.fillColor(gray).font('Helvetica').fontSize(7).text(f.label, x, y + 6, { width: colW - 16 })
      doc.fillColor('#1a202c').font('Helvetica-Bold').fontSize(9).text(f.value, x, y + 18, { width: colW - 16, ellipsis: true })
    })
    y += 56

    const halfW = CW / 2 - 6
    const leftX = M
    const rightX = M + CW / 2 + 6

    doc.rect(leftX, y, halfW, 18).fill(accent)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
      .text('INGRESOS', leftX, y + 4, { width: halfW, align: 'center' })
    doc.rect(rightX, y, halfW, 18).fill('#c53030')
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
      .text('DEDUCCIONES', rightX, y + 4, { width: halfW, align: 'center' })
    y += 18

    const ingresos = [
      { label: 'Salario base',     value: item.salaryBase    },
      { label: 'Horas extra',      value: item.horasExtra    },
      { label: 'Bonos',            value: item.bonos         },
      { label: 'Comisiones',       value: item.comisiones    },
      { label: 'Aguinaldo',        value: item.aguinaldo     },
      { label: 'Otros ingresos',   value: item.otrosIngresos },
    ]
    const deducciones = [
      { label: 'ISSS empleado',     value: item.isssEmpleado     },
      { label: 'AFP empleado',      value: item.afpEmpleado      },
      { label: 'Renta retenida',    value: item.rentaRetenida    },
      { label: 'Otras deducciones', value: item.otrosDeducciones },
    ]
    const rowH = 16
    const maxRows = Math.max(ingresos.length, deducciones.length)

    for (let i = 0; i < maxRows; i++) {
      const bg = i % 2 === 0 ? '#ffffff' : light
      doc.rect(leftX, y + i * rowH, halfW, rowH).fill(bg)
      doc.rect(rightX, y + i * rowH, halfW, rowH).fill(bg)
    }

    ingresos.forEach((r, i) => {
      const ry = y + i * rowH
      doc.fillColor(gray).font('Helvetica').fontSize(8).text(r.label, leftX + 6, ry + 4, { width: halfW * 0.6 })
      doc.fillColor('#1a202c').font('Helvetica-Bold').fontSize(8)
        .text(fmt(r.value), leftX + halfW * 0.6 + 6, ry + 4, { width: halfW * 0.35, align: 'right' })
    })
    deducciones.forEach((r, i) => {
      const ry = y + i * rowH
      doc.fillColor(gray).font('Helvetica').fontSize(8).text(r.label, rightX + 6, ry + 4, { width: halfW * 0.6 })
      doc.fillColor('#c53030').font('Helvetica-Bold').fontSize(8)
        .text(fmt(r.value), rightX + halfW * 0.6 + 6, ry + 4, { width: halfW * 0.35, align: 'right' })
    })
    y += maxRows * rowH + 6

    doc.rect(leftX, y, halfW, 22).fill(accent)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
      .text('TOTAL BRUTO:', leftX + 6, y + 6, { width: halfW * 0.6 })
    doc.fontSize(10).text(fmt(item.totalBruto), leftX + halfW * 0.6 + 6, y + 5, { width: halfW * 0.35, align: 'right' })
    doc.rect(rightX, y, halfW, 22).fill('#9b2c2c')
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
      .text('TOTAL DEDUCCIONES:', rightX + 6, y + 6, { width: halfW * 0.6 })
    doc.fontSize(10).text(fmt(item.totalDeducciones), rightX + halfW * 0.6 + 6, y + 5, { width: halfW * 0.35, align: 'right' })
    y += 30

    doc.rect(M, y, CW, 28).fill('#276749')
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12)
      .text('SALARIO NETO A RECIBIR:', M + 10, y + 7, { width: CW * 0.6 })
    doc.fontSize(14).text(fmt(item.salarioNeto), M + CW * 0.6, y + 6, { width: CW * 0.38, align: 'right' })
    y += 36

    doc.fillColor(gray).font('Helvetica').fontSize(7)
      .text(`Carga patronal: ISSS ${fmt(item.isssPatronal)}  AFP ${fmt(item.afpPatronal)}  INSAFORP ${fmt(item.insaforp)}`, M, y, { width: CW })
    y += 12
    doc.fillColor(border).font('Helvetica').fontSize(7)
      .text(`Período: ${period.name}  |  Generado: ${new Date().toLocaleDateString('es-SV')}  |  Conservar por 3 años (Art. 139 CT)`, M, y, { width: CW })
  }
}

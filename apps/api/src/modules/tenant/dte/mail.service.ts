/**
 * MailService
 * Sends DTE notification emails via SMTP (nodemailer).
 * Config from env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * Optional: SMTP_SECURE (true for port 465, false for STARTTLS)
 *
 * If SMTP_HOST is not configured, the service logs a warning and skips sending.
 */
import { Injectable, Logger } from '@nestjs/common'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

const DTE_LABELS: Record<string, string> = {
  '01': 'Factura — Consumidor Final',
  '03': 'Comprobante de Crédito Fiscal',
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporter: Transporter | null = null

  constructor() {
    const host = process.env.SMTP_HOST
    if (!host) {
      this.logger.warn('SMTP_HOST no configurado — envío de correos DTE desactivado')
      return
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  /**
   * Sends DTE acceptance email to the client with:
   * - HTML body with sale summary
   * - PDF attachment (representación gráfica)
   * - JSON attachment (documento electrónico)
   *
   * Logs a warning and returns silently if no SMTP config or no client email.
   */
  async sendDteEmail(opts: {
    sale: any
    dte: any
    pdfBuffer: Buffer
    dteJson: Record<string, unknown> | null
  }): Promise<void> {
    if (!this.transporter) return

    const { sale, dte, pdfBuffer, dteJson } = opts
    const client = sale.client ?? null
    const company = sale.company ?? {}
    const tipoDte: string = dte.tipoDte ?? '01'

    const toEmail: string | null = client?.email ?? null
    if (!toEmail) {
      this.logger.debug(`Sale ${sale.id}: cliente sin correo, omitiendo envio DTE`)
      return
    }

    const fromLabel = company.comercialName ?? company.name ?? 'POS DTE'
    const from = `"${fromLabel}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`
    const subject = `${DTE_LABELS[tipoDte] ?? 'Documento Tributario'} — ${dte.numeroControl}`

    const svDate = new Intl.DateTimeFormat('es-SV', {
      timeZone: 'America/El_Salvador',
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date(sale.createdAt))

    const totalPagar = Number(sale.totalPagar ?? 0).toFixed(2)

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
    <div style="background:#1a365d;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px">${company.name ?? 'Empresa'}</h1>
      ${company.nit ? `<p style="color:#cbd5e0;margin:4px 0 0;font-size:13px">NIT: ${company.nit}${company.nrc ? `  |  NRC: ${company.nrc}` : ''}</p>` : ''}
    </div>

    <div style="padding:24px 32px">
      <div style="background:#ebf8ff;border-left:4px solid #2b6cb0;padding:12px 16px;border-radius:4px;margin-bottom:20px">
        <p style="margin:0;color:#2b6cb0;font-weight:700;font-size:14px">
          ${DTE_LABELS[tipoDte] ?? 'Documento Tributario'} — Aceptado por el Ministerio de Hacienda
        </p>
        <p style="margin:4px 0 0;color:#4a5568;font-size:12px">Número de control: <strong>${dte.numeroControl}</strong></p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
        <tr style="background:#f7fafc">
          <td style="padding:8px 12px;color:#4a5568;font-weight:700">Fecha de emisión</td>
          <td style="padding:8px 12px">${svDate}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;color:#4a5568;font-weight:700">Cliente</td>
          <td style="padding:8px 12px">${client?.name ?? 'Consumidor Final'}</td>
        </tr>
        ${client?.nit ? `<tr style="background:#f7fafc"><td style="padding:8px 12px;color:#4a5568;font-weight:700">NIT</td><td style="padding:8px 12px">${client.nit}</td></tr>` : ''}
        ${client?.nrc ? `<tr><td style="padding:8px 12px;color:#4a5568;font-weight:700">NRC</td><td style="padding:8px 12px">${client.nrc}</td></tr>` : ''}
        <tr style="background:#1a365d">
          <td style="padding:10px 12px;color:#fff;font-weight:700;font-size:15px">TOTAL PAGADO</td>
          <td style="padding:10px 12px;color:#fff;font-weight:700;font-size:15px;text-align:right">$${totalPagar}</td>
        </tr>
      </table>

      <p style="font-size:12px;color:#718096">
        Adjunto encontrará la representación gráfica del documento en PDF y el archivo JSON del DTE firmado.
        Consérvelos para sus registros contables.
      </p>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
      <p style="font-size:11px;color:#a0aec0;text-align:center">
        Este correo fue generado automáticamente por ${fromLabel}.<br>
        Documento tributario electrónico conforme al Art. 107 del Código Tributario de El Salvador.
      </p>
    </div>
  </div>
</body>
</html>`

    const attachments: any[] = [
      {
        filename: `DTE_${dte.numeroControl?.replace(/\//g, '-') ?? dte.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ]

    if (dteJson) {
      attachments.push({
        filename: `DTE_${dte.codigoGeneracion ?? dte.id}.json`,
        content: JSON.stringify(dteJson, null, 2),
        contentType: 'application/json',
      })
    }

    try {
      await this.transporter.sendMail({ from, to: toEmail, subject, html, attachments })
      this.logger.log(`DTE email enviado a ${toEmail} — ${dte.numeroControl}`)
    } catch (err: any) {
      // Email failure must NEVER block the DTE emission flow
      this.logger.error(`Error enviando DTE email a ${toEmail}: ${err.message}`)
    }
  }
}

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { EncryptionService } from '../../../infrastructure/crypto/encryption.service'
import { CompanyService } from '../company/company.service'
import { FirmadorService } from './firmador.service'
import { HaciendaService } from './hacienda.service'
import { DteBuilderService } from './dte-builder.service'
import { DtePdfService } from './dte-pdf.service'
import { MailService, type SmtpConfig } from './mail.service'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { assertCanInvalidateDte, assertValidDteJson, INVALIDATION_EVENT_VERSION } from '@pos-dte/dte-core'
import { z } from 'zod'

export const AnulacionSchema = z.object({
  saleId: z.string().min(1),
  motivo: z.string().trim().min(5),
  nombreResponsable: z.string().trim().min(1),
  tipDocResponsable: z.string().length(2),
  numDocResponsable: z.string().trim().min(1),
  nombreSolicita: z.string().trim().min(1),
  tipDocSolicita: z.string().length(2),
  numDocSolicita: z.string().trim().min(1),
})

export type AnulacionDto = z.infer<typeof AnulacionSchema>

export const RetornoSchema = z.object({
  saleId: z.string().min(1),
  motivo: z.string().trim().min(5),
  nombreResponsable: z.string().trim().min(1),
  tipDocResponsable: z.string().length(2),
  numDocResponsable: z.string().trim().min(1),
  nombreSolicita: z.string().trim().min(1),
  tipDocSolicita: z.string().length(2),
  numDocSolicita: z.string().trim().min(1),
})

export type RetornoDto = z.infer<typeof RetornoSchema>

export const OperacionEspecialSchema = z.object({
  saleId: z.string().min(1),
  tipoOperacion: z.enum(['01', '02', '03', '04', '05', '99']),
  motivo: z.string().trim().min(5),
  nombreResponsable: z.string().trim().min(1),
  tipDocResponsable: z.string().length(2),
  numDocResponsable: z.string().trim().min(1),
  nombreSolicita: z.string().trim().min(1),
  tipDocSolicita: z.string().length(2),
  numDocSolicita: z.string().trim().min(1),
})

export type OperacionEspecialDto = z.infer<typeof OperacionEspecialSchema>

@Injectable()
export class DteService {
  private readonly logger = new Logger(DteService.name)

  constructor(
    private readonly clientFactory: TenantClientFactory,
    private readonly crypto: EncryptionService,
    private readonly companyService: CompanyService,
    private readonly firmador: FirmadorService,
    private readonly hacienda: HaciendaService,
    private readonly builder: DteBuilderService,
    private readonly dtePdf: DtePdfService,
    private readonly mail: MailService,
  ) {}

  private getDb(dbUrl?: string) {
    return this.clientFactory.getClient(dbUrl)
  }

  private assertSaleAccess(user: JwtAccessPayload, sale: { companyId: string; branchId: string }) {
    if (sale.companyId !== user.companyId) throw new ForbiddenException('Venta no autorizada')
    if (!user.canViewAllBranches && !user.branchIds.includes(sale.branchId)) {
      throw new ForbiddenException('Venta no autorizada')
    }
  }

  /**
   * Main emission method — called from BullMQ processor.
   * Runs outside an HTTP request so we must provide tenant context.
   */
  async emitFromQueue(payload: {
    saleId: string
    tenantId: string
    companyId: string
    branchId: string
    tipoDte: string
    numeroControl: string
    dbUrl?: string
    /** Presente solo cuando se re-emite un DTE marcado como CONTINGENCY */
    contingencia?: { tipoContingencia: number; motivoContin: string }
  }) {
    const db = this.getDb(payload.dbUrl)

    // Load sale with all relations
    const sale = await db.sale.findFirst({
      where: {
        id: payload.saleId,
        tenantId: payload.tenantId,
        companyId: payload.companyId,
        branchId: payload.branchId,
      },
      include: {
        client: true,
        items: { include: { product: { select: { sku: true } } } },
        payments: true,
        branch: true,
        company: {
          select: {
            id: true, name: true, comercialName: true, nit: true, nrc: true,
            actividadEconomica: true, actividadEconomicaCodigo: true,
            giro: true, tipoDocumento: true, esGranContribuyente: true,
            address: true, departamentoCod: true, municipioCod: true, distritoCod: true,
            phone: true, email: true, dteAmbiente: true,
            haciendaUserEnc: true, haciendaPwdEnc: true, certDataEnc: true, certPwdEnc: true,
            smtpHost: true, smtpPort: true, smtpUser: true, smtpPwdEnc: true, smtpFrom: true, smtpSecure: true,
          },
        },
      },
    })
    if (!sale) throw new Error(`Sale ${payload.saleId} not found`)

    const company = sale.company as any
    const branch = sale.branch as any
    const client = sale.client as any

    // Outbox: buscar DteDocument QUEUED creado dentro de la tx de venta.
    // Reutilizar si existe (fix retry crash por saleId @unique).
    // Crear como fallback solo si no existe (caso legacy o job manual).
    let dteDoc = await db.dteDocument.findFirst({
      where: { saleId: payload.saleId, tenantId: payload.tenantId },
    })

    if (!dteDoc) {
      dteDoc = await db.dteDocument.create({
        data: {
          tenantId: payload.tenantId,
          saleId: payload.saleId,
          companyId: payload.companyId,
          branchId: payload.branchId,
          tipoDte: payload.tipoDte,
          numeroControl: payload.numeroControl,
          codigoGeneracion: this.builder.generateCodigoGeneracion(),
          status: 'PENDING',
        },
      })
    } else {
      // Marcar como PENDING (era QUEUED o ERROR de retry anterior)
      await db.dteDocument.update({
        where: { id: dteDoc.id },
        data: { status: 'PENDING' },
      })
    }

    try {
      // Build JSON
      const codigoGeneracion = dteDoc.codigoGeneracion
      let dteJson: Record<string, unknown>

      const contingencia = payload.contingencia
      if (payload.tipoDte === '01') {
        dteJson = this.builder.buildCF(sale, company, branch, client, payload.numeroControl, codigoGeneracion, contingencia) as Record<string, unknown>
      } else if (payload.tipoDte === '03') {
        dteJson = this.builder.buildCCF(sale, company, branch, client, payload.numeroControl, codigoGeneracion, contingencia) as Record<string, unknown>
      } else if (payload.tipoDte === '05') {
        dteJson = this.builder.buildNC(sale, company, branch, client, payload.numeroControl, codigoGeneracion, contingencia) as Record<string, unknown>
      } else if (payload.tipoDte === '06') {
        dteJson = this.builder.buildND(sale, company, branch, client, payload.numeroControl, codigoGeneracion, contingencia) as Record<string, unknown>
      } else if (payload.tipoDte === '16') {
        dteJson = this.builder.buildVS(sale, company, branch, payload.numeroControl, codigoGeneracion, contingencia) as Record<string, unknown>
      } else {
        throw new Error(`Unsupported tipoDte: ${payload.tipoDte}`)
      }

      assertValidDteJson(dteJson, payload.tipoDte)

      // Get Hacienda credentials
      const haciendaUser = this.crypto.decrypt(company.haciendaUserEnc)
      const haciendaPassword = this.crypto.decrypt(company.haciendaPwdEnc)
      const certData = company.certDataEnc ? this.crypto.decrypt(company.certDataEnc) : null
      const certPassword = company.certPwdEnc ? this.crypto.decrypt(company.certPwdEnc) : null
      const ambiente = company.dteAmbiente ?? 'TEST'

      // Sign
      const jws = await this.firmador.firmarDocumento(
        dteJson,
        certData ?? '',
        certPassword ?? '',
      )

      // Auth
      const cacheKey = `${payload.tenantId}:${payload.companyId}`
      const authToken = await this.hacienda.authenticate(haciendaUser, haciendaPassword, ambiente, cacheKey)

      // Submit
      const result = await this.hacienda.submitDte(
        jws,
        payload.tipoDte,
        codigoGeneracion,
        ambiente,
        authToken,
      )

      // Update DTE doc
      const accepted = !!result.selloRecibido
      const updatedDte = await db.dteDocument.update({
        where: { id: dteDoc.id },
        data: {
          jsonOriginal: dteJson as any,
          jsonFirmado: jws,
          selloRecibido: result.selloRecibido,
          status: accepted ? 'ACCEPTED' : 'REJECTED',
          observaciones: result.observaciones,
          processedAt: new Date(),
        },
      })

      this.logger.log(`DTE emitido: ${payload.numeroControl} | sello: ${result.selloRecibido}`)

      // Send email with PDF + JSON (fire-and-forget — never blocks emission)
      if (accepted && sale.client?.email) {
        setImmediate(async () => {
          try {
            const pdfBuffer = await this.dtePdf.generate(sale, updatedDte)
            const smtpConfig = this.buildSmtpConfig(company)
            await this.mail.sendDteEmail({
              sale,
              dte: updatedDte,
              pdfBuffer,
              dteJson: dteJson as Record<string, unknown>,
              smtpConfig,
            })
          } catch (emailErr: any) {
            this.logger.warn(`Error post-emision generando PDF/email para sale ${sale.id}: ${emailErr.message}`)
          }
        })
      }
    } catch (err: any) {
      this.logger.error(`DTE emission failed for sale ${payload.saleId}: ${err.message}`)
      const shouldContingency = this.hacienda.isConnectivityError(err)
      await db.dteDocument.update({
        where: { id: dteDoc.id },
        data: {
          status: shouldContingency ? 'CONTINGENCY' : 'ERROR',
          // Persistir tipo de contingencia para re-emisión correcta con tipoModelo=2
          ...(shouldContingency ? {
            tipoContingenciaEmision: payload.contingencia?.tipoContingencia ?? 1,
            motivoContingenciaEmision: payload.contingencia?.motivoContin ?? 'No disponibilidad del sistema del Ministerio de Hacienda',
          } : {}),
          observaciones: [
            shouldContingency
              ? 'Falla de comunicacion con MH. DTE marcado para re-emision con tipoModelo=2 tras transmision del evento de contingencia.'
              : err.message,
          ],
          processedAt: new Date(),
        },
      })
      throw err // Re-throw so BullMQ retries
    }
  }

  /** Builds SmtpConfig from company record (per-company SMTP, fallback returns undefined) */
  private buildSmtpConfig(company: any): SmtpConfig | undefined {
    if (!company?.smtpHost || !company?.smtpPwdEnc) return undefined
    return {
      host: company.smtpHost,
      port: company.smtpPort ?? 587,
      secure: company.smtpSecure ?? false,
      user: company.smtpUser ?? '',
      pass: this.crypto.decrypt(company.smtpPwdEnc),
      from: company.smtpFrom ?? `"${company.comercialName ?? company.name}" <${company.smtpUser}>`,
    }
  }

  /** Returns PDF buffer for a given sale's DTE (for download endpoint). */
  async downloadPdf(saleId: string, user: JwtAccessPayload, tenantId: string, dbUrl?: string): Promise<Buffer> {
    const db = this.getDb(dbUrl)
    const sale = await db.sale.findFirst({
      where: { id: saleId, tenantId, companyId: user.companyId },
      include: {
        client: true,
        items: { include: { product: { select: { sku: true } } } },
        payments: true,
        branch: true,
        company: { select: { id: true, name: true, comercialName: true, nit: true, nrc: true, actividadEconomica: true, address: true, phone: true, email: true } },
        dteDocument: true,
      },
    })
    if (!sale) throw new NotFoundException('Venta no encontrada')
    this.assertSaleAccess(user, sale)
    if (!sale.dteDocument) throw new NotFoundException('Sin DTE para esta venta')
    return this.dtePdf.generate(sale, sale.dteDocument)
  }

  /** Re-sends DTE email for an accepted DTE. */
  async resendEmail(saleId: string, user: JwtAccessPayload, tenantId: string, dbUrl?: string): Promise<{ sent: boolean }> {
    const db = this.getDb(dbUrl)
    const sale = await db.sale.findFirst({
      where: { id: saleId, tenantId, companyId: user.companyId },
      include: {
        client: true,
        items: { include: { product: { select: { sku: true } } } },
        payments: true,
        branch: true,
        company: {
          select: {
            id: true, name: true, comercialName: true, nit: true, nrc: true,
            actividadEconomica: true, address: true, phone: true, email: true,
            smtpHost: true, smtpPort: true, smtpUser: true, smtpPwdEnc: true, smtpFrom: true, smtpSecure: true,
          },
        },
        dteDocument: true,
      },
    })
    if (!sale) throw new NotFoundException('Venta no encontrada')
    this.assertSaleAccess(user, sale)
    if (!sale.dteDocument || sale.dteDocument.status !== 'ACCEPTED') {
      throw new NotFoundException('Solo se pueden reenviar DTE aceptados')
    }
    const clientEmail = sale.client?.email
    if (!clientEmail) throw new NotFoundException('El cliente no tiene correo registrado')

    const pdfBuffer = await this.dtePdf.generate(sale, sale.dteDocument)
    const smtpConfig = this.buildSmtpConfig(sale.company)
    await this.mail.sendDteEmail({
      sale,
      dte: sale.dteDocument,
      pdfBuffer,
      dteJson: sale.dteDocument.jsonOriginal as Record<string, unknown> | null,
      smtpConfig,
    })
    return { sent: true }
  }

  async findBySale(saleId: string, user: JwtAccessPayload, tenantId: string, dbUrl?: string) {
    const db = this.getDb(dbUrl)
    const sale = await db.sale.findFirst({
      where: { id: saleId, tenantId, companyId: user.companyId },
      select: { companyId: true, branchId: true },
    })
    if (!sale) throw new NotFoundException('Venta no encontrada')
    this.assertSaleAccess(user, sale)
    return db.dteDocument.findFirst({ where: { saleId, tenantId, companyId: user.companyId } })
  }

  async anular(dto: AnulacionDto, user: JwtAccessPayload, tenantId: string, dbUrl?: string) {
    const db = this.getDb(dbUrl)

    const sale = await db.sale.findFirst({
      where: { id: dto.saleId, tenantId, companyId: user.companyId },
      include: {
        dteDocument: true,
        company: {
          select: {
            id: true, name: true, nit: true, nrc: true, dteAmbiente: true,
            phone: true, email: true,
            haciendaUserEnc: true, haciendaPwdEnc: true, certDataEnc: true, certPwdEnc: true,
          },
        },
        branch: true,
        client: true,
      },
    })
    if (!sale) throw new NotFoundException('Venta no encontrada')
    this.assertSaleAccess(user, sale)
    if (!sale.dteDocument || sale.dteDocument.status !== 'ACCEPTED') {
      throw new NotFoundException('No hay DTE aceptado para anular')
    }

    const company = sale.company as any
    const ambiente = company.dteAmbiente ?? 'TEST'
    const haciendaUser = this.crypto.decrypt(company.haciendaUserEnc)
    const haciendaPassword = this.crypto.decrypt(company.haciendaPwdEnc)
    const certData = company.certDataEnc ? this.crypto.decrypt(company.certDataEnc) : null
    const certPassword = company.certPwdEnc ? this.crypto.decrypt(company.certPwdEnc) : null

    assertCanInvalidateDte({
      tipoDte: sale.dteDocument.tipoDte,
      selloReceivedAt: sale.dteDocument.processedAt ?? sale.dteDocument.createdAt,
    })

    // Build invalidacion JSON for invalidacion-schema-v3.json and /anulardte.
    const invalidacionCodigoGeneracion = this.builder.generateCodigoGeneracion()
    const now = this.svDateTime()
    const client = (sale as any).client
    const anulacionJson = {
      identificacion: {
        version: INVALIDATION_EVENT_VERSION,
        ambiente: ambiente === 'PROD' ? '01' : '00',
        codigoGeneracion: invalidacionCodigoGeneracion,
        fecEmi: now.date,
        horEmi: now.time,
        fusion: null,
      },
      emisor: {
        nit: company.nit,
        nombre: company.name,
        codEstableMH: (sale.branch as any).codEstableMH,
        codEstable: (sale.branch as any).codEstableMH,
        codPuntoVentaMH: (sale.branch as any).codPuntoVentaMH,
        codPuntoVenta: (sale.branch as any).codPuntoVentaMH,
        telefono: company.phone ?? '',
        correo: company.email ?? '',
      },
      documento: {
        tipoDte: sale.dteDocument.tipoDte,
        codigoGeneracion: sale.dteDocument.codigoGeneracion,
        selloRecibido: sale.dteDocument.selloRecibido,
        numeroControl: sale.dteDocument.numeroControl,
        fecEmi: (sale as any).createdAt.toISOString().split('T')[0],
        codigoGeneracionR: null,
        tipoDocumento: client?.tipoDocumento ?? null,
        numDocumento: client?.numDocumento ?? null,
        nombre: client?.name ?? null,
        telefono: client?.phone ?? null,
        correo: client?.email ?? null,
      },
      motivo: {
        tipoAnulacion: 2,
        motivoAnulacion: dto.motivo,
        nombreResponsable: dto.nombreResponsable,
        tipDocResponsable: dto.tipDocResponsable,
        numDocResponsable: dto.numDocResponsable,
        nombreSolicita: dto.nombreSolicita,
        tipDocSolicita: dto.tipDocSolicita,
        numDocSolicita: dto.numDocSolicita,
      },
    }

    const jws = await this.firmador.firmarDocumento(anulacionJson, certData ?? '', certPassword ?? '')
    const cacheKey = `${tenantId}:${company.id}`
    const authToken = await this.hacienda.authenticate(haciendaUser, haciendaPassword, ambiente, cacheKey)
    const result = await this.hacienda.submitInvalidacion(
      jws,
      invalidacionCodigoGeneracion,
      ambiente,
      authToken,
    )

    const accepted = !!result.selloRecibido

    // Keep the original DTE reception stamp intact. The invalidation event has its own stamp.
    await db.dteDocument.update({
      where: { id: sale.dteDocument.id },
      data: {
        status: accepted ? 'ANNULLED' : sale.dteDocument.status,
        observaciones: result.observaciones,
        processedAt: new Date(),
        ...(accepted
          ? {
              invalidacionCodigoGeneracion,
              invalidacionJson: anulacionJson as any,
              invalidacionJsonFirmado: jws,
              invalidacionSelloRecibido: result.selloRecibido,
              invalidationReason: dto.motivo,
              invalidatedAt: new Date(),
            }
          : {}),
      },
    })

    return { ok: accepted, selloRecibido: result.selloRecibido, observaciones: result.observaciones }
  }

  async emitirRetorno(dto: RetornoDto, user: JwtAccessPayload, tenantId: string, dbUrl?: string) {
    const db = this.getDb(dbUrl)

    const sale = await db.sale.findFirst({
      where: { id: dto.saleId, tenantId, companyId: user.companyId },
      include: {
        dteDocument: true,
        items: true,
        company: {
          select: {
            id: true, name: true, nit: true, nrc: true, dteAmbiente: true,
            phone: true, email: true,
            haciendaUserEnc: true, haciendaPwdEnc: true, certDataEnc: true, certPwdEnc: true,
          },
        },
        branch: true,
      },
    })
    if (!sale) throw new NotFoundException('Venta no encontrada')
    this.assertSaleAccess(user, sale)

    const dte = (sale as any).dteDocument
    if (!dte || dte.status !== 'ACCEPTED') throw new NotFoundException('El DTE debe estar aceptado para emitir retorno')
    if (dte.tipoDte !== '03') throw new Error('Evento de Retorno aplica solo a CCF (tipo 03)')
    if (dte.retornoCodigoGeneracion) throw new Error('Ya existe un evento de retorno para este DTE')

    const company = (sale as any).company as any
    const branch = (sale as any).branch as any
    const ambiente = company.dteAmbiente ?? 'TEST'
    const haciendaUser = this.crypto.decrypt(company.haciendaUserEnc)
    const haciendaPassword = this.crypto.decrypt(company.haciendaPwdEnc)
    const certData = company.certDataEnc ? this.crypto.decrypt(company.certDataEnc) : null
    const certPassword = company.certPwdEnc ? this.crypto.decrypt(company.certPwdEnc) : null

    // Build detalle from sale items
    const items = (sale as any).items.map((item: any) => ({
      tipoItem: Number.parseInt(item.tipoItem, 10),
      descripcion: item.productName,
      cantidad: Number(item.quantity),
      uniMedida: Number(item.uniMedida),
      precioUni: Number(item.unitPrice),
      montoDescu: Number(item.discount),
      ventaNoSuj: Number(item.ventaNoSuj),
      ventaExenta: Number(item.ventaExenta),
      ventaGravada: Number(item.ventaGravada),
    }))

    const retornoCodigoGeneracion = this.builder.generateCodigoGeneracion()
    const fecEmi = (sale as any).createdAt.toISOString().split('T')[0]

    const retornoJson = this.builder.buildRetornoEvent({
      company,
      branch,
      codigoGeneracion: retornoCodigoGeneracion,
      dteDocument: {
        tipoDte: dte.tipoDte,
        codigoGeneracion: dte.codigoGeneracion,
        selloRecibido: dte.selloRecibido,
        numeroControl: dte.numeroControl,
        fecEmi,
      },
      motivo: dto.motivo,
      nombreResponsable: dto.nombreResponsable,
      tipoDocResponsable: dto.tipDocResponsable,
      numDocResponsable: dto.numDocResponsable,
      nombreSolicita: dto.nombreSolicita,
      tipoDocSolicita: dto.tipDocSolicita,
      numDocSolicita: dto.numDocSolicita,
      items,
      resumen: {
        totalNoSuj: Number((sale as any).totalNoSuj),
        totalExenta: Number((sale as any).totalExenta),
        totalGravada: Number((sale as any).totalGravada),
        totalIva: Number((sale as any).totalIva),
        totalDescuento: Number((sale as any).totalDescuento),
        totalPagar: Number((sale as any).totalPagar),
      },
    })

    const jws = await this.firmador.firmarDocumento(retornoJson as Record<string, unknown>, certData ?? '', certPassword ?? '')
    const cacheKey = `${tenantId}:${company.id}`
    const authToken = await this.hacienda.authenticate(haciendaUser, haciendaPassword, ambiente, cacheKey)
    const result = await this.hacienda.submitRetorno(jws, retornoCodigoGeneracion, ambiente, authToken)

    const accepted = !!result.selloRecibido

    await db.dteDocument.update({
      where: { id: dte.id },
      data: {
        retornoCodigoGeneracion,
        retornoJson: retornoJson as any,
        retornoJsonFirmado: jws,
        retornoSelloRecibido: result.selloRecibido,
        retornoMotivo: dto.motivo,
        retornoAt: new Date(),
      },
    })

    return { ok: accepted, selloRecibido: result.selloRecibido, observaciones: result.observaciones }
  }

  async emitirOperacionEspecial(dto: OperacionEspecialDto, user: JwtAccessPayload, tenantId: string, dbUrl?: string) {
    const db = this.getDb(dbUrl)

    const sale = await db.sale.findFirst({
      where: { id: dto.saleId, tenantId, companyId: user.companyId },
      include: {
        dteDocument: true,
        items: true,
        company: {
          select: {
            id: true, name: true, nit: true, nrc: true, dteAmbiente: true,
            phone: true, email: true,
            haciendaUserEnc: true, haciendaPwdEnc: true, certDataEnc: true, certPwdEnc: true,
          },
        },
        branch: true,
      },
    })
    if (!sale) throw new NotFoundException('Venta no encontrada')
    this.assertSaleAccess(user, sale)

    const dte = (sale as any).dteDocument
    if (!dte || dte.status !== 'ACCEPTED') throw new NotFoundException('El DTE debe estar aceptado para emitir operacion especial')
    if (!['01', '03'].includes(dte.tipoDte)) throw new Error('Evento de Operacion Especial aplica a CF (01) y CCF (03)')
    if (dte.opEspecialCodigoGeneracion) throw new Error('Ya existe un evento de operacion especial para este DTE')

    const company = (sale as any).company as any
    const branch = (sale as any).branch as any
    const ambiente = company.dteAmbiente ?? 'TEST'
    const haciendaUser = this.crypto.decrypt(company.haciendaUserEnc)
    const haciendaPassword = this.crypto.decrypt(company.haciendaPwdEnc)
    const certData = company.certDataEnc ? this.crypto.decrypt(company.certDataEnc) : null
    const certPassword = company.certPwdEnc ? this.crypto.decrypt(company.certPwdEnc) : null

    const items = (sale as any).items.map((item: any) => ({
      tipoItem: Number.parseInt(item.tipoItem, 10),
      descripcion: item.productName,
      cantidad: Number(item.quantity),
      uniMedida: Number(item.uniMedida),
      precioUni: Number(item.unitPrice),
      montoDescu: Number(item.discount),
      ventaNoSuj: Number(item.ventaNoSuj),
      ventaExenta: Number(item.ventaExenta),
      ventaGravada: Number(item.ventaGravada),
    }))

    const opEspecialCodigoGeneracion = this.builder.generateCodigoGeneracion()
    const fecEmi = (sale as any).createdAt.toISOString().split('T')[0]

    const opEspecialJson = this.builder.buildOperacionEspecialEvent({
      company,
      branch,
      codigoGeneracion: opEspecialCodigoGeneracion,
      dteDocument: {
        tipoDte: dte.tipoDte,
        codigoGeneracion: dte.codigoGeneracion,
        selloRecibido: dte.selloRecibido,
        numeroControl: dte.numeroControl,
        fecEmi,
      },
      tipoOperacion: dto.tipoOperacion,
      motivo: dto.motivo,
      nombreResponsable: dto.nombreResponsable,
      tipoDocResponsable: dto.tipDocResponsable,
      numDocResponsable: dto.numDocResponsable,
      nombreSolicita: dto.nombreSolicita,
      tipoDocSolicita: dto.tipDocSolicita,
      numDocSolicita: dto.numDocSolicita,
      items,
      resumen: {
        totalNoSuj: Number((sale as any).totalNoSuj),
        totalExenta: Number((sale as any).totalExenta),
        totalGravada: Number((sale as any).totalGravada),
        totalIva: Number((sale as any).totalIva),
        totalDescuento: Number((sale as any).totalDescuento),
        totalPagar: Number((sale as any).totalPagar),
      },
    })

    const jws = await this.firmador.firmarDocumento(opEspecialJson as Record<string, unknown>, certData ?? '', certPassword ?? '')
    const cacheKey = `${tenantId}:${company.id}`
    const authToken = await this.hacienda.authenticate(haciendaUser, haciendaPassword, ambiente, cacheKey)
    const result = await this.hacienda.submitOperacionEspecial(jws, opEspecialCodigoGeneracion, ambiente, authToken)

    await db.dteDocument.update({
      where: { id: dte.id },
      data: {
        opEspecialCodigoGeneracion,
        opEspecialJson: opEspecialJson as any,
        opEspecialJsonFirmado: jws,
        opEspecialSelloRecibido: result.selloRecibido,
        opEspecialTipoOperacion: dto.tipoOperacion,
        opEspecialMotivo: dto.motivo,
        opEspecialAt: new Date(),
      },
    })

    return { ok: !!result.selloRecibido, selloRecibido: result.selloRecibido, observaciones: result.observaciones }
  }

  private svDateTime(value = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(value)

    const get = (type: string) => {
      const part = parts.find((item) => item.type === type)?.value
      if (!part) throw new Error(`No se pudo formatear fecha/hora ${type}`)
      return part
    }

    return {
      date: `${get('year')}-${get('month')}-${get('day')}`,
      time: `${get('hour')}:${get('minute')}:${get('second')}`,
    }
  }
}

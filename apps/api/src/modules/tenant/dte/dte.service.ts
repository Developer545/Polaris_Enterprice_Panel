import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { EncryptionService } from '../../../infrastructure/crypto/encryption.service'
import { CompanyService } from '../company/company.service'
import { FirmadorService } from './firmador.service'
import { HaciendaService } from './hacienda.service'
import { DteBuilderService } from './dte-builder.service'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const AnulacionSchema = z.object({
  saleId: z.string().cuid(),
  motivo: z.string().min(5),
  nombreResponsable: z.string(),
  tipDocResponsable: z.string().length(2),
  numDocResponsable: z.string(),
  nombreSolicita: z.string(),
  tipDocSolicita: z.string().length(2),
  numDocSolicita: z.string(),
})

export type AnulacionDto = z.infer<typeof AnulacionSchema>

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
  ) {}

  private getDb(dbUrl?: string) {
    return this.clientFactory.getClient(dbUrl)
  }

  private assertSaleAccess(user: JwtAccessPayload, sale: { companyId: string; branchId: string }) {
    if (sale.companyId !== user.companyId || !user.branchIds.includes(sale.branchId)) {
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
            address: true, phone: true, email: true, dteAmbiente: true,
            haciendaUserEnc: true, haciendaPwdEnc: true, certDataEnc: true, certPwdEnc: true,
          },
        },
      },
    })
    if (!sale) throw new Error(`Sale ${payload.saleId} not found`)

    const company = sale.company as any
    const branch = sale.branch as any
    const client = sale.client as any

    // Mark DTE as processing
    const dteDoc = await db.dteDocument.create({
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

    try {
      // Build JSON
      const codigoGeneracion = dteDoc.codigoGeneracion
      let dteJson: Record<string, unknown>

      if (payload.tipoDte === '01') {
        dteJson = this.builder.buildCF(sale, company, branch, client, payload.numeroControl, codigoGeneracion) as Record<string, unknown>
      } else if (payload.tipoDte === '03') {
        dteJson = this.builder.buildCCF(sale, company, branch, client, payload.numeroControl, codigoGeneracion) as Record<string, unknown>
      } else {
        throw new Error(`Unsupported tipoDte: ${payload.tipoDte}`)
      }

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
      await db.dteDocument.update({
        where: { id: dteDoc.id },
        data: {
          jsonOriginal: dteJson as any,
          jsonFirmado: jws,
          selloRecibido: result.selloRecibido,
          status: result.selloRecibido ? 'ACCEPTED' : 'REJECTED',
          observaciones: result.observaciones,
          processedAt: new Date(),
        },
      })

      this.logger.log(`DTE emitido: ${payload.numeroControl} | sello: ${result.selloRecibido}`)
    } catch (err: any) {
      this.logger.error(`DTE emission failed for sale ${payload.saleId}: ${err.message}`)
      await db.dteDocument.update({
        where: { id: dteDoc.id },
        data: {
          status: 'ERROR',
          observaciones: [err.message],
          processedAt: new Date(),
        },
      })
      throw err // Re-throw so BullMQ retries
    }
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
            haciendaUserEnc: true, haciendaPwdEnc: true, certDataEnc: true, certPwdEnc: true,
          },
        },
        branch: true,
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

    // Build ND JSON (tipoDte 06 = Nota de Debito, or 14 = Nota de Anulación)
    const now = new Date()
    const anulacionJson = {
      identificacion: {
        version: 2,
        ambiente: ambiente === 'PROD' ? '00' : '01',
        tipoDte: '14',
        numeroControl: sale.dteDocument.numeroControl,
        codigoGeneracion: this.builder.generateCodigoGeneracion(),
        tipoModelo: 1,
        tipoOperacion: 1,
        fecAnula: now.toISOString().split('T')[0],
        horAnula: now.toISOString().split('T')[1].substring(0, 8),
      },
      emisor: {
        nit: company.nit,
        nombre: company.name,
        tipoEstablecimiento: '02',
        telefono: company.phone ?? '',
        correo: company.email ?? '',
        codEstableMH: (sale.branch as any).codEstableMH,
        codPuntoVentaMH: (sale.branch as any).codPuntoVentaMH,
        nomEstablecimiento: (sale.branch as any).name,
      },
      documento: {
        tipoDte: sale.dteDocument.tipoDte,
        codigoGeneracion: sale.dteDocument.codigoGeneracion,
        selloRecibido: sale.dteDocument.selloRecibido,
        numeroControl: sale.dteDocument.numeroControl,
        fecEmi: (sale as any).createdAt.toISOString().split('T')[0],
        montoIva: Number((sale as any).totalIva),
        codigoGeneracionR: null,
        tipoDocumento: '01',
        numDocumento: '00000000-0',
        nombre: (sale as any).client?.name ?? 'Consumidor Final',
        telefono: '',
        correo: '',
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
    const result = await this.hacienda.submitDte(jws, '14', (anulacionJson as any).identificacion.codigoGeneracion, ambiente, authToken)

    await db.dteDocument.update({
      where: { id: sale.dteDocument.id },
      data: { status: 'ANNULLED' },
    })

    return { ok: true, selloRecibido: result.selloRecibido }
  }
}

import { Injectable, Logger, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { EncryptionService } from '../../../infrastructure/crypto/encryption.service'
import { FirmadorService } from './firmador.service'
import { HaciendaService } from './hacienda.service'
import { DteBuilderService } from './dte-builder.service'
import { DteService } from './dte.service'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import {
  CAT_005_TIPO_CONTINGENCIA,
  CONTINGENCY_MAX_DOCUMENTS,
  getContingencyEventDeadline,
  getContingencyBatchDeadline,
} from '@pos-dte/dte-core'
import { z } from 'zod'

export const ContingenciaSchema = z.object({
  branchId: z.string().cuid().optional(),
  tipoContingencia: z.number().int().min(1).max(5).optional(),
  motivoContingencia: z.string().trim().max(150).optional(),
  nombreResponsable: z.string().trim().min(1).optional(),
  tipoDocResponsable: z.string().length(2).optional(),
  numeroDocResponsable: z.string().trim().min(1).optional(),
})

export type ContingenciaDto = z.infer<typeof ContingenciaSchema>

interface Scope {
  tenantId: string
  dbUrl?: string
  companyId: string
  // null = todas las sucursales (dueño); array = solo estas
  allowedBranchIds: string[] | null
}

export interface BranchTransmitResult {
  branchId: string
  branchName: string
  documentos: number
  eventoTransmitido: boolean
  selloEvento: string | null
  reemitidos: number
  observaciones: string[]
}

@Injectable()
export class ContingencyService {
  private readonly logger = new Logger(ContingencyService.name)

  constructor(
    private readonly clientFactory: TenantClientFactory,
    private readonly crypto: EncryptionService,
    private readonly firmador: FirmadorService,
    private readonly hacienda: HaciendaService,
    private readonly builder: DteBuilderService,
    private readonly dteService: DteService,
  ) {}

  private getDb(dbUrl?: string) {
    return this.clientFactory.getClient(dbUrl)
  }

  static scopeFromUser(user: JwtAccessPayload): Pick<Scope, 'companyId' | 'allowedBranchIds'> {
    return {
      companyId: user.companyId,
      allowedBranchIds: user.canViewAllBranches ? null : user.branchIds,
    }
  }

  /**
   * Resumen de documentos en contingencia por sucursal + fechas límite (24h evento / 72h lote).
   */
  async getStatus(scope: Scope) {
    const db = this.getDb(scope.dbUrl)
    const now = new Date()

    const grouped = await db.dteDocument.groupBy({
      by: ['branchId'],
      where: {
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        status: 'CONTINGENCY',
        ...(scope.allowedBranchIds ? { branchId: { in: scope.allowedBranchIds } } : {}),
      },
      _count: { _all: true },
      _min: { createdAt: true },
    })

    const branchIds = grouped.map((g) => g.branchId)
    const branches = branchIds.length
      ? await db.branch.findMany({
          where: { id: { in: branchIds } },
          select: { id: true, name: true },
        })
      : []
    const nameById = new Map(branches.map((b) => [b.id, b.name]))

    const rows = grouped.map((g) => {
      const oldest = g._min.createdAt ?? now
      const eventDeadline = getContingencyEventDeadline(oldest)
      const batchDeadline = getContingencyBatchDeadline(oldest)
      return {
        branchId: g.branchId,
        branchName: nameById.get(g.branchId) ?? g.branchId,
        pendientes: g._count._all,
        masAntiguo: oldest.toISOString(),
        fechaLimiteEvento: eventDeadline.toISOString(),
        fechaLimiteLote: batchDeadline.toISOString(),
        eventoVencido: now.getTime() > eventDeadline.getTime(),
        loteVencido: now.getTime() > batchDeadline.getTime(),
      }
    })

    return {
      now: now.toISOString(),
      totalPendientes: rows.reduce((acc, r) => acc + r.pendientes, 0),
      sucursales: rows.sort((a, b) => b.pendientes - a.pendientes),
    }
  }

  /**
   * Transmite el evento de contingencia para los DTE pendientes de cada sucursal
   * y reintenta la emisión real de los documentos. Reutilizable desde el endpoint
   * manual (con scope de usuario) y desde el runner automático (sin scope).
   */
  async transmit(scope: Scope, dto: ContingenciaDto = {}): Promise<BranchTransmitResult[]> {
    const db = this.getDb(scope.dbUrl)

    // Sucursales objetivo: la indicada (validando acceso) o todas con pendientes.
    let targetBranchIds: string[]
    if (dto.branchId) {
      if (scope.allowedBranchIds && !scope.allowedBranchIds.includes(dto.branchId)) {
        throw new ForbiddenException('Sucursal no autorizada')
      }
      targetBranchIds = [dto.branchId]
    } else {
      const grouped = await db.dteDocument.groupBy({
        by: ['branchId'],
        where: {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          status: 'CONTINGENCY',
          ...(scope.allowedBranchIds ? { branchId: { in: scope.allowedBranchIds } } : {}),
        },
      })
      targetBranchIds = grouped.map((g) => g.branchId)
    }

    const results: BranchTransmitResult[] = []
    for (const branchId of targetBranchIds) {
      results.push(await this.transmitBranch(scope, branchId, dto))
    }
    return results
  }

  private async transmitBranch(scope: Scope, branchId: string, dto: ContingenciaDto): Promise<BranchTransmitResult> {
    const db = this.getDb(scope.dbUrl)

    const docs = await db.dteDocument.findMany({
      where: {
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        branchId,
        status: 'CONTINGENCY',
      },
      orderBy: { createdAt: 'asc' },
      take: CONTINGENCY_MAX_DOCUMENTS,
    })

    const branch = await db.branch.findFirst({
      where: { id: branchId, tenantId: scope.tenantId, companyId: scope.companyId },
    })
    const company = await db.company.findFirst({
      where: { id: scope.companyId, tenantId: scope.tenantId },
      select: {
        id: true, name: true, nit: true, phone: true, email: true, dteAmbiente: true,
        haciendaUserEnc: true, haciendaPwdEnc: true, certDataEnc: true, certPwdEnc: true,
      },
    })

    const base: BranchTransmitResult = {
      branchId,
      branchName: branch?.name ?? branchId,
      documentos: docs.length,
      eventoTransmitido: false,
      selloEvento: null,
      reemitidos: 0,
      observaciones: [],
    }

    if (!branch || !company) {
      base.observaciones.push('Sucursal o empresa no encontrada')
      return base
    }
    if (docs.length === 0) {
      base.observaciones.push('Sin documentos en contingencia')
      return base
    }

    try {
      const ambiente = (company.dteAmbiente ?? 'TEST') as 'TEST' | 'PROD'
      const haciendaUser = this.crypto.decrypt(company.haciendaUserEnc!)
      const haciendaPassword = this.crypto.decrypt(company.haciendaPwdEnc!)
      const certData = company.certDataEnc ? this.crypto.decrypt(company.certDataEnc) : ''
      const certPassword = company.certPwdEnc ? this.crypto.decrypt(company.certPwdEnc) : ''

      const codigoGeneracion = this.builder.generateCodigoGeneracion()
      const startedAt = docs[0].createdAt
      const endedAt = new Date()

      const eventJson = this.builder.buildContingenciaEvent({
        company,
        branch,
        codigoGeneracion,
        startedAt,
        endedAt,
        tipoContingencia: dto.tipoContingencia ?? CAT_005_TIPO_CONTINGENCIA.NO_DISPONIBILIDAD_MH,
        motivoContingencia: dto.motivoContingencia ?? 'No disponibilidad del sistema del Ministerio de Hacienda',
        nombreResponsable: dto.nombreResponsable ?? company.name,
        tipoDocResponsable: dto.tipoDocResponsable ?? '36',
        numeroDocResponsable: dto.numeroDocResponsable ?? company.nit ?? '',
        documentos: docs.map((d) => ({ tipoDoc: d.tipoDte, codigoGeneracion: d.codigoGeneracion })),
      }) as Record<string, unknown>

      const jws = await this.firmador.firmarDocumento(eventJson, certData, certPassword)
      const cacheKey = `${scope.tenantId}:${company.id}`
      const authToken = await this.hacienda.authenticate(haciendaUser, haciendaPassword, ambiente, cacheKey)
      const result = await this.hacienda.submitContingencia(jws, codigoGeneracion, ambiente, authToken)

      base.eventoTransmitido = !!result.selloRecibido
      base.selloEvento = result.selloRecibido
      base.observaciones.push(...(result.observaciones ?? []))

      if (!result.selloRecibido) {
        this.logger.warn(`Evento de contingencia rechazado (sucursal ${branchId}): ${result.observaciones?.join('; ')}`)
        return base
      }

      this.logger.log(`Evento de contingencia transmitido (sucursal ${branchId}) sello=${result.selloRecibido} docs=${docs.length}`)

      // Evento aceptado → reintentar la emisión real de cada DTE (best-effort).
      for (const doc of docs) {
        try {
          await this.dteService.emitFromQueue({
            saleId: doc.saleId,
            tenantId: doc.tenantId,
            companyId: doc.companyId,
            branchId: doc.branchId,
            tipoDte: doc.tipoDte,
            numeroControl: doc.numeroControl,
            dbUrl: scope.dbUrl,
          })
          base.reemitidos += 1
        } catch (err: any) {
          this.logger.warn(`Re-emisión post-contingencia falló (${doc.numeroControl}): ${err.message}`)
        }
      }
    } catch (err: any) {
      this.logger.error(`Transmisión de contingencia falló (sucursal ${branchId}): ${err.message}`)
      base.observaciones.push(err.message)
    }

    return base
  }

  /**
   * Procesamiento automático (runner): transmite contingencia de TODAS las sucursales
   * con pendientes en la empresa indicada. Sin scope de usuario.
   */
  async autoProcessCompany(tenantId: string, companyId: string, dbUrl?: string): Promise<BranchTransmitResult[]> {
    return this.transmit({ tenantId, dbUrl, companyId, allowedBranchIds: null })
  }
}

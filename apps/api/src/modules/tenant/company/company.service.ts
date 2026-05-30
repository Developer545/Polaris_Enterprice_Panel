import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { EncryptionService } from '../../../infrastructure/crypto/encryption.service'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { DTE_TYPE_VALUES, type JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const UpdateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  comercialName: z.string().optional(),
  nit: z.string().optional(),
  nrc: z.string().optional(),
  actividadEconomica: z.string().optional(),
  actividadEconomicaCodigo: z.string().optional(),
  address: z.string().optional(),
  departamentoCod: z.string().optional().nullable(),
  municipioCod: z.string().optional().nullable(),
  distritoCod: z.string().optional().nullable(),
  giro: z.string().optional().nullable(),
  tipoDocumento: z.string().optional().nullable(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  esGranContribuyente: z.boolean().optional(),
  sujetoRetencionIva1: z.boolean().optional(),
  logoUrl: z.string().url().optional().nullable(),
  // Hacienda credentials (stored encrypted)
  haciendaUser: z.string().optional(),
  haciendaPassword: z.string().optional(),
  // Certificate .p12 uploaded as base64
  certData: z.string().optional(),   // base64 p12
  certPassword: z.string().optional(),
  dteAmbiente: z.enum(['TEST', 'PROD']).optional(),
  dteEnabledTypes: z.array(z.enum(DTE_TYPE_VALUES)).optional(),
})

export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>

@Injectable()
export class CompanyService {
  constructor(
    private readonly clientFactory: TenantClientFactory,
    private readonly crypto: EncryptionService,
  ) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  async findAll(user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    return db.company.findMany({
      where: { tenantId, id: user.companyId },
      select: {
        id: true, name: true, comercialName: true, nit: true, nrc: true,
        actividadEconomica: true, actividadEconomicaCodigo: true,
        address: true, departamentoCod: true, municipioCod: true, distritoCod: true,
        phone: true, email: true,
        esGranContribuyente: true, sujetoRetencionIva1: true,
        logoUrl: true, dteAmbiente: true, isActive: true, createdAt: true,
        _count: { select: { branches: true, users: true } },
      },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, id)
    const company = await db.company.findFirst({
      where: { id, tenantId },
      select: {
        id: true, name: true, comercialName: true, nit: true, nrc: true,
        actividadEconomica: true, actividadEconomicaCodigo: true,
        address: true, departamentoCod: true, municipioCod: true, distritoCod: true,
        phone: true, email: true, logoUrl: true,
        esGranContribuyente: true, sujetoRetencionIva1: true,
        dteAmbiente: true, dteEnabledTypes: true, isActive: true, createdAt: true,
        haciendaUserEnc: true,
        certDataEnc: true,
        branches: { select: { id: true, name: true, codEstableMH: true, isActive: true } },
      },
    })
    if (!company) throw new NotFoundException('Empresa no encontrada')

    const enabledTypes = (company.dteEnabledTypes as string[]) ?? []
    return {
      ...company,
      haciendaConfigured:  !!company.haciendaUserEnc,
      certConfigured:      !!company.certDataEnc,
      // Treat empty array as default ["01","03"]
      dteEnabledTypes:     enabledTypes.length > 0 ? enabledTypes : ['01', '03'],
      haciendaUserEnc: undefined,
      certDataEnc:     undefined,
    }
  }

  async update(id: string, dto: UpdateCompanyDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, id)

    const company = await db.company.findFirst({ where: { id, tenantId } })
    if (!company) throw new NotFoundException('Empresa no encontrada')

    const { haciendaUser, haciendaPassword, certData, certPassword, dteEnabledTypes, ...rest } = dto
    const data: Record<string, unknown> = { ...rest }
    if (dteEnabledTypes !== undefined) data.dteEnabledTypes = dteEnabledTypes

    if (haciendaUser) data.haciendaUserEnc = this.crypto.encrypt(haciendaUser)
    if (haciendaPassword) data.haciendaPwdEnc = this.crypto.encrypt(haciendaPassword)
    if (certData) data.certDataEnc = this.crypto.encrypt(certData)
    if (certPassword) data.certPwdEnc = this.crypto.encrypt(certPassword)

    return db.company.update({ where: { id }, data })
  }

  // Test Hacienda connection — authenticates with provided or stored credentials
  async testHaciendaConnection(id: string, authUser: JwtAccessPayload, overrides?: { user?: string; password?: string; ambiente?: 'TEST' | 'PROD' }) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(authUser, id)
    const company = await db.company.findFirst({
      where: { id, tenantId },
      select: { haciendaUserEnc: true, haciendaPwdEnc: true, dteAmbiente: true },
    })
    if (!company) throw new NotFoundException('Empresa no encontrada')

    const user     = overrides?.user     ?? (company.haciendaUserEnc ? this.crypto.decrypt(company.haciendaUserEnc) : null)
    const password = overrides?.password ?? (company.haciendaPwdEnc  ? this.crypto.decrypt(company.haciendaPwdEnc!)  : null)
    const ambiente = (overrides?.ambiente ?? company.dteAmbiente ?? 'TEST') as 'TEST' | 'PROD'

    if (!user || !password) {
      throw new NotFoundException('No hay credenciales Hacienda configuradas para esta empresa')
    }

    const ENDPOINTS = {
      TEST: 'https://apitest.dtes.mh.gob.sv/fesv',
      PROD: 'https://api.dtes.mh.gob.sv/fesv',
    }

    const Axios = (await import('axios')).default
    const res = await Axios.post(`${ENDPOINTS[ambiente]}/seguridad/auth`, null, {
      params: { user, pwd: password },
      timeout: 15_000,
    })

    const token = res.data?.body?.token
    if (!token) throw new Error('Hacienda no retornó token — credenciales incorrectas')

    return { ok: true, ambiente, message: 'Conexión exitosa con Ministerio de Hacienda' }
  }

  // Decrypt Hacienda credentials for internal use by DTE service
  async getHaciendaCredentials(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const company = await db.company.findFirst({
      where: { id, tenantId },
      select: { haciendaUserEnc: true, haciendaPwdEnc: true, certDataEnc: true, certPwdEnc: true, dteAmbiente: true },
    })
    if (!company) throw new NotFoundException('Empresa no encontrada')
    if (!company.haciendaUserEnc) throw new ForbiddenException('Empresa sin credenciales Hacienda configuradas')

    return {
      user: this.crypto.decrypt(company.haciendaUserEnc),
      password: this.crypto.decrypt(company.haciendaPwdEnc!),
      certData: company.certDataEnc ? this.crypto.decrypt(company.certDataEnc) : null,
      certPassword: company.certPwdEnc ? this.crypto.decrypt(company.certPwdEnc) : null,
      ambiente: company.dteAmbiente ?? 'TEST',
    }
  }
}

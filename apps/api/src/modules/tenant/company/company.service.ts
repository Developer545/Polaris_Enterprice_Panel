import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { EncryptionService } from '../../../infrastructure/crypto/encryption.service'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { z } from 'zod'

export const UpdateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  comercialName: z.string().optional(),
  nit: z.string().optional(),
  nrc: z.string().optional(),
  actividadEconomica: z.string().optional(),
  actividadEconomicaCodigo: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  logoUrl: z.string().url().optional().nullable(),
  // Hacienda credentials (stored encrypted)
  haciendaUser: z.string().optional(),
  haciendaPassword: z.string().optional(),
  // Certificate .p12 uploaded as base64
  certData: z.string().optional(),   // base64 p12
  certPassword: z.string().optional(),
  dteAmbiente: z.enum(['TEST', 'PROD']).optional(),
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

  async findAll() {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    return db.company.findMany({
      where: { tenantId },
      select: {
        id: true, name: true, comercialName: true, nit: true, nrc: true,
        actividadEconomica: true, address: true, phone: true, email: true,
        logoUrl: true, dteAmbiente: true, isActive: true, createdAt: true,
        _count: { select: { branches: true, users: true } },
      },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const company = await db.company.findFirst({
      where: { id, tenantId },
      select: {
        id: true, name: true, comercialName: true, nit: true, nrc: true,
        actividadEconomica: true, actividadEconomicaCodigo: true,
        address: true, phone: true, email: true, logoUrl: true,
        dteAmbiente: true, isActive: true, createdAt: true,
        haciendaUserEnc: true, // return indicator only
        branches: { select: { id: true, name: true, codEstableMH: true, isActive: true } },
      },
    })
    if (!company) throw new NotFoundException('Empresa no encontrada')

    return {
      ...company,
      haciendaConfigured: !!company.haciendaUserEnc,
      haciendaUserEnc: undefined,
    }
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const company = await db.company.findFirst({ where: { id, tenantId } })
    if (!company) throw new NotFoundException('Empresa no encontrada')

    const { haciendaUser, haciendaPassword, certData, certPassword, ...rest } = dto
    const data: Record<string, unknown> = { ...rest }

    if (haciendaUser) data.haciendaUserEnc = this.crypto.encrypt(haciendaUser)
    if (haciendaPassword) data.haciendaPwdEnc = this.crypto.encrypt(haciendaPassword)
    if (certData) data.certDataEnc = this.crypto.encrypt(certData)
    if (certPassword) data.certPwdEnc = this.crypto.encrypt(certPassword)

    return db.company.update({ where: { id }, data })
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

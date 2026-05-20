import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const CreateEmployeeSchema = z.object({
  companyId: z.string().cuid(),
  branchId: z.string().cuid().optional().nullable(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dui: z.string().optional().nullable(),
  nit: z.string().optional().nullable(),
  nssIsss: z.string().optional().nullable(),
  nup: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  position: z.string().min(1),
  department: z.string().optional().nullable(),
  salary: z.number().positive(),
  salaryType: z.enum(['MONTHLY', 'DAILY', 'HOURLY']).default('MONTHLY'),
  hireDate: z.coerce.date(),
  terminationDate: z.coerce.date().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).default('ACTIVE'),
  afpInstitution: z.enum(['CONFIA', 'CRECER']).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
})

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().omit({ companyId: true })

export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>
export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeSchema>

@Injectable()
export class EmployeesService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  private assertBranchAccess(user: JwtAccessPayload, branchId?: string | null) {
    if (branchId && !user.branchIds.includes(branchId)) throw new ForbiddenException('Sucursal no autorizada')
  }

  async findAll(companyId: string, user: JwtAccessPayload, branchId?: string, search?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    this.assertBranchAccess(user, branchId)
    return db.employee.findMany({
      where: {
        tenantId,
        companyId,
        ...(branchId ? { branchId } : { OR: [{ branchId: null }, { branchId: { in: user.branchIds } }] }),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { dui: { contains: search } },
                { position: { contains: search, mode: 'insensitive' } },
                { department: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dui: true,
        position: true,
        department: true,
        salary: true,
        salaryType: true,
        hireDate: true,
        status: true,
        afpInstitution: true,
        photoUrl: true,
        createdAt: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 200,
    })
  }

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const employee = await db.employee.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!employee) throw new NotFoundException('Empleado no encontrado')
    this.assertBranchAccess(user, employee.branchId)
    return employee
  }

  async create(dto: CreateEmployeeDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)
    this.assertBranchAccess(user, dto.branchId)

    if (dto.dui) {
      const exists = await db.employee.findFirst({
        where: { tenantId, companyId: dto.companyId, dui: dto.dui },
      })
      if (exists) throw new ConflictException('Ya existe un empleado con ese DUI')
    }

    return db.employee.create({ data: { ...dto, tenantId } })
  }

  async update(id: string, dto: UpdateEmployeeDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const employee = await db.employee.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!employee) throw new NotFoundException('Empleado no encontrado')
    this.assertBranchAccess(user, employee.branchId)
    if (dto.branchId !== undefined) this.assertBranchAccess(user, dto.branchId)
    return db.employee.update({ where: { id }, data: dto })
  }

  async deactivate(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const employee = await db.employee.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!employee) throw new NotFoundException('Empleado no encontrado')
    this.assertBranchAccess(user, employee.branchId)
    return db.employee.update({
      where: { id },
      data: { status: 'INACTIVE', terminationDate: new Date() },
    })
  }
}

import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { buildBranchWhere, assertBranchAccess } from '../../../common/branch-scope.util'
import { z } from 'zod'

export const CreateEmployeeSchema = z.object({
  companyId: z.string().cuid(),
  branchId: z.string().cuid().optional().nullable(),
  cargoId: z.string().cuid().optional().nullable(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dui: z.string().optional().nullable(),
  nit: z.string().optional().nullable(),
  nssIsss: z.string().optional().nullable(),
  nup: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  departamentoCod: z.string().optional().nullable(),
  municipioCod: z.string().optional().nullable(),
  distritoCod: z.string().optional().nullable(),
  position: z.string().min(1),
  department: z.string().optional().nullable(),
  salary: z.number().positive(),
  salaryType: z.enum(['MONTHLY', 'DAILY', 'HOURLY']).default('MONTHLY'),
  hireDate: z.coerce.date(),
  terminationDate: z.coerce.date().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).default('ACTIVE'),
  afpInstitution: z.enum(['CONFIA', 'CRECER']).optional().nullable(),
  photoUrl: z.string().optional().nullable(),
})

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().omit({ companyId: true })

export const CreateCargoSchema = z.object({
  companyId: z.string().cuid(),
  nombre: z.string().min(1).max(100),
  descripcion: z.string().optional().nullable(),
  activo: z.boolean().optional().default(true),
})

export const UpdateCargoSchema = CreateCargoSchema.partial().omit({ companyId: true })

export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>
export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeSchema>
export type CreateCargoDto    = z.infer<typeof CreateCargoSchema>
export type UpdateCargoDto    = z.infer<typeof UpdateCargoSchema>

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
    if (branchId) assertBranchAccess(user, branchId)
  }

  // ── Employees CRUD ───────────────────────────────────────────────────────────

  async findAll(companyId: string, user: JwtAccessPayload, branchId?: string, search?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    return db.employee.findMany({
      where: {
        tenantId,
        companyId,
        ...buildBranchWhere(user, branchId),
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
        cargoId: true,
        cargo: { select: { id: true, nombre: true } },
        createdAt: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 200,
    })
  }

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const employee = await db.employee.findFirst({
      where: { id, tenantId, companyId: user.companyId, ...buildBranchWhere(user) },
      include: { cargo: { select: { id: true, nombre: true } } },
    })
    if (!employee) throw new NotFoundException('Empleado no encontrado')
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
    const employee = await db.employee.findFirst({ where: { id, tenantId, companyId: user.companyId, ...buildBranchWhere(user) } })
    if (!employee) throw new NotFoundException('Empleado no encontrado')
    if (dto.branchId !== undefined) this.assertBranchAccess(user, dto.branchId)
    return db.employee.update({ where: { id }, data: dto })
  }

  async deactivate(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const employee = await db.employee.findFirst({ where: { id, tenantId, companyId: user.companyId, ...buildBranchWhere(user) } })
    if (!employee) throw new NotFoundException('Empleado no encontrado')
    return db.employee.update({
      where: { id },
      data: { status: 'INACTIVE', terminationDate: new Date() },
    })
  }

  // ── Cargos CRUD ──────────────────────────────────────────────────────────────

  async listCargos(companyId: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    const cargos = await db.employeeCargo.findMany({
      where: { tenantId, companyId },
      select: { id: true, nombre: true, descripcion: true, activo: true, _count: { select: { employees: true } } },
      orderBy: { nombre: 'asc' },
    })
    return cargos.map((c) => ({ ...c, totalEmpleados: c._count.employees }))
  }

  async createCargo(dto: CreateCargoDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)
    const exists = await db.employeeCargo.findFirst({ where: { tenantId, companyId: dto.companyId, nombre: dto.nombre } })
    if (exists) throw new ConflictException('Ya existe un cargo con ese nombre')
    return db.employeeCargo.create({ data: { tenantId, companyId: dto.companyId, nombre: dto.nombre, descripcion: dto.descripcion, activo: dto.activo ?? true } })
  }

  async updateCargo(id: string, dto: UpdateCargoDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const cargo = await db.employeeCargo.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!cargo) throw new NotFoundException('Cargo no encontrado')
    return db.employeeCargo.update({ where: { id }, data: dto })
  }

  async deleteCargo(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const cargo = await db.employeeCargo.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      include: { _count: { select: { employees: true } } },
    })
    if (!cargo) throw new NotFoundException('Cargo no encontrado')
    if (cargo._count.employees > 0) throw new ConflictException('No se puede eliminar: tiene empleados asignados')
    return db.employeeCargo.delete({ where: { id } })
  }

  // ── Employee Analytics ───────────────────────────────────────────────────────

  async getAnalytics(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const employee = await db.employee.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      select: { id: true, firstName: true, lastName: true, hireDate: true, salary: true, status: true },
    })
    if (!employee) throw new NotFoundException('Empleado no encontrado')

    const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const now = new Date()

    // Last 6 months slots
    const slots: { label: string; from: Date; to: Date }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      slots.push({
        label: `${MONTHS_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        from: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0),
        to: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      })
    }

    // Payroll history for this employee
    const payrollItems = await db.payrollItem.findMany({
      where: { tenantId, employeeId: id },
      include: { payrollPeriod: { select: { name: true, status: true, startDate: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    })

    // Tenure in months
    const tenureMs = Date.now() - new Date(employee.hireDate).getTime()
    const tenureMeses = Math.floor(tenureMs / (1000 * 60 * 60 * 24 * 30))

    // Payroll totals
    const planillaTotals = payrollItems.reduce(
      (acc, p) => {
        acc.totalBruto       += Number(p.totalBruto)
        acc.totalNeto        += Number(p.salarioNeto)
        acc.totalDeducciones += Number(p.totalDeducciones)
        acc.costoPatronal    += Number(p.isssPatronal) + Number(p.afpPatronal) + Number(p.insaforp)
        return acc
      },
      { totalBruto: 0, totalNeto: 0, totalDeducciones: 0, costoPatronal: 0 },
    )

    return {
      employee: {
        id: employee.id,
        fullName: `${employee.firstName} ${employee.lastName}`,
        hireDate: employee.hireDate,
        salary: Number(employee.salary),
        status: employee.status,
        tenureMeses,
      },
      planillaEvolucion: [...payrollItems].reverse().map((p) => ({
        periodo: p.payrollPeriod.name,
        totalBruto: Number(p.totalBruto),
        totalDeducciones: Number(p.totalDeducciones),
        salarioNeto: Number(p.salarioNeto),
        costoPatronal: Number(p.isssPatronal) + Number(p.afpPatronal) + Number(p.insaforp),
        estado: p.payrollPeriod.status,
      })),
      planillaTotals,
    }
  }
}

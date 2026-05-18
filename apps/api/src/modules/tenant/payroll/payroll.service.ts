import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { Decimal } from '@prisma/client/runtime/library'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { calcPayrollItem } from './payroll-calculator'
import { z } from 'zod'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const CreatePeriodSchema = z.object({
  companyId: z.string().cuid(),
  name: z.string().min(1).max(100),
  periodType: z.enum(['MONTHLY', 'BIWEEKLY']).default('MONTHLY'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  payDate: z.coerce.date(),
})

export type CreatePeriodDto = z.infer<typeof CreatePeriodSchema>

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PayrollService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  // ── Periods ───────────────────────────────────────────────────────────────

  async findPeriods(companyId: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    return db.payrollPeriod.findMany({
      where: { tenantId, companyId },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        periodType: true,
        startDate: true,
        endDate: true,
        payDate: true,
        status: true,
        totalBruto: true,
        totalNeto: true,
        totalIsss: true,
        totalAfp: true,
        totalRenta: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    })
  }

  async findPeriod(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const period = await db.payrollPeriod.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                position: true,
                dui: true,
                afpInstitution: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!period) throw new NotFoundException('Período de planilla no encontrado')
    return period
  }

  async createPeriod(dto: CreatePeriodDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    if (dto.endDate <= dto.startDate) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio')
    }

    return db.payrollPeriod.create({ data: { ...dto, tenantId } })
  }

  // ── Generate payroll ──────────────────────────────────────────────────────

  async generatePayroll(periodId: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const period = await db.payrollPeriod.findFirst({ where: { id: periodId, tenantId } })
    if (!period) throw new NotFoundException('Período de planilla no encontrado')
    if (period.status !== 'DRAFT') {
      throw new BadRequestException('Solo se puede generar la planilla en estado BORRADOR')
    }

    const employees = await db.employee.findMany({
      where: { tenantId, companyId: period.companyId, status: 'ACTIVE' },
    })

    if (employees.length === 0) {
      throw new BadRequestException('No hay empleados activos en esta empresa')
    }

    // Check for existing items — prevent duplicate generation
    const existingCount = await db.payrollItem.count({ where: { payrollPeriodId: periodId } })
    if (existingCount > 0) {
      throw new ConflictException(
        'La planilla ya tiene ítems generados. Elimine el período y cree uno nuevo.',
      )
    }

    // Calculate each employee's payroll item
    const itemsData = employees.map((emp) => {
      const salaryBase = Number(emp.salary)
      const calc = calcPayrollItem({
        salaryBase,
        afpInstitution: emp.afpInstitution,
      })

      return {
        tenantId,
        payrollPeriodId: periodId,
        employeeId: emp.id,
        salaryBase: new Decimal(calc.salaryBase),
        horasExtra: new Decimal(calc.horasExtra),
        bonos: new Decimal(calc.bonos),
        aguinaldo: new Decimal(calc.aguinaldo),
        otrosIngresos: new Decimal(calc.otrosIngresos),
        totalBruto: new Decimal(calc.totalBruto),
        isssEmpleado: new Decimal(calc.isssEmpleado),
        afpEmpleado: new Decimal(calc.afpEmpleado),
        rentaRetenida: new Decimal(calc.rentaRetenida),
        otrosDeducciones: new Decimal(calc.otrosDeducciones),
        totalDeducciones: new Decimal(calc.totalDeducciones),
        salarioNeto: new Decimal(calc.salarioNeto),
        isssPatronal: new Decimal(calc.isssPatronal),
        afpPatronal: new Decimal(calc.afpPatronal),
        insaforp: new Decimal(calc.insaforp),
      }
    })

    // Aggregate totals
    const totalBruto = itemsData.reduce((s, i) => s + Number(i.totalBruto), 0)
    const totalNeto = itemsData.reduce((s, i) => s + Number(i.salarioNeto), 0)
    const totalIsss = itemsData.reduce((s, i) => s + Number(i.isssEmpleado), 0)
    const totalAfp = itemsData.reduce((s, i) => s + Number(i.afpEmpleado), 0)
    const totalRenta = itemsData.reduce((s, i) => s + Number(i.rentaRetenida), 0)

    // Persist everything in a single transaction
    return db.$transaction(async (tx) => {
      await tx.payrollItem.createMany({ data: itemsData })

      return tx.payrollPeriod.update({
        where: { id: periodId },
        data: {
          totalBruto: new Decimal(Math.round(totalBruto * 100) / 100),
          totalNeto: new Decimal(Math.round(totalNeto * 100) / 100),
          totalIsss: new Decimal(Math.round(totalIsss * 100) / 100),
          totalAfp: new Decimal(Math.round(totalAfp * 100) / 100),
          totalRenta: new Decimal(Math.round(totalRenta * 100) / 100),
        },
        include: {
          _count: { select: { items: true } },
        },
      })
    })
  }

  // ── Approve / Pay ─────────────────────────────────────────────────────────

  async approvePeriod(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const period = await db.payrollPeriod.findFirst({ where: { id, tenantId } })
    if (!period) throw new NotFoundException('Período de planilla no encontrado')
    if (period.status !== 'DRAFT') {
      throw new BadRequestException('Solo se puede aprobar un período en estado BORRADOR')
    }

    const itemCount = await db.payrollItem.count({ where: { payrollPeriodId: id } })
    if (itemCount === 0) {
      throw new BadRequestException('Genere la planilla antes de aprobarla')
    }

    return db.payrollPeriod.update({
      where: { id },
      data: { status: 'APPROVED' },
    })
  }

  async markPaid(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const period = await db.payrollPeriod.findFirst({ where: { id, tenantId } })
    if (!period) throw new NotFoundException('Período de planilla no encontrado')
    if (period.status !== 'APPROVED') {
      throw new BadRequestException('Solo se puede marcar como pagado un período APROBADO')
    }

    return db.payrollPeriod.update({
      where: { id },
      data: { status: 'PAID' },
    })
  }
}

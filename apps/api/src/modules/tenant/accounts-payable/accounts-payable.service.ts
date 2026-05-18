import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'

export const CreateAccountPayableSchema = z.object({
  companyId: z.string().cuid(),
  supplierId: z.string().cuid(),
  purchaseOrderId: z.string().cuid().optional().nullable(),
  description: z.string().min(2),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  notes: z.string().optional().nullable(),
})

export const UpdateAccountPayableSchema = CreateAccountPayableSchema.partial().omit({ companyId: true })

export const RegisterPaymentSchema = z.object({
  amount: z.number().positive(),
  notes: z.string().optional().nullable(),
})

export type CreateAccountPayableDto = z.infer<typeof CreateAccountPayableSchema>
export type UpdateAccountPayableDto = z.infer<typeof UpdateAccountPayableSchema>
export type RegisterPaymentDto = z.infer<typeof RegisterPaymentSchema>

@Injectable()
export class AccountsPayableService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  async findAll(companyId: string, status?: string, supplierId?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    return db.accountPayable.findMany({
      where: {
        tenantId,
        companyId,
        ...(status ? { status: status as never } : {}),
        ...(supplierId ? { supplierId } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, orderNumber: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 200,
    })
  }

  async findOne(id: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const ap = await db.accountPayable.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        purchaseOrder: { include: { items: true } },
      },
    })
    if (!ap) throw new NotFoundException('Cuenta por pagar no encontrada')
    return ap
  }

  async create(dto: CreateAccountPayableDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    return db.accountPayable.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        supplierId: dto.supplierId,
        purchaseOrderId: dto.purchaseOrderId ?? null,
        description: dto.description,
        amount: new Decimal(dto.amount),
        amountPaid: new Decimal(0),
        dueDate: new Date(dto.dueDate),
        status: 'PENDING',
        notes: dto.notes ?? null,
      },
    })
  }

  async update(id: string, dto: UpdateAccountPayableDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const ap = await db.accountPayable.findFirst({ where: { id, tenantId } })
    if (!ap) throw new NotFoundException('Cuenta por pagar no encontrada')
    if (ap.status === 'PAID') throw new BadRequestException('No se puede modificar una cuenta ya pagada')

    const { amount, dueDate, ...rest } = dto
    return db.accountPayable.update({
      where: { id },
      data: {
        ...rest,
        ...(amount !== undefined ? { amount: new Decimal(amount) } : {}),
        ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}),
      },
    })
  }

  async registerPayment(id: string, dto: RegisterPaymentDto) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const ap = await db.accountPayable.findFirst({ where: { id, tenantId } })
    if (!ap) throw new NotFoundException('Cuenta por pagar no encontrada')
    if (ap.status === 'PAID') throw new BadRequestException('Esta cuenta ya está completamente pagada')

    const currentPaid = Number(ap.amountPaid)
    const total = Number(ap.amount)
    const newPaid = currentPaid + dto.amount

    if (newPaid > total) {
      throw new BadRequestException(`El monto excede el saldo pendiente de $${(total - currentPaid).toFixed(2)}`)
    }

    const newStatus = newPaid >= total ? 'PAID' : 'PARTIAL'

    return db.accountPayable.update({
      where: { id },
      data: {
        amountPaid: new Decimal(newPaid),
        status: newStatus as never,
        ...(dto.notes ? { notes: dto.notes } : {}),
      },
    })
  }

  async markOverdue(companyId: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const now = new Date()
    const result = await db.accountPayable.updateMany({
      where: {
        tenantId,
        companyId,
        status: 'PENDING',
        dueDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    })
    return { updated: result.count }
  }
}

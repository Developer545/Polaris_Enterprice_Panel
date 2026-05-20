import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { Decimal } from '@prisma/client/runtime/library'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
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

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  async findAll(companyId: string, user: JwtAccessPayload, status?: string, supplierId?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
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

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const ap = await db.accountPayable.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      include: {
        supplier: true,
        purchaseOrder: { include: { items: true } },
      },
    })
    if (!ap) throw new NotFoundException('Cuenta por pagar no encontrada')
    return ap
  }

  async create(dto: CreateAccountPayableDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)
    const supplier = await db.supplier.findFirst({
      where: { id: dto.supplierId, tenantId, companyId: dto.companyId, isActive: true },
      select: { id: true },
    })
    if (!supplier) throw new BadRequestException('Proveedor no pertenece a la empresa')
    if (dto.purchaseOrderId) {
      const order = await db.purchaseOrder.findFirst({
        where: { id: dto.purchaseOrderId, tenantId, companyId: dto.companyId },
        select: { id: true },
      })
      if (!order) throw new BadRequestException('Orden de compra no pertenece a la empresa')
    }
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

  async update(id: string, dto: UpdateAccountPayableDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const ap = await db.accountPayable.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!ap) throw new NotFoundException('Cuenta por pagar no encontrada')
    if (ap.status === 'PAID') throw new BadRequestException('No se puede modificar una cuenta ya pagada')
    if (dto.supplierId) {
      const supplier = await db.supplier.findFirst({
        where: { id: dto.supplierId, tenantId, companyId: user.companyId, isActive: true },
        select: { id: true },
      })
      if (!supplier) throw new BadRequestException('Proveedor no pertenece a la empresa')
    }
    if (dto.purchaseOrderId) {
      const order = await db.purchaseOrder.findFirst({
        where: { id: dto.purchaseOrderId, tenantId, companyId: user.companyId },
        select: { id: true },
      })
      if (!order) throw new BadRequestException('Orden de compra no pertenece a la empresa')
    }

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

  async registerPayment(id: string, dto: RegisterPaymentDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const ap = await db.accountPayable.findFirst({ where: { id, tenantId, companyId: user.companyId } })
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

  async markOverdue(companyId: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
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

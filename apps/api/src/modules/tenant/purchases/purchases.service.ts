import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { Decimal } from '@prisma/client/runtime/library'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const PurchaseOrderItemSchema = z.object({
  productId: z.string().cuid(),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
})

export const CreatePurchaseOrderSchema = z.object({
  companyId: z.string().cuid(),
  supplierId: z.string().cuid(),
  orderNumber: z.string().optional().nullable(),
  expectedDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(PurchaseOrderItemSchema).min(1),
})

export const UpdatePurchaseOrderSchema = z.object({
  supplierId: z.string().cuid().optional(),
  orderNumber: z.string().optional().nullable(),
  expectedDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED']).optional(),
})

export const ReceiveItemSchema = z.object({
  itemId: z.string().cuid(),
  receivedQty: z.number().nonnegative(),
})

export const ReceivePurchaseOrderSchema = z.object({
  items: z.array(ReceiveItemSchema).min(1),
  createAccountPayable: z.boolean().default(true),
  dueDate: z.string().datetime().optional().nullable(),
})

export type CreatePurchaseOrderDto = z.infer<typeof CreatePurchaseOrderSchema>
export type UpdatePurchaseOrderDto = z.infer<typeof UpdatePurchaseOrderSchema>
export type ReceivePurchaseOrderDto = z.infer<typeof ReceivePurchaseOrderSchema>

@Injectable()
export class PurchasesService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  private async assertSupplierAndProducts(db: ReturnType<PurchasesService['getDb']>, tenantId: string, dto: CreatePurchaseOrderDto) {
    const supplier = await db.supplier.findFirst({
      where: { id: dto.supplierId, tenantId, companyId: dto.companyId, isActive: true },
      select: { id: true },
    })
    if (!supplier) throw new BadRequestException('Proveedor no pertenece a la empresa')

    const productIds = [...new Set(dto.items.map((item) => item.productId))]
    const productCount = await db.service.count({
      where: { id: { in: productIds }, tenantId, companyId: dto.companyId, isActive: true },
    })
    if (productCount !== productIds.length) throw new BadRequestException('Uno o más productos no pertenecen a la empresa')
  }

  async findAll(companyId: string, user: JwtAccessPayload, status?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    return db.purchaseOrder.findMany({
      where: {
        tenantId,
        companyId,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const order = await db.purchaseOrder.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      include: {
        supplier: { select: { id: true, name: true, email: true, phone: true } },
        items: true,
        accountsPayable: { select: { id: true, amount: true, amountPaid: true, status: true, dueDate: true } },
      },
    })
    if (!order) throw new NotFoundException('Orden de compra no encontrada')
    return order
  }

  async create(dto: CreatePurchaseOrderDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)
    await this.assertSupplierAndProducts(db, tenantId, dto)

    const subtotal = dto.items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0)
    const tax = 0
    const total = subtotal + tax

    return db.purchaseOrder.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        supplierId: dto.supplierId,
        orderNumber: dto.orderNumber ?? `OC-${Date.now()}`,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes,
        status: 'DRAFT',
        subtotal: new Decimal(subtotal),
        tax: new Decimal(tax),
        total: new Decimal(total),
        items: {
          create: dto.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitCost: new Decimal(item.unitCost),
            total: new Decimal(item.quantity * item.unitCost),
            receivedQty: 0,
          })),
        },
      },
      include: { items: true },
    })
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const order = await db.purchaseOrder.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!order) throw new NotFoundException('Orden de compra no encontrada')
    if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
      throw new BadRequestException('No se puede modificar una orden ya recibida o cancelada')
    }

    const { expectedDate, supplierId, ...rest } = dto
    if (supplierId) {
      const supplier = await db.supplier.findFirst({
        where: { id: supplierId, tenantId, companyId: user.companyId, isActive: true },
        select: { id: true },
      })
      if (!supplier) throw new BadRequestException('Proveedor no pertenece a la empresa')
    }
    return db.purchaseOrder.update({
      where: { id },
      data: {
        ...rest,
        ...(supplierId !== undefined ? { supplierId } : {}),
        ...(expectedDate !== undefined ? { expectedDate: expectedDate ? new Date(expectedDate) : null } : {}),
      } as any,
    })
  }

  async receive(id: string, dto: ReceivePurchaseOrderDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const order = await db.purchaseOrder.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      include: { items: true },
    })
    if (!order) throw new NotFoundException('Orden de compra no encontrada')
    if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Esta orden ya fue procesada o está cancelada')
    }

    const receiveMap = new Map(dto.items.map(i => [i.itemId, i.receivedQty]))

    return db.$transaction(async (tx) => {
      for (const item of order.items) {
        const incomingQty = receiveMap.get(item.id)
        if (incomingQty === undefined) continue

        const newReceived = Number(item.receivedQty ?? 0) + incomingQty
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQty: newReceived },
        })

        if (incomingQty > 0) {
          const product = await tx.service.findFirst({
            where: { id: item.productId, tenantId, companyId: order.companyId },
          })
          if (product?.trackStock) {
            await tx.service.update({
              where: { id: item.productId },
              data: { stock: { increment: incomingQty } },
            })
          }
        }
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } })
      const allReceived = updatedItems.every(i => Number(i.receivedQty ?? 0) >= Number(i.quantity))
      const anyReceived = updatedItems.some(i => Number(i.receivedQty ?? 0) > 0)
      const newStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIAL' : order.status

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: newStatus as never,
          ...(allReceived ? { receivedDate: new Date() } : {}),
        },
      })

      if (dto.createAccountPayable && (allReceived || anyReceived)) {
        const existing = await tx.accountPayable.findFirst({ where: { purchaseOrderId: id, tenantId } })
        if (!existing) {
          await tx.accountPayable.create({
            data: {
              tenantId,
              companyId: order.companyId,
              supplierId: order.supplierId,
              purchaseOrderId: id,
              description: `OC #${order.orderNumber ?? id.slice(-8)}`,
              amount: order.total,
              amountPaid: new Decimal(0),
              dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: 'PENDING',
            },
          })
        }
      }

      return updatedOrder
    })
  }

  async cancel(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const order = await db.purchaseOrder.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!order) throw new NotFoundException('Orden de compra no encontrada')
    if (order.status === 'RECEIVED') {
      throw new BadRequestException('No se puede cancelar una orden ya recibida')
    }
    return db.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } })
  }
}

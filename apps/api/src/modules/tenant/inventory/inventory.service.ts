import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { Decimal } from '@prisma/client/runtime/library'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const AdjustStockSchema = z.object({
  companyId:  z.string().cuid(),
  branchId:   z.string().cuid().optional(),
  productId:  z.string().cuid(),
  type:       z.enum(['IN', 'OUT', 'ADJUST']),
  quantity:   z.number().positive(),
  unitCost:   z.number().nonnegative().optional(),
  reason:     z.string().min(2).max(500),
})

export type AdjustStockDto = z.infer<typeof AdjustStockSchema>

@Injectable()
export class InventoryService {
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

  // ─── Movimientos / Kardex ──────────────────────────────────────────────────

  async findMovements(
    companyId: string,
    user: JwtAccessPayload,
    productId?: string,
    type?: string,
    branchId?: string,
    from?: string,
    to?: string,
    page = 1,
    limit = 100,
  ) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    this.assertBranchAccess(user, branchId)

    const safePage = Math.max(1, page || 1)
    const safeLimit = Math.min(Math.max(1, limit || 100), 100)
    const skip = (safePage - 1) * safeLimit
    const where = {
      tenantId,
      companyId,
      ...(productId ? { productId } : {}),
      ...(type ? { type: type as any } : {}),
      ...(branchId ? { branchId } : { OR: [{ branchId: null }, { branchId: { in: user.branchIds } }] }),
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to   ? { lte: new Date(to)   } : {}),
        },
      } : {}),
    }

    const [total, data] = await Promise.all([
      db.inventoryMovement.count({ where }),
      db.inventoryMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user:    { select: { id: true, name: true } },
          branch:  { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ])

    return { total, page: safePage, limit: safeLimit, data }
  }

  // ─── Stock bajo mínimo ────────────────────────────────────────────────────

  async findLowStock(companyId: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)

    return db.service.findMany({
      where: {
        tenantId,
        companyId,
        trackStock: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        minStock: true,
        cost: true,
        price: true,
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { name: 'asc' },
    })
  }

  // ─── KPIs inventario ─────────────────────────────────────────────────────

  async getStats(companyId: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [stockStats, movementsToday] = await Promise.all([
      db.$queryRawUnsafe<Array<{
        totalProductos: number
        valorStock: Decimal | null
        itemsBajoMinimo: number
      }>>(`
        SELECT
          COUNT(*)::int AS "totalProductos",
          COALESCE(SUM("stock" * "cost"), 0) AS "valorStock",
          COUNT(*) FILTER (WHERE "stock" <= "minStock")::int AS "itemsBajoMinimo"
        FROM "Service"
        WHERE "tenantId" = $1
          AND "companyId" = $2
          AND "trackStock" = true
          AND "isActive" = true
      `, tenantId, companyId),
      db.inventoryMovement.count({
        where: { tenantId, companyId, createdAt: { gte: today } },
      }),
    ])

    const stats = stockStats[0]

    return {
      totalProductos: stats?.totalProductos ?? 0,
      valorStock: Number(stats?.valorStock ?? 0).toFixed(2),
      itemsBajoMinimo: stats?.itemsBajoMinimo ?? 0,
      movementsToday,
      totalConStock: stats?.totalProductos ?? 0,
    }
  }

  // ─── Ajuste manual ────────────────────────────────────────────────────────

  async adjust(dto: AdjustStockDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)
    this.assertBranchAccess(user, dto.branchId)

    const product = await db.service.findFirst({
      where: { id: dto.productId, tenantId, companyId: dto.companyId, trackStock: true },
    })
    if (!product) throw new NotFoundException('Producto no encontrado o no maneja inventario')

    const currentStock = Number(product.stock)
    let newStock: number

    if (dto.type === 'IN') {
      newStock = currentStock + dto.quantity
    } else if (dto.type === 'OUT') {
      newStock = currentStock - dto.quantity
      if (newStock < 0) throw new BadRequestException('Stock insuficiente para la salida')
    } else {
      // ADJUST — set absolute value
      newStock = dto.quantity
    }

    const quantityForMovement = dto.type === 'ADJUST'
      ? Math.abs(newStock - currentStock)
      : dto.quantity

    const [movement] = await db.$transaction([
      db.inventoryMovement.create({
        data: {
          tenantId,
          companyId:      dto.companyId,
          branchId:       dto.branchId ?? null,
          productId:      dto.productId,
          userId:         user.sub,
          type:           dto.type,
          quantity:       new Decimal(quantityForMovement),
          quantityBefore: new Decimal(currentStock),
          quantityAfter:  new Decimal(newStock),
          unitCost:       dto.unitCost != null ? new Decimal(dto.unitCost) : null,
          reason:         dto.reason,
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user:    { select: { id: true, name: true } },
        },
      }),
      db.service.update({
        where: { id: dto.productId },
        data:  { stock: newStock },
      }),
    ])

    return movement
  }
}

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { Decimal } from '@prisma/client/runtime/library'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { buildBranchWhere, assertBranchAccess } from '../../../common/branch-scope.util'
import { z } from 'zod'

export const AdjustStockSchema = z.object({
  companyId:  z.string().cuid(),
  branchId:   z.string().cuid().optional(),
  productId:  z.string().cuid(),
  type:       z.enum(['IN', 'OUT', 'ADJUST']),
  quantity:   z.number().nonnegative(),
  unitCost:   z.number().nonnegative().optional(),
  reference:  z.string().max(100).optional(),
  reason:     z.string().min(2).max(500),
})

export const TransferStockSchema = z.object({
  companyId:    z.string().cuid(),
  productId:    z.string().cuid(),
  fromBranchId: z.string().cuid(),
  toBranchId:   z.string().cuid(),
  quantity:     z.number().positive(),
  reason:       z.string().min(2).max(500),
})

export type AdjustStockDto    = z.infer<typeof AdjustStockSchema>
export type TransferStockDto  = z.infer<typeof TransferStockSchema>

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
    if (branchId) assertBranchAccess(user, branchId)
  }

  // ─── Movimientos / Kardex ──────────────────────────────────────────────────

  private async getInitialBranchStock(db: any, tenantId: string, companyId: string, product: { id: string; stock: number | null }) {
    const [existingBranchStockCount, activeBranchCount] = await Promise.all([
      db.branchInventory.count({ where: { tenantId, companyId, productId: product.id } }),
      db.branch.count({ where: { tenantId, companyId, isActive: true } }),
    ])
    return existingBranchStockCount === 0 && activeBranchCount <= 1 ? Number(product.stock ?? 0) : 0
  }

  private async syncGlobalStock(db: any, tenantId: string, companyId: string, productId: string, fallbackStock: number) {
    const totals = await db.branchInventory.aggregate({
      where: { tenantId, companyId, productId },
      _sum: { stock: true },
    })
    await db.service.update({
      where: { id: productId },
      data: { stock: totals._sum.stock ?? fallbackStock },
    })
  }

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
      ...buildBranchWhere(user, branchId),
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

  async findLowStock(companyId: string, user: JwtAccessPayload, branchId?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    this.assertBranchAccess(user, branchId)

    const branchScope = buildBranchWhere(user, branchId)
    const consolidated = user.canViewAllBranches && !branchId

    if (!consolidated) {
      const rows = await db.branchInventory.findMany({
        where: {
          tenantId,
          companyId,
          ...branchScope,
          product: { trackStock: true, isActive: true },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              cost: true,
              price: true,
              category: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: { product: { name: 'asc' } },
      })
      return rows
        .filter((row) => row.stock <= row.minStock)
        .map((row) => ({ ...row.product, stock: row.stock, minStock: row.minStock }))
    }

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

  async getStats(companyId: string, user: JwtAccessPayload, branchId?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    this.assertBranchAccess(user, branchId)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Owner with no branchId selected → company-wide consolidated view (Service.stock).
    // Otherwise (a branch user, or an owner drilling into one branch) → per-branch
    // aggregation over BranchInventory scoped to the branches the user may see.
    const branchScope = buildBranchWhere(user, branchId)
    const consolidated = user.canViewAllBranches && !branchId

    if (!consolidated) {
      const [inventories, movementsToday] = await Promise.all([
        db.branchInventory.findMany({
          where: {
            tenantId,
            companyId,
            ...branchScope,
            product: { trackStock: true, isActive: true },
          },
          select: {
            stock: true,
            minStock: true,
            product: { select: { cost: true } },
          },
        }),
        db.inventoryMovement.count({
          where: { tenantId, companyId, ...branchScope, createdAt: { gte: today } },
        }),
      ])

      const valorStock = inventories.reduce((sum, row) => sum + row.stock * Number(row.product.cost ?? 0), 0)
      const itemsBajoMinimo = inventories.filter((row) => row.stock <= row.minStock).length

      return {
        totalProductos: inventories.length,
        valorStock: valorStock.toFixed(2),
        itemsBajoMinimo,
        movementsToday,
        totalConStock: inventories.length,
      }
    }

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

  // ─── Búsqueda cruzada de stock (excepción) ─────────────────────────────────

  async stockSearch(companyId: string, user: JwtAccessPayload, productId?: string, q?: string) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)

    const search = q?.trim()
    if (!productId && !search) {
      throw new BadRequestException('Indique un producto o un término de búsqueda')
    }

    const products = await db.service.findMany({
      where: {
        tenantId,
        companyId,
        trackStock: true,
        isActive: true,
        ...(productId ? { id: productId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, sku: true },
      orderBy: { name: 'asc' },
      take: 20,
    })
    if (products.length === 0) return []

    const productIds = products.map((p) => p.id)
    const inventories = await db.branchInventory.findMany({
      where: { tenantId, companyId, productId: { in: productIds } },
      select: {
        productId: true,
        stock: true,
        branch: { select: { id: true, name: true } },
      },
    })

    return products.map((p) => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      branches: inventories
        .filter((inv) => inv.productId === p.id)
        .map((inv) => ({
          branchId: inv.branch.id,
          branchName: inv.branch.name,
          stock: inv.stock,
        }))
        .sort((a, b) => b.stock - a.stock),
    }))
  }

  // ─── Transferencia entre sucursales ──────────────────────────────────────

  async transfer(dto: TransferStockDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)

    if (dto.fromBranchId === dto.toBranchId) {
      throw new BadRequestException('La sucursal origen y destino deben ser distintas')
    }

    // Validate both branches belong to company
    const [fromBranch, toBranch] = await Promise.all([
      db.branch.findFirst({ where: { id: dto.fromBranchId, tenantId, companyId: dto.companyId, isActive: true }, select: { id: true, name: true } }),
      db.branch.findFirst({ where: { id: dto.toBranchId,   tenantId, companyId: dto.companyId, isActive: true }, select: { id: true, name: true } }),
    ])
    if (!fromBranch) throw new BadRequestException('Sucursal origen no encontrada')
    if (!toBranch)   throw new BadRequestException('Sucursal destino no encontrada')

    // Branch users can only transfer OUT from their own branches
    assertBranchAccess(user, dto.fromBranchId)

    const product = await db.service.findFirst({
      where: { id: dto.productId, tenantId, companyId: dto.companyId, trackStock: true },
    })
    if (!product) throw new NotFoundException('Producto no encontrado o no maneja inventario')

    return db.$transaction(async (tx) => {
      // Get/init origin BranchInventory
      const initialStockFrom = await this.getInitialBranchStock(tx, tenantId, dto.companyId, product)
      const fromInv = await tx.branchInventory.upsert({
        where:  { tenantId_branchId_productId: { tenantId, branchId: dto.fromBranchId, productId: dto.productId } },
        update: {},
        create: { tenantId, companyId: dto.companyId, branchId: dto.fromBranchId, productId: dto.productId, stock: initialStockFrom, minStock: product.minStock },
        select: { id: true, stock: true },
      })

      const fromCurrent = Number(fromInv.stock)
      if (fromCurrent < dto.quantity) {
        throw new BadRequestException(`Stock insuficiente en ${fromBranch.name} (disponible: ${fromCurrent})`)
      }
      const fromNew = fromCurrent - dto.quantity

      // Get/init destination BranchInventory
      const toInv = await tx.branchInventory.upsert({
        where:  { tenantId_branchId_productId: { tenantId, branchId: dto.toBranchId, productId: dto.productId } },
        update: {},
        create: { tenantId, companyId: dto.companyId, branchId: dto.toBranchId, productId: dto.productId, stock: 0, minStock: product.minStock },
        select: { id: true, stock: true },
      })
      const toCurrent = Number(toInv.stock)
      const toNew = toCurrent + dto.quantity

      const reason = `Transferencia: ${fromBranch.name} → ${toBranch.name} — ${dto.reason}`

      // Update both inventories and create 2 movement records
      const [, , movOut, movIn] = await Promise.all([
        tx.branchInventory.update({ where: { id: fromInv.id }, data: { stock: new Decimal(fromNew) } }),
        tx.branchInventory.update({ where: { id: toInv.id   }, data: { stock: new Decimal(toNew)  } }),
        tx.inventoryMovement.create({
          data: {
            tenantId, companyId: dto.companyId, branchId: dto.fromBranchId, productId: dto.productId,
            userId: user.sub, type: 'TRANSFER',
            quantity: new Decimal(dto.quantity), quantityBefore: new Decimal(fromCurrent), quantityAfter: new Decimal(fromNew),
            reason,
          },
        }),
        tx.inventoryMovement.create({
          data: {
            tenantId, companyId: dto.companyId, branchId: dto.toBranchId, productId: dto.productId,
            userId: user.sub, type: 'TRANSFER',
            quantity: new Decimal(dto.quantity), quantityBefore: new Decimal(toCurrent), quantityAfter: new Decimal(toNew),
            reason,
          },
        }),
      ])

      // Sync global stock on Service
      await this.syncGlobalStock(tx, tenantId, dto.companyId, dto.productId, fromNew + toNew)

      return { ok: true, fromBranch: fromBranch.name, toBranch: toBranch.name, quantity: dto.quantity, movOut, movIn }
    })
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

    if (dto.type !== 'ADJUST' && dto.quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero')
    }

    if (dto.branchId) {
      const branch = await db.branch.findFirst({
        where: { id: dto.branchId, tenantId, companyId: dto.companyId, isActive: true },
        select: { id: true },
      })
      if (!branch) throw new BadRequestException('Sucursal no pertenece a esta empresa')

      return db.$transaction(async (tx) => {
        const initialStock = await this.getInitialBranchStock(tx, tenantId, dto.companyId, product)
        const branchStock = await tx.branchInventory.upsert({
          where: {
            tenantId_branchId_productId: {
              tenantId,
              branchId: dto.branchId!,
              productId: dto.productId,
            },
          },
          update: {},
          create: {
            tenantId,
            companyId: dto.companyId,
            branchId: dto.branchId!,
            productId: dto.productId,
            stock: initialStock,
            minStock: product.minStock,
          },
          select: { id: true, stock: true },
        })

        const currentStock = Number(branchStock.stock ?? 0)
        let newStock: number
        if (dto.type === 'IN') {
          newStock = currentStock + dto.quantity
        } else if (dto.type === 'OUT') {
          newStock = currentStock - dto.quantity
          if (newStock < 0) throw new BadRequestException('Stock insuficiente para la salida')
        } else {
          newStock = dto.quantity
        }

        const quantityForMovement = dto.type === 'ADJUST'
          ? Math.abs(newStock - currentStock)
          : dto.quantity

        const updateResult = await tx.branchInventory.updateMany({
          where: { id: branchStock.id, ...(dto.type === 'OUT' ? { stock: { gte: dto.quantity } } : {}) },
          data: { stock: newStock },
        })
        if (updateResult.count === 0) throw new BadRequestException('Stock insuficiente para la salida')

        const movement = await tx.inventoryMovement.create({
          data: {
            tenantId,
            companyId:      dto.companyId,
            branchId:       dto.branchId,
            productId:      dto.productId,
            userId:         user.sub,
            type:           dto.type,
            quantity:       new Decimal(quantityForMovement),
            quantityBefore: new Decimal(currentStock),
            quantityAfter:  new Decimal(newStock),
            unitCost:       dto.unitCost != null ? new Decimal(dto.unitCost) : null,
            reference:      dto.reference,
            reason:         dto.reason,
          },
          include: {
            product: { select: { id: true, name: true, sku: true } },
            user:    { select: { id: true, name: true } },
            branch:  { select: { id: true, name: true } },
          },
        })

        await this.syncGlobalStock(tx, tenantId, dto.companyId, dto.productId, newStock)
        return movement
      })
    }

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
          reference:      dto.reference,
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

import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { Decimal } from '@prisma/client/runtime/library'
import type { JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

export const CreateProductSchema = z.object({
  companyId:   z.string().cuid(),
  categoryId:  z.string().cuid().optional().nullable(),
  name:        z.string().min(2),
  description: z.string().optional().nullable(),
  sku:         z.string().optional().nullable(),
  barcode:     z.string().optional().nullable(),
  price:       z.number().positive(),
  cost:        z.number().nonnegative().optional().default(0),
  // Precios adicionales
  priceWholesale:    z.number().min(0).optional().nullable(),
  priceDistribution: z.number().min(0).optional().nullable(),
  priceSpecial:      z.number().min(0).optional().nullable(),
  commissionAmount:  z.number().min(0).optional().nullable(),
  imageUrl:    z.string().url().optional().nullable(),
  emoji:       z.string().max(10).optional().nullable(),
  // DTE fields
  tipoItem:  z.enum(['1', '2', '3', '4']).default('2'),
  uniMedida: z.number().int().default(59),
  // Stock
  trackStock: z.boolean().default(false),
  stock:      z.number().nonnegative().optional().default(0),
  minStock:   z.number().nonnegative().optional().default(0),
  // Units / Fractions
  purchaseUnit:     z.string().max(50).optional().nullable(),
  saleUnitId:       z.string().cuid().optional().nullable(),
  conversionFactor: z.number().positive().optional().default(1),
})

export const UpdateProductSchema = CreateProductSchema.partial().omit({ companyId: true })

export const AdjustStockSchema = z.object({
  quantity: z.number().int(),
  reason: z.string().min(3),
})

export type CreateProductDto = z.infer<typeof CreateProductSchema>
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>

@Injectable()
export class ProductsService {
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

  async findAll(
    companyId: string,
    user: JwtAccessPayload,
    search?: string,
    categoryId?: string,
    lowStock?: boolean,
    branchId?: string,
    page = 1,
    limit = 50,
    trackStockOnly?: boolean,
  ) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, companyId)
    this.assertBranchAccess(user, branchId)

    const where = {
      tenantId,
      companyId,
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(trackStockOnly ? { trackStock: true } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
          { barcode: { contains: search } },
        ],
      } : {}),
      ...(!branchId && lowStock ? { trackStock: true } : {}),
    }

    const include = {
      category: { select: { id: true, name: true, color: true } },
      saleUnit:  { select: { id: true, name: true, symbol: true } },
      ...(branchId ? {
        branchInventories: {
          where: { tenantId, branchId },
          select: { stock: true, minStock: true },
          take: 1,
        },
      } : {}),
    }

    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      db.service.findMany({ where, include, orderBy: { name: 'asc' }, skip, take: limit }),
      db.service.count({ where }),
    ])

    const mapped = branchId
      ? (products as any[]).map(({ branchInventories, ...p }) => ({
          ...p,
          stock:    branchInventories?.[0]?.stock    ?? p.stock,
          minStock: branchInventories?.[0]?.minStock ?? p.minStock,
        }))
      : products

    const filtered = lowStock
      ? (mapped as any[]).filter(p => p.trackStock && Number(p.stock ?? 0) <= Number(p.minStock ?? 0))
      : mapped

    return { data: filtered, total, page, limit }
  }

  async findOne(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const product = await db.service.findFirst({
      where:   { id, tenantId, companyId: user.companyId },
      include: { category: true, saleUnit: true },
    })
    if (!product) throw new NotFoundException('Producto/servicio no encontrado')
    return product
  }

  async create(dto: CreateProductDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    this.assertCompanyAccess(user, dto.companyId)

    if (dto.sku) {
      const exists = await db.service.findFirst({ where: { tenantId, companyId: dto.companyId, sku: dto.sku } })
      if (exists) throw new ConflictException('Ya existe un producto con ese SKU')
    }
    if (dto.barcode) {
      const exists = await db.service.findFirst({ where: { tenantId, companyId: dto.companyId, barcode: dto.barcode } })
      if (exists) throw new ConflictException('Ya existe un producto con ese código de barras')
    }

    return db.service.create({
      data: {
        ...dto,
        tenantId,
        price:             new Decimal(dto.price),
        cost:              new Decimal(dto.cost ?? 0),
        priceWholesale:    dto.priceWholesale    != null ? new Decimal(dto.priceWholesale)    : null,
        priceDistribution: dto.priceDistribution != null ? new Decimal(dto.priceDistribution) : null,
        priceSpecial:      dto.priceSpecial      != null ? new Decimal(dto.priceSpecial)      : null,
        commissionAmount:  dto.commissionAmount  != null ? new Decimal(dto.commissionAmount)  : null,
      },
    })
  }

  async update(id: string, dto: UpdateProductDto, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const product = await db.service.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!product) throw new NotFoundException('Producto/servicio no encontrado')

    const { price, cost, priceWholesale, priceDistribution, priceSpecial, commissionAmount, ...rest } = dto
    return db.service.update({
      where: { id },
      data: {
        ...rest,
        ...(price             !== undefined ? { price:             new Decimal(price)                                                          } : {}),
        ...(cost              !== undefined ? { cost:              new Decimal(cost ?? 0)                                                       } : {}),
        ...(priceWholesale    !== undefined ? { priceWholesale:    priceWholesale    != null ? new Decimal(priceWholesale)    : null } : {}),
        ...(priceDistribution !== undefined ? { priceDistribution: priceDistribution != null ? new Decimal(priceDistribution) : null } : {}),
        ...(priceSpecial      !== undefined ? { priceSpecial:      priceSpecial      != null ? new Decimal(priceSpecial)      : null } : {}),
        ...(commissionAmount  !== undefined ? { commissionAmount:  commissionAmount  != null ? new Decimal(commissionAmount)  : null } : {}),
      },
    })
  }

  async adjustStock(id: string, quantity: number, reason: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const product = await db.service.findFirst({ where: { id, tenantId, companyId: user.companyId } })
    if (!product) throw new NotFoundException('Producto no encontrado')
    if (!product.trackStock) throw new BadRequestException('Este producto no lleva control de inventario')

    const newStock = Number(product.stock ?? 0) + quantity
    if (newStock < 0) throw new BadRequestException('Stock insuficiente')

    return db.service.update({ where: { id }, data: { stock: newStock } })
  }

  async remove(id: string, user: JwtAccessPayload) {
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()
    const product = await db.service.findFirst({
      where: { id, tenantId, companyId: user.companyId },
      select: {
        id: true,
        _count: { select: { saleItems: true, purchaseOrderItems: true, inventoryMovements: true } },
      },
    })
    if (!product) throw new NotFoundException('Producto/servicio no encontrado')

    if ((product as any)._count.saleItems > 0)
      throw new ConflictException('El producto tiene ventas registradas y no puede eliminarse.')
    if ((product as any)._count.purchaseOrderItems > 0)
      throw new ConflictException('El producto tiene órdenes de compra y no puede eliminarse.')
    if ((product as any)._count.inventoryMovements > 0)
      throw new ConflictException('El producto tiene movimientos de inventario y no puede eliminarse.')

    await db.service.update({ where: { id }, data: { isActive: false } })
    return { ok: true }
  }
}

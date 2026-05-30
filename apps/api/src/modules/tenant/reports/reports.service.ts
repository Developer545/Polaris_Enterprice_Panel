/**
 * ReportsService
 * Generates xlsx workbooks for Sales and Inventory reports using ExcelJS.
 */
import { Injectable, ForbiddenException } from '@nestjs/common'
import ExcelJS from 'exceljs'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getCurrentTenant } from '../tenant-resolver/tenant.context'
import { buildBranchWhere } from '../../../common/branch-scope.util'
import type { JwtAccessPayload } from '@pos-dte/shared-types'

// ─── Style helpers ────────────────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' },
}
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 }
const ALT_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFC' } }
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
}

function applyHeaderRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = BORDER
  })
  row.height = 22
}

function styleDataRow(row: ExcelJS.Row, isAlt: boolean) {
  row.eachCell({ includeEmpty: true }, cell => {
    if (isAlt) cell.fill = ALT_FILL
    cell.border = BORDER
    cell.font = { size: 9 }
  })
  row.height = 16
}

function numFmt(col: ExcelJS.Column) {
  col.numFmt = '"$"#,##0.00'
  col.alignment = { horizontal: 'right' }
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ReportsService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    const { dbUrl } = getCurrentTenant()
    return this.clientFactory.getClient(dbUrl)
  }

  private assertCompanyAccess(user: JwtAccessPayload, companyId: string) {
    if (user.companyId !== companyId) throw new ForbiddenException('Empresa no autorizada')
  }

  // ─── Sales report ────────────────────────────────────────────────────────

  async salesXlsx(
    companyId: string,
    user: JwtAccessPayload,
    from?: string,
    to?: string,
    branchId?: string,
  ): Promise<Buffer> {
    this.assertCompanyAccess(user, companyId)
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const where: any = {
      tenantId,
      companyId,
      ...buildBranchWhere(user, branchId),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    }

    const sales: any[] = await db.sale.findMany({
      where,
      include: {
        client:      { select: { name: true, numDocumento: true, nrc: true } },
        branch:      { select: { name: true } },
        dteDocument: { select: { tipoDte: true, numeroControl: true, selloRecibido: true, status: true } },
        payments:    { select: { formaPago: true, amount: true } },
        items: {
          include: { product: { select: { name: true, sku: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    })

    const PAGO: Record<string, string> = {
      '01': 'Efectivo', '02': 'T.Débito', '03': 'T.Crédito',
      '04': 'Cheque', '05': 'Transferencia', '08': 'D.Electrónico',
      '09': 'Monedero', '11': 'Bitcoin', '12': 'Cripto',
      '13': 'CxP', '14': 'Giro', '99': 'Otros',
    }
    const TIPO: Record<string, string> = {
      '01': 'CF', '03': 'CCF', '05': 'NC', '06': 'ND',
    }
    const STATUS: Record<string, string> = {
      ACCEPTED: 'Aceptado', REJECTED: 'Rechazado', PENDING: 'Pendiente',
      CONTINGENCY: 'Contingencia', ANNULLED: 'Anulado', ERROR: 'Error', QUEUED: 'En cola',
    }

    const wb = new ExcelJS.Workbook()
    wb.creator = 'POS DTE El Salvador'
    wb.created = new Date()

    // ── Sheet 1: Sales summary ──────────────────────────────────────────────
    const ws = wb.addWorksheet('Ventas', { views: [{ state: 'frozen', ySplit: 1 }] })

    ws.columns = [
      { header: 'Fecha', key: 'fecha', width: 18 },
      { header: 'N° Venta', key: 'venta', width: 14 },
      { header: 'Tipo DTE', key: 'tipo', width: 10 },
      { header: 'Nº Control', key: 'control', width: 26 },
      { header: 'Estado DTE', key: 'status', width: 14 },
      { header: 'Sucursal', key: 'sucursal', width: 18 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Documento', key: 'doc', width: 16 },
      { header: 'Forma Pago', key: 'pago', width: 18 },
      { header: 'Grav.', key: 'grav', width: 12 },
      { header: 'IVA', key: 'iva', width: 10 },
      { header: 'Total', key: 'total', width: 12 },
    ]

    applyHeaderRow(ws.getRow(1))
    numFmt(ws.getColumn('grav'))
    numFmt(ws.getColumn('iva'))
    numFmt(ws.getColumn('total'))

    let ri = 2
    for (const s of sales) {
      const pagoLabels = s.payments.map((p: any) => PAGO[p.formaPago] ?? p.formaPago).join(', ')
      const svDate = new Intl.DateTimeFormat('es-SV', {
        timeZone: 'America/El_Salvador',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(s.createdAt)

      const row = ws.addRow({
        fecha:    svDate,
        venta:    s.saleNumber ?? s.id.slice(-8),
        tipo:     TIPO[s.dteDocument?.tipoDte ?? '01'] ?? '—',
        control:  s.dteDocument?.numeroControl ?? '—',
        status:   STATUS[s.dteDocument?.status ?? ''] ?? '—',
        sucursal: s.branch?.name ?? '—',
        cliente:  s.client?.name ?? 'Consumidor Final',
        doc:      s.client?.numDocumento ?? '—',
        pago:     pagoLabels,
        grav:     Number(s.totalGravada ?? 0),
        iva:      Number(s.totalIva ?? 0),
        total:    Number(s.totalPagar ?? 0),
      })
      styleDataRow(row, ri % 2 === 0)
      ri++
    }

    // Totals row
    if (sales.length > 0) {
      const totRow = ws.addRow({
        fecha: 'TOTAL',
        venta: '', tipo: '', control: '', status: '', sucursal: '', cliente: '', doc: '', pago: '',
        grav:  sales.reduce((s, r) => s + Number(r.totalGravada ?? 0), 0),
        iva:   sales.reduce((s, r) => s + Number(r.totalIva  ?? 0), 0),
        total: sales.reduce((s, r) => s + Number(r.totalPagar ?? 0), 0),
      })
      totRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B6CB0' } }
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.border = BORDER
      })
      totRow.height = 20
    }

    // ── Sheet 2: Sale items ─────────────────────────────────────────────────
    const ws2 = wb.addWorksheet('Detalle Ítems', { views: [{ state: 'frozen', ySplit: 1 }] })
    ws2.columns = [
      { header: 'Fecha', key: 'fecha', width: 18 },
      { header: 'Nº Control', key: 'control', width: 26 },
      { header: 'Tipo', key: 'tipo', width: 8 },
      { header: 'Cliente', key: 'cliente', width: 24 },
      { header: 'Sucursal', key: 'sucursal', width: 16 },
      { header: 'SKU', key: 'sku', width: 12 },
      { header: 'Producto', key: 'producto', width: 32 },
      { header: 'Cantidad', key: 'qty', width: 10 },
      { header: 'P. Unitario', key: 'puni', width: 12 },
      { header: 'Descuento', key: 'desc', width: 12 },
      { header: 'Grav.', key: 'grav', width: 12 },
      { header: 'IVA Ítem', key: 'iva', width: 11 },
    ]
    applyHeaderRow(ws2.getRow(1))
    numFmt(ws2.getColumn('puni'))
    numFmt(ws2.getColumn('desc'))
    numFmt(ws2.getColumn('grav'))
    numFmt(ws2.getColumn('iva'))

    let ri2 = 2
    for (const s of sales) {
      const svDate = new Intl.DateTimeFormat('es-SV', {
        timeZone: 'America/El_Salvador',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(s.createdAt)

      for (const it of s.items) {
        const row = ws2.addRow({
          fecha:    svDate,
          control:  s.dteDocument?.numeroControl ?? '—',
          tipo:     TIPO[s.dteDocument?.tipoDte ?? '01'] ?? '—',
          cliente:  s.client?.name ?? 'CF',
          sucursal: s.branch?.name ?? '—',
          sku:      it.product?.sku ?? '—',
          producto: it.product?.name ?? '—',
          qty:      Number(it.quantity),
          puni:     Number(it.unitPrice ?? 0),
          desc:     Number(it.discount ?? 0),
          grav:     Number(it.ventaGravada ?? 0),
          iva:      Number(it.ivaItem ?? 0),
        })
        styleDataRow(row, ri2 % 2 === 0)
        ri2++
      }
    }

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>
  }

  // ─── Inventory report ─────────────────────────────────────────────────────

  async inventoryXlsx(
    companyId: string,
    user: JwtAccessPayload,
    branchId?: string,
  ): Promise<Buffer> {
    this.assertCompanyAccess(user, companyId)
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const branchScope = buildBranchWhere(user, branchId)

    // Get all active products with their branch inventories
    const products = await db.service.findMany({
      where: { tenantId, companyId, isActive: true, trackStock: true },
      include: {
        category: { select: { name: true } },
        branchInventories: {
          where: {
            tenantId,
            companyId,
            ...(branchId ? { branchId } : {}),
          },
          include: { branch: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    })

    const wb = new ExcelJS.Workbook()
    wb.creator = 'POS DTE El Salvador'
    wb.created = new Date()

    // ── Sheet 1: Stock por sucursal ─────────────────────────────────────────
    const ws = wb.addWorksheet('Stock por Sucursal', { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.columns = [
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Producto', key: 'nombre', width: 36 },
      { header: 'Categoría', key: 'cat', width: 18 },
      { header: 'Sucursal', key: 'sucursal', width: 20 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Stock Mínimo', key: 'min', width: 14 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Costo Unit.', key: 'costo', width: 12 },
      { header: 'Valor Stock', key: 'valor', width: 14 },
    ]
    applyHeaderRow(ws.getRow(1))
    numFmt(ws.getColumn('costo'))
    numFmt(ws.getColumn('valor'))

    let ri = 2
    for (const p of products) {
      const invs = p.branchInventories.length > 0
        ? p.branchInventories
        : [{ branch: { name: 'Global' }, stock: p.stock, minStock: p.minStock }]

      for (const inv of invs) {
        const stock = Number((inv as any).stock ?? 0)
        const minSt = Number((inv as any).minStock ?? 0)
        const costo = Number(p.cost ?? 0)
        const row = ws.addRow({
          sku:      p.sku ?? '—',
          nombre:   p.name,
          cat:      p.category?.name ?? 'Sin categoría',
          sucursal: (inv as any).branch?.name ?? '—',
          stock,
          min:      minSt,
          estado:   stock <= 0 ? 'Sin stock' : stock <= minSt ? 'Stock bajo' : 'OK',
          costo,
          valor:    stock * costo,
        })

        // Color-code estado cell
        const estadoCell = row.getCell('estado')
        if (stock <= 0) {
          estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } }
          estadoCell.font = { color: { argb: 'FFCC0000' }, bold: true, size: 9 }
        } else if (stock <= minSt) {
          estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }
          estadoCell.font = { color: { argb: 'FF856404' }, bold: true, size: 9 }
        } else {
          estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }
          estadoCell.font = { color: { argb: 'FF155724' }, bold: true, size: 9 }
        }

        styleDataRow(row, ri % 2 === 0)
        // Restore estado cell styling (styleDataRow overwrites fill)
        if (stock <= 0) {
          estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } }
        } else if (stock <= minSt) {
          estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }
        } else {
          estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }
        }

        ri++
      }
    }

    // ── Sheet 2: Consolidated (one row per product, global stock) ───────────
    const ws2 = wb.addWorksheet('Consolidado', { views: [{ state: 'frozen', ySplit: 1 }] })
    ws2.columns = [
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Producto', key: 'nombre', width: 36 },
      { header: 'Categoría', key: 'cat', width: 18 },
      { header: 'Stock Global', key: 'stock', width: 14 },
      { header: 'Stock Mínimo', key: 'min', width: 14 },
      { header: 'Precio Venta', key: 'precio', width: 14 },
      { header: 'Costo Unit.', key: 'costo', width: 12 },
      { header: 'Valor Inventario', key: 'valor', width: 16 },
    ]
    applyHeaderRow(ws2.getRow(1))
    numFmt(ws2.getColumn('precio'))
    numFmt(ws2.getColumn('costo'))
    numFmt(ws2.getColumn('valor'))

    let ri2 = 2
    let totalValor = 0
    for (const p of products) {
      const stock = Number(p.stock ?? 0)
      const costo = Number(p.cost ?? 0)
      const valor = stock * costo
      totalValor += valor
      const row = ws2.addRow({
        sku:    p.sku ?? '—',
        nombre: p.name,
        cat:    p.category?.name ?? 'Sin categoría',
        stock,
        min:    Number(p.minStock ?? 0),
        precio: Number(p.price ?? 0),
        costo,
        valor,
      })
      styleDataRow(row, ri2 % 2 === 0)
      ri2++
    }

    // Total row
    const totRow = ws2.addRow({
      sku: 'TOTAL', nombre: '', cat: '', stock: '', min: '', precio: '', costo: '',
      valor: totalValor,
    })
    totRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B6CB0' } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.border = BORDER
    })
    totRow.height = 20

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>
  }

  // ─── Expenses report ──────────────────────────────────────────────────────

  async expensesXlsx(
    companyId: string,
    user: JwtAccessPayload,
    from?: string,
    to?: string,
    branchId?: string,
  ): Promise<Buffer> {
    this.assertCompanyAccess(user, companyId)
    const { tenantId } = getCurrentTenant()
    const db = this.getDb()

    const expenses = await db.expense.findMany({
      where: {
        tenantId,
        companyId,
        ...buildBranchWhere(user, branchId),
        ...(from || to
          ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
      },
      include: {
        category: { select: { name: true } },
        branch:   { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 10_000,
    })

    const wb = new ExcelJS.Workbook()
    wb.creator = 'POS DTE El Salvador'
    wb.created = new Date()

    const ws = wb.addWorksheet('Gastos', { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.columns = [
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Sucursal', key: 'sucursal', width: 18 },
      { header: 'Categoría', key: 'cat', width: 20 },
      { header: 'Descripción', key: 'desc', width: 36 },
      { header: 'Monto', key: 'monto', width: 14 },
      { header: 'Forma Pago', key: 'pago', width: 16 },
      { header: 'Comprobante', key: 'comp', width: 20 },
    ]
    applyHeaderRow(ws.getRow(1))
    numFmt(ws.getColumn('monto'))

    let ri = 2
    for (const e of expenses) {
      const svDate = new Intl.DateTimeFormat('es-SV', {
        timeZone: 'America/El_Salvador',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(e.date))

      const row = ws.addRow({
        fecha:    svDate,
        sucursal: (e as any).branch?.name ?? '—',
        cat:      e.category?.name ?? '—',
        desc:     e.description,
        monto:    Number(e.amount),
        pago:     (e as any).paymentMethod ?? '—',
        comp:     (e as any).invoiceNumber ?? '—',
      })
      styleDataRow(row, ri % 2 === 0)
      ri++
    }

    if (expenses.length > 0) {
      const totRow = ws.addRow({
        fecha: 'TOTAL', sucursal: '', cat: '', desc: '',
        monto: expenses.reduce((s, e) => s + Number(e.amount), 0),
        pago: '', comp: '',
      })
      totRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B6CB0' } }
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.border = BORDER
      })
      totRow.height = 20
    }

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>
  }
}

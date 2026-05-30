'use client'

// ══════════════════════════════════════════════════════════════════════════════
// INVENTARIO — Tab: Stock por sucursal + Kardex general
// KPIs | Tabla productos con stock | Drawer kardex | Modal ajuste | Modal transferencia
// Scanner de código de barras integrado para búsqueda rápida de producto
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useRef } from 'react'
import {
  Table, Button, Tag, Typography, Modal, Form, Select, InputNumber, Input,
  App, Row, Col, Statistic, Card, Space, Tabs, Badge, Tooltip, theme,
  DatePicker, Progress, Drawer, Popconfirm, Alert,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, WarningOutlined, ArrowUpOutlined,
  ArrowDownOutlined, SlidersOutlined, DollarOutlined,
  FilterOutlined, HistoryOutlined, EditOutlined,
  SearchOutlined, ShoppingOutlined, SwapOutlined, InboxOutlined,
  BarcodeOutlined, SendOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import { useBarcodeScanner } from '../../../hooks/use-barcode-scanner'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography
const { RangePicker } = DatePicker

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase() || '?'
}

const AVATAR_COLORS = [
  '#f47920', '#1677ff', '#52c41a', '#722ed1', '#eb2f96',
  '#13c2c2', '#fa8c16', '#2f54eb',
]
function avatarBg(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function stockPercent(actual: number, minimo: number): number {
  if (minimo <= 0) return actual > 0 ? 100 : 0
  return Math.min(100, Math.round((actual / (minimo * 2)) * 100))
}

function stockStatus(actual: number, minimo: number): 'success' | 'exception' | 'normal' {
  if (actual <= 0) return 'exception'
  if (actual <= minimo) return 'exception'
  if (actual <= minimo * 1.2) return 'normal'
  return 'success'
}

// ── Movement config ───────────────────────────────────────────────────────────

const MOV_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  IN:       { label: 'Entrada',      color: 'success', icon: <ArrowUpOutlined />   },
  OUT:      { label: 'Salida',       color: 'error',   icon: <ArrowDownOutlined /> },
  ADJUST:   { label: 'Ajuste',       color: 'warning', icon: <SlidersOutlined />   },
  TRANSFER: { label: 'Transferencia', color: 'blue',   icon: <SwapOutlined />      },
}

const AJUSTE_OPTIONS = [
  { value: 'IN',     label: '↑ Entrada — agregar stock'  },
  { value: 'OUT',    label: '↓ Salida — retirar stock'   },
  { value: 'ADJUST', label: '⟳ Ajuste — stock absoluto'  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const { companyId, branchId } = useAppContext()

  const primary = token.colorPrimary

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'productos' | 'kardex'>('productos')

  // ── Products tab filters ───────────────────────────────────────────────────
  const [search, setSearch]               = useState('')
  const [filterCat, setFilterCat]         = useState<string | undefined>()
  const [soloStockBajo, setSoloStockBajo] = useState(false)

  // ── Kardex tab filters ─────────────────────────────────────────────────────
  const [filterType, setFilterType]       = useState<string | undefined>()
  const [filterProduct, setFilterProduct] = useState<string | undefined>()
  const [dateRange, setDateRange]         = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  // ── Kardex drawer (per-product) ────────────────────────────────────────────
  const [kardexDrawerOpen, setKardexDrawerOpen] = useState(false)
  const [kardexProduct, setKardexProduct]       = useState<any>(null)

  // ── Adjust modal ───────────────────────────────────────────────────────────
  const [adjustModal, setAdjustModal]   = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<any>(null)
  const [adjustForm] = Form.useForm()
  const movType = Form.useWatch('type', adjustForm)

  // ── Transfer modal ─────────────────────────────────────────────────────────
  const [transferModal, setTransferModal] = useState(false)
  const [transferForm]                    = Form.useForm()

  // ── Edit modal ─────────────────────────────────────────────────────────────
  const [editModal, setEditModal]   = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editForm] = Form.useForm()

  // ── Barcode scanner state ──────────────────────────────────────────────────
  const [scannerActive, setScannerActive] = useState(false)
  const searchInputRef = useRef<any>(null)

  // ── Queries ────────────────────────────────────────────────────────────────
  const statsQ = useQuery({
    queryKey: ['inventory-stats', companyId, branchId],
    queryFn:  () => api.get('/api/inventory/stats', { params: { companyId, branchId } }).then(r => r.data),
    enabled:  !!companyId,
  })

  // Products query: fetch all (large limit), server returns { data, total, page, limit }
  const productsQ = useQuery<any[]>({
    queryKey: ['products', companyId, branchId, 'inventory'],
    queryFn:  () => api.get('/api/products', { params: { companyId, branchId, limit: 500 } }).then(r => r.data?.data ?? r.data),
    enabled:  !!companyId,
  })

  const categoriesQ = useQuery<any[]>({
    queryKey: ['categories', companyId],
    queryFn:  () => api.get('/api/categories', { params: { companyId } }).then(r => r.data),
    enabled:  !!companyId,
  })

  // Branches (for transfer modal)
  const branchesQ = useQuery<any[]>({
    queryKey: ['branches', companyId],
    queryFn:  () => api.get('/api/branches', { params: { companyId } }).then(r => r.data),
    enabled:  !!companyId,
  })

  const movParams: Record<string, string> = { companyId: companyId! }
  if (branchId)      movParams.branchId  = branchId
  if (filterType)    movParams.type      = filterType
  if (filterProduct) movParams.productId = filterProduct
  if (dateRange) {
    movParams.from = dateRange[0].startOf('day').toISOString()
    movParams.to   = dateRange[1].endOf('day').toISOString()
  }
  const movQ = useQuery({
    queryKey: ['inventory-movements', companyId, branchId, filterType, filterProduct,
      dateRange?.[0]?.toString(), dateRange?.[1]?.toString()],
    queryFn:  () => api.get('/api/inventory', { params: movParams }).then(r => r.data),
    enabled:  !!companyId,
  })

  // Per-product kardex
  const kardexQ = useQuery({
    queryKey: ['inventory-kardex', companyId, branchId, kardexProduct?.id],
    queryFn:  () => api.get('/api/inventory', {
      params: { companyId, branchId, productId: kardexProduct!.id },
    }).then(r => r.data),
    enabled:  !!companyId && !!kardexProduct && kardexDrawerOpen,
  })

  // ── Barcode scanner integration ────────────────────────────────────────────
  useBarcodeScanner({
    enabled: scannerActive && adjustModal,
    minLength: 3,
    maxInterval: 60,
    ignoreWhenFocusIn: ['INPUT:not([data-scanner-target])', 'TEXTAREA'],
    onScan: (barcode) => {
      const allProducts = productsQ.data ?? []
      const found = allProducts.find(
        (p: any) => p.barcode === barcode || p.sku === barcode,
      )
      if (found) {
        adjustForm.setFieldValue('productId', found.id)
        setAdjustTarget(found)
        message.success(`Producto: ${found.name}`)
      } else {
        message.warning(`Código no encontrado: ${barcode}`)
      }
    },
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const adjustMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/inventory/adjust', { ...values, companyId, branchId }),
    onSuccess: () => {
      message.success('Movimiento registrado')
      qc.invalidateQueries({ queryKey: ['inventory-movements'] })
      qc.invalidateQueries({ queryKey: ['inventory-stats'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory-kardex'] })
      setAdjustModal(false)
      adjustForm.resetFields()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al registrar'),
  })

  const transferMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/inventory/transfer', { ...values, companyId }),
    onSuccess: (data: any) => {
      message.success(`Transferencia realizada: ${data.quantity} unidades de ${data.fromBranch} → ${data.toBranch}`)
      qc.invalidateQueries({ queryKey: ['inventory-movements'] })
      qc.invalidateQueries({ queryKey: ['inventory-stats'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setTransferModal(false)
      transferForm.resetFields()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error en transferencia'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/api/products/${id}`, data).then(r => r.data),
    onSuccess: () => {
      message.success('Producto actualizado')
      qc.invalidateQueries({ queryKey: ['products'] })
      setEditModal(false)
      editForm.resetFields()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al actualizar'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => {
      message.success('Producto desactivado')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory-stats'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al desactivar'),
  })

  // ── Computed ───────────────────────────────────────────────────────────────
  const stats       = statsQ.data ?? {}
  const allProducts = productsQ.data ?? []
  const categories  = categoriesQ.data ?? []
  const branches    = branchesQ.data ?? []
  const movements   = movQ.data?.data ?? movQ.data ?? []
  const kardexItems = kardexQ.data?.data ?? kardexQ.data ?? []

  // Inventory tab: only products with trackStock
  const stockProducts = useMemo(() => {
    let list = allProducts.filter((p: any) => p.trackStock)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p: any) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.barcode ?? '').includes(q)
      )
    }
    if (filterCat) list = list.filter((p: any) => p.categoryId === filterCat)
    if (soloStockBajo) list = list.filter((p: any) => Number(p.stock ?? 0) <= Number(p.minStock ?? 0))
    return list
  }, [allProducts, search, filterCat, soloStockBajo])

  const stockBajoCount = allProducts.filter(
    (p: any) => p.trackStock && Number(p.stock ?? 0) <= Number(p.minStock ?? 0)
  ).length

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openKardex(product: any) {
    setKardexProduct(product)
    setKardexDrawerOpen(true)
  }

  function openAdjust(product?: any) {
    setAdjustTarget(product ?? null)
    adjustForm.resetFields()
    if (product) {
      adjustForm.setFieldsValue({
        productId: product.id,
        type: 'IN',
        unitCost: Number(product.cost ?? 0) > 0 ? Number(product.cost) : undefined,
      })
    } else {
      adjustForm.setFieldsValue({ type: 'IN' })
    }
    setScannerActive(true)
    setAdjustModal(true)
  }

  function openTransfer() {
    transferForm.resetFields()
    if (branchId) transferForm.setFieldValue('fromBranchId', branchId)
    setTransferModal(true)
  }

  function openEdit(product: any) {
    setEditTarget(product)
    editForm.setFieldsValue({
      name:        product.name,
      description: product.description ?? '',
      categoryId:  product.categoryId ?? undefined,
      price:       Number(product.price),
      cost:        Number(product.cost ?? 0),
      minStock:    Number(product.minStock ?? 0),
    })
    setEditModal(true)
  }

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['inventory-movements'] })
    qc.invalidateQueries({ queryKey: ['inventory-stats'] })
    qc.invalidateQueries({ queryKey: ['products'] })
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = [
    {
      title:  'Productos en stock',
      value:  stats.totalProductos ?? allProducts.filter((p: any) => p.trackStock).length,
      color:  primary,
      icon:   <ShoppingOutlined />,
    },
    {
      title:  'Stock bajo mínimo',
      value:  stats.itemsBajoMinimo ?? stockBajoCount,
      color:  stockBajoCount > 0 ? token.colorError : token.colorTextDisabled,
      icon:   <WarningOutlined />,
    },
    {
      title:  'Valor en stock',
      value:  `$${Number(stats.valorStock ?? 0).toFixed(2)}`,
      color:  '#52c41a',
      icon:   <DollarOutlined />,
    },
    {
      title:  'Movimientos hoy',
      value:  stats.movementsToday ?? 0,
      color:  token.colorWarning,
      icon:   <SlidersOutlined />,
    },
  ]

  // ── Columns — Products tab ─────────────────────────────────────────────────
  const productCols: ColumnsType<any> = [
    {
      key: 'producto', title: 'Producto',
      render: (_: any, r: any) => {
        const bg = Number(r.stock ?? 0) <= Number(r.minStock ?? 0)
          ? '#fff1f0' : `${avatarBg(r.name)}22`
        const fg = Number(r.stock ?? 0) <= Number(r.minStock ?? 0)
          ? '#cf1322' : avatarBg(r.name)
        const fraccionable = Number(r.conversionFactor ?? 1) > 1
        return (
          <Space size={10}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: bg, color: fg,
              border: `1px solid ${fg}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {getInitials(r.name)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, lineHeight: '18px' }}>{r.name}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                {r.category && (
                  <Tag color={r.category.color ?? undefined} style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>
                    {r.category.name}
                  </Tag>
                )}
                {fraccionable && (
                  <Tag color="cyan" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>Fraccionable</Tag>
                )}
                {r.sku && (
                  <code style={{ fontSize: 10, background: token.colorFillSecondary, padding: '1px 4px', borderRadius: 3 }}>
                    {r.sku}
                  </code>
                )}
                {r.barcode && (
                  <code style={{ fontSize: 10, background: token.colorFillSecondary, padding: '1px 4px', borderRadius: 3, color: token.colorTextSecondary }}>
                    <BarcodeOutlined style={{ marginRight: 2 }} />{r.barcode}
                  </code>
                )}
              </div>
            </div>
          </Space>
        )
      },
    },
    {
      key: 'stock', title: 'Stock', width: 190,
      render: (_: any, r: any) => {
        const stock  = Number(r.stock ?? 0)
        const min    = Number(r.minStock ?? 0)
        const pct    = stockPercent(stock, min)
        const status = stockStatus(stock, min)
        const factor = Number(r.conversionFactor ?? 1)
        const unitLabel = r.saleUnit?.symbol ?? r.saleUnit?.name ?? ''
        const inCompra  = factor > 1 ? (stock / factor).toFixed(2) : null
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: 600, color: status === 'exception' ? '#cf1322' : primary }}>
                {stock % 1 === 0 ? stock.toFixed(0) : stock.toFixed(2)} {unitLabel}
              </Text>
              {status === 'exception' && (
                <Tooltip title={`Mínimo: ${min}`}>
                  <Tag color="error" style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>Bajo</Tag>
                </Tooltip>
              )}
            </div>
            <Progress
              percent={pct} status={status} size="small" showInfo={false}
              strokeColor={status === 'exception' ? '#ff4d4f' : status === 'normal' ? '#faad14' : primary}
              trailColor={token.colorFillSecondary}
            />
            <Text style={{ fontSize: 10, color: token.colorTextSecondary }}>
              Mín: {min % 1 === 0 ? min.toFixed(0) : min.toFixed(2)} {unitLabel}
              {inCompra && <span style={{ marginLeft: 6 }}>· {inCompra} {r.purchaseUnit}</span>}
            </Text>
          </div>
        )
      },
    },
    {
      key: 'costo', title: 'Costo prom.', width: 105, align: 'right' as const,
      responsive: ['md'] as any,
      render: (_: any, r: any) => (
        <Text style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          ${Number(r.cost ?? 0).toFixed(2)}
        </Text>
      ),
    },
    {
      key: 'precio', title: 'Precio venta', width: 115, align: 'right' as const,
      render: (_: any, r: any) => (
        <Text strong style={{ color: primary, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
          ${Number(r.price ?? 0).toFixed(2)}
        </Text>
      ),
    },
    {
      key: 'actions', title: 'Acciones', width: 160, fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Tooltip title="Editar min. stock">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Kardex / Movimientos">
            <Button size="small" icon={<HistoryOutlined />} onClick={() => openKardex(r)} />
          </Tooltip>
          <Tooltip title="Ajustar stock">
            <Button size="small" icon={<SwapOutlined />} onClick={() => openAdjust(r)} />
          </Tooltip>
          <Tooltip title="Transferir a otra sucursal">
            <Button size="small" icon={<SendOutlined />} onClick={() => {
              transferForm.resetFields()
              transferForm.setFieldsValue({
                productId:    r.id,
                fromBranchId: branchId || undefined,
              })
              setTransferModal(true)
            }} />
          </Tooltip>
          <Popconfirm
            title="¿Desactivar producto?"
            description="El producto quedará inactivo."
            onConfirm={() => deactivateMutation.mutate(r.id)}
            okText="Sí, desactivar" cancelText="Cancelar" okButtonProps={{ danger: true }}
          >
            <Tooltip title="Desactivar">
              <Button size="small" danger icon={<FilterOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ── Columns — Kardex general ───────────────────────────────────────────────
  const kardexCols: ColumnsType<any> = [
    {
      title: 'Fecha', dataIndex: 'createdAt', width: 140,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YY HH:mm')}</Text>,
    },
    {
      title: 'Producto', key: 'producto',
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{r.product?.name}</div>
          {r.product?.sku && (
            <code style={{ fontSize: 10, background: token.colorFillSecondary, padding: '1px 4px', borderRadius: 3 }}>
              {r.product.sku}
            </code>
          )}
        </div>
      ),
    },
    {
      title: 'Sucursal', dataIndex: ['branch', 'name'], width: 130,
      responsive: ['lg'] as any,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Tipo', dataIndex: 'type', width: 130,
      render: (t: string) => {
        const m = MOV_CONFIG[t] ?? { label: t, color: 'default', icon: null }
        return <Tag color={m.color} icon={m.icon} style={{ borderRadius: 6, fontWeight: 600 }}>{m.label}</Tag>
      },
    },
    {
      title: 'Referencia / Razón', key: 'razon',
      render: (_: any, r: any) => (
        <div>
          {r.reason    && <div style={{ fontSize: 12, fontWeight: 500 }}>{r.reason}</div>}
          {r.reference && <Text type="secondary" style={{ fontSize: 11 }}>Ref: {r.reference}</Text>}
        </div>
      ),
    },
    {
      title: 'Cantidad', dataIndex: 'quantity', width: 90, align: 'right' as const,
      render: (v: any, r: any) => {
        const esSalida = r.type === 'OUT'
        return (
          <Text style={{ color: esSalida ? token.colorError : token.colorSuccess, fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            {esSalida ? '−' : '+'}{Number(v).toFixed(2)}
          </Text>
        )
      },
    },
    {
      title: 'Stock ant. → nuevo', key: 'delta', width: 150, responsive: ['lg'] as any,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 11 }}>{Number(r.quantityBefore ?? 0).toFixed(0)}</Text>
          <Text type="secondary">→</Text>
          <Text strong style={{ fontSize: 12, color: Number(r.quantityAfter) < Number(r.quantityBefore) ? '#cf1322' : primary }}>
            {Number(r.quantityAfter ?? 0).toFixed(0)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Usuario', dataIndex: ['user', 'name'], width: 115, responsive: ['md'] as any,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v ?? '—'}</Text>,
    },
  ]

  // ── Columns — Per-product kardex ───────────────────────────────────────────
  const kardexProductCols: ColumnsType<any> = [
    {
      title: 'Tipo', dataIndex: 'type', width: 130,
      render: (t: string) => {
        const m = MOV_CONFIG[t] ?? { label: t, color: 'default', icon: null }
        return <Tag color={m.color} icon={m.icon} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{m.label}</Tag>
      },
    },
    {
      title: 'Referencia', key: 'ref',
      render: (_: any, r: any) => (
        <div>
          {r.reason    && <div style={{ fontSize: 12, fontWeight: 500 }}>{r.reason}</div>}
          {r.reference && <Text type="secondary" style={{ fontSize: 11 }}>Ref: {r.reference}</Text>}
        </div>
      ),
    },
    {
      title: 'Cantidad', dataIndex: 'quantity', width: 90, align: 'right' as const,
      render: (v: any, r: any) => {
        const esSalida = r.type === 'OUT'
        return (
          <Text style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: esSalida ? '#cf1322' : '#389e0d', fontWeight: 600 }}>
            {esSalida ? '−' : '+'}{Math.abs(Number(v))}
          </Text>
        )
      },
    },
    {
      title: 'Stock', key: 'stock', width: 130,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Text type="secondary" style={{ fontSize: 11 }}>{Number(r.quantityBefore ?? 0).toFixed(0)}</Text>
          <Text type="secondary">→</Text>
          <Text strong style={{ fontSize: 12, color: Number(r.quantityAfter) < Number(r.quantityBefore) ? '#cf1322' : primary }}>
            {Number(r.quantityAfter ?? 0).toFixed(0)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Fecha', dataIndex: 'createdAt', width: 130, responsive: ['md'] as any,
      render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).format('DD/MM/YY HH:mm')}</Text>,
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Typography.Title level={4} style={{ margin: '0 0 2px', fontWeight: 700 }}>Inventario</Typography.Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Control de stock, movimientos y transferencias entre sucursales</Text>
        </div>
        <Space wrap>
          <Tooltip title="Recargar">
            <Button icon={<ReloadOutlined />} onClick={invalidateAll} />
          </Tooltip>
          <Button icon={<SendOutlined />} onClick={openTransfer}>Transferir</Button>
          <Button type="primary" icon={<SwapOutlined />} onClick={() => openAdjust(undefined)}>
            Ajustar stock
          </Button>
        </Space>
      </div>

      {/* KPIs */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        {kpis.map(k => (
          <Col xs={12} sm={12} md={6} key={k.title}>
            <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', borderTop: `3px solid ${k.color}` }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: token.colorTextSecondary }}>{k.title}</Text>}
                value={k.value}
                prefix={<span style={{ color: k.color, marginRight: 4, fontSize: 14 }}>{k.icon}</span>}
                valueStyle={{ fontSize: 22, fontWeight: 700, color: k.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Tabs */}
      <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
        styles={{ body: { padding: '0 16px 16px' } }}>
        <Tabs activeKey={activeTab} onChange={k => setActiveTab(k as any)} size="small"
          items={[
            {
              key: 'productos',
              label: (
                <Space>
                  <ShoppingOutlined />
                  {`Productos (${allProducts.filter((p: any) => p.trackStock).length})`}
                  {stockBajoCount > 0 && <Badge count={stockBajoCount} style={{ backgroundColor: token.colorError }} />}
                </Space>
              ),
              children: (
                <>
                  {/* Toolbar */}
                  <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 14, marginTop: 8 }}>
                    <Col flex="1">
                      <Input
                        ref={searchInputRef}
                        prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
                        suffix={
                          <Tooltip title={scannerActive ? 'Scanner activo — escanea para buscar' : 'Activar scanner de código de barras'}>
                            <BarcodeOutlined
                              onClick={() => setScannerActive(v => !v)}
                              style={{ color: scannerActive ? primary : token.colorTextQuaternary, cursor: 'pointer', fontSize: 16 }}
                            />
                          </Tooltip>
                        }
                        placeholder="Buscar producto, SKU o código de barras..."
                        allowClear value={search} onChange={e => setSearch(e.target.value)}
                        style={{ maxWidth: 360 }}
                      />
                    </Col>
                    <Col>
                      <Select placeholder="Categoría" allowClear style={{ width: 160 }}
                        value={filterCat} onChange={setFilterCat}
                        options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                      />
                    </Col>
                    <Col>
                      <Space size={6}>
                        <Button
                          type={soloStockBajo ? 'primary' : 'default'}
                          icon={<WarningOutlined />}
                          onClick={() => setSoloStockBajo(v => !v)}
                          danger={soloStockBajo}
                          size="small"
                        >
                          Stock bajo {stockBajoCount > 0 && `(${stockBajoCount})`}
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  {/* Scanner active banner */}
                  {scannerActive && (
                    <Alert
                      type="info"
                      icon={<BarcodeOutlined />}
                      showIcon
                      message="Scanner activo — escanea un código de barras para abrir el ajuste de ese producto"
                      style={{ marginBottom: 12, borderRadius: 8 }}
                      closable
                      onClose={() => setScannerActive(false)}
                    />
                  )}

                  {/* Stock bajo alert */}
                  {stockBajoCount > 0 && !soloStockBajo && (
                    <div style={{ background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 8, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <WarningOutlined style={{ color: '#ff4d4f' }} />
                      <Text style={{ color: '#cf1322', fontSize: 13 }}>
                        {stockBajoCount} {stockBajoCount === 1 ? 'producto tiene' : 'productos tienen'} stock por debajo del mínimo.{' '}
                      </Text>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: primary, fontWeight: 600, fontSize: 13, padding: 0 }}
                        onClick={() => setSoloStockBajo(true)}>
                        Ver productos
                      </button>
                    </div>
                  )}

                  <Table size="small" columns={productCols} dataSource={stockProducts} rowKey="id"
                    loading={productsQ.isLoading} scroll={{ x: 900 }}
                    rowClassName={(r: any) => Number(r.stock ?? 0) <= Number(r.minStock ?? 0) ? 'ant-table-row-danger' : ''}
                    pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'], showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} productos` }}
                    locale={{
                      emptyText: (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                          <InboxOutlined style={{ fontSize: 36, color: token.colorTextDisabled }} />
                          <div style={{ marginTop: 10, color: token.colorTextSecondary }}>
                            {soloStockBajo ? 'No hay productos con stock bajo' : 'Sin productos con control de stock. Activa "Controlar inventario" en el módulo Productos.'}
                          </div>
                        </div>
                      ),
                    }}
                  />
                </>
              ),
            },
            {
              key: 'kardex',
              label: <Space><HistoryOutlined />Kardex general</Space>,
              children: (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12, marginTop: 8 }}>
                    <Select placeholder="Tipo de movimiento" allowClear style={{ width: 180 }}
                      value={filterType} onChange={setFilterType}
                      options={Object.entries(MOV_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
                    />
                    <Select placeholder="Producto" allowClear showSearch optionFilterProp="label" style={{ width: 220 }}
                      value={filterProduct} onChange={setFilterProduct}
                      options={allProducts.map((p: any) => ({ value: p.id, label: p.name }))}
                    />
                    <RangePicker value={dateRange} onChange={v => setDateRange(v as any)}
                      format="DD/MM/YY" placeholder={['Desde', 'Hasta']} style={{ borderRadius: 8 }} />
                    {(filterType || filterProduct || dateRange) && (
                      <Button size="small" onClick={() => { setFilterType(undefined); setFilterProduct(undefined); setDateRange(null) }}>
                        Limpiar
                      </Button>
                    )}
                  </div>
                  <Table size="small" columns={kardexCols} dataSource={movements} rowKey="id"
                    loading={movQ.isLoading} scroll={{ x: 900 }}
                    pagination={{ pageSize: 30, showTotal: t => `${t} movimientos`, showSizeChanger: false }}
                    locale={{ emptyText: 'Sin movimientos en el período seleccionado' }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* ══════════════════════════════════════════════════════
          Drawer: Kardex por producto
      ══════════════════════════════════════════════════════ */}
      <Drawer
        title={<Space><HistoryOutlined style={{ color: primary }} /><span>Kardex: {kardexProduct?.name ?? 'Producto'}</span></Space>}
        open={kardexDrawerOpen} onClose={() => { setKardexDrawerOpen(false); setKardexProduct(null) }}
        width={700}
        extra={
          kardexProduct && (
            <Button size="small" icon={<SwapOutlined />} onClick={() => { setKardexDrawerOpen(false); openAdjust(kardexProduct) }}>
              Ajustar stock
            </Button>
          )
        }
        destroyOnClose
      >
        {kardexProduct && (
          <Card size="small" style={{ marginBottom: 16, background: `${primary}12`, border: `1px solid ${primary}30` }}>
            <Row gutter={[16, 8]}>
              <Col span={6}>
                <div style={{ fontSize: 11, color: token.colorTextSecondary }}>Stock actual</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: Number(kardexProduct.stock ?? 0) <= Number(kardexProduct.minStock ?? 0) ? '#cf1322' : primary }}>
                  {Number(kardexProduct.stock ?? 0) % 1 === 0 ? Number(kardexProduct.stock ?? 0).toFixed(0) : Number(kardexProduct.stock ?? 0).toFixed(2)}
                  <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4 }}>{kardexProduct.saleUnit?.symbol ?? kardexProduct.saleUnit?.name ?? ''}</span>
                </div>
                {Number(kardexProduct.conversionFactor ?? 1) > 1 && (
                  <div style={{ fontSize: 10, color: token.colorTextSecondary }}>
                    = {(Number(kardexProduct.stock ?? 0) / Number(kardexProduct.conversionFactor)).toFixed(2)} {kardexProduct.purchaseUnit}
                  </div>
                )}
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 11, color: token.colorTextSecondary }}>Mínimo</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{Number(kardexProduct.minStock ?? 0).toFixed(0)}</div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 11, color: token.colorTextSecondary }}>Costo</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>${Number(kardexProduct.cost ?? 0).toFixed(2)}</div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 11, color: token.colorTextSecondary }}>Precio venta</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: primary }}>${Number(kardexProduct.price ?? 0).toFixed(2)}</div>
              </Col>
            </Row>
          </Card>
        )}
        <Table size="small" columns={kardexProductCols} dataSource={kardexItems} rowKey="id"
          loading={kardexQ.isLoading} scroll={{ x: 600 }}
          pagination={{ pageSize: 15, showTotal: t => `${t} movimientos`, showSizeChanger: false }}
          locale={{ emptyText: (<div style={{ padding: 32, textAlign: 'center', color: token.colorTextSecondary }}><HistoryOutlined style={{ fontSize: 28, color: token.colorTextDisabled }} /><div style={{ marginTop: 8 }}>Sin movimientos registrados para este producto</div></div>) }}
        />
      </Drawer>

      {/* ══════════════════════════════════════════════════════
          Modal: Ajuste de stock
      ══════════════════════════════════════════════════════ */}
      <Modal
        open={adjustModal}
        title={<Space><SwapOutlined style={{ color: primary }} /><span>{adjustTarget ? `Ajustar stock — ${adjustTarget.name}` : 'Ajustar stock'}</span></Space>}
        onCancel={() => { setAdjustModal(false); setScannerActive(false); adjustForm.resetFields() }}
        onOk={() => adjustForm.submit()}
        confirmLoading={adjustMutation.isPending}
        okText="Confirmar" okButtonProps={{ style: { borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={500} style={{ top: 40 }} destroyOnClose
      >
        {adjustTarget && (
          <Card size="small" style={{ marginBottom: 14, background: token.colorFillAlter }}>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ fontSize: 11, color: token.colorTextSecondary }}>Stock actual</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: Number(adjustTarget.stock ?? 0) <= Number(adjustTarget.minStock ?? 0) ? '#cf1322' : primary }}>
                  {Number(adjustTarget.stock ?? 0) % 1 === 0 ? Number(adjustTarget.stock ?? 0).toFixed(0) : Number(adjustTarget.stock ?? 0).toFixed(2)}
                  <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4 }}>{adjustTarget.saleUnit?.symbol ?? adjustTarget.saleUnit?.name ?? ''}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: token.colorTextSecondary }}>Stock mínimo</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{Number(adjustTarget.minStock ?? 0).toFixed(0)}</div>
              </Col>
            </Row>
          </Card>
        )}

        <Alert
          type="info"
          icon={<BarcodeOutlined />}
          showIcon
          message="Puedes escanear el código de barras del producto para seleccionarlo automáticamente."
          style={{ marginBottom: 14, borderRadius: 8, fontSize: 12 }}
        />

        <Form form={adjustForm} layout="vertical" requiredMark={false} onFinish={values => adjustMutation.mutate(values)}>
          {!adjustTarget && (
            <Form.Item name="productId" label="Producto" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
              <Select showSearch optionFilterProp="label" placeholder="Buscar producto con stock..."
                options={allProducts.filter((p: any) => p.trackStock).map((p: any) => ({
                  value: p.id,
                  label: `${p.name}${p.sku ? ` (${p.sku})` : ''} — Stock: ${Number(p.stock ?? 0).toFixed(0)}`,
                }))}
              />
            </Form.Item>
          )}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="type" label="Tipo de movimiento" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                <Select options={AJUSTE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="quantity"
                label={movType === 'ADJUST' ? 'Stock final (absoluto)' : 'Cantidad'}
                rules={[{ required: true }]} style={{ marginBottom: 14 }}
              >
                <InputNumber min={0} precision={4} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="unitCost" label="Costo unitario ($)" style={{ marginBottom: 14 }}>
                <InputNumber min={0} precision={4} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="reference" label="Referencia" style={{ marginBottom: 14 }}>
                <Input placeholder="Factura #001, conteo físico..." />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="reason" label="Razón / descripción" rules={[{ required: true, min: 2, message: 'Describe el motivo del movimiento' }]} style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} placeholder="Ej: Compra a proveedor, devolución, conteo físico..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          Modal: Transferencia entre sucursales
      ══════════════════════════════════════════════════════ */}
      <Modal
        open={transferModal}
        title={<Space><SendOutlined style={{ color: primary }} /><span>Transferir stock entre sucursales</span></Space>}
        onCancel={() => { setTransferModal(false); transferForm.resetFields() }}
        onOk={() => transferForm.submit()}
        confirmLoading={transferMutation.isPending}
        okText="Transferir" okButtonProps={{ style: { borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={520} style={{ top: 40 }} destroyOnClose
      >
        <Alert
          type="warning"
          message="El stock se descuenta de la sucursal origen y se agrega a la destino. Se registran 2 movimientos en el kardex."
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
        <Form form={transferForm} layout="vertical" requiredMark={false} onFinish={values => transferMutation.mutate(values)}>
          <Form.Item name="productId" label="Producto" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
            <Select showSearch optionFilterProp="label" placeholder="Seleccionar producto con stock..."
              options={allProducts.filter((p: any) => p.trackStock).map((p: any) => ({
                value: p.id,
                label: `${p.name}${p.sku ? ` (${p.sku})` : ''} — Stock total: ${Number(p.stock ?? 0).toFixed(0)}`,
              }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="fromBranchId" label="Sucursal origen" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                <Select placeholder="Origen" options={branches.map((b: any) => ({ value: b.id, label: b.name }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="toBranchId" label="Sucursal destino" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                <Select placeholder="Destino" options={branches.map((b: any) => ({ value: b.id, label: b.name }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="quantity" label="Cantidad a transferir" rules={[{ required: true, min: 0.0001 }]} style={{ marginBottom: 14 }}>
                <InputNumber min={0.0001} precision={4} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="reason" label="Motivo de transferencia" rules={[{ required: true, min: 2 }]} style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} placeholder="Ej: Desabastecimiento sucursal norte, redistribución mensual..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          Modal: Editar producto (quick edit — min stock + precio)
      ══════════════════════════════════════════════════════ */}
      <Modal
        open={editModal}
        title={<Space><EditOutlined style={{ color: primary }} /><span>Editar — {editTarget?.name}</span></Space>}
        onCancel={() => { setEditModal(false); editForm.resetFields() }}
        onOk={() => editForm.submit()}
        confirmLoading={editMutation.isPending}
        okText="Guardar cambios" okButtonProps={{ style: { borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={520} style={{ top: 40 }} destroyOnClose
      >
        <Form form={editForm} layout="vertical" requiredMark={false}
          onFinish={values => editMutation.mutate({ id: editTarget.id, data: values })}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true, min: 2 }]} style={{ marginBottom: 14 }}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Descripción" style={{ marginBottom: 14 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="categoryId" label="Categoría" style={{ marginBottom: 14 }}>
            <Select allowClear showSearch optionFilterProp="label" placeholder="Sin categoría"
              options={categories.map((c: any) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="price" label="Precio ($)" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                <InputNumber min={0.01} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cost" label="Costo ($)" style={{ marginBottom: 14 }}>
                <InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minStock" label="Stock mínimo de alerta" style={{ marginBottom: 0 }}
                tooltip="Cantidad mínima antes de mostrar alerta de stock bajo">
                <InputNumber min={0} precision={4} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

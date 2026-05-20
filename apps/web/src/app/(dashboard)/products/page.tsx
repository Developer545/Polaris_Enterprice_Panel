'use client'
import { useState, useMemo } from 'react'
import {
  Table, Button, Tag, Input, Typography, Modal, Form, Select, InputNumber,
  App, Row, Col, Switch, Avatar, Divider, Card, Space, Tooltip, Drawer,
  Statistic, Popconfirm, theme, Empty, Popover,
} from 'antd'
import {
  PlusOutlined, EditOutlined, SearchOutlined, ReloadOutlined,
  AppstoreOutlined, DollarOutlined, TagsOutlined, WarningOutlined,
  DeleteOutlined, CheckOutlined, CloseOutlined, ScissorOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

const TIPO_ITEM = [
  { value: '1', label: 'Bien',          color: 'blue'    },
  { value: '2', label: 'Servicio',      color: 'green'   },
  { value: '3', label: 'Bien+Servicio', color: 'purple'  },
  { value: '4', label: 'Otro',          color: 'default' },
]

const UNI_MH_OPTIONS = [
  { value: 59, label: 'Unidad'    },
  { value: 10, label: 'Kilogramo' },
  { value: 8,  label: 'Litro'     },
  { value: 74, label: 'Servicio'  },
  { value: 52, label: 'Hora'      },
]

const EMOJI_LIST = [
  // Alimentación
  '🍎','🍌','🥩','🍞','🥛','🥤','🍫','🧃','☕','🍵','🥗','🧂','🫙','🥫','🧁',
  // Ferretería / construcción
  '🔧','🔨','🪛','🔩','🪚','🛠️','🔌','💡','🪝','🧱','🪵','🏠','🪣','🎨','🪟',
  // Salud / belleza
  '💊','🩺','🩹','💄','💅','🧼','🪥','🌿','🧴','🫧',
  // Tecnología
  '📱','💻','🖥️','⌨️','🖱️','📷','🔋','📡',
  // Ropa / moda
  '👗','👠','👒','🧣','🧤','👜','👟','🕶️',
  // Oficina
  '📝','📋','📊','📁','🗂️','🖨️','📦','📌','✂️',
  // Servicios / transporte
  '💼','🚗','🚐','🚚','✈️','🎵','🏋️','📚','🌐','🔑',
  // Mascotas / animales
  '🐕','🐈','🐄','🐓','🐖','🐟','🐇','🦜',
  // Misc
  '⭐','❤️','✅','🎁','🛍️','🏷️','💎','🌟','🏆','🎯',
]

function EmojiPicker({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  return (
    <Popover
      trigger="click"
      content={
        <div style={{ width: 260, maxHeight: 220, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2 }}>
            <div
              onClick={() => onChange?.('')}
              title="Sin emoji"
              style={{
                fontSize: 18, cursor: 'pointer', textAlign: 'center', padding: '3px 0',
                borderRadius: 4, background: !value ? '#f0f0f0' : 'transparent',
                lineHeight: 1.6,
              }}
            >
              ✕
            </div>
            {EMOJI_LIST.map(e => (
              <div
                key={e}
                onClick={() => onChange?.(e)}
                style={{
                  fontSize: 18, cursor: 'pointer', textAlign: 'center', padding: '3px 0',
                  borderRadius: 4, background: value === e ? '#f0f0f0' : 'transparent',
                  lineHeight: 1.6, transition: 'background .1s',
                }}
                onMouseEnter={el => (el.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={el => (el.currentTarget.style.background = value === e ? '#f0f0f0' : 'transparent')}
              >
                {e}
              </div>
            ))}
          </div>
        </div>
      }
    >
      <Button
        style={{ width: '100%', textAlign: 'left', fontSize: value ? 22 : 13 }}
        title="Seleccionar emoji"
      >
        {value || <span style={{ color: '#bbb', fontSize: 13 }}>Sin emoji</span>}
      </Button>
    </Popover>
  )
}

const COLOR_PRESETS = [
  '#f47920', '#1677ff', '#52c41a', '#ff4d4f',
  '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96', '#8c8c8c',
]
const AVATAR_BG = ['#f47920', '#1677ff', '#52c41a', '#722ed1', '#13c2c2', '#fa8c16']

function getInitials(name: string) { return name.trim().charAt(0).toUpperCase() }
function avatarBg(name: string) {
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_BG[Math.abs(h) % AVATAR_BG.length]
}

function ColorSwatch({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
      {COLOR_PRESETS.map(c => (
        <div key={c} onClick={() => onChange?.(c)} style={{
          width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer',
          border: value === c ? '2px solid #fff' : '2px solid transparent',
          boxShadow: value === c ? `0 0 0 2px ${c}` : '0 1px 4px rgba(0,0,0,0.18)',
          transition: 'all 0.15s',
        }} />
      ))}
    </div>
  )
}

export default function ProductsPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const { companyId } = useAppContext()

  // product state
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState<string | undefined>()
  const [onlyLow, setOnlyLow]     = useState(false)
  const [editProd, setEditProd]   = useState<any>(null)
  const [prodForm] = Form.useForm()
  const fraccionable = Form.useWatch('fraccionable', prodForm)

  // category drawer
  const [catDrawer, setCatDrawer]       = useState(false)
  const [catName, setCatName]           = useState('')
  const [catColor, setCatColor]         = useState(COLOR_PRESETS[1])
  const [editCat, setEditCat]           = useState<any>(null)
  const [editCatName, setEditCatName]   = useState('')
  const [editCatColor, setEditCatColor] = useState(COLOR_PRESETS[0])

  // units drawer
  const [unitDrawer, setUnitDrawer]     = useState(false)
  const [unitName, setUnitName]         = useState('')
  const [unitSymbol, setUnitSymbol]     = useState('')
  const [editUnit, setEditUnit]         = useState<any>(null)
  const [editUnitName, setEditUnitName] = useState('')
  const [editUnitSym, setEditUnitSym]   = useState('')

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['categories', companyId],
    queryFn: () => api.get('/api/categories', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: units = [] } = useQuery<any[]>({
    queryKey: ['units', companyId],
    queryFn: () => api.get('/api/units', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: products = [], isLoading } = useQuery<any[]>({
    queryKey: ['products', companyId],
    queryFn: () => api.get('/api/products', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  // ── KPI ──────────────────────────────────────────────────────────────────
  const valorInventario = products.reduce(
    (a, p) => a + (p.trackStock ? Number(p.stock ?? 0) * Number(p.cost ?? 0) : 0), 0,
  )
  const stockBajoCount = products.filter(
    p => p.trackStock && Number(p.stock ?? 0) <= Number(p.minStock ?? 0),
  ).length

  const filtered = useMemo(() => products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.sku?.toLowerCase().includes(search.toLowerCase()) &&
        !p.barcode?.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter && p.categoryId !== catFilter) return false
    if (onlyLow && !(p.trackStock && Number(p.stock ?? 0) <= Number(p.minStock ?? 0))) return false
    return true
  }), [products, search, catFilter, onlyLow])

  // ── Mutations — productos ─────────────────────────────────────────────────
  const saveProd = useMutation({
    mutationFn: (values: any) => {
      const { fraccionable: _f, ...rest } = values
      const dto = {
        ...rest,
        tipoItem:         String(rest.tipoItem),
        conversionFactor: rest.conversionFactor ?? 1,
        saleUnitId:       rest.fraccionable ? rest.saleUnitId : null,
        purchaseUnit:     rest.purchaseUnit || null,
      }
      return editProd?.id
        ? api.put(`/api/products/${editProd.id}`, dto)
        : api.post('/api/products', { ...dto, companyId })
    },
    onSuccess: () => {
      message.success('Producto guardado')
      qc.invalidateQueries({ queryKey: ['products'] })
      setEditProd(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const deleteProd = useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => {
      message.success('Producto eliminado')
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  // ── Mutations — categorías ────────────────────────────────────────────────
  const createCat = useMutation({
    mutationFn: () => api.post('/api/categories', { companyId, name: catName.trim(), color: catColor }),
    onSuccess: () => { message.success('Categoría creada'); qc.invalidateQueries({ queryKey: ['categories'] }); setCatName(''); setCatColor(COLOR_PRESETS[1]) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })
  const updateCat = useMutation({
    mutationFn: (id: string) => api.put(`/api/categories/${id}`, { name: editCatName.trim(), color: editCatColor }),
    onSuccess: () => { message.success('Categoría actualizada'); qc.invalidateQueries({ queryKey: ['categories'] }); setEditCat(null) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })
  const deleteCat = useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess: () => { message.success('Categoría eliminada'); qc.invalidateQueries({ queryKey: ['categories'] }) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  // ── Mutations — unidades ──────────────────────────────────────────────────
  const createUnit = useMutation({
    mutationFn: () => api.post('/api/units', { companyId, name: unitName.trim(), symbol: unitSymbol.trim() || null }),
    onSuccess: () => { message.success('Unidad creada'); qc.invalidateQueries({ queryKey: ['units'] }); setUnitName(''); setUnitSymbol('') },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })
  const updateUnit = useMutation({
    mutationFn: (id: string) => api.put(`/api/units/${id}`, { name: editUnitName.trim(), symbol: editUnitSym.trim() || null }),
    onSuccess: () => { message.success('Unidad actualizada'); qc.invalidateQueries({ queryKey: ['units'] }); setEditUnit(null) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })
  const deleteUnit = useMutation({
    mutationFn: (id: string) => api.delete(`/api/units/${id}`),
    onSuccess: () => { message.success('Unidad eliminada'); qc.invalidateQueries({ queryKey: ['units'] }) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: ColumnsType<any> = [
    {
      key: 'avatar', width: 52, fixed: 'left',
      render: (r: any) => r.imageUrl
        ? <Avatar src={r.imageUrl} shape="square" size={40} style={{ borderRadius: 10 }} />
        : r.emoji
          ? <Avatar shape="square" size={40} style={{ borderRadius: 10, background: `${avatarBg(r.name)}18`, fontSize: 22 }}>{r.emoji}</Avatar>
          : <Avatar shape="square" size={40} style={{ borderRadius: 10, background: avatarBg(r.name), fontSize: 17, fontWeight: 700 }}>{getInitials(r.name)}</Avatar>,
    },
    {
      title: 'SKU', dataIndex: 'sku', key: 'sku', width: 100,
      render: (v: string) => v
        ? <code style={{ fontSize: 11, background: token.colorFillSecondary, padding: '2px 7px', borderRadius: 5 }}>{v}</code>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Producto', key: 'producto', minWidth: 220,
      render: (r: any) => {
        const tipo = TIPO_ITEM.find(t => t.value === String(r.tipoItem))
        const isFrac = Number(r.conversionFactor ?? 1) > 1
        return (
          <Space direction="vertical" size={3}>
            <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
            {r.description && <Text type="secondary" style={{ fontSize: 11 }}>{r.description}</Text>}
            <Space size={4} wrap style={{ marginTop: 2 }}>
              {r.category && (
                <Tag color={r.category.color ?? undefined} style={{ fontSize: 10, margin: 0, borderRadius: 4, lineHeight: '18px', padding: '0 5px' }}>
                  {r.category.name}
                </Tag>
              )}
              {tipo && (
                <Tag color={tipo.color} style={{ fontSize: 10, margin: 0, borderRadius: 4, lineHeight: '18px', padding: '0 5px' }}>
                  {tipo.label}
                </Tag>
              )}
              {isFrac && (
                <Tag color="cyan" style={{ fontSize: 10, margin: 0, borderRadius: 4, lineHeight: '18px', padding: '0 5px' }}>
                  Fraccionable
                </Tag>
              )}
            </Space>
          </Space>
        )
      },
    },
    {
      title: 'Unidades', key: 'unidades', width: 160,
      render: (r: any) => {
        const isFrac = Number(r.conversionFactor ?? 1) > 1
        if (!isFrac) return <Text type="secondary" style={{ fontSize: 12 }}>{r.purchaseUnit || 'Unidad'}</Text>
        return (
          <Space direction="vertical" size={1}>
            <Text style={{ fontSize: 12 }}>Compra: <strong>{r.purchaseUnit || 'Unidad'}</strong></Text>
            <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
              Venta: {r.saleUnit?.name ?? '—'}{r.saleUnit?.symbol ? ` (${r.saleUnit.symbol})` : ''}
            </Text>
            <Text style={{ fontSize: 11, color: token.colorPrimary }}>
              ×{Number(r.conversionFactor).toFixed(2)}
            </Text>
          </Space>
        )
      },
    },
    {
      title: 'Precio', dataIndex: 'price', key: 'price', width: 100, align: 'right',
      render: (v: any) => <Text strong style={{ color: token.colorPrimary, fontSize: 13 }}>${Number(v).toFixed(2)}</Text>,
    },
    {
      title: 'Costo', dataIndex: 'cost', key: 'cost', width: 90, align: 'right',
      render: (v: any) => <Text type="secondary" style={{ fontSize: 12 }}>${Number(v ?? 0).toFixed(2)}</Text>,
    },
    {
      title: 'Stock', key: 'stock', width: 90, align: 'center',
      render: (r: any) => {
        if (!r.trackStock) return <Tag style={{ fontSize: 10, borderRadius: 6 }}>N/A</Tag>
        const low = Number(r.stock ?? 0) <= Number(r.minStock ?? 0)
        return (
          <Tag color={low ? 'error' : 'success'} icon={low ? <WarningOutlined style={{ fontSize: 10 }} /> : undefined}
            style={{ fontWeight: 700, borderRadius: 6, fontSize: 12 }}>
            {Number(r.stock ?? 0).toFixed(0)}
          </Tag>
        )
      },
    },
    {
      key: 'actions', width: 80, fixed: 'right', align: 'center',
      render: (r: any) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              const isFrac = Number(r.conversionFactor ?? 1) > 1
              setEditProd(r)
              prodForm.setFieldsValue({
                ...r,
                tipoItem:         String(r.tipoItem ?? '1'),
                price:            Number(r.price),
                cost:             Number(r.cost ?? 0),
                uniMedida:        Number(r.uniMedida ?? 59),
                conversionFactor: Number(r.conversionFactor ?? 1),
                fraccionable:     isFrac,
                emoji:            r.emoji ?? '',
              })
            }} />
          </Tooltip>
          <Popconfirm title="¿Eliminar producto?" okText="Eliminar" cancelText="Cancelar" onConfirm={() => deleteProd.mutate(r.id)}>
            <Tooltip title="Eliminar"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const kpis = [
    { title: 'Total productos',  value: products.length,              color: token.colorPrimary, icon: <AppstoreOutlined /> },
    { title: 'Valor inventario', value: `$${valorInventario.toFixed(2)}`, color: '#52c41a',      icon: <DollarOutlined />   },
    { title: 'Categorías',       value: categories.length,            color: '#722ed1',          icon: <TagsOutlined />     },
    { title: 'Stock bajo',       value: stockBajoCount,               color: token.colorError,   icon: <WarningOutlined />  },
  ]

  const openNewProd = () => {
    setEditProd({})
    prodForm.resetFields()
    prodForm.setFieldsValue({ tipoItem: '1', uniMedida: 59, trackStock: false, cost: 0, fraccionable: false, conversionFactor: 1 })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Title level={4} style={{ margin: '0 0 2px', fontWeight: 700 }}>Productos</Typography.Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Catálogo de productos — precios, unidades, categorías e inventario</Text>
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

      {/* Toolbar */}
      <Card size="small" style={{ borderRadius: 12, marginBottom: 14, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
          <Space wrap size={8}>
            <Input prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
              placeholder="Buscar nombre, SKU, código..." value={search} onChange={e => setSearch(e.target.value)}
              allowClear style={{ width: 240, borderRadius: 8 }} />
            <Select placeholder="Categoría" allowClear value={catFilter} onChange={setCatFilter}
              style={{ width: 160 }} options={categories.map(c => ({ value: c.id, label: c.name }))} />
            <Button icon={<WarningOutlined />} type={onlyLow ? 'primary' : 'default'} onClick={() => setOnlyLow(v => !v)}
              style={onlyLow ? { background: token.colorError, borderColor: token.colorError, color: '#fff', borderRadius: 8 } : { borderRadius: 8 }}>
              Stock bajo{stockBajoCount > 0 && (
                <span style={{ marginLeft: 6, background: onlyLow ? 'rgba(255,255,255,0.3)' : token.colorError, color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 700 }}>
                  {stockBajoCount}
                </span>
              )}
            </Button>
          </Space>
          <Space size={8}>
            <Tooltip title="Recargar"><Button icon={<ReloadOutlined />} onClick={() => { qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['categories'] }); qc.invalidateQueries({ queryKey: ['units'] }) }} /></Tooltip>
            <Button icon={<ScissorOutlined />} onClick={() => setUnitDrawer(true)}>Unidades</Button>
            <Button icon={<TagsOutlined />} onClick={() => setCatDrawer(true)}>Categorías</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openNewProd} style={{ borderRadius: 8, fontWeight: 600 }}>Nuevo producto</Button>
          </Space>
        </div>
      </Card>

      {/* Tabla */}
      <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} styles={{ body: { padding: 0 } }}>
        <Table size="small" columns={columns} dataSource={filtered} rowKey="id" loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} productos`, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
          locale={{ emptyText: onlyLow ? 'Sin productos con stock bajo' : 'Sin productos registrados' }}
        />
      </Card>

      {/* ── Modal producto ────────────────────────────────────────────────── */}
      <Modal open={editProd !== null}
        title={<Space>{editProd?.id ? <EditOutlined /> : <PlusOutlined />}{editProd?.id ? 'Editar producto' : 'Nuevo producto'}</Space>}
        onCancel={() => setEditProd(null)} onOk={() => prodForm.submit()}
        confirmLoading={saveProd.isPending} okText="Guardar"
        okButtonProps={{ style: { borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={720} style={{ top: 40 }} destroyOnClose>
        <Form form={prodForm} layout="vertical" requiredMark={false}
          onFinish={values => saveProd.mutate(values)}>

          <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Identificación</Text>
          <Divider style={{ margin: '6px 0 14px' }} />
          <Row gutter={16}>
            <Col xs={24} sm={14}>
              <Form.Item name="name" label="Nombre" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                <Input placeholder="Nombre del producto" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item name="categoryId" label="Categoría" style={{ marginBottom: 14 }}>
                <Select allowClear placeholder="Sin categoría" style={{ borderRadius: 8 }}
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  dropdownRender={menu => (<>{menu}<Divider style={{ margin: '4px 0' }} /><div style={{ padding: '4px 8px' }}><Button type="link" size="small" icon={<PlusOutlined />} onClick={() => setCatDrawer(true)}>Gestionar categorías</Button></div></>)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="sku" label="SKU / Código interno" style={{ marginBottom: 14 }}>
                <Input placeholder="PROD-001" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="barcode" label="Código de barras" style={{ marginBottom: 14 }}>
                <Input placeholder="EAN-13" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="tipoItem" label="Tipo de ítem (DTE)" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                <Select options={TIPO_ITEM.map(t => ({ value: t.value, label: t.label }))} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="emoji" label="Emoji (POS)" style={{ marginBottom: 14 }}
                tooltip="Icono visual para la pantalla del POS">
                <EmojiPicker />
              </Form.Item>
            </Col>
            <Col xs={24} sm={18}>
              <Form.Item name="description" label="Descripción" style={{ marginBottom: 14 }}>
                <Input.TextArea rows={2} style={{ borderRadius: 8 }} placeholder="Descripción opcional" />
              </Form.Item>
            </Col>
          </Row>

          <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Precios</Text>
          <Divider style={{ margin: '6px 0 14px' }} />
          <Row gutter={16}>
            <Col xs={12} sm={8}>
              <Form.Item name="price" label="Precio de venta" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                <InputNumber min={0} step={0.01} prefix="$" precision={2} style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name="cost" label="Costo promedio" style={{ marginBottom: 14 }}>
                <InputNumber min={0} step={0.01} prefix="$" precision={2} style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="uniMedida" label="Unidad MH (DTE)" style={{ marginBottom: 14 }}>
                <Select options={UNI_MH_OPTIONS} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>

          <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Inventario</Text>
          <Divider style={{ margin: '6px 0 14px' }} />
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item name="trackStock" label="Controlar inventario" valuePropName="checked" style={{ marginBottom: 14 }}>
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Form.Item noStyle shouldUpdate={(p, c) => p.trackStock !== c.trackStock}>
              {({ getFieldValue }) => getFieldValue('trackStock') && (
                <Row gutter={16} style={{ width: '100%', padding: '0 8px' }}>
                  <Col xs={12}>
                    <Form.Item name="stock" label="Stock inicial" style={{ marginBottom: 14 }}>
                      <InputNumber min={0} style={{ width: '100%', borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="minStock" label="Stock mínimo de alerta" style={{ marginBottom: 14 }}>
                      <InputNumber min={0} style={{ width: '100%', borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </Form.Item>
          </Row>

          <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unidades de medida</Text>
          <Divider style={{ margin: '6px 0 14px' }} />
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="purchaseUnit" label="Unidad de compra" style={{ marginBottom: 14 }}
                tooltip="Cómo compras este producto: Galón, Caja, Libra...">
                <Input placeholder="Ej: Galón, Caja, Libra" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="fraccionable" label="¿Se puede fraccionar?" valuePropName="checked" style={{ marginBottom: 14 }}>
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>

          {fraccionable && (
            <Card size="small" style={{ borderRadius: 10, border: `1px solid ${token.colorPrimary}40`, background: `${token.colorPrimary}08`, marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 12, color: token.colorPrimary }}>
                Configuración de fracción
              </Text>
              <Row gutter={16}>
                <Col xs={24} sm={14}>
                  <Form.Item name="saleUnitId" label="Unidad de venta (fracción)" style={{ marginBottom: 12 }}
                    tooltip="En qué unidad vendes la fracción: Onza, Litro, Vaso...">
                    <Select allowClear placeholder="Seleccionar unidad..."
                      options={units.map(u => ({ value: u.id, label: `${u.name}${u.symbol ? ` (${u.symbol})` : ''}` }))}
                      dropdownRender={menu => (<>{menu}<Divider style={{ margin: '4px 0' }} /><div style={{ padding: '4px 8px' }}><Button type="link" size="small" icon={<PlusOutlined />} onClick={() => setUnitDrawer(true)}>Crear unidad</Button></div></>)}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={10}>
                  <Form.Item name="conversionFactor" label="Factor de conversión" style={{ marginBottom: 12 }}
                    tooltip="Cuántas unidades de venta entran en 1 unidad de compra. Ej: 1 Galón = 128 Onzas">
                    <InputNumber min={0.0001} precision={4} style={{ width: '100%', borderRadius: 8 }}
                      placeholder="Ej: 128" addonAfter="unidades" />
                  </Form.Item>
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Ej: Compras 1 Galón y vendes por Onzas → Factor = 128 (1 galón = 128 oz)
              </Text>
            </Card>
          )}
        </Form>
      </Modal>

      {/* ── Drawer categorías ─────────────────────────────────────────────── */}
      <Drawer title={<Space><TagsOutlined /> Gestionar categorías</Space>}
        open={catDrawer} onClose={() => { setCatDrawer(false); setEditCat(null) }} width={380}
        styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 16px 14px', borderBottom: `1px solid ${token.colorBorderSecondary}`, background: token.colorFillAlter }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Nueva categoría</Text>
          <Input placeholder="Nombre" value={catName} onChange={e => setCatName(e.target.value)}
            style={{ borderRadius: 8, marginBottom: 10 }} onPressEnter={() => catName.trim() && createCat.mutate()} />
          <Text style={{ fontSize: 12, color: token.colorTextSecondary, display: 'block', marginBottom: 6 }}>Color</Text>
          <ColorSwatch value={catColor} onChange={setCatColor} />
          <Button type="primary" block icon={<PlusOutlined />} loading={createCat.isPending}
            disabled={!catName.trim()} onClick={() => createCat.mutate()}
            style={{ borderRadius: 8, fontWeight: 600, marginTop: 12 }}>Agregar</Button>
        </div>
        <div style={{ padding: 16 }}>
          <Text style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 12, display: 'block' }}>
            {categories.length} categorías
          </Text>
          {categories.length === 0 ? <Empty description="Sin categorías" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            : categories.map((cat: any) => {
              const isEd = editCat?.id === cat.id
              return (
                <Card key={cat.id} size="small" style={{ marginBottom: 8, borderRadius: 10, border: isEd ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`, transition: 'border 0.2s' }}>
                  {isEd ? (
                    <div>
                      <Input value={editCatName} onChange={e => setEditCatName(e.target.value)} style={{ borderRadius: 6, marginBottom: 10 }} autoFocus />
                      <ColorSwatch value={editCatColor} onChange={setEditCatColor} />
                      <Space style={{ marginTop: 10, width: '100%', justifyContent: 'flex-end' }}>
                        <Button size="small" icon={<CloseOutlined />} style={{ borderRadius: 6 }} onClick={() => setEditCat(null)}>Cancelar</Button>
                        <Button type="primary" size="small" icon={<CheckOutlined />} loading={updateCat.isPending}
                          disabled={!editCatName.trim()} onClick={() => updateCat.mutate(cat.id)} style={{ borderRadius: 6 }}>Guardar</Button>
                      </Space>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Space size={8}><div style={{ width: 14, height: 14, borderRadius: 4, background: cat.color ?? token.colorPrimary }} /><Text strong style={{ fontSize: 13 }}>{cat.name}</Text>{cat._count?.services > 0 && <Text type="secondary" style={{ fontSize: 11 }}>{cat._count.services} prod.</Text>}</Space>
                      <Space size={4}>
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditCat(cat); setEditCatName(cat.name); setEditCatColor(cat.color ?? COLOR_PRESETS[0]) }} />
                        <Popconfirm title="¿Eliminar categoría?" onConfirm={() => deleteCat.mutate(cat.id)} okText="Eliminar" cancelText="Cancelar">
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  )}
                </Card>
              )
            })}
        </div>
      </Drawer>

      {/* ── Drawer unidades de medida ─────────────────────────────────────── */}
      <Drawer title={<Space><ScissorOutlined /> Unidades de medida (fracciones)</Space>}
        open={unitDrawer} onClose={() => { setUnitDrawer(false); setEditUnit(null) }} width={380}
        styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 16px 14px', borderBottom: `1px solid ${token.colorBorderSecondary}`, background: token.colorFillAlter }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Nueva unidad</Text>
          <Text style={{ fontSize: 12, color: token.colorTextSecondary, display: 'block', marginBottom: 6 }}>
            Define unidades para productos fraccionables (Onza, Litro, Vaso...)
          </Text>
          <Row gutter={10} style={{ marginBottom: 10 }}>
            <Col flex={1}>
              <Input placeholder="Nombre (Ej: Onza)" value={unitName} onChange={e => setUnitName(e.target.value)}
                style={{ borderRadius: 8 }} onPressEnter={() => unitName.trim() && createUnit.mutate()} />
            </Col>
            <Col style={{ width: 90 }}>
              <Input placeholder="Símbolo" value={unitSymbol} onChange={e => setUnitSymbol(e.target.value)}
                style={{ borderRadius: 8 }} maxLength={10} />
            </Col>
          </Row>
          <Button type="primary" block icon={<PlusOutlined />} loading={createUnit.isPending}
            disabled={!unitName.trim()} onClick={() => createUnit.mutate()}
            style={{ borderRadius: 8, fontWeight: 600 }}>Agregar unidad</Button>
        </div>
        <div style={{ padding: 16 }}>
          <Text style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 12, display: 'block' }}>
            {units.length} unidades registradas
          </Text>
          {units.length === 0 ? <Empty description="Sin unidades personalizadas" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            : units.map((u: any) => {
              const isEd = editUnit?.id === u.id
              return (
                <Card key={u.id} size="small" style={{ marginBottom: 8, borderRadius: 10, border: isEd ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`, transition: 'border 0.2s' }}>
                  {isEd ? (
                    <div>
                      <Row gutter={10} style={{ marginBottom: 8 }}>
                        <Col flex={1}><Input value={editUnitName} onChange={e => setEditUnitName(e.target.value)} style={{ borderRadius: 6 }} autoFocus placeholder="Nombre" /></Col>
                        <Col style={{ width: 90 }}><Input value={editUnitSym} onChange={e => setEditUnitSym(e.target.value)} style={{ borderRadius: 6 }} placeholder="Símbolo" /></Col>
                      </Row>
                      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button size="small" icon={<CloseOutlined />} style={{ borderRadius: 6 }} onClick={() => setEditUnit(null)}>Cancelar</Button>
                        <Button type="primary" size="small" icon={<CheckOutlined />} loading={updateUnit.isPending}
                          disabled={!editUnitName.trim()} onClick={() => updateUnit.mutate(u.id)} style={{ borderRadius: 6 }}>Guardar</Button>
                      </Space>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Space size={8}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: token.colorFillSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Text strong style={{ fontSize: 12, color: token.colorPrimary }}>{u.symbol || u.name.charAt(0).toUpperCase()}</Text>
                        </div>
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{u.name}</Text>
                          {u.symbol && <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>({u.symbol})</Text>}
                          {u._count?.products > 0 && <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>{u._count.products} prod.</Text>}
                        </div>
                      </Space>
                      <Space size={4}>
                        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditUnit(u); setEditUnitName(u.name); setEditUnitSym(u.symbol ?? '') }} />
                        <Popconfirm title="¿Eliminar unidad?" onConfirm={() => deleteUnit.mutate(u.id)} okText="Eliminar" cancelText="Cancelar">
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  )}
                </Card>
              )
            })}
        </div>
      </Drawer>
    </div>
  )
}

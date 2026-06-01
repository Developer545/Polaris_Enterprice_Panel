'use client'
import { useState, useMemo } from 'react'
import {
  Table, Button, Input, Tag, Space, Typography, Drawer, Form,
  InputNumber, Select, Row, Col, Statistic, Card, Popconfirm,
  App, Tooltip, Divider, theme, Empty, Avatar,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  TagsOutlined, ReloadOutlined, CheckOutlined, CloseOutlined,
  CheckCircleOutlined, DollarOutlined, ToolOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import type { ColumnsType } from 'antd/es/table'
import { IconOrImagePicker, resolveImageUrl } from '../../../components/icon-or-image-picker'

const { Text } = Typography

const UNI_MEDIDA_OPTIONS = [
  { value: 59, label: 'Unidad'   },
  { value: 99, label: 'Otra'     },
]

const COLOR_PRESETS = [
  '#f47920', '#1677ff', '#52c41a', '#ff4d4f',
  '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96', '#8c8c8c',
]


function ColorSwatch({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
      {COLOR_PRESETS.map(c => (
        <div
          key={c}
          onClick={() => onChange?.(c)}
          style={{
            width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer',
            border: value === c ? '2px solid #fff' : '2px solid transparent',
            boxShadow: value === c ? `0 0 0 2px ${c}` : '0 1px 4px rgba(0,0,0,0.18)',
            transition: 'all 0.15s',
          }}
        />
      ))}
    </div>
  )
}

export default function ServicesPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const { companyId } = useAppContext()

  // form / drawer state
  const [search, setSearch]         = useState('')
  const [catFilter, setCatFilter]   = useState<string | undefined>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing]       = useState<any>(null)
  const [form] = Form.useForm()

  // category drawer state
  const [catDrawer, setCatDrawer]         = useState(false)
  const [catName, setCatName]             = useState('')
  const [catColor, setCatColor]           = useState(COLOR_PRESETS[2])
  const [editCat, setEditCat]             = useState<any>(null)
  const [editCatName, setEditCatName]     = useState('')
  const [editCatColor, setEditCatColor]   = useState(COLOR_PRESETS[0])

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: allProducts = [], isLoading } = useQuery<any[]>({
    queryKey: ['products-all', companyId],
    queryFn: () => api.get('/api/products', { params: { companyId, limit: 500 } }).then(r => r.data.data ?? []),
    enabled: !!companyId,
  })

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['categories', companyId],
    queryFn: () => api.get('/api/categories', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  // Solo servicios (tipoItem = 2)
  const services = useMemo(
    () => allProducts.filter(p => String(p.tipoItem) === '2'),
    [allProducts],
  )

  // ── KPI computed ─────────────────────────────────────────────────────────
  const avgPrice = services.length
    ? services.reduce((a, s) => a + Number(s.price ?? 0), 0) / services.length
    : 0

  const conCategoria = services.filter(s => !!s.categoryId).length

  const filtered = useMemo(() => services.filter(s => {
    if (search &&
        !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !s.description?.toLowerCase().includes(search.toLowerCase()) &&
        !s.sku?.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter && s.categoryId !== catFilter) return false
    return true
  }), [services, search, catFilter])

  // ── Mutations — servicios ─────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const dto: Record<string, any> = {
        name:              values.name,
        categoryId:        values.categoryId || null,
        description:       values.description || null,
        sku:               values.sku         || null,
        tipoItem:          '2',
        uniMedida:         Number(values.uniMedida ?? 99),
        price:             Number(values.price),
        cost:              Number(values.cost ?? 0),
        priceWholesale:    values.priceWholesale    != null ? Number(values.priceWholesale)    : null,
        priceDistribution: values.priceDistribution != null ? Number(values.priceDistribution) : null,
        priceSpecial:      values.priceSpecial      != null ? Number(values.priceSpecial)      : null,
        commissionAmount:  values.commissionAmount  != null ? Number(values.commissionAmount)  : null,
        imageUrl:          values.imageUrl || null,
        emoji:             values.emoji    || null,
      }
      return editing?.id
        ? api.put(`/api/products/${editing.id}`, dto)
        : api.post('/api/products', { ...dto, companyId })
    },
    onSuccess: () => {
      message.success(editing?.id ? 'Servicio actualizado' : 'Servicio creado')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-all'] })
      setDrawerOpen(false)
      setEditing(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al guardar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => {
      message.success('Servicio eliminado')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products-all'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  // ── Mutations — categorías ────────────────────────────────────────────────
  const createCat = useMutation({
    mutationFn: () => api.post('/api/categories', { companyId, name: catName.trim(), color: catColor }),
    onSuccess: () => {
      message.success('Categoría creada')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setCatName('')
      setCatColor(COLOR_PRESETS[2])
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const updateCat = useMutation({
    mutationFn: (id: string) => api.put(`/api/categories/${id}`, { name: editCatName.trim(), color: editCatColor }),
    onSuccess: () => {
      message.success('Categoría actualizada')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setEditCat(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const deleteCat = useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess: () => {
      message.success('Categoría eliminada')
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const openNew = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ uniMedida: 99, cost: 0 })
    setDrawerOpen(true)
  }

  const openEdit = (record: any) => {
    setEditing(record)
    form.setFieldsValue({
      name:              record.name,
      description:       record.description ?? '',
      sku:               record.sku ?? '',
      price:             Number(record.price),
      cost:              Number(record.cost ?? 0),
      priceWholesale:    record.priceWholesale    != null ? Number(record.priceWholesale)    : null,
      priceDistribution: record.priceDistribution != null ? Number(record.priceDistribution) : null,
      priceSpecial:      record.priceSpecial      != null ? Number(record.priceSpecial)      : null,
      commissionAmount:  record.commissionAmount  != null ? Number(record.commissionAmount)  : null,
      categoryId:        record.categoryId ?? undefined,
      uniMedida:         Number(record.uniMedida ?? 99),
      emoji:             record.emoji ?? '',
      imageUrl:          record.imageUrl ?? '',
    })
    setDrawerOpen(true)
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: ColumnsType<any> = [
    {
      title: 'Servicio', key: 'servicio',
      render: (r: any) => {
        const imgSrc = resolveImageUrl(r.imageUrl)
        return (
        <Space size={10} align="start">
          {imgSrc
            ? <Avatar src={imgSrc} shape="square" size={40} style={{ borderRadius: 8, flexShrink: 0 }} />
            : r.emoji
              ? <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{r.emoji}</span>
              : null
          }
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
            {r.description && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {r.description.length > 70 ? r.description.slice(0, 70) + '…' : r.description}
              </Text>
            )}
            {r.sku && (
              <code style={{ fontSize: 10, background: token.colorFillSecondary, padding: '1px 5px', borderRadius: 4 }}>
                {r.sku}
              </code>
            )}
          </Space>
        </Space>
        )
      },
    },
    {
      title: 'Categoría', key: 'categoria', width: 140,
      render: (r: any) => r.category
        ? <Tag color={r.category.color ?? undefined} style={{ borderRadius: 5 }}>{r.category.name}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Precios', key: 'precio', width: 155, align: 'right',
      render: (r: any) => (
        <Space direction="vertical" size={1} style={{ alignItems: 'flex-end' }}>
          <Tooltip title="Precio estándar">
            <Text strong style={{ color: token.colorPrimary, fontSize: 13 }}>${Number(r.price).toFixed(2)}</Text>
          </Tooltip>
          <Space size={2} wrap style={{ justifyContent: 'flex-end' }}>
            {r.priceWholesale != null && Number(r.priceWholesale) > 0 && (
              <Tooltip title={`Mayoreo: $${Number(r.priceWholesale).toFixed(2)}`}>
                <Tag color="blue" style={{ fontSize: 9, margin: 0, borderRadius: 4, lineHeight: '16px', padding: '0 4px', cursor: 'default' }}>
                  May ${Number(r.priceWholesale).toFixed(2)}
                </Tag>
              </Tooltip>
            )}
            {r.priceDistribution != null && Number(r.priceDistribution) > 0 && (
              <Tooltip title={`Distribución: $${Number(r.priceDistribution).toFixed(2)}`}>
                <Tag color="purple" style={{ fontSize: 9, margin: 0, borderRadius: 4, lineHeight: '16px', padding: '0 4px', cursor: 'default' }}>
                  Dist ${Number(r.priceDistribution).toFixed(2)}
                </Tag>
              </Tooltip>
            )}
            {r.priceSpecial != null && Number(r.priceSpecial) > 0 && (
              <Tooltip title={`Especial: $${Number(r.priceSpecial).toFixed(2)}`}>
                <Tag color="gold" style={{ fontSize: 9, margin: 0, borderRadius: 4, lineHeight: '16px', padding: '0 4px', cursor: 'default' }}>
                  Esp ${Number(r.priceSpecial).toFixed(2)}
                </Tag>
              </Tooltip>
            )}
            {r.commissionAmount != null && Number(r.commissionAmount) > 0 && (
              <Tooltip title={`Comisión fija: $${Number(r.commissionAmount).toFixed(2)}/und`}>
                <Tag icon={<DollarOutlined />} color="orange" style={{ fontSize: 9, margin: 0, borderRadius: 4, lineHeight: '16px', padding: '0 4px', cursor: 'default' }}>
                  Com ${Number(r.commissionAmount).toFixed(2)}
                </Tag>
              </Tooltip>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Estado', key: 'estado', width: 90, align: 'center',
      render: (r: any) => (
        <Tag
          color={r.isActive !== false ? 'success' : 'default'}
          style={{ borderRadius: 6, fontWeight: 600 }}
        >
          {r.isActive !== false ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: '', key: 'actions', width: 80, fixed: 'right', align: 'center',
      render: (r: any) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar este servicio?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => deleteMutation.mutate(r.id)}
            okText="Eliminar" cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Eliminar">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const kpis = [
    { title: 'Total servicios',   value: services.length,          color: token.colorPrimary, icon: <ToolOutlined />          },
    { title: 'Activos',           value: services.filter(s => s.isActive !== false).length, color: '#52c41a', icon: <CheckCircleOutlined /> },
    { title: 'Precio promedio',   value: `$${avgPrice.toFixed(2)}`, color: token.colorWarning, icon: <DollarOutlined />        },
    { title: 'Categorías',        value: categories.length,         color: '#722ed1',           icon: <TagsOutlined />          },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Title level={4} style={{ margin: '0 0 2px', fontWeight: 700 }}>
          Servicios
        </Typography.Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Catálogo de servicios para facturación DTE — cortes, tratamientos, consultas
        </Text>
      </div>

      {/* KPIs */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        {kpis.map(k => (
          <Col xs={12} sm={12} md={6} key={k.title}>
            <Card
              size="small"
              style={{
                borderRadius: 12, border: 'none',
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                borderTop: `3px solid ${k.color}`,
              }}
            >
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
      <Card
        size="small"
        style={{ borderRadius: 12, marginBottom: 14, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
          <Space wrap size={8}>
            <Input
              prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
              placeholder="Buscar nombre, descripción, SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              allowClear
              style={{ width: 260, borderRadius: 8 }}
            />
            <Select
              placeholder="Categoría"
              allowClear
              value={catFilter}
              onChange={setCatFilter}
              style={{ width: 180 }}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
            />
          </Space>
          <Space size={8}>
            <Tooltip title="Recargar">
              <Button icon={<ReloadOutlined />} onClick={() => {
                qc.invalidateQueries({ queryKey: ['products'] })
                qc.invalidateQueries({ queryKey: ['categories'] })
              }} />
            </Tooltip>
            <Button icon={<TagsOutlined />} onClick={() => setCatDrawer(true)}>
              Categorías
            </Button>
            <Button
              type="primary" icon={<PlusOutlined />} onClick={openNew}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Nuevo servicio
            </Button>
          </Space>
        </div>
      </Card>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 640 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} servicios`,
            style: { padding: '8px 16px' },
          }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
          locale={{
            emptyText: (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <ToolOutlined style={{ fontSize: 32, color: token.colorTextDisabled }} />
                <div style={{ marginTop: 8, color: token.colorTextSecondary }}>
                  {search || catFilter
                    ? 'Sin resultados. Cambia los filtros.'
                    : 'Sin servicios registrados. Usa "+ Nuevo servicio".'}
                </div>
              </div>
            ),
          }}
        />
      </Card>

      {/* ── Drawer crear / editar servicio ───────────────────────────────── */}
      <Drawer
        title={
          <Space>
            {editing?.id ? <EditOutlined /> : <PlusOutlined />}
            {editing?.id ? 'Editar servicio' : 'Nuevo servicio'}
          </Space>
        }
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null) }}
        width={480}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button style={{ borderRadius: 8 }} onClick={() => { setDrawerOpen(false); setEditing(null) }}>
              Cancelar
            </Button>
            <Button
              type="primary" loading={saveMutation.isPending}
              style={{ borderRadius: 8, fontWeight: 600 }}
              onClick={() => form.submit()}
            >
              {editing?.id ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </div>
        }
        styles={{ footer: { borderTop: `1px solid ${token.colorBorderSecondary}`, padding: '12px 16px' } }}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={values => saveMutation.mutate(values)}
        >
          <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Identificación
          </Text>
          <Divider style={{ margin: '6px 0 14px' }} />

          <Form.Item name="name" label="Nombre" rules={[{ required: true, min: 2 }]} style={{ marginBottom: 14 }}>
            <Input placeholder="Ej: Corte de cabello, Consulta médica..." style={{ borderRadius: 8 }} autoFocus />
          </Form.Item>

          <Form.Item name="description" label="Descripción" style={{ marginBottom: 14 }}>
            <Input.TextArea rows={2} placeholder="Descripción del servicio (opcional)" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            label="Ícono / Imagen"
            tooltip="Emoji o foto del servicio para el POS y listados"
            style={{ marginBottom: 14 }}
          >
            <Form.Item name="emoji"    noStyle hidden><Input /></Form.Item>
            <Form.Item name="imageUrl" noStyle hidden><Input /></Form.Item>
            <Form.Item noStyle shouldUpdate={(p, c) => p.emoji !== c.emoji || p.imageUrl !== c.imageUrl}>
              {({ getFieldValue, setFieldsValue }) => (
                <IconOrImagePicker
                  emoji={getFieldValue('emoji')}
                  imageUrl={getFieldValue('imageUrl')}
                  onChange={({ emoji, imageUrl }) => setFieldsValue({ emoji: emoji ?? '', imageUrl: imageUrl ?? '' })}
                  folder="polaris/servicios"
                />
              )}
            </Form.Item>
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="sku" label="SKU / Código interno" style={{ marginBottom: 14 }}>
                <Input placeholder="Ej: SERV-001" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="categoryId" label="Categoría" style={{ marginBottom: 14 }}>
                <Select
                  placeholder="Sin categoría" allowClear
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  style={{ borderRadius: 8 }}
                  dropdownRender={menu => (
                    <>
                      {menu}
                      <Divider style={{ margin: '4px 0' }} />
                      <div style={{ padding: '4px 8px' }}>
                        <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => setCatDrawer(true)}>
                          Gestionar categorías
                        </Button>
                      </div>
                    </>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Precios y comisiones
          </Text>
          <Divider style={{ margin: '6px 0 14px' }} />

          <Card size="small" style={{ borderRadius: 10, marginBottom: 14, background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}` }}>
            <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 12, color: token.colorTextSecondary }}>
              Precios
            </Text>
            <Row gutter={12}>
              <Col xs={12}>
                <Form.Item name="price" label="Precio estándar" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                  <InputNumber min={0} step={0.01} prefix="$" precision={2} style={{ width: '100%', borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col xs={12}>
                <Form.Item name="priceWholesale" label="Precio mayoreo" style={{ marginBottom: 14 }}>
                  <InputNumber min={0} step={0.01} prefix="$" precision={2} style={{ width: '100%', borderRadius: 8 }} placeholder="Opcional" />
                </Form.Item>
              </Col>
              <Col xs={12}>
                <Form.Item name="priceDistribution" label="Precio distribución" style={{ marginBottom: 14 }}>
                  <InputNumber min={0} step={0.01} prefix="$" precision={2} style={{ width: '100%', borderRadius: 8 }} placeholder="Opcional" />
                </Form.Item>
              </Col>
              <Col xs={12}>
                <Form.Item name="priceSpecial" label="Precio especial" style={{ marginBottom: 14 }}>
                  <InputNumber min={0} step={0.01} prefix="$" precision={2} style={{ width: '100%', borderRadius: 8 }} placeholder="Opcional" />
                </Form.Item>
              </Col>
              <Col xs={12}>
                <Form.Item
                  name="commissionAmount"
                  label="Comisión fija (tipo A)"
                  tooltip="Monto fijo de comisión por unidad vendida"
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber min={0} step={0.01} prefix="$" precision={2} style={{ width: '100%', borderRadius: 8 }} placeholder="Opcional" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Row gutter={12}>
            <Col xs={12}>
              <Form.Item name="cost" label="Costo" style={{ marginBottom: 14 }}>
                <InputNumber min={0} step={0.01} prefix="$" precision={2} style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item
                name="uniMedida"
                label="Unidad de medida (código MH)"
                style={{ marginBottom: 0 }}
              >
                <Select options={UNI_MEDIDA_OPTIONS} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>

      {/* ── Drawer categorías ─────────────────────────────────────────────── */}
      <Drawer
        title={<Space><TagsOutlined /> Categorías de servicios</Space>}
        open={catDrawer}
        onClose={() => { setCatDrawer(false); setEditCat(null) }}
        width={380}
        styles={{ body: { padding: 0 } }}
      >
        {/* Nueva categoría */}
        <div style={{
          padding: '16px 16px 14px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorFillAlter,
        }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
            Nueva categoría
          </Text>
          <Input
            placeholder="Ej: Tratamientos, Cortes, Consultas..."
            value={catName}
            onChange={e => setCatName(e.target.value)}
            style={{ borderRadius: 8, marginBottom: 10 }}
            onPressEnter={() => catName.trim() && createCat.mutate()}
          />
          <Text style={{ fontSize: 12, color: token.colorTextSecondary, display: 'block', marginBottom: 6 }}>
            Color de etiqueta
          </Text>
          <ColorSwatch value={catColor} onChange={setCatColor} />
          <Button
            type="primary" block icon={<PlusOutlined />}
            loading={createCat.isPending}
            disabled={!catName.trim()}
            onClick={() => createCat.mutate()}
            style={{ borderRadius: 8, fontWeight: 600, marginTop: 12 }}
          >
            Agregar categoría
          </Button>
        </div>

        {/* Lista */}
        <div style={{ padding: 16 }}>
          <Text style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 12, display: 'block' }}>
            {categories.length} {categories.length === 1 ? 'categoría registrada' : 'categorías registradas'}
          </Text>

          {categories.length === 0
            ? <Empty description="Sin categorías" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            : categories.map((cat: any) => {
                const isEditing = editCat?.id === cat.id
                return (
                  <Card
                    key={cat.id}
                    size="small"
                    style={{
                      marginBottom: 8, borderRadius: 10,
                      border: isEditing
                        ? `2px solid ${token.colorPrimary}`
                        : `1px solid ${token.colorBorderSecondary}`,
                      transition: 'border 0.2s',
                    }}
                  >
                    {isEditing ? (
                      <div>
                        <Input
                          value={editCatName}
                          onChange={e => setEditCatName(e.target.value)}
                          style={{ borderRadius: 6, marginBottom: 10 }}
                          autoFocus
                        />
                        <Text style={{ fontSize: 12, color: token.colorTextSecondary, display: 'block', marginBottom: 6 }}>
                          Color
                        </Text>
                        <ColorSwatch value={editCatColor} onChange={setEditCatColor} />
                        <Space style={{ marginTop: 10, width: '100%', justifyContent: 'flex-end' }}>
                          <Button size="small" icon={<CloseOutlined />} style={{ borderRadius: 6 }} onClick={() => setEditCat(null)}>
                            Cancelar
                          </Button>
                          <Button
                            type="primary" size="small" icon={<CheckOutlined />}
                            loading={updateCat.isPending}
                            disabled={!editCatName.trim()}
                            onClick={() => updateCat.mutate(cat.id)}
                            style={{ borderRadius: 6 }}
                          >
                            Guardar
                          </Button>
                        </Space>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Space size={8}>
                          <div style={{
                            width: 14, height: 14, borderRadius: 4,
                            background: cat.color ?? token.colorPrimary, flexShrink: 0,
                          }} />
                          <div>
                            <Text strong style={{ fontSize: 13 }}>{cat.name}</Text>
                            {cat._count?.services > 0 && (
                              <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                {cat._count.services} serv.
                              </Text>
                            )}
                          </div>
                        </Space>
                        <Space size={4}>
                          <Button
                            size="small" icon={<EditOutlined />}
                            onClick={() => {
                              setEditCat(cat)
                              setEditCatName(cat.name)
                              setEditCatColor(cat.color ?? COLOR_PRESETS[0])
                            }}
                          />
                          <Popconfirm
                            title="¿Eliminar categoría?"
                            description={
                              cat._count?.services > 0
                                ? 'Los servicios asignados quedarán sin categoría.'
                                : undefined
                            }
                            onConfirm={() => deleteCat.mutate(cat.id)}
                            okText="Eliminar" cancelText="Cancelar"
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      </div>
                    )}
                  </Card>
                )
              })
          }
        </div>
      </Drawer>
    </div>
  )
}

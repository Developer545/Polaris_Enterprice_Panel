'use client'
import { useState, useMemo, useRef } from 'react'
import {
  Table, Button, Tag, Typography, Modal, Form, Select, InputNumber, Input,
  App, Row, Col, Statistic, Card, Space, DatePicker, Drawer, Divider,
  ColorPicker, Badge, theme, Empty,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  DollarOutlined, CalendarOutlined, SearchOutlined, SettingOutlined, TagOutlined,
  FileExcelOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { downloadXlsx } from '../../../lib/download-xlsx'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const COLORES_PRESET = [
  '#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#10b981', '#f97316', '#06b6d4',
  '#84cc16', '#ec4899', '#6366f1', '#14b8a6',
]

function fmt(n: number) { return `$${n.toFixed(2)}` }

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function ExpensesPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const { companyId } = useAppContext()

  // ── Filtros ────────────────────────────────────────────────────────────────

  const [search,    setSearch]    = useState('')
  const [filterCat, setFilterCat] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  // ── Modals / Drawer ────────────────────────────────────────────────────────

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editExpense, setEditExpense] = useState<any>(null)
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [editCat,     setEditCat]     = useState<any>(null)
  const [catColor,    setCatColor]    = useState('#0d9488')
  const drawerFormRef = useRef<HTMLDivElement>(null)

  const [form]    = Form.useForm()
  const [catForm] = Form.useForm()

  // ── Queries ────────────────────────────────────────────────────────────────

  const allQ = useQuery({
    queryKey: ['expenses-all', companyId],
    queryFn: () => api.get('/api/expenses', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const catsQ = useQuery({
    queryKey: ['expense-categories', companyId],
    queryFn: () => api.get('/api/expenses/categories', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const allData: any[]    = allQ.data ?? []
  const categories: any[] = catsQ.data ?? []

  // ── Filtrado cliente ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = allData
    if (filterCat) list = list.filter(g => g.categoryId === filterCat)
    if (dateRange) {
      list = list.filter(g => {
        const d = dayjs(g.date)
        return (d.isSame(dateRange[0], 'day') || d.isAfter(dateRange[0], 'day')) &&
               (d.isSame(dateRange[1], 'day') || d.isBefore(dateRange[1], 'day'))
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(g =>
        g.description?.toLowerCase().includes(q) ||
        g.category?.name?.toLowerCase().includes(q) ||
        (g.notes ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [allData, filterCat, dateRange, search])

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const now = new Date()
  const totalHoy = allData
    .filter(g => isSameDay(new Date(g.date), now))
    .reduce((s, g) => s + Number(g.amount), 0)
  const totalMes = allData
    .filter(g => { const d = new Date(g.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .reduce((s, g) => s + Number(g.amount), 0)
  const totalAno = allData
    .filter(g => new Date(g.date).getFullYear() === now.getFullYear())
    .reduce((s, g) => s + Number(g.amount), 0)
  const totalFiltrado = filtered.reduce((s, g) => s + Number(g.amount), 0)

  // Resumen por categoría (mes actual)
  const catMap: Record<string, { nombre: string; color: string; total: number; count: number }> = {}
  allData
    .filter(g => { const d = new Date(g.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    .forEach(g => {
      const id = g.categoryId ?? '__sin'
      if (!catMap[id]) catMap[id] = { nombre: g.category?.name ?? 'Sin categoría', color: g.category?.color ?? '#6b7280', total: 0, count: 0 }
      catMap[id].total += Number(g.amount)
      catMap[id].count++
    })
  const resumen = Object.entries(catMap).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total)
  const catTop = resumen[0] ?? null

  // ── Mutations — gastos ─────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/expenses', { ...values, companyId }),
    onSuccess: () => { message.success('Gasto registrado'); qc.invalidateQueries({ queryKey: ['expenses-all'] }); setModalOpen(false); form.resetFields() },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) => api.put(`/api/expenses/${id}`, values),
    onSuccess: () => { message.success('Gasto actualizado'); qc.invalidateQueries({ queryKey: ['expenses-all'] }); setModalOpen(false); setEditExpense(null); form.resetFields() },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/expenses/${id}`),
    onSuccess: () => { message.success('Gasto eliminado'); qc.invalidateQueries({ queryKey: ['expenses-all'] }) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  // ── Mutations — categorías ─────────────────────────────────────────────────

  const createCatMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/expenses/categories', { ...values, companyId }),
    onSuccess: () => { message.success('Categoría creada'); qc.invalidateQueries({ queryKey: ['expense-categories'] }); catForm.resetFields(); setCatColor('#0d9488'); setEditCat(null) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const updateCatMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) => api.put(`/api/expenses/categories/${id}`, values),
    onSuccess: () => { message.success('Categoría actualizada'); qc.invalidateQueries({ queryKey: ['expense-categories'] }); qc.invalidateQueries({ queryKey: ['expenses-all'] }); catForm.resetFields(); setCatColor('#0d9488'); setEditCat(null) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/expenses/categories/${id}`),
    onSuccess: () => { message.success('Categoría eliminada'); qc.invalidateQueries({ queryKey: ['expense-categories'] }) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  // ── Helpers ────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditExpense(null)
    form.resetFields()
    form.setFieldsValue({ date: dayjs() })
    setModalOpen(true)
  }

  function openEdit(r: any) {
    setEditExpense(r)
    form.setFieldsValue({
      description: r.description,
      categoryId:  r.categoryId,
      amount:      Number(r.amount),
      date:        dayjs(r.date),
      notes:       r.notes,
    })
    setModalOpen(true)
  }

  function startEditCat(c: any) {
    setEditCat(c)
    setCatColor(c.color ?? '#0d9488')
    catForm.setFieldsValue({ name: c.name })
    setTimeout(() => drawerFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function handleSaveExpense(values: any) {
    const dto = { ...values, date: values.date.toISOString() }
    if (editExpense) {
      updateMutation.mutate({ id: editExpense.id, values: dto })
    } else {
      createMutation.mutate(dto)
    }
  }

  function handleSaveCat(values: any) {
    const dto = { ...values, color: catColor }
    if (editCat) {
      updateCatMutation.mutate({ id: editCat.id, values: dto })
    } else {
      createCatMutation.mutate(dto)
    }
  }

  // ── Columnas ───────────────────────────────────────────────────────────────

  const columns: ColumnsType<any> = [
    {
      title: 'Fecha', dataIndex: 'date', width: 110,
      render: (v: string) => <Text style={{ fontSize: 13 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
      sorter: (a, b) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Categoría', width: 160,
      render: (_: any, r: any) => r.category ? (
        <Tag style={{ borderColor: r.category.color, color: r.category.color, background: r.category.color + '18', fontWeight: 500 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: r.category.color, marginRight: 6 }} />
          {r.category.name}
        </Tag>
      ) : <Text type="secondary" style={{ fontSize: 12 }}>Sin categoría</Text>,
      filters: categories.map((c: any) => ({ text: c.name, value: c.id })),
      onFilter: (value, record) => record.categoryId === value,
    },
    {
      title: 'Descripción',
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{r.description}</div>
          {r.notes && <Text type="secondary" style={{ fontSize: 11 }}>{r.notes}</Text>}
        </div>
      ),
    },
    {
      title: 'Monto', dataIndex: 'amount', width: 110, align: 'right',
      render: (v: any) => (
        <Text strong style={{ color: token.colorError, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(Number(v))}
        </Text>
      ),
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
    },
    {
      title: '', width: 80, align: 'center',
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button type="text" size="small" danger icon={<DeleteOutlined />}
            onClick={() => Modal.confirm({
              title: 'Eliminar gasto',
              content: 'Esta acción no se puede deshacer.',
              okText: 'Eliminar', cancelText: 'Cancelar',
              okButtonProps: { danger: true },
              onOk: () => deleteMutation.mutate(r.id),
            })}
          />
        </Space>
      ),
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Gastos</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Registro y control de egresos del negocio</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => qc.invalidateQueries({ queryKey: ['expenses-all'] })} />
          <Button
            icon={<FileExcelOutlined />}
            style={{ color: '#217346', borderColor: '#217346' }}
            onClick={async () => {
              const xlsxParams: Record<string, any> = { companyId }
              if (dateRange?.[0]) xlsxParams.from = dateRange[0].startOf('day').toISOString()
              if (dateRange?.[1]) xlsxParams.to   = dateRange[1].endOf('day').toISOString()
              const date = new Date().toISOString().slice(0, 10)
              await downloadXlsx('/api/reports/expenses', `reporte_gastos_${date}.xlsx`, xlsxParams)
            }}
          >
            Excel
          </Button>
          <Button icon={<SettingOutlined />} onClick={() => setDrawerOpen(true)}>Categorías</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ background: token.colorPrimary, borderRadius: 8, fontWeight: 600 }}>
            Nuevo gasto
          </Button>
        </Space>
      </div>

      {/* KPIs */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: `3px solid ${token.colorWarning}` }}>
            <Statistic title="Gastos hoy" value={fmt(totalHoy)}
              valueStyle={{ fontSize: 20, fontWeight: 700, color: token.colorWarning }}
              prefix={<DollarOutlined style={{ color: token.colorWarning }} />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: `3px solid ${token.colorError}` }}>
            <Statistic title="Gastos este mes" value={fmt(totalMes)}
              valueStyle={{ fontSize: 20, fontWeight: 700, color: token.colorError }}
              prefix={<CalendarOutlined style={{ color: token.colorError }} />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: `3px solid ${token.colorTextSecondary}` }}>
            <Statistic title="Gastos este año" value={fmt(totalAno)}
              valueStyle={{ fontSize: 20, fontWeight: 700, color: token.colorTextSecondary }}
              prefix={<DollarOutlined style={{ color: token.colorTextSecondary }} />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: `3px solid ${catTop?.color ?? '#8b5cf6'}` }}>
            <Statistic
              title={catTop ? `Cat. top: ${catTop.nombre}` : 'Categoría top del mes'}
              value={catTop ? fmt(catTop.total) : '—'}
              valueStyle={{ fontSize: 20, fontWeight: 700, color: catTop?.color ?? '#8b5cf6' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Resumen por categoría del mes */}
      {resumen.length > 0 && (
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          {resumen.map(r => (
            <Col key={r.id} xs={12} sm={8} md={6} lg={4}>
              <Card size="small" hoverable style={{ borderRadius: 8 }}>
                <Space align="center" size={8}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: token.colorTextSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>
                      {r.nombre}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: r.color }}>{fmt(r.total)}</div>
                    <div style={{ fontSize: 10, color: token.colorTextQuaternary }}>{r.count} {r.count === 1 ? 'gasto' : 'gastos'}</div>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Tabla */}
      <Card size="small" style={{ borderRadius: 10, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: 0 } }}>

        {/* Toolbar */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}`, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
            placeholder="Buscar descripción, categoría o notas..."
            allowClear value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          <Select
            placeholder="Categoría" allowClear style={{ width: 160 }}
            value={filterCat} onChange={setFilterCat}
            options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
          />
          <RangePicker value={dateRange} onChange={(v) => setDateRange(v as any)} format="DD/MM/YY" />
          <Button onClick={() => { setSearch(''); setFilterCat(undefined); setDateRange(null) }}>Limpiar</Button>
          <div style={{ marginLeft: 'auto' }}>
            {filtered.length > 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Total filtrado: <Text strong style={{ color: token.colorError }}>{fmt(totalFiltrado)}</Text>
              </Text>
            )}
          </div>
        </div>

        <Table
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={allQ.isLoading}
          scroll={{ x: 700 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['15', '30', '50'],
            showTotal: (t, [a, b]) => `${a}–${b} de ${t} gastos`,
          }}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin gastos registrados">
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  Registrar primer gasto
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Modal nuevo / editar gasto */}
      <Modal
        open={modalOpen}
        title={
          <Space>
            {editExpense ? <EditOutlined /> : <DollarOutlined style={{ color: token.colorError }} />}
            {editExpense ? 'Editar gasto' : 'Nuevo gasto'}
          </Space>
        }
        onCancel={() => { setModalOpen(false); setEditExpense(null); form.resetFields() }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editExpense ? 'Guardar cambios' : 'Registrar gasto'}
        okButtonProps={{ danger: true, style: { borderRadius: 8, fontWeight: 600 } }}
        width={500}
        style={{ top: 40 }}
        styles={{ header: { borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSaveExpense}>
          <Form.Item name="categoryId" label="Categoría">
            <Select
              showSearch optionFilterProp="label" placeholder="Seleccionar categoría..." allowClear
              options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
              dropdownRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '6px 0' }} />
                  <div style={{ padding: '4px 8px' }}>
                    <Button type="link" size="small" icon={<PlusOutlined />}
                      onClick={() => { setModalOpen(false); setDrawerOpen(true) }}
                      style={{ padding: 0 }}>
                      Nueva categoría
                    </Button>
                  </div>
                </>
              )}
            />
          </Form.Item>
          <Form.Item name="description" label="Descripción" rules={[{ required: true, min: 2, message: 'Mínimo 2 caracteres' }]}>
            <Input placeholder="Ej: Papel de tienda, Servicio de agua..." maxLength={200} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="amount" label="Monto ($)" rules={[{ required: true, message: 'Requerido' }]}>
                <InputNumber min={0.01} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date" label="Fecha" rules={[{ required: true, message: 'Requerido' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" allowClear={false} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} placeholder="Observaciones opcionales" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer gestión de categorías */}
      <Drawer
        title={<Space><TagOutlined style={{ color: token.colorPrimary }} />Gestionar categorías</Space>}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditCat(null); catForm.resetFields(); setCatColor('#0d9488') }}
        width={400}
      >
        {/* Lista de categorías */}
        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ fontSize: 13 }}>Categorías activas ({categories.length})</Text>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.length === 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>Sin categorías aún. Crea la primera abajo.</Text>
            )}
            {categories.map((c: any) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 8,
                border: `1px solid ${editCat?.id === c.id ? c.color : token.colorBorderSecondary}`,
                background: editCat?.id === c.id ? c.color + '18' : token.colorFillAlter,
              }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.color, marginRight: 10, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                  <Badge
                    count={c._count?.expenses ?? 0}
                    style={{ backgroundColor: c.color, fontSize: 10 }}
                    overflowCount={999}
                  />
                </div>
                <Space size={4}>
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => startEditCat(c)} />
                  <Button
                    type="text" size="small" danger icon={<DeleteOutlined />}
                    disabled={(c._count?.expenses ?? 0) > 0}
                    title={(c._count?.expenses ?? 0) > 0 ? `Tiene ${c._count.expenses} gasto(s), no se puede eliminar` : 'Eliminar categoría'}
                    onClick={() => Modal.confirm({
                      title: 'Eliminar categoría',
                      content: 'Esta acción no se puede deshacer.',
                      okText: 'Eliminar', cancelText: 'Cancelar',
                      okButtonProps: { danger: true },
                      onOk: () => deleteCatMutation.mutate(c.id),
                    })}
                  />
                </Space>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* Formulario nueva / editar categoría */}
        <div ref={drawerFormRef}>
          <Text strong style={{ fontSize: 13 }}>
            {editCat ? 'Editar categoría' : 'Nueva categoría'}
          </Text>
          <Form form={catForm} layout="vertical" requiredMark={false} style={{ marginTop: 12 }} onFinish={handleSaveCat}>
            <Form.Item name="name" label="Nombre" rules={[{ required: true, min: 2 }]}>
              <Input placeholder="Ej: Suministros, Servicios, Alquiler..." maxLength={80} />
            </Form.Item>

            <Form.Item label="Color">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                {COLORES_PRESET.map(col => (
                  <button key={col} onClick={() => setCatColor(col)} style={{
                    width: 24, height: 24, borderRadius: '50%', background: col, cursor: 'pointer', padding: 0,
                    border: catColor === col ? `3px solid ${token.colorText}` : '2px solid transparent',
                  }} />
                ))}
                <ColorPicker value={catColor} onChange={(_, hex) => setCatColor(hex)} size="small" />
              </div>
              {catColor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: catColor, display: 'inline-block' }} />
                  <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>{catColor}</Text>
                </div>
              )}
            </Form.Item>

            <div style={{ display: 'flex', gap: 8 }}>
              {editCat && (
                <Button onClick={() => { setEditCat(null); catForm.resetFields(); setCatColor('#0d9488') }}>
                  Cancelar
                </Button>
              )}
              <Button
                type="primary"
                htmlType="submit"
                icon={editCat ? <EditOutlined /> : <PlusOutlined />}
                loading={createCatMutation.isPending || updateCatMutation.isPending}
                block={!editCat}
              >
                {editCat ? 'Guardar cambios' : 'Crear categoría'}
              </Button>
            </div>
          </Form>
        </div>
      </Drawer>
    </div>
  )
}

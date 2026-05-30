'use client'
import { useState } from 'react'
import {
  Table, Button, Tag, Input, Drawer, Form, Select, App,
  Typography, Switch, Popconfirm, Card, Space, Tooltip,
} from 'antd'
import { PlusOutlined, EditOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography
const CARD_SHADOW = { borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

export default function DistritosTab() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing]       = useState<any | null>(null)
  const [search, setSearch]         = useState('')
  const [filterDept, setFilterDept] = useState<string | undefined>()
  const [filterMuni, setFilterMuni] = useState<string | undefined>()

  const { data: departamentos = [] } = useQuery({
    queryKey: ['admin', 'catalogs', 'departamentos'],
    queryFn: () => api.get('/api/control-plane/catalogs/departamentos').then(r => r.data),
  })

  const { data: municipios = [] } = useQuery({
    queryKey: ['admin', 'catalogs', 'municipios', filterDept],
    queryFn: () =>
      api.get('/api/control-plane/catalogs/municipios', { params: filterDept ? { departamentoCod: filterDept } : {} })
        .then(r => r.data),
    enabled: !!filterDept,
  })

  // municipios for drawer form (based on selected dept in form)
  const formDept = Form.useWatch('departamentoCod', form)
  const { data: formMunicipios = [] } = useQuery({
    queryKey: ['admin', 'catalogs', 'municipios', formDept],
    queryFn: () =>
      api.get('/api/control-plane/catalogs/municipios', { params: { departamentoCod: formDept } })
        .then(r => r.data),
    enabled: !!formDept,
  })

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'catalogs', 'distritos', filterDept, filterMuni],
    queryFn: () =>
      api.get('/api/control-plane/catalogs/distritos', {
        params: {
          ...(filterDept ? { departamentoCod: filterDept } : {}),
          ...(filterMuni ? { municipioCod: filterMuni } : {}),
        },
      }).then(r => r.data),
  })

  const filtered = data.filter((d: any) =>
    d.nombre.toLowerCase().includes(search.toLowerCase()) ||
    d.codigo.toLowerCase().includes(search.toLowerCase())
  )

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editing?.id
        ? api.put(`/api/control-plane/catalogs/distritos/${editing.id}`, values)
        : api.post('/api/control-plane/catalogs/distritos', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'catalogs', 'distritos'] })
      message.success(editing?.id ? 'Distrito actualizado' : 'Distrito creado')
      closeDrawer()
    },
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Error al guardar'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/control-plane/catalogs/distritos/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'catalogs', 'distritos'] }),
  })

  const openEdit = (row: any) => {
    setEditing(row)
    form.setFieldsValue({
      codigo: row.codigo,
      nombre: row.nombre,
      departamentoCod: row.departamentoCod,
      municipioCod: row.municipioCod ?? undefined,
    })
    setDrawerOpen(true)
  }
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null); form.resetFields() }

  const columns = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 90,
      render: (v: string) => <Tag style={{ fontFamily: 'monospace', fontWeight: 700, borderRadius: 4 }}>{v}</Tag>,
    },
    {
      title: 'Distrito',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Departamento',
      key: 'departamento',
      render: (r: any) => (
        <Text style={{ fontSize: 12, color: '#787774' }}>
          {r.departamento?.nombre ?? r.departamentoCod}
        </Text>
      ),
    },
    {
      title: 'Municipio ref.',
      key: 'municipio',
      render: (r: any) => r.municipioCod
        ? <Tag color="blue" style={{ fontSize: 11 }}>{r.municipioCod}</Tag>
        : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 100,
      render: (r: any) => (
        <Popconfirm
          title={r.isActive ? '¿Desactivar distrito?' : '¿Activar distrito?'}
          onConfirm={() => toggleMutation.mutate(r.id)}
          okText="Sí" cancelText="No"
        >
          <Switch checked={r.isActive} size="small" />
        </Popconfirm>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (r: any) => (
        <Tooltip title="Editar">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
        </Tooltip>
      ),
    },
  ]

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Toolbar */}
      <Card size="small" style={{ ...CARD_SHADOW, marginBottom: 12 }} styles={{ body: { padding: '10px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Space wrap>
            <Input
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder="Buscar distrito..."
              style={{ width: 200 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              allowClear
            />
            <Select
              placeholder="Departamento"
              style={{ width: 180 }}
              allowClear
              showSearch
              optionFilterProp="label"
              onChange={v => { setFilterDept(v); setFilterMuni(undefined) }}
              options={departamentos.map((d: any) => ({ value: d.codigo, label: d.nombre }))}
            />
            <Select
              placeholder="Municipio"
              style={{ width: 180 }}
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={!filterDept}
              onChange={setFilterMuni}
              options={municipios.map((m: any) => ({ value: m.codigo, label: m.nombre }))}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {filtered.length} distrito{filtered.length !== 1 ? 's' : ''}
            </Text>
          </Space>
          <Space>
            <Tooltip title="Recargar"><Button icon={<ReloadOutlined />} onClick={() => refetch()} /></Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
              Nuevo distrito
            </Button>
          </Space>
        </div>
      </Card>

      {/* Tabla */}
      <Card size="small" style={CARD_SHADOW} styles={{ body: { padding: 0 } }}>
        <Table
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 25, showTotal: t => `${t} distritos`, showSizeChanger: false, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      <Drawer
        title={
          <Space>
            {editing?.id ? <EditOutlined /> : <PlusOutlined />}
            <span>{editing?.id ? 'Editar distrito' : 'Nuevo distrito'}</span>
          </Space>
        }
        open={drawerOpen}
        onClose={closeDrawer}
        width={420}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button type="primary" loading={saveMutation.isPending} onClick={() => form.submit()}>
              {editing?.id ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false}>
          <Form.Item name="departamentoCod" label="Departamento" rules={[{ required: true, message: 'Requerido' }]}>
            <Select
              showSearch
              placeholder="Seleccionar departamento"
              optionFilterProp="label"
              disabled={!!editing?.id}
              onChange={() => form.setFieldValue('municipioCod', undefined)}
              options={departamentos.map((d: any) => ({ value: d.codigo, label: `${d.codigo} — ${d.nombre}` }))}
            />
          </Form.Item>
          <Form.Item name="municipioCod" label="Municipio asociado (opcional)">
            <Select
              showSearch
              placeholder="Seleccionar municipio (opcional)"
              optionFilterProp="label"
              allowClear
              disabled={!formDept && !editing?.id}
              options={formMunicipios.map((m: any) => ({ value: m.codigo, label: `${m.codigo} — ${m.nombre}` }))}
            />
          </Form.Item>
          <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="01" maxLength={10} style={{ fontFamily: 'monospace', fontWeight: 600 }} />
          </Form.Item>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Nombre del distrito" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

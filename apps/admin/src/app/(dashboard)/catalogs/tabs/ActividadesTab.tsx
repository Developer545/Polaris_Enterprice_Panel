'use client'
import { useState } from 'react'
import {
  Table, Button, Tag, Input, Drawer, Form, App,
  Typography, Switch, Popconfirm, Card, Space, Tooltip,
} from 'antd'
import { PlusOutlined, EditOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography
const CARD_SHADOW = { borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

export default function ActividadesTab() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing]       = useState<any | null>(null)
  const [search, setSearch]         = useState('')

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'catalogs', 'actividades'],
    queryFn: () => api.get('/api/control-plane/catalogs/actividades').then((r) => r.data),
  })

  const filtered = data.filter((a: any) =>
    a.nombre.toLowerCase().includes(search.toLowerCase()) ||
    a.codigo.toLowerCase().includes(search.toLowerCase())
  )

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editing?.id
        ? api.put(`/api/control-plane/catalogs/actividades/${editing.id}`, values)
        : api.post('/api/control-plane/catalogs/actividades', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'catalogs', 'actividades'] })
      message.success(editing?.id ? 'Actividad actualizada' : 'Actividad creada')
      closeDrawer()
    },
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Error al guardar'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/control-plane/catalogs/actividades/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'catalogs', 'actividades'] }),
  })

  const openEdit = (row: any) => {
    setEditing(row)
    form.setFieldsValue({ codigo: row.codigo, nombre: row.nombre })
    setDrawerOpen(true)
  }
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null); form.resetFields() }

  const columns = [
    {
      title: 'Código CIIU',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 130,
      render: (v: string) => <Tag style={{ fontFamily: 'monospace', fontWeight: 700, borderRadius: 4, fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: 'Actividad económica',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 100,
      render: (r: any) => (
        <Popconfirm
          title={r.isActive ? '¿Desactivar actividad?' : '¿Activar actividad?'}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Space>
            <Input
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder="Buscar por código o descripción..."
              style={{ width: 300 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {filtered.length} actividad{filtered.length !== 1 ? 'es' : ''}
            </Text>
          </Space>
          <Space>
            <Tooltip title="Recargar"><Button icon={<ReloadOutlined />} onClick={() => refetch()} /></Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
              Nueva actividad
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
          scroll={{ x: 600 }}
          pagination={{ pageSize: 25, showTotal: (t) => `${t} actividades`, showSizeChanger: false, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      <Drawer
        title={<Space>{editing?.id ? <EditOutlined /> : <PlusOutlined />}<span>{editing?.id ? 'Editar actividad económica' : 'Nueva actividad económica'}</span></Space>}
        open={drawerOpen}
        onClose={closeDrawer}
        width={440}
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
          <Form.Item
            name="codigo"
            label="Código CIIU"
            rules={[{ required: true, message: 'Requerido' }]}
            help="Código de Clasificación Industrial Internacional Uniforme"
          >
            <Input placeholder="47111" maxLength={20} style={{ fontFamily: 'monospace', fontWeight: 600 }} />
          </Form.Item>
          <Form.Item name="nombre" label="Descripción de la actividad" rules={[{ required: true, message: 'Requerido' }]}>
            <Input.TextArea
              placeholder="Venta al por menor en almacenes no especializados..."
              rows={3}
              maxLength={300}
              showCount
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

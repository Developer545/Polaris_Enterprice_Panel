'use client'
import { useState } from 'react'
import {
  Table, Button, Tag, Input, Drawer, Form, App,
  Typography, Switch, Popconfirm, Card, Space, Tooltip, Badge,
} from 'antd'
import { PlusOutlined, EditOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography
const CARD_SHADOW = { borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

export default function DepartamentosTab() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing]       = useState<any | null>(null)
  const [search, setSearch]         = useState('')

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'catalogs', 'departamentos'],
    queryFn: () => api.get('/api/control-plane/catalogs/departamentos').then((r) => r.data),
  })

  const filtered = data.filter((d: any) =>
    d.nombre.toLowerCase().includes(search.toLowerCase()) ||
    d.codigo.toLowerCase().includes(search.toLowerCase())
  )

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editing?.id
        ? api.put(`/api/control-plane/catalogs/departamentos/${editing.id}`, values)
        : api.post('/api/control-plane/catalogs/departamentos', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'catalogs', 'departamentos'] })
      message.success(editing?.id ? 'Departamento actualizado' : 'Departamento creado')
      closeDrawer()
    },
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Error al guardar'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/control-plane/catalogs/departamentos/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'catalogs', 'departamentos'] }),
  })

  const openEdit = (row: any) => {
    setEditing(row)
    form.setFieldsValue({ codigo: row.codigo, nombre: row.nombre })
    setDrawerOpen(true)
  }

  const closeDrawer = () => { setDrawerOpen(false); setEditing(null); form.resetFields() }

  const columns = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 100,
      render: (v: string) => <Tag style={{ fontFamily: 'monospace', fontWeight: 700, borderRadius: 4 }}>{v}</Tag>,
    },
    {
      title: 'Departamento',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (v: string) => <Text style={{ fontWeight: 600, fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Municipios',
      key: 'municipios',
      width: 100,
      render: (r: any) => <Badge count={r._count?.municipios ?? 0} showZero style={{ backgroundColor: '#722ed1' }} />,
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 100,
      render: (r: any) => (
        <Popconfirm
          title={r.isActive ? '¿Desactivar departamento?' : '¿Activar departamento?'}
          onConfirm={() => toggleMutation.mutate(r.id)}
          okText="Sí" cancelText="No"
        >
          <Switch checked={r.isActive} size="small" loading={toggleMutation.isPending} />
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
              placeholder="Buscar departamento..."
              style={{ width: 260 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {filtered.length} departamento{filtered.length !== 1 ? 's' : ''}
            </Text>
          </Space>
          <Space>
            <Tooltip title="Recargar"><Button icon={<ReloadOutlined />} onClick={() => refetch()} /></Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
              Nuevo departamento
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
          pagination={{ pageSize: 20, showTotal: (t) => `${t} departamentos`, showSizeChanger: false, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      <Drawer
        title={<Space>{editing?.id ? <EditOutlined /> : <PlusOutlined />}<span>{editing?.id ? 'Editar departamento' : 'Nuevo departamento'}</span></Space>}
        open={drawerOpen}
        onClose={closeDrawer}
        width={400}
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
          <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="01" maxLength={10} style={{ fontFamily: 'monospace', fontWeight: 600 }} />
          </Form.Item>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ahuachapán" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

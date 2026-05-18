'use client'
import { useState } from 'react'
import {
  Table, Button, Tag, Typography, Drawer, Form, Input,
  InputNumber, Switch, App, Badge, Space, Card, Row, Col, Statistic, Tooltip,
} from 'antd'
import {
  PlusOutlined, EditOutlined, CheckOutlined, CloseOutlined,
  CrownOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'

const { Title, Text } = Typography
const CARD_SHADOW = { borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

export default function PlansPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const [editing, setEditing]   = useState<any | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/api/control-plane/plans').then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editing?.id
        ? api.put(`/api/control-plane/plans/${editing.id}`, values)
        : api.post('/api/control-plane/plans', values),
    onSuccess: () => {
      message.success(editing?.id ? 'Plan actualizado' : 'Plan creado')
      qc.invalidateQueries({ queryKey: ['plans'] })
      closeDrawer()
    },
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Error al guardar'),
  })

  function openEdit(plan: any) {
    setEditing(plan)
    form.setFieldsValue({ ...plan, price: Number(plan.price) })
    setDrawerOpen(true)
  }

  function openNew() {
    setEditing({})
    form.resetFields()
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
    form.resetFields()
  }

  const totalTenants = data.reduce((sum: number, p: any) => sum + (p._count?.tenants ?? 0), 0)

  const columns = [
    {
      title: 'Plan',
      key: 'name',
      render: (r: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: r.isActive ? 'linear-gradient(135deg, #722ed1, #9254de)' : '#f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CrownOutlined style={{ color: r.isActive ? '#fff' : '#bbb', fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
            {r.description && <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>}
          </div>
        </div>
      ),
    },
    {
      title: 'Precio / mes',
      dataIndex: 'price',
      key: 'price',
      render: (v: number) => (
        <Text strong style={{ color: '#722ed1', fontSize: 15 }}>${Number(v).toFixed(2)}</Text>
      ),
    },
    {
      title: 'Límites',
      key: 'limits',
      render: (r: any) => (
        <Space size={4} wrap>
          <Tag style={{ borderRadius: 4, fontSize: 11 }}>
            {r.maxCompanies === -1 ? '∞' : r.maxCompanies} empresa{r.maxCompanies !== 1 ? 's' : ''}
          </Tag>
          <Tag style={{ borderRadius: 4, fontSize: 11 }}>
            {r.maxBranches === -1 ? '∞' : r.maxBranches} sucursal{r.maxBranches !== 1 ? 'es' : ''}
          </Tag>
          <Tag style={{ borderRadius: 4, fontSize: 11 }}>
            {r.maxUsers === -1 ? '∞' : r.maxUsers} usuario{r.maxUsers !== 1 ? 's' : ''}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Tenants',
      key: 'tenants',
      width: 80,
      render: (r: any) => (
        <Badge
          count={r._count?.tenants ?? 0}
          showZero
          style={{ backgroundColor: '#722ed1' }}
        />
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (v: boolean) => v
        ? <Badge color="green" text="Activo" />
        : <Badge color="default" text="Inactivo" />,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (r: any) => (
        <Tooltip title="Editar plan">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
        </Tooltip>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Planes</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {data.length} plan{data.length !== 1 ? 'es' : ''} · {totalTenants} tenants en total
        </Text>
      </div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { title: 'Planes activos',  value: data.filter((p: any) => p.isActive).length,  color: '#722ed1' },
          { title: 'Total tenants',   value: totalTenants,                                  color: '#52c41a' },
        ].map((kpi) => (
          <Col key={kpi.title} xs={12} sm={6}>
            <Card size="small" style={CARD_SHADOW}>
              <Statistic
                title={<span style={{ fontSize: 12, color: '#888' }}>{kpi.title}</span>}
                value={kpi.value}
                valueStyle={{ color: kpi.color, fontWeight: 700, fontSize: 22 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Toolbar */}
      <Card size="small" style={{ ...CARD_SHADOW, marginBottom: 12 }} styles={{ body: { padding: '10px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: '#787774' }}>Gestiona los planes disponibles en la plataforma</Text>
          <Space>
            <Tooltip title="Recargar"><Button icon={<ReloadOutlined />} onClick={() => refetch()} /></Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nuevo plan</Button>
          </Space>
        </div>
      </Card>

      {/* Tabla */}
      <Card size="small" style={CARD_SHADOW} styles={{ body: { padding: 0 } }}>
        <Table
          size="small"
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, showSizeChanger: false, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      {/* Drawer */}
      <Drawer
        title={<Space>{editing?.id ? <EditOutlined /> : <PlusOutlined />}<span>{editing?.id ? 'Editar plan' : 'Nuevo plan'}</span></Space>}
        open={drawerOpen}
        onClose={closeDrawer}
        width={440}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button type="primary" loading={saveMutation.isPending} onClick={() => form.submit()}>
              {editing?.id ? 'Actualizar' : 'Crear plan'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false}>
          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Información</Text>
          <div style={{ marginBottom: 12 }} />
          <Form.Item name="name" label="Nombre del plan" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Básico / Profesional / Enterprise" />
          </Form.Item>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea placeholder="Descripción breve del plan" rows={2} />
          </Form.Item>
          <Form.Item name="price" label="Precio / mes (USD)" rules={[{ required: true, message: 'Requerido' }]}>
            <InputNumber min={0} step={0.01} prefix="$" style={{ width: '100%' }} placeholder="29.99" />
          </Form.Item>

          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Límites (−1 = ilimitado)</Text>
          </div>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="maxCompanies" label="Empresas" rules={[{ required: true }]} initialValue={1}>
                <InputNumber min={-1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxBranches" label="Sucursales" rules={[{ required: true }]} initialValue={1}>
                <InputNumber min={-1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxUsers" label="Usuarios" rules={[{ required: true }]} initialValue={5}>
                <InputNumber min={-1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isActive" label="Plan activo" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren={<CheckOutlined />} unCheckedChildren={<CloseOutlined />} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

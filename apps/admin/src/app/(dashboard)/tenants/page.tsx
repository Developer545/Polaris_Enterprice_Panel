'use client'
import { useState } from 'react'
import {
  Table, Button, Tag, Space, Typography, Badge, Drawer,
  Form, Input, Select, Row, Col, App, Tooltip, Modal,
  Descriptions, Card, Avatar, Statistic,
} from 'antd'
import {
  PlusOutlined, CopyOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, TeamOutlined, ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '../../../lib/api'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const STATUS_COLOR: Record<string, string> = {
  TRIAL: 'blue', ACTIVE: 'green', SUSPENDED: 'red', CANCELLED: 'default',
}
const STATUS_LABEL: Record<string, string> = {
  TRIAL: 'Prueba', ACTIVE: 'Activo', SUSPENDED: 'Suspendido', CANCELLED: 'Cancelado',
}
const DB_COLOR: Record<string, string> = {
  NEON_SHARED: 'cyan', NEON_DEDICATED: 'purple', LOCAL_DEDICATED: 'orange',
}

const CARD_SHADOW = { borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

export default function TenantsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [provisionForm] = Form.useForm()

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [provisionOpen, setProvisionOpen] = useState(false)
  const [newTenantId, setNewTenantId]   = useState<string | null>(null)
  const [dbStrategy, setDbStrategy]     = useState('NEON_SHARED')
  const [credentials, setCredentials]   = useState<null | { email: string; slug: string }>(null)

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => api.get('/api/control-plane/tenants').then((r) => r.data),
  })
  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/api/control-plane/plans').then((r) => r.data),
  })

  const filtered = data.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/control-plane/tenants', values).then((r) => r.data),
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] })
      message.success('Tenant creado — ahora aprovisiona el primer usuario')
      setDrawerOpen(false)
      form.resetFields()
      setNewTenantId(tenant.id)
      setProvisionOpen(true)
    },
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Error al crear tenant'),
  })

  const provisionMutation = useMutation({
    mutationFn: (values: any) =>
      api.post(`/api/control-plane/tenants/${newTenantId}/provision`, values).then((r) => r.data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] })
      setProvisionOpen(false)
      provisionForm.resetFields()
      setCredentials(result.credentials)
    },
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Error al aprovisionar tenant'),
  })

  const copy = (text: string) => { navigator.clipboard.writeText(text); message.success('Copiado') }

  // KPIs
  const active    = data.filter((t: any) => t.status === 'ACTIVE').length
  const trial     = data.filter((t: any) => t.status === 'TRIAL').length
  const pending   = data.filter((t: any) => !t.provisioned).length

  const columns = [
    {
      title: 'Tenant',
      key: 'tenant',
      render: (r: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={36}
            style={{ background: 'linear-gradient(135deg, #722ed1, #9254de)', fontWeight: 700, flexShrink: 0 }}
          >
            {r.name?.[0]?.toUpperCase() ?? 'T'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{r.name}</div>
            <code style={{ fontSize: 11, color: '#9b9b99' }}>{r.slug}</code>
          </div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (v: string) => <Text style={{ fontSize: 12, color: '#787774' }}>{v}</Text>,
    },
    {
      title: 'Plan',
      key: 'plan',
      render: (r: any) => <Tag color="purple" style={{ fontWeight: 600, borderRadius: 4 }}>{r.plan?.name ?? '—'}</Tag>,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v]} style={{ borderRadius: 4, fontWeight: 500 }}>{STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: 'BD',
      dataIndex: 'dbStrategy',
      key: 'dbStrategy',
      render: (v: string) => (
        <Tag color={DB_COLOR[v]} style={{ fontSize: 11, borderRadius: 4 }}>{v.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Aprovisionado',
      dataIndex: 'provisioned',
      key: 'provisioned',
      render: (v: boolean) => v
        ? <Badge color="green" text="Listo" />
        : <Badge color="orange" text="Pendiente" />,
    },
    {
      title: 'Último acceso',
      dataIndex: 'lastSeenAt',
      key: 'lastSeenAt',
      render: (v: string) => v
        ? <Tooltip title={dayjs(v).format('DD/MM/YYYY HH:mm')}><Text style={{ fontSize: 12, color: '#9b9b99' }}>{dayjs(v).format('DD/MM/YY HH:mm')}</Text></Tooltip>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      fixed: 'right' as const,
      width: 160,
      render: (r: any) => (
        <Space>
          <Button size="small" type="primary" ghost onClick={() => router.push(`/tenants/${r.id}`)}>
            Ver detalle
          </Button>
          {!r.provisioned && (
            <Tooltip title="Aprovisionar primer usuario">
              <Button
                size="small"
                type="text"
                style={{ color: '#fa8c16' }}
                onClick={() => { setNewTenantId(r.id); setProvisionOpen(true) }}
              >
                Aprovisionar
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Tenants</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Gestión de clientes de la plataforma Polaris Enterprise</Text>
      </div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { title: 'Total',       value: data.length, icon: <TeamOutlined />, color: '#722ed1' },
          { title: 'Activos',     value: active,      color: '#52c41a' },
          { title: 'En prueba',   value: trial,       color: '#faad14' },
          { title: 'Sin aprovisionar', value: pending, color: pending > 0 ? '#ff4d4f' : '#52c41a' },
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            placeholder="Buscar por nombre, slug, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 340 }}
          />
          <Space>
            <Tooltip title="Recargar">
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setDrawerOpen(true)}
            >
              Nuevo tenant
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
          scroll={{ x: 900 }}
          pagination={{
            pageSize: 20,
            showTotal: (t) => `${t} tenants`,
            showSizeChanger: false,
            style: { padding: '8px 16px' },
          }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      {/* ── Drawer: Nuevo Tenant ───────────────────────────────────────── */}
      <Drawer
        title={<Space><PlusOutlined /><span>Nuevo Tenant</span></Space>}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.resetFields() }}
        width={520}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setDrawerOpen(false); form.resetFields() }}>Cancelar</Button>
            <Button type="primary" loading={createMutation.isPending} onClick={() => form.submit()}>
              Crear tenant
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={createMutation.mutate} requiredMark={false}>
          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Datos del cliente
          </Text>
          <div style={{ marginBottom: 16 }} />

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="Nombre empresa" rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="Empresa ABC S.A. de C.V." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="slug"
                label="Slug (identificador único)"
                rules={[
                  { required: true },
                  { pattern: /^[a-z0-9-]+$/, message: 'Solo minúsculas, números y guiones' },
                ]}
              >
                <Input placeholder="empresa-abc" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="contacto@empresa.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Teléfono">
                <Input placeholder="7777-7777" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Configuración de plataforma
            </Text>
          </div>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="planId" label="Plan" rules={[{ required: true }]}>
                <Select placeholder="Seleccionar plan">
                  {plans.map((p: any) => (
                    <Select.Option key={p.id} value={p.id}>
                      {p.name} — ${p.price}/mes
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dbStrategy" label="Estrategia de BD" initialValue="NEON_SHARED" rules={[{ required: true }]}>
                <Select onChange={setDbStrategy}>
                  <Select.Option value="NEON_SHARED">Neon Compartida</Select.Option>
                  <Select.Option value="NEON_DEDICATED">Neon Dedicada</Select.Option>
                  <Select.Option value="LOCAL_DEDICATED">PostgreSQL Local</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {dbStrategy !== 'NEON_SHARED' && (
            <Form.Item
              name="dbUrl"
              label="URL de base de datos"
              rules={[{ required: true }]}
              help="Se cifrará automáticamente antes de almacenarse"
            >
              <Input.Password placeholder="postgresql://user:pass@host:5432/db?sslmode=require" style={{ fontFamily: 'monospace', fontSize: 12 }} />
            </Form.Item>
          )}
        </Form>
      </Drawer>

      {/* ── Drawer: Aprovisionar ───────────────────────────────────────── */}
      <Drawer
        title={
          <div>
            <div style={{ fontWeight: 600 }}>Aprovisionar Tenant</div>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              Crear empresa inicial + usuario administrador
            </Text>
          </div>
        }
        open={provisionOpen}
        onClose={() => { setProvisionOpen(false); provisionForm.resetFields() }}
        width={480}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setProvisionOpen(false); provisionForm.resetFields() }}>Omitir por ahora</Button>
            <Button type="primary" loading={provisionMutation.isPending} icon={<CheckCircleOutlined />} onClick={() => provisionForm.submit()}>
              Aprovisionar
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fffbe6', borderRadius: 8, border: '1px solid #ffe58f', display: 'flex', gap: 8 }}>
          <ExclamationCircleOutlined style={{ color: '#faad14', flexShrink: 0, marginTop: 2 }} />
          <Text style={{ fontSize: 12 }}>
            Crea la empresa principal, la sucursal inicial y el usuario administrador en la BD del tenant.
          </Text>
        </div>

        <Form form={provisionForm} layout="vertical" onFinish={provisionMutation.mutate} requiredMark={false}>
          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Empresa inicial
          </Text>
          <div style={{ marginBottom: 12 }} />

          <Form.Item name="companyName" label="Nombre de la empresa" rules={[{ required: true }]}>
            <Input placeholder="Empresa ABC S.A. de C.V." />
          </Form.Item>

          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Usuario administrador
          </Text>
          <div style={{ marginBottom: 12 }} />

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="adminName" label="Nombre" rules={[{ required: true }]}>
                <Input placeholder="Juan García" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="adminEmail" label="Email" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="admin@empresa.com" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="adminPassword"
            label="Contraseña inicial"
            rules={[{ required: true, min: 8, message: 'Mínimo 8 caracteres' }]}
            help="Anota esta contraseña — solo se muestra una vez"
          >
            <Input.Password placeholder="Mínimo 8 caracteres" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ── Modal: Credenciales ────────────────────────────────────────── */}
      <Modal
        title={<Space><CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} /><span>Tenant aprovisionado</span></Space>}
        open={!!credentials}
        onCancel={() => setCredentials(null)}
        footer={<Button type="primary" onClick={() => setCredentials(null)}>Entendido, ya guardé las credenciales</Button>}
        closable={false}
      >
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
          <Text style={{ fontSize: 12 }}>El tenant fue creado. Comparte el slug y correo con el administrador — deberá usar <strong>"Olvidé mi contraseña"</strong> para establecer su contraseña la primera vez.</Text>
        </div>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="Slug">
            <Space><code>{credentials?.slug}</code><Button size="small" icon={<CopyOutlined />} type="text" onClick={() => copy(credentials?.slug ?? '')} /></Space>
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            <Space><span>{credentials?.email}</span><Button size="small" icon={<CopyOutlined />} type="text" onClick={() => copy(credentials?.email ?? '')} /></Space>
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  )
}

'use client'
import {
  Table, Badge, Typography, Tag, Alert, Tooltip, Card, Avatar,
  Space, Button, Modal, Form, Input, Select, App,
} from 'antd'
import { MailOutlined, PlusOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../../lib/api'
import dayjs from 'dayjs'

const { Text } = Typography
const CARD_SHADOW = { borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

interface Props { tenantId: string }

export default function UsuariosTab({ tenantId }: Props) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['admin', 'tenant', tenantId, 'users'],
    queryFn: () => api.get(`/api/control-plane/tenants/${tenantId}/users`).then((r) => r.data),
  })

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['admin', 'tenant', tenantId, 'companies'],
    queryFn: () => api.get(`/api/control-plane/tenants/${tenantId}/companies`).then((r) => r.data),
    enabled: open,
  })

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['admin', 'tenant', tenantId, 'roles'],
    queryFn: () => api.get(`/api/control-plane/tenants/${tenantId}/roles`).then((r) => r.data),
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      api.post(`/api/control-plane/tenants/${tenantId}/users`, values).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId, 'users'] })
      message.success('Usuario creado correctamente')
      setOpen(false)
      form.resetFields()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Error al crear usuario'
      message.error(msg)
    },
  })

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      createMutation.mutate(values)
    })
  }

  if (isError) {
    return (
      <div style={{ padding: '20px 24px' }}>
        <Alert
          type="warning"
          message="No se pudo cargar los usuarios"
          description="El tenant puede no estar aprovisionado o su BD no está accesible."
          showIcon
          style={{ borderRadius: 8 }}
        />
      </div>
    )
  }

  const columns = [
    {
      title: 'Usuario',
      key: 'user',
      render: (r: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={34}
            style={{ background: 'linear-gradient(135deg, #722ed1, #9254de)', fontWeight: 700, flexShrink: 0 }}
          >
            {r.name?.[0]?.toUpperCase() ?? 'U'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{r.name}</div>
            <Space size={4}>
              <MailOutlined style={{ fontSize: 10, color: '#9b9b99' }} />
              <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
            </Space>
          </div>
        </div>
      ),
    },
    {
      title: 'Empresa',
      key: 'company',
      render: (r: any) => <Text style={{ fontSize: 12, color: '#787774' }}>{r.company?.name ?? '—'}</Text>,
    },
    {
      title: 'Rol',
      key: 'role',
      width: 130,
      render: (r: any) => <Tag color="blue" style={{ borderRadius: 4, fontWeight: 500 }}>{r.role?.name ?? '—'}</Tag>,
    },
    {
      title: 'Sucursales',
      key: 'branches',
      width: 120,
      render: (r: any) => {
        const names = (r.branches ?? []).map((b: any) => b.branch?.name).filter(Boolean)
        if (names.length === 0) return <Text type="secondary" style={{ fontSize: 12 }}>Sin asignar</Text>
        if (names.length === 1) return <Text style={{ fontSize: 12 }}>{names[0]}</Text>
        return (
          <Tooltip title={names.join(', ')}>
            <Tag style={{ borderRadius: 4, fontSize: 11 }}>{names.length} sucursales</Tag>
          </Tooltip>
        )
      },
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (v: boolean) => (
        <Badge status={v ? 'success' : 'default'} text={v ? 'Activo' : 'Inactivo'} />
      ),
    },
    {
      title: 'Último acceso',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 130,
      render: (v: string) => v
        ? <Tooltip title={dayjs(v).format('DD/MM/YYYY HH:mm')}><Text style={{ fontSize: 12, color: '#9b9b99' }}>{dayjs(v).fromNow()}</Text></Tooltip>
        : <Text type="secondary" style={{ fontSize: 12 }}>Nunca</Text>,
    },
  ]

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <Text style={{ fontWeight: 600, fontSize: 14, color: '#37352f' }}>Usuarios del tenant</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>({data.length} registrados)</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => setOpen(true)}
        >
          Nuevo usuario
        </Button>
      </div>

      {/* Table */}
      <Card size="small" style={CARD_SHADOW} styles={{ body: { padding: 0 } }}>
        <Table
          size="small"
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showTotal: (t) => `${t} usuarios`,
            showSizeChanger: false,
            style: { padding: '8px 16px' },
          }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
          locale={{ emptyText: 'Sin usuarios registrados' }}
        />
      </Card>

      {/* Modal crear usuario */}
      <Modal
        title="Crear usuario"
        open={open}
        onOk={handleSubmit}
        onCancel={() => { setOpen(false); form.resetFields() }}
        okText="Crear usuario"
        cancelText="Cancelar"
        confirmLoading={createMutation.isPending}
        destroyOnClose
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="companyId"
            label="Empresa"
            rules={[{ required: true, message: 'Selecciona una empresa' }]}
          >
            <Select
              placeholder="Seleccionar empresa"
              loading={loadingCompanies}
              showSearch
              optionFilterProp="label"
              options={(companies as any[]).map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>

          <Form.Item
            name="roleId"
            label="Rol"
            rules={[{ required: true, message: 'Selecciona un rol' }]}
          >
            <Select
              placeholder="Seleccionar rol"
              loading={loadingRoles}
              showSearch
              optionFilterProp="label"
              options={(roles as any[]).map((r) => ({ value: r.id, label: r.name }))}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Nombre completo"
            rules={[{ required: true, message: 'Ingresa el nombre completo' }]}
          >
            <Input placeholder="Ej: Juan Pérez" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[
              { required: true, message: 'Ingresa el correo electrónico' },
              { type: 'email', message: 'Ingresa un correo válido' },
            ]}
          >
            <Input type="email" placeholder="usuario@empresa.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: 'Ingresa una contraseña' },
              { min: 6, message: 'Mínimo 6 caracteres' },
            ]}
          >
            <Input.Password placeholder="Mínimo 6 caracteres" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

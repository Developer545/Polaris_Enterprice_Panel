'use client'
import {
  Table, Typography, Tag, Card, Button, Modal, Form, Input,
  Space, Switch, App, Statistic, Checkbox,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../../lib/api'

const { Text } = Typography
const CARD_SHADOW = { borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

const PERMISSION_OPTIONS = [
  { label: 'Dashboard', value: 'dashboard' },
  { label: 'POS', value: 'pos' },
  { label: 'Ventas', value: 'ventas' },
  { label: 'Compras', value: 'compras' },
  { label: 'Inventario', value: 'inventario' },
  { label: 'Clientes', value: 'clientes' },
  { label: 'Proveedores', value: 'proveedores' },
  { label: 'Productos', value: 'productos' },
  { label: 'Servicios', value: 'servicios' },
  { label: 'Empleados', value: 'empleados' },
  { label: 'Planilla', value: 'planilla' },
  { label: 'Gastos', value: 'gastos' },
  { label: 'CxC', value: 'cxc' },
  { label: 'CxP', value: 'cxp' },
  { label: 'Reportes', value: 'reportes' },
  { label: 'Configuración', value: 'configuracion' },
]

interface RoleRecord {
  id: string
  name: string
  description?: string
  permissions: Record<string, boolean>
  isSystem: boolean
  isActive: boolean
  _count: { users: number }
}

interface Props { tenantId: string }

export default function RolesTab({ tenantId }: Props) {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RoleRecord | null>(null)
  const [form] = Form.useForm()

  const { data = [], isLoading } = useQuery<RoleRecord[]>({
    queryKey: ['admin', 'tenant', tenantId, 'roles'],
    queryFn: () => api.get(`/api/control-plane/tenants/${tenantId}/roles`).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      api.post(`/api/control-plane/tenants/${tenantId}/roles`, values).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId, 'roles'] })
      message.success('Rol creado correctamente')
      handleClose()
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? 'Error al crear rol')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ roleId, values }: { roleId: string; values: Record<string, unknown> }) =>
      api.put(`/api/control-plane/tenants/${tenantId}/roles/${roleId}`, values).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId, 'roles'] })
      message.success('Rol actualizado correctamente')
      handleClose()
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? 'Error al actualizar rol')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) =>
      api.delete(`/api/control-plane/tenants/${tenantId}/roles/${roleId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId, 'roles'] })
      message.success('Rol eliminado')
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? 'Error al eliminar rol')
    },
  })

  const handleOpen = (record?: RoleRecord) => {
    if (record) {
      setEditing(record)
      const activePerms = Object.entries(record.permissions ?? {})
        .filter(([, v]) => v)
        .map(([k]) => k)
      form.setFieldsValue({
        name: record.name,
        description: record.description ?? '',
        permissions: activePerms,
        isActive: record.isActive,
      })
    } else {
      setEditing(null)
      form.setFieldsValue({ isActive: true, permissions: [] })
    }
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditing(null)
    form.resetFields()
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const permsArray: string[] = values.permissions ?? []
      const permissions: Record<string, boolean> = {}
      PERMISSION_OPTIONS.forEach(({ value }) => {
        permissions[value] = permsArray.includes(value)
      })
      const payload = { ...values, permissions }
      delete payload.permissions

      if (editing) {
        updateMutation.mutate({ roleId: editing.id, values: { ...payload, permissions } })
      } else {
        createMutation.mutate({ ...payload, permissions })
      }
    })
  }

  const handleDelete = (record: RoleRecord) => {
    modal.confirm({
      title: 'Eliminar rol',
      content: `¿Estás seguro de que deseas eliminar el rol "${record.name}"? Esta acción no se puede deshacer.`,
      okText: 'Eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => deleteMutation.mutate(record.id),
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const columns = [
    {
      title: 'Nombre',
      key: 'name',
      render: (r: RoleRecord) => (
        <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{v || '—'}</Text>
      ),
    },
    {
      title: 'Permisos',
      key: 'permissions',
      width: 120,
      render: (r: RoleRecord) => {
        const count = Object.values(r.permissions ?? {}).filter(Boolean).length
        return (
          <Tag color="purple" style={{ borderRadius: 4, fontWeight: 500 }}>
            {count} {count === 1 ? 'permiso' : 'permisos'}
          </Tag>
        )
      },
    },
    {
      title: 'Usuarios',
      key: 'users',
      width: 100,
      render: (r: RoleRecord) => (
        <Text style={{ fontSize: 13 }}>{r._count?.users ?? 0}</Text>
      ),
    },
    {
      title: 'Tipo',
      key: 'isSystem',
      width: 100,
      render: (r: RoleRecord) =>
        r.isSystem
          ? <Tag color="gold" icon={<SafetyOutlined />} style={{ borderRadius: 4 }}>Sistema</Tag>
          : <Tag color="default" style={{ borderRadius: 4 }}>Personalizado</Tag>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 90,
      render: (r: RoleRecord) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpen(r)}
            style={{ color: '#1677ff' }}
          />
          {!r.isSystem && (r._count?.users ?? 0) === 0 && (
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              loading={deleteMutation.isPending}
              onClick={() => handleDelete(r)}
            />
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* KPI */}
      <div style={{ marginBottom: 16 }}>
        <Card size="small" style={{ ...CARD_SHADOW, display: 'inline-block', minWidth: 140 }}>
          <Statistic
            title="Total roles"
            value={data.length}
            prefix={<SafetyOutlined style={{ color: '#722ed1' }} />}
            valueStyle={{ fontSize: 22, fontWeight: 700, color: '#722ed1' }}
          />
        </Card>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <Text style={{ fontWeight: 600, fontSize: 14, color: '#37352f' }}>Roles del tenant</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>({data.length} configurados)</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => handleOpen()}
        >
          Nuevo rol
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
          pagination={{
            pageSize: 10,
            showTotal: (t) => `${t} roles`,
            showSizeChanger: false,
            style: { padding: '8px 16px' },
          }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
          locale={{ emptyText: 'Sin roles configurados' }}
        />
      </Card>

      {/* Modal crear/editar rol */}
      <Modal
        title={editing ? 'Editar rol' : 'Nuevo rol'}
        open={open}
        onOk={handleSubmit}
        onCancel={handleClose}
        okText={editing ? 'Guardar cambios' : 'Crear rol'}
        cancelText="Cancelar"
        confirmLoading={isPending}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: 'Ingresa el nombre del rol' }]}
          >
            <Input placeholder="Ej: Vendedor, Supervisor, Cajero" />
          </Form.Item>

          <Form.Item name="description" label="Descripción">
            <Input.TextArea
              rows={2}
              placeholder="Descripción opcional del rol"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item name="permissions" label="Permisos">
            <Checkbox.Group style={{ width: '100%' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px 16px',
                  padding: '12px',
                  background: '#fafafa',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0',
                }}
              >
                {PERMISSION_OPTIONS.map((opt) => (
                  <Checkbox key={opt.value} value={opt.value} style={{ margin: 0, fontSize: 13 }}>
                    {opt.label}
                  </Checkbox>
                ))}
              </div>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="isActive" label="Estado" valuePropName="checked">
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

'use client'

import { useState } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, Select, App,
  Space, Popconfirm, Typography, Avatar, Card, Divider, Tooltip, Switch, theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined,
  MailOutlined, PhoneOutlined, LockOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography

const LBL = (text: string) => <span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>{text}</span>
const INP = { borderRadius: 8, borderColor: '#e9e9e7' } as const
const MB = { marginBottom: 16 } as const

interface Props { companyId: string }

export default function UsuariosTab({ companyId }: Props) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', companyId],
    queryFn: () => api.get(`/api/users?companyId=${companyId}`).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', companyId],
    queryFn: () => api.get(`/api/roles?companyId=${companyId}`).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', companyId],
    queryFn: () => api.get(`/api/branches?companyId=${companyId}`).then(r => r.data),
    enabled: !!companyId,
  })

  const createMut = useMutation({
    mutationFn: (dto: any) => api.post('/api/users', dto),
    onSuccess: () => { message.success('Usuario creado'); qc.invalidateQueries({ queryKey: ['users'] }); closeModal() },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Error al crear usuario'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: any) => api.put(`/api/users/${id}`, dto),
    onSuccess: () => { message.success('Usuario actualizado'); qc.invalidateQueries({ queryKey: ['users'] }); closeModal() },
    onError: () => message.error('Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => { message.success('Usuario desactivado'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: () => message.error('Error al eliminar'),
  })

  function openCreate() { setEditing(null); form.resetFields(); setOpen(true) }
  function openEdit(r: any) {
    setEditing(r)
    form.setFieldsValue({
      name: r.name, email: r.email, phone: r.phone,
      roleId: r.roleId, isActive: r.isActive,
      branchIds: r.branches?.map((b: any) => b.branchId) ?? [],
    })
    setOpen(true)
  }
  function closeModal() { setOpen(false); setEditing(null); form.resetFields() }

  function onFinish(values: any) {
    const dto = { ...values, companyId }
    if (editing) {
      const { password, ...rest } = dto
      updateMut.mutate({ id: editing.id, dto: password ? dto : rest })
    } else {
      createMut.mutate(dto)
    }
  }

  const columns: ColumnsType<any> = [
    {
      title: 'Usuario',
      render: (r: any) => (
        <Space>
          <Avatar style={{ background: token.colorPrimary, fontWeight: 700, flexShrink: 0 }} size={34}>
            {r.name?.[0]?.toUpperCase() ?? 'U'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Rol', dataIndex: 'role', width: 140,
      render: (role: any) => role
        ? <Tag style={{ borderRadius: 4, fontWeight: 500 }}>{role.name}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Teléfono', dataIndex: 'phone', width: 130,
      render: (v: string) => v
        ? <Space size={4}><PhoneOutlined style={{ color: '#999', fontSize: 12 }} /><Text style={{ fontSize: 12 }}>{v}</Text></Space>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Estado', dataIndex: 'isActive', width: 90,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'} style={{ borderRadius: 4, fontWeight: 500 }}>
          {v ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Acciones', width: 90, fixed: 'right' as const,
      render: (r: any) => (
        <Space>
          <Tooltip title="Editar">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Desactivar">
            <Popconfirm
              title="¿Desactivar usuario?"
              description="El usuario no podrá ingresar al sistema."
              onConfirm={() => deleteMut.mutate(r.id)}
              okText="Sí, desactivar" okButtonProps={{ danger: true }} cancelText="Cancelar"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deleteMut.isPending} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Text style={{ fontWeight: 600, fontSize: 14, color: '#37352f' }}>Usuarios</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>({(users as any[]).length} registrados)</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 }}>
          Nuevo Usuario
        </Button>
      </div>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: '1px solid #e9e9e7', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={users as any[]}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 10, size: 'small', showTotal: (t) => `${t} usuarios`, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      {/* Modal */}
      <Modal
        open={open}
        title={<Space>{editing ? <EditOutlined /> : <PlusOutlined />}{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</Space>}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        okText={editing ? 'Actualizar' : 'Crear usuario'}
        okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        width={520}
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>

          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos personales</Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />

          <Form.Item label={LBL('Nombre completo')} name="name" rules={[{ required: true, min: 2, message: 'Requerido' }]} style={MB}>
            <Input prefix={<UserOutlined style={{ color: '#ccc' }} />} placeholder="Juan Pérez" style={INP} />
          </Form.Item>
          <Form.Item label={LBL('Correo electrónico')} name="email" rules={[{ required: true, type: 'email', message: 'Email inválido' }]} style={MB}>
            <Input prefix={<MailOutlined style={{ color: '#ccc' }} />} placeholder="juan@empresa.com" style={INP} />
          </Form.Item>
          <Form.Item
            label={LBL(editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña')}
            name="password"
            rules={editing ? [] : [{ required: true, min: 8, message: 'Mínimo 8 caracteres' }]}
            style={MB}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#ccc' }} />} placeholder="Mínimo 8 caracteres" style={INP} />
          </Form.Item>
          <Form.Item label={LBL('Teléfono')} name="phone" style={MB}>
            <Input prefix={<PhoneOutlined style={{ color: '#ccc' }} />} placeholder="7777-8888" style={INP} />
          </Form.Item>

          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acceso y permisos</Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />

          <Form.Item label={LBL('Rol')} name="roleId" rules={[{ required: true, message: 'Selecciona un rol' }]} style={MB}>
            <Select
              placeholder="Seleccione un rol"
              style={{ borderRadius: 8 }}
              options={(roles as any[]).map((r: any) => ({ value: r.id, label: r.name }))}
            />
          </Form.Item>
          <Form.Item label={LBL('Sucursales habilitadas')} name="branchIds" style={editing ? MB : { marginBottom: 0 }}>
            <Select
              mode="multiple"
              placeholder="Seleccione sucursales"
              style={{ borderRadius: 8 }}
              options={(branches as any[]).map((b: any) => ({ value: b.id, label: b.name }))}
            />
          </Form.Item>
          {editing && (
            <Form.Item label={LBL('Estado')} name="isActive" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

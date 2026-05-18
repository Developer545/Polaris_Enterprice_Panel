'use client'

import { useState } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, Select, App,
  Space, Popconfirm, Switch, Typography, Avatar, theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography
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

  function openCreate() {
    setEditing(null); form.resetFields(); setOpen(true)
  }

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
      render: (_: any, r: any) => (
        <Space>
          <Avatar style={{ background: token.colorPrimary, fontWeight: 700 }} size={32}>
            {r.name?.[0]?.toUpperCase() ?? 'U'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Rol',
      dataIndex: 'role',
      render: (role: any) => role ? <Tag color="blue">{role.name}</Tag> : '—',
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: 'Acciones',
      width: 100,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="¿Desactivar usuario?" onConfirm={() => deleteMut.mutate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '16px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong>Usuarios ({users.length})</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: token.colorPrimary, borderColor: token.colorPrimary }}>
          Nuevo Usuario
        </Button>
      </div>

      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 10, size: 'small' }}
      />

      <Modal
        open={open}
        onCancel={closeModal}
        title={editing ? 'Editar Usuario' : 'Nuevo Usuario'}
        footer={null}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item label="Nombre completo" name="name" rules={[{ required: true, min: 2 }]}>
            <Input prefix={<UserOutlined />} placeholder="Juan Pérez" />
          </Form.Item>
          <Form.Item label="Correo electrónico" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="juan@empresa.com" />
          </Form.Item>
          <Form.Item
            label={editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            name="password"
            rules={editing ? [] : [{ required: true, min: 8 }]}
          >
            <Input.Password placeholder="Mínimo 8 caracteres" />
          </Form.Item>
          <Form.Item label="Teléfono" name="phone">
            <Input placeholder="7777-8888" />
          </Form.Item>
          <Form.Item label="Rol" name="roleId" rules={[{ required: true }]}>
            <Select
              placeholder="Seleccione un rol"
              options={roles.map((r: any) => ({ value: r.id, label: r.name }))}
            />
          </Form.Item>
          <Form.Item label="Sucursales habilitadas" name="branchIds">
            <Select
              mode="multiple"
              placeholder="Seleccione sucursales"
              options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
            />
          </Form.Item>
          {editing && (
            <Form.Item label="Estado" name="isActive" valuePropName="checked">
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeModal}>Cancelar</Button>
            <Button type="primary" htmlType="submit"
              loading={createMut.isPending || updateMut.isPending}
              style={{ background: token.colorPrimary, borderColor: token.colorPrimary }}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

'use client'

import { useState } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, App,
  Space, Popconfirm, Typography, Checkbox, Divider, Row, Col, theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography

// Grupos de permisos para el checkbox matrix
const PERMISSION_GROUPS = [
  { label: 'POS / Ventas', perms: ['pos.create','pos.view','pos.cancel','sales.view'] },
  { label: 'DTE', perms: ['dte.view','dte.emit','dte.anular'] },
  { label: 'Clientes', perms: ['clients.view','clients.create','clients.edit','clients.delete'] },
  { label: 'Productos', perms: ['products.view','products.create','products.edit','products.delete','categories.view'] },
  { label: 'Usuarios', perms: ['users.view','users.create','users.edit','users.delete'] },
  { label: 'Roles', perms: ['roles.view','roles.create','roles.edit','roles.delete'] },
  { label: 'Empresa / Sucursales', perms: ['company.view','company.edit','branches.view','branches.create','branches.edit','branches.delete'] },
  { label: 'Caja', perms: ['cash_register.view','cash_register.open','cash_register.close'] },
  { label: 'Proveedores', perms: ['suppliers.view','suppliers.create','suppliers.edit','suppliers.delete'] },
  { label: 'Compras / CxP', perms: ['purchases.view','purchases.create','purchases.edit','accounts_payable.view','accounts_payable.create','accounts_payable.edit'] },
  { label: 'Gastos', perms: ['expenses.view','expenses.create','expenses.edit','expenses.delete'] },
  { label: 'Empleados', perms: ['employees.view','employees.create','employees.edit','employees.delete'] },
  { label: 'Planilla', perms: ['payroll.view','payroll.create','payroll.approve'] },
  { label: 'Configuración / Reportes', perms: ['settings.view','settings.edit','reports.view'] },
]

const ALL_PERMS = PERMISSION_GROUPS.flatMap(g => g.perms)

function permLabel(p: string) {
  const parts = p.split('.')
  const action = parts[1]
  const map: Record<string, string> = {
    view: 'Ver', create: 'Crear', edit: 'Editar', delete: 'Eliminar',
    emit: 'Emitir', anular: 'Anular', cancel: 'Cancelar',
    open: 'Abrir', close: 'Cerrar', approve: 'Aprobar',
  }
  return map[action] ?? action
}

interface Props { companyId: string }

export default function RolesTab({ companyId }: Props) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()
  const [selectedPerms, setSelectedPerms] = useState<string[]>([])

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles', companyId],
    queryFn: () => api.get(`/api/roles?companyId=${companyId}`).then(r => r.data),
    enabled: !!companyId,
  })

  const createMut = useMutation({
    mutationFn: (dto: any) => api.post('/api/roles', dto),
    onSuccess: () => { message.success('Rol creado'); qc.invalidateQueries({ queryKey: ['roles'] }); closeModal() },
    onError: () => message.error('Error al crear rol'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: any) => api.put(`/api/roles/${id}`, dto),
    onSuccess: () => { message.success('Rol actualizado'); qc.invalidateQueries({ queryKey: ['roles'] }); closeModal() },
    onError: () => message.error('Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/roles/${id}`),
    onSuccess: () => { message.success('Rol eliminado'); qc.invalidateQueries({ queryKey: ['roles'] }) },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Error al eliminar'),
  })

  function openCreate() {
    setEditing(null)
    setSelectedPerms([])
    form.resetFields()
    setOpen(true)
  }

  function openEdit(r: any) {
    setEditing(r)
    const perms = Object.entries(r.permissions || {})
      .filter(([, v]) => v)
      .map(([k]) => k)
    setSelectedPerms(perms)
    form.setFieldsValue({ name: r.name, description: r.description })
    setOpen(true)
  }

  function closeModal() { setOpen(false); setEditing(null); form.resetFields(); setSelectedPerms([]) }

  function toggleGroupAll(group: typeof PERMISSION_GROUPS[0]) {
    const allSelected = group.perms.every(p => selectedPerms.includes(p))
    if (allSelected) {
      setSelectedPerms(prev => prev.filter(p => !group.perms.includes(p)))
    } else {
      setSelectedPerms(prev => [...new Set([...prev, ...group.perms])])
    }
  }

  function toggleSelectAll() {
    if (selectedPerms.length === ALL_PERMS.length) {
      setSelectedPerms([])
    } else {
      setSelectedPerms([...ALL_PERMS])
    }
  }

  function onFinish(values: any) {
    const permissions = Object.fromEntries(ALL_PERMS.map(p => [p, selectedPerms.includes(p)]))
    const dto = { ...values, permissions, companyId }
    if (editing) {
      updateMut.mutate({ id: editing.id, dto })
    } else {
      createMut.mutate(dto)
    }
  }

  const columns: ColumnsType<any> = [
    {
      title: 'Rol',
      render: (_: any, r: any) => (
        <Space>
          <SafetyOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            {r.description && <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>}
          </div>
        </Space>
      ),
    },
    {
      title: 'Permisos activos',
      render: (_: any, r: any) => {
        const count = Object.values(r.permissions || {}).filter(Boolean).length
        return <Tag color="blue">{count} permisos</Tag>
      },
    },
    {
      title: 'Acciones',
      width: 100,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="¿Eliminar rol?" onConfirm={() => deleteMut.mutate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '16px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong>Roles ({roles.length})</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: token.colorPrimary, borderColor: token.colorPrimary }}>
          Nuevo Rol
        </Button>
      </div>

      <Table
        dataSource={roles}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 10, size: 'small' }}
      />

      <Modal
        open={open}
        onCancel={closeModal}
        title={editing ? 'Editar Rol' : 'Nuevo Rol'}
        footer={null}
        width={680}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item label="Nombre del rol" name="name" rules={[{ required: true, min: 2 }]}>
                <Input placeholder="Ej. Cajero, Supervisor..." />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="Descripción" name="description">
                <Input placeholder="Descripción breve" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0 12px' }}>
            <Space>
              <Text style={{ fontSize: 13 }}>Permisos</Text>
              <Button size="small" onClick={toggleSelectAll} style={{ fontSize: 11 }}>
                {selectedPerms.length === ALL_PERMS.length ? 'Quitar todos' : 'Marcar todos'}
              </Button>
            </Space>
          </Divider>

          {PERMISSION_GROUPS.map(group => {
            const allSelected = group.perms.every(p => selectedPerms.includes(p))
            const someSelected = group.perms.some(p => selectedPerms.includes(p))
            return (
              <div key={group.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={!allSelected && someSelected}
                    onChange={() => toggleGroupAll(group)}
                  >
                    <Text strong style={{ fontSize: 12 }}>{group.label}</Text>
                  </Checkbox>
                </div>
                <div style={{ paddingLeft: 24, display: 'flex', flexWrap: 'wrap', gap: '4px 0' }}>
                  {group.perms.map(p => (
                    <Checkbox
                      key={p}
                      checked={selectedPerms.includes(p)}
                      onChange={e => {
                        setSelectedPerms(prev =>
                          e.target.checked ? [...prev, p] : prev.filter(x => x !== p)
                        )
                      }}
                      style={{ width: '50%', fontSize: 12 }}
                    >
                      {permLabel(p)}
                    </Checkbox>
                  ))}
                </div>
              </div>
            )
          })}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
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

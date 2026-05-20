'use client'

import { useState } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, App,
  Space, Popconfirm, Typography, Checkbox, Divider, Row, Col, Card, Tooltip, theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography

const PERMISSION_GROUPS = [
  { label: 'POS / Ventas',          perms: ['pos.create','pos.view','pos.cancel','sales.view'] },
  { label: 'DTE',                   perms: ['dte.view','dte.emit','dte.anular'] },
  { label: 'Clientes',              perms: ['clients.view','clients.create','clients.edit','clients.delete'] },
  { label: 'Productos',             perms: ['products.view','products.create','products.edit','products.delete','categories.view'] },
  { label: 'Usuarios',              perms: ['users.view','users.create','users.edit','users.delete'] },
  { label: 'Roles',                 perms: ['roles.view','roles.create','roles.edit','roles.delete'] },
  { label: 'Empresa / Sucursales',  perms: ['company.view','company.edit','branches.view','branches.create','branches.edit','branches.delete'] },
  { label: 'Caja',                  perms: ['cash_register.view','cash_register.open','cash_register.close'] },
  { label: 'Proveedores',           perms: ['suppliers.view','suppliers.create','suppliers.edit','suppliers.delete'] },
  { label: 'Compras / CxP',         perms: ['purchases.view','purchases.create','purchases.edit','accounts_payable.view','accounts_payable.create','accounts_payable.edit'] },
  { label: 'Gastos',                perms: ['expenses.view','expenses.create','expenses.edit','expenses.delete'] },
  { label: 'Empleados',             perms: ['employees.view','employees.create','employees.edit','employees.delete'] },
  { label: 'Planilla',              perms: ['payroll.view','payroll.create','payroll.approve'] },
  { label: 'Configuración',         perms: ['settings.view','settings.edit','reports.view'] },
]

const ALL_PERMS = PERMISSION_GROUPS.flatMap(g => g.perms)

function permLabel(p: string) {
  const action = p.split('.')[1]
  const map: Record<string, string> = {
    view: 'Ver', create: 'Crear', edit: 'Editar', delete: 'Eliminar',
    emit: 'Emitir', anular: 'Anular', cancel: 'Cancelar',
    open: 'Abrir', close: 'Cerrar', approve: 'Aprobar',
  }
  return map[action] ?? action
}

const LBL = (text: string) => <span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>{text}</span>
const INP = { borderRadius: 8, borderColor: '#e9e9e7' } as const
const MB = { marginBottom: 16 } as const

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

  function openCreate() { setEditing(null); setSelectedPerms([]); form.resetFields(); setOpen(true) }
  function openEdit(r: any) {
    setEditing(r)
    const perms = Object.entries(r.permissions || {}).filter(([, v]) => v).map(([k]) => k)
    setSelectedPerms(perms)
    form.setFieldsValue({ name: r.name, description: r.description })
    setOpen(true)
  }
  function closeModal() { setOpen(false); setEditing(null); form.resetFields(); setSelectedPerms([]) }

  function toggleGroupAll(group: typeof PERMISSION_GROUPS[0]) {
    const allSelected = group.perms.every(p => selectedPerms.includes(p))
    setSelectedPerms(prev =>
      allSelected ? prev.filter(p => !group.perms.includes(p)) : [...new Set([...prev, ...group.perms])]
    )
  }

  function toggleSelectAll() {
    setSelectedPerms(selectedPerms.length === ALL_PERMS.length ? [] : [...ALL_PERMS])
  }

  function onFinish(values: any) {
    const permissions = Object.fromEntries(ALL_PERMS.map(p => [p, selectedPerms.includes(p)]))
    const dto = { ...values, permissions, companyId }
    editing ? updateMut.mutate({ id: editing.id, dto }) : createMut.mutate(dto)
  }

  const columns: ColumnsType<any> = [
    {
      title: 'Rol',
      render: (r: any) => (
        <Space>
          <SafetyOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
            {r.description && <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>}
          </div>
        </Space>
      ),
    },
    {
      title: 'Permisos activos', width: 140,
      render: (r: any) => {
        const count = Object.values(r.permissions || {}).filter(Boolean).length
        return <Tag style={{ borderRadius: 4, fontWeight: 500 }}>{count} permisos</Tag>
      },
    },
    {
      title: 'Acciones', width: 90, fixed: 'right' as const,
      render: (r: any) => (
        <Space>
          <Tooltip title="Editar">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Eliminar rol?"
              description="Los usuarios con este rol perderán sus permisos."
              onConfirm={() => deleteMut.mutate(r.id)}
              okText="Sí, eliminar" okButtonProps={{ danger: true }} cancelText="Cancelar"
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
          <Text style={{ fontWeight: 600, fontSize: 14, color: '#37352f' }}>Roles y Permisos</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>({(roles as any[]).length} roles)</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 }}>
          Nuevo Rol
        </Button>
      </div>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: '1px solid #e9e9e7', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={roles as any[]}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 10, size: 'small', showTotal: (t) => `${t} roles`, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      {/* Modal */}
      <Modal
        open={open}
        title={<Space>{editing ? <EditOutlined /> : <PlusOutlined />}{editing ? 'Editar Rol' : 'Nuevo Rol'}</Space>}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        okText={editing ? 'Actualizar' : 'Crear rol'}
        okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        width={680}
        style={{ top: 40 }}
        styles={{
          header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 },
          body: { paddingTop: 16, maxHeight: '70vh', overflowY: 'auto' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>

          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Información del rol</Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item label={LBL('Nombre del rol')} name="name" rules={[{ required: true, min: 2, message: 'Requerido' }]} style={MB}>
                <Input placeholder="Ej. Cajero, Supervisor..." style={INP} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label={LBL('Descripción')} name="description" style={MB}>
                <Input placeholder="Descripción breve" style={INP} />
              </Form.Item>
            </Col>
          </Row>

          {/* Matriz de permisos */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Permisos</Text>
            <Button
              size="small"
              type="text"
              onClick={toggleSelectAll}
              style={{ fontSize: 11, color: token.colorPrimary, padding: '0 4px' }}
            >
              {selectedPerms.length === ALL_PERMS.length ? 'Quitar todos' : 'Marcar todos'}
            </Button>
          </div>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />

          {PERMISSION_GROUPS.map(group => {
            const allSelected = group.perms.every(p => selectedPerms.includes(p))
            const someSelected = group.perms.some(p => selectedPerms.includes(p))
            return (
              <div key={group.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={!allSelected && someSelected}
                    onChange={() => toggleGroupAll(group)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 600, color: '#37352f' }}>{group.label}</Text>
                  </Checkbox>
                </div>
                <div style={{ paddingLeft: 24, display: 'flex', flexWrap: 'wrap', gap: '4px 0', background: '#f9f9f8', borderRadius: 6, padding: '8px 8px 8px 24px' }}>
                  {group.perms.map(p => (
                    <Checkbox
                      key={p}
                      checked={selectedPerms.includes(p)}
                      onChange={e => setSelectedPerms(prev =>
                        e.target.checked ? [...prev, p] : prev.filter(x => x !== p)
                      )}
                      style={{ width: '50%', fontSize: 12, color: '#37352f' }}
                    >
                      {permLabel(p)}
                    </Checkbox>
                  ))}
                </div>
              </div>
            )
          })}
        </Form>
      </Modal>
    </div>
  )
}

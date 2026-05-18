'use client'
import { useState } from 'react'
import { Table, Button, Tag, Typography, Modal, Form, Input, Switch, App, Divider, Row, Col, Card } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import { PERMISSIONS } from '@pos-dte/shared-types'

const PERMISSION_GROUPS: Record<string, { label: string; keys: string[] }> = {
  'POS / Ventas': {
    label: 'POS / Ventas',
    keys: [PERMISSIONS.POS_VIEW, PERMISSIONS.POS_CREATE, PERMISSIONS.POS_CANCEL, PERMISSIONS.SALES_VIEW],
  },
  'DTE': {
    label: 'Facturación DTE',
    keys: [PERMISSIONS.DTE_VIEW, PERMISSIONS.DTE_EMIT, PERMISSIONS.DTE_ANULAR],
  },
  'Clientes': {
    label: 'Clientes',
    keys: [PERMISSIONS.CLIENTS_VIEW, PERMISSIONS.CLIENTS_CREATE, PERMISSIONS.CLIENTS_EDIT, PERMISSIONS.CLIENTS_DELETE],
  },
  'Productos': {
    label: 'Productos',
    keys: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_EDIT, PERMISSIONS.PRODUCTS_DELETE],
  },
  'Usuarios': {
    label: 'Usuarios',
    keys: [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_EDIT, PERMISSIONS.USERS_DELETE],
  },
  'Roles': {
    label: 'Roles',
    keys: [PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_EDIT, PERMISSIONS.ROLES_DELETE],
  },
  'Caja': {
    label: 'Caja',
    keys: [PERMISSIONS.CASH_REGISTER_VIEW, PERMISSIONS.CASH_REGISTER_OPEN, PERMISSIONS.CASH_REGISTER_CLOSE],
  },
  'Admin': {
    label: 'Administración',
    keys: [PERMISSIONS.COMPANY_VIEW, PERMISSIONS.COMPANY_EDIT, PERMISSIONS.BRANCHES_VIEW, PERMISSIONS.BRANCHES_CREATE, PERMISSIONS.BRANCHES_EDIT, PERMISSIONS.BRANCHES_DELETE, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT],
  },
}

const PERM_LABEL: Record<string, string> = {
  [PERMISSIONS.POS_VIEW]: 'Ver POS',
  [PERMISSIONS.POS_CREATE]: 'Crear venta',
  [PERMISSIONS.POS_CANCEL]: 'Cancelar venta',
  [PERMISSIONS.SALES_VIEW]: 'Ver ventas',
  [PERMISSIONS.DTE_VIEW]: 'Ver DTE',
  [PERMISSIONS.DTE_EMIT]: 'Emitir DTE',
  [PERMISSIONS.DTE_ANULAR]: 'Anular DTE',
  [PERMISSIONS.CLIENTS_VIEW]: 'Ver clientes',
  [PERMISSIONS.CLIENTS_CREATE]: 'Crear cliente',
  [PERMISSIONS.CLIENTS_EDIT]: 'Editar cliente',
  [PERMISSIONS.CLIENTS_DELETE]: 'Eliminar cliente',
  [PERMISSIONS.PRODUCTS_VIEW]: 'Ver productos',
  [PERMISSIONS.PRODUCTS_CREATE]: 'Crear producto',
  [PERMISSIONS.PRODUCTS_EDIT]: 'Editar producto',
  [PERMISSIONS.PRODUCTS_DELETE]: 'Eliminar producto',
  [PERMISSIONS.USERS_VIEW]: 'Ver usuarios',
  [PERMISSIONS.USERS_CREATE]: 'Crear usuario',
  [PERMISSIONS.USERS_EDIT]: 'Editar usuario',
  [PERMISSIONS.USERS_DELETE]: 'Eliminar usuario',
  [PERMISSIONS.ROLES_VIEW]: 'Ver roles',
  [PERMISSIONS.ROLES_CREATE]: 'Crear rol',
  [PERMISSIONS.ROLES_EDIT]: 'Editar rol',
  [PERMISSIONS.ROLES_DELETE]: 'Eliminar rol',
  [PERMISSIONS.CASH_REGISTER_VIEW]: 'Ver caja',
  [PERMISSIONS.CASH_REGISTER_OPEN]: 'Abrir caja',
  [PERMISSIONS.CASH_REGISTER_CLOSE]: 'Cerrar caja',
  [PERMISSIONS.COMPANY_VIEW]: 'Ver empresa',
  [PERMISSIONS.COMPANY_EDIT]: 'Editar empresa',
  [PERMISSIONS.BRANCHES_VIEW]: 'Ver sucursales',
  [PERMISSIONS.BRANCHES_CREATE]: 'Crear sucursal',
  [PERMISSIONS.BRANCHES_EDIT]: 'Editar sucursal',
  [PERMISSIONS.BRANCHES_DELETE]: 'Eliminar sucursal',
  [PERMISSIONS.REPORTS_VIEW]: 'Ver reportes',
  [PERMISSIONS.SETTINGS_VIEW]: 'Ver configuración',
  [PERMISSIONS.SETTINGS_EDIT]: 'Editar configuración',
}

export default function RolesPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [edit, setEdit] = useState<any>(null)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [form] = Form.useForm()
  const { companyId } = useAppContext()

  const { data = [], isLoading } = useQuery({
    queryKey: ['roles', companyId],
    queryFn: () => api.get('/api/roles', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      edit?.id
        ? api.put(`/api/roles/${edit.id}`, { ...values, permissions })
        : api.post('/api/roles', { ...values, permissions, companyId }),
    onSuccess: () => {
      message.success('Rol guardado')
      qc.invalidateQueries({ queryKey: ['roles'] })
      setEdit(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  function openEdit(role: any) {
    setEdit(role)
    form.setFieldsValue(role)
    setPermissions(role.permissions ?? {})
  }

  const columns = [
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Descripción', dataIndex: 'description', key: 'description', render: (v: string) => v ?? '—' },
    { title: 'Sistema', dataIndex: 'isSystem', key: 'isSystem', render: (v: boolean) => v ? <Tag color="blue">Sistema</Tag> : null },
    { title: 'Usuarios', key: 'users', render: (r: any) => r._count?.users ?? 0 },
    {
      title: 'Acciones', key: 'actions',
      render: (r: any) => (
        !r.isSystem && (
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Editar</Button>
        )
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Roles y Permisos</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEdit({}); setPermissions({}); form.resetFields() }}>
          Nuevo rol
        </Button>
      </div>

      <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading}
        style={{ borderRadius: 10, overflow: 'hidden' }} />

      <Modal
        open={edit !== null}
        title={edit?.id ? 'Editar rol' : 'Nuevo rol'}
        onCancel={() => setEdit(null)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="Guardar"
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Descripción"><Input /></Form.Item>
        </Form>

        <Divider orientation="left" plain style={{ fontSize: 13 }}>Permisos</Divider>
        {Object.values(PERMISSION_GROUPS).map(group => (
          <Card key={group.label} size="small" title={group.label} style={{ marginBottom: 12, borderRadius: 8 }}>
            <Row gutter={[8, 4]}>
              {group.keys.map(key => (
                <Col key={key} span={8}>
                  <Switch
                    size="small"
                    checked={!!permissions[key]}
                    onChange={v => setPermissions(prev => ({ ...prev, [key]: v }))}
                    style={{ marginRight: 6 }}
                  />
                  <span style={{ fontSize: 12 }}>{PERM_LABEL[key] ?? key}</span>
                </Col>
              ))}
            </Row>
          </Card>
        ))}
      </Modal>
    </div>
  )
}

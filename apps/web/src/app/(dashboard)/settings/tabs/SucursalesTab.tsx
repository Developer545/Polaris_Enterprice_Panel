'use client'

import { useState } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, App,
  Space, Popconfirm, Typography, Row, Col, Card, Divider, Tooltip, theme, Switch,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ShopOutlined, PhoneOutlined, BranchesOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography

const LBL = (text: string) => <span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>{text}</span>
const INP = { borderRadius: 8, borderColor: '#e9e9e7' } as const
const MB = { marginBottom: 16 } as const

interface Props { companyId: string }

export default function SucursalesTab({ companyId }: Props) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches', companyId],
    queryFn: () => api.get(`/api/branches?companyId=${companyId}`).then(r => r.data),
    enabled: !!companyId,
  })

  const createMut = useMutation({
    mutationFn: (dto: any) => api.post('/api/branches', dto),
    onSuccess: () => { message.success('Sucursal creada'); qc.invalidateQueries({ queryKey: ['branches'] }); closeModal() },
    onError: () => message.error('Error al crear sucursal'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: any) => api.put(`/api/branches/${id}`, dto),
    onSuccess: () => { message.success('Sucursal actualizada'); qc.invalidateQueries({ queryKey: ['branches'] }); closeModal() },
    onError: () => message.error('Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/branches/${id}`),
    onSuccess: () => { message.success('Sucursal eliminada'); qc.invalidateQueries({ queryKey: ['branches'] }) },
    onError: () => message.error('Error al eliminar'),
  })

  function openCreate() { setEditing(null); form.resetFields(); setOpen(true) }
  function openEdit(record: any) {
    setEditing(record)
    form.setFieldsValue({
      name: record.name, address: record.address, phone: record.phone,
      codEstableMH: record.codEstableMH, codPuntoVentaMH: record.codPuntoVentaMH,
      isActive: record.isActive,
    })
    setOpen(true)
  }
  function closeModal() { setOpen(false); setEditing(null); form.resetFields() }

  function onFinish(values: any) {
    editing
      ? updateMut.mutate({ id: editing.id, dto: values })
      : createMut.mutate({ ...values, companyId })
  }

  const columns: ColumnsType<any> = [
    {
      title: 'Sucursal',
      render: (r: any) => (
        <Space>
          <ShopOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.address || '—'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Teléfono', dataIndex: 'phone', width: 130,
      render: (v: string) => v
        ? <Space size={4}><PhoneOutlined style={{ color: '#999', fontSize: 12 }} /><Text style={{ fontSize: 12 }}>{v}</Text></Space>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Código MH', width: 160,
      render: (r: any) => r.codEstableMH ? (
        <Space size={4}>
          <Tag style={{ fontSize: 11, borderRadius: 4 }}>{r.codEstableMH}</Tag>
          <Tag style={{ fontSize: 11, borderRadius: 4 }}>{r.codPuntoVentaMH}</Tag>
        </Space>
      ) : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Estado', dataIndex: 'isActive', width: 90,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'} style={{ borderRadius: 4, fontWeight: 500 }}>
          {v ? 'Activa' : 'Inactiva'}
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
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Eliminar sucursal?"
              description="Esta acción no se puede deshacer."
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
          <Text style={{ fontWeight: 600, fontSize: 14, color: '#37352f' }}>Sucursales</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>({(branches as any[]).length} registradas)</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 }}>
          Nueva Sucursal
        </Button>
      </div>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: '1px solid #e9e9e7', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={branches as any[]}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 10, size: 'small', showTotal: (t) => `${t} sucursales`, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      {/* Modal */}
      <Modal
        open={open}
        title={<Space>{editing ? <EditOutlined /> : <PlusOutlined />}{editing ? 'Editar Sucursal' : 'Nueva Sucursal'}</Space>}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        okText={editing ? 'Actualizar' : 'Crear sucursal'}
        okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        width={560}
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>

          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos de la sucursal</Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />

          <Form.Item label={LBL('Nombre')} name="name" rules={[{ required: true, min: 2, message: 'Mínimo 2 caracteres' }]} style={MB}>
            <Input prefix={<ShopOutlined style={{ color: '#ccc' }} />} placeholder="Sucursal Central" style={INP} />
          </Form.Item>
          <Form.Item label={LBL('Dirección')} name="address" style={MB}>
            <Input placeholder="Dirección de la sucursal" style={INP} />
          </Form.Item>
          <Form.Item label={LBL('Teléfono')} name="phone" style={MB}>
            <Input prefix={<PhoneOutlined style={{ color: '#ccc' }} />} placeholder="2222-3333" style={INP} />
          </Form.Item>

          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Códigos DTE (Hacienda)</Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={LBL('Código Establecimiento MH')} name="codEstableMH"
                extra={<Text type="secondary" style={{ fontSize: 11 }}>4 caracteres (ej. M001)</Text>} style={MB}>
                <Input placeholder="M001" maxLength={4} style={INP} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={LBL('Código Punto de Venta MH')} name="codPuntoVentaMH"
                extra={<Text type="secondary" style={{ fontSize: 11 }}>4 caracteres (ej. P001)</Text>} style={MB}>
                <Input placeholder="P001" maxLength={4} style={INP} />
              </Form.Item>
            </Col>
          </Row>

          {editing && (
            <Form.Item label={LBL('Estado')} name="isActive" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

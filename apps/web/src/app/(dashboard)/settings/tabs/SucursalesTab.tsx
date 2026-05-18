'use client'

import { useState } from 'react'
import {
  Table, Button, Tag, Modal, Form, Input, App,
  Space, Popconfirm, Switch, Typography, Row, Col,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  BranchesOutlined, ShopOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography
interface Props { companyId: string }

export default function SucursalesTab({ companyId }: Props) {
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

  function openCreate() {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      address: record.address,
      phone: record.phone,
      codEstableMH: record.codEstableMH,
      codPuntoVentaMH: record.codPuntoVentaMH,
      isActive: record.isActive,
    })
    setOpen(true)
  }

  function closeModal() { setOpen(false); setEditing(null); form.resetFields() }

  function onFinish(values: any) {
    if (editing) {
      updateMut.mutate({ id: editing.id, dto: values })
    } else {
      createMut.mutate({ ...values, companyId })
    }
  }

  const columns: ColumnsType<any> = [
    {
      title: 'Sucursal',
      dataIndex: 'name',
      render: (name: string, r: any) => (
        <Space>
          <ShopOutlined style={{ color: '#f47920' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.address || '—'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Código MH',
      dataIndex: 'codEstableMH',
      render: (v: string, r: any) => v ? (
        <Space>
          <Tag>{v}</Tag>
          <Tag>{r.codPuntoVentaMH}</Tag>
        </Space>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activa' : 'Inactiva'}</Tag>,
    },
    {
      title: 'Acciones',
      width: 120,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="¿Eliminar sucursal?" onConfirm={() => deleteMut.mutate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '16px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong>Sucursales ({branches.length})</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: '#f47920', borderColor: '#f47920' }}>
          Nueva Sucursal
        </Button>
      </div>

      <Table
        dataSource={branches}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 10, size: 'small' }}
      />

      <Modal
        open={open}
        onCancel={closeModal}
        title={editing ? 'Editar Sucursal' : 'Nueva Sucursal'}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item label="Nombre" name="name" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="Sucursal Central" />
          </Form.Item>
          <Form.Item label="Dirección" name="address">
            <Input placeholder="Dirección de la sucursal" />
          </Form.Item>
          <Form.Item label="Teléfono" name="phone">
            <Input placeholder="2222-3333" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Código Establecimiento MH"
                name="codEstableMH"
                extra="4 caracteres (ej. M001)"
              >
                <Input placeholder="M001" maxLength={4} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Código Punto de Venta MH"
                name="codPuntoVentaMH"
                extra="4 caracteres (ej. P001)"
              >
                <Input placeholder="P001" maxLength={4} />
              </Form.Item>
            </Col>
          </Row>
          {editing && (
            <Form.Item label="Estado" name="isActive" valuePropName="checked">
              <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
            </Form.Item>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeModal}>Cancelar</Button>
            <Button type="primary" htmlType="submit"
              loading={createMut.isPending || updateMut.isPending}
              style={{ background: '#f47920', borderColor: '#f47920' }}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

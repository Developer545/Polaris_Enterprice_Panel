'use client'
import { useState } from 'react'
import { Table, Button, Typography, Modal, Form, Input, InputNumber, App, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'

export default function SuppliersPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [edit, setEdit] = useState<any>(null)
  const [form] = Form.useForm()
  const { companyId } = useAppContext()

  const { data = [], isLoading } = useQuery({
    queryKey: ['suppliers', companyId],
    queryFn: () => api.get('/api/suppliers', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      edit?.id
        ? api.put(`/api/suppliers/${edit.id}`, values)
        : api.post('/api/suppliers', { ...values, companyId }),
    onSuccess: () => {
      message.success('Proveedor guardado')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setEdit(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const columns = [
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'NIT', dataIndex: 'nit', key: 'nit', render: (v: string) => v ?? '—' },
    { title: 'NRC', dataIndex: 'nrc', key: 'nrc', render: (v: string) => v ?? '—' },
    { title: 'Contacto', dataIndex: 'contactName', key: 'contactName', render: (v: string) => v ?? '—' },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (v: string) => v ?? '—' },
    { title: 'Teléfono', dataIndex: 'phone', key: 'phone', render: (v: string) => v ?? '—' },
    { title: 'Días crédito', dataIndex: 'paymentTermDays', key: 'paymentTermDays', render: (v: number) => v != null ? `${v} días` : '—' },
    {
      title: 'Acciones', key: 'actions',
      render: (r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEdit(r); form.setFieldsValue(r) }}>
          Editar
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Proveedores</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEdit({}); form.resetFields() }}>
          Nuevo proveedor
        </Button>
      </div>

      <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading}
        style={{ borderRadius: 10, overflow: 'hidden' }} pagination={{ pageSize: 20 }} />

      <Modal
        open={edit !== null}
        title={edit?.id ? 'Editar proveedor' : 'Nuevo proveedor'}
        onCancel={() => setEdit(null)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="Guardar"
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="paymentTermDays" label="Días de crédito" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nit" label="NIT">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nrc" label="NRC">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactName" label="Nombre de contacto">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Teléfono">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label="Dirección">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notas">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

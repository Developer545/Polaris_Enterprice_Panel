'use client'
import { useState } from 'react'
import { Table, Button, Tag, Typography, Modal, Form, Select, InputNumber, Input, App, Row, Col, Space, Divider } from 'antd'
import { PlusOutlined, InboxOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  DRAFT:      { color: 'default', label: 'Borrador' },
  SENT:       { color: 'blue',    label: 'Enviada' },
  PARTIAL:    { color: 'orange',  label: 'Parcial' },
  RECEIVED:   { color: 'green',   label: 'Recibida' },
  CANCELLED:  { color: 'red',     label: 'Cancelada' },
}

export default function PurchasesPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [newModal, setNewModal] = useState(false)
  const [receiveModal, setReceiveModal] = useState<any>(null)
  const [newForm] = Form.useForm()
  const [receiveForm] = Form.useForm()
  const { companyId } = useAppContext()

  const { data = [], isLoading } = useQuery({
    queryKey: ['purchases', companyId],
    queryFn: () => api.get('/api/purchases', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', companyId],
    queryFn: () => api.get('/api/suppliers', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products', companyId],
    queryFn: () => api.get('/api/products', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/purchases', { ...values, companyId }),
    onSuccess: () => {
      message.success('Orden de compra creada')
      qc.invalidateQueries({ queryKey: ['purchases'] })
      setNewModal(false)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const receiveMutation = useMutation({
    mutationFn: ({ id, lines }: any) => api.put(`/api/purchases/${id}/receive`, { lines }),
    onSuccess: () => {
      message.success('Recepción registrada')
      qc.invalidateQueries({ queryKey: ['purchases'] })
      setReceiveModal(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const columns = [
    { title: 'N° OC', dataIndex: 'orderNumber', key: 'orderNumber', render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code> },
    { title: 'Proveedor', key: 'supplier', render: (r: any) => r.supplier?.name ?? '—' },
    { title: 'Fecha', dataIndex: 'orderDate', key: 'orderDate', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'F. esperada', dataIndex: 'expectedDate', key: 'expectedDate', render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        const s = STATUS_MAP[v] ?? { color: 'default', label: v }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (v: number) => `$${Number(v ?? 0).toFixed(2)}` },
    {
      title: 'Acciones', key: 'actions',
      render: (r: any) => (
        <Space size={4}>
          {(r.status === 'SENT' || r.status === 'PARTIAL') && (
            <Button
              size="small"
              icon={<InboxOutlined />}
              onClick={() => {
                setReceiveModal(r)
                receiveForm.setFieldsValue({
                  lines: (r.lines ?? []).map((l: any) => ({ id: l.id, productId: l.productId, productName: l.product?.name, ordered: l.quantity, received: 0 }))
                })
              }}
            >
              Recibir
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Órdenes de Compra</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setNewModal(true); newForm.resetFields() }}>
          Nueva OC
        </Button>
      </div>

      <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading}
        style={{ borderRadius: 10, overflow: 'hidden' }} pagination={{ pageSize: 20 }} />

      {/* Modal nueva OC */}
      <Modal
        open={newModal}
        title="Nueva Orden de Compra"
        onCancel={() => setNewModal(false)}
        onOk={() => newForm.submit()}
        confirmLoading={createMutation.isPending}
        okText="Crear OC"
        width={780}
      >
        <Form form={newForm} layout="vertical" onFinish={createMutation.mutate} requiredMark={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplierId" label="Proveedor" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="Seleccionar proveedor"
                  options={suppliers.map((s: any) => ({ value: s.id, label: s.name }))}
                  filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expectedDate" label="Fecha esperada de entrega">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain style={{ margin: '8px 0 12px' }}>Líneas de ítems</Divider>

          <Form.List name="lines" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={11}>
                      <Form.Item name={[name, 'productId']} noStyle rules={[{ required: true, message: 'Selecciona producto' }]}>
                        <Select
                          showSearch
                          placeholder="Buscar producto"
                          style={{ width: '100%' }}
                          options={products.map((p: any) => ({ value: p.id, label: p.name }))}
                          filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item name={[name, 'quantity']} noStyle rules={[{ required: true, message: 'Cantidad' }]}>
                        <InputNumber min={1} placeholder="Cant." style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name={[name, 'unitCost']} noStyle rules={[{ required: true, message: 'Costo' }]}>
                        <InputNumber min={0} step={0.01} prefix="$" placeholder="Costo unit." style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button size="small" danger onClick={() => remove(name)} disabled={fields.length === 1}>✕</Button>
                    </Col>
                  </Row>
                ))}
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => add({})}>
                  Agregar ítem
                </Button>
              </>
            )}
          </Form.List>

          <Form.Item name="notes" label="Notas" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal recibir OC */}
      <Modal
        open={receiveModal !== null}
        title={`Recibir OC — ${receiveModal?.orderNumber ?? ''}`}
        onCancel={() => setReceiveModal(null)}
        onOk={() => receiveForm.submit()}
        confirmLoading={receiveMutation.isPending}
        okText="Registrar recepción"
        width={600}
      >
        <Form
          form={receiveForm}
          layout="vertical"
          onFinish={(values) => receiveMutation.mutate({ id: receiveModal?.id, lines: values.lines })}
          requiredMark={false}
        >
          <Form.List name="lines">
            {(fields) => (
              <>
                <Row gutter={8} style={{ marginBottom: 8, fontWeight: 600 }}>
                  <Col span={12}>Producto</Col>
                  <Col span={6}>Ordenado</Col>
                  <Col span={6}>Recibido</Col>
                </Row>
                {fields.map(({ key, name }) => {
                  const line = receiveForm.getFieldValue(['lines', name])
                  return (
                    <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                      <Col span={12}>
                        <Typography.Text>{line?.productName ?? '—'}</Typography.Text>
                        <Form.Item name={[name, 'id']} hidden><Input /></Form.Item>
                        <Form.Item name={[name, 'productId']} hidden><Input /></Form.Item>
                        <Form.Item name={[name, 'productName']} hidden><Input /></Form.Item>
                        <Form.Item name={[name, 'ordered']} hidden><Input /></Form.Item>
                      </Col>
                      <Col span={6}>
                        <Typography.Text>{line?.ordered ?? 0}</Typography.Text>
                      </Col>
                      <Col span={6}>
                        <Form.Item name={[name, 'received']} noStyle rules={[{ required: true }]}>
                          <InputNumber min={0} max={line?.ordered} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  )
                })}
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  )
}

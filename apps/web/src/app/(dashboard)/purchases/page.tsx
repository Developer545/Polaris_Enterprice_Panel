'use client'
import { useState } from 'react'
import {
  Table, Button, Tag, Typography, Modal, Form, Select, InputNumber, Input,
  App, Row, Col, Space, Divider, Card, Statistic, Tooltip, theme,
} from 'antd'
import {
  PlusOutlined, InboxOutlined, ShoppingOutlined, ClockCircleOutlined,
  CheckCircleOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  DRAFT:     { color: 'default', label: 'Borrador' },
  SENT:      { color: 'blue',    label: 'Enviada' },
  PARTIAL:   { color: 'orange',  label: 'Parcial' },
  RECEIVED:  { color: 'green',   label: 'Recibida' },
  CANCELLED: { color: 'red',     label: 'Cancelada' },
}

const LBL = (text: string) => (
  <span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>{text}</span>
)
const INP_STYLE = { borderRadius: 8, borderColor: '#e9e9e7' } as const
const MB = { marginBottom: 16 } as const

export default function PurchasesPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const [newModal, setNewModal] = useState(false)
  const [receiveModal, setReceiveModal] = useState<any>(null)
  const [newForm] = Form.useForm()
  const [receiveForm] = Form.useForm()
  const { companyId } = useAppContext()

  const { data = [], isLoading, refetch } = useQuery({
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

  // KPIs
  const list = data as any[]
  const pending   = list.filter(p => p.status === 'SENT' || p.status === 'PARTIAL').length
  const received  = list.filter(p => p.status === 'RECEIVED').length
  const totalSpent = list.filter(p => p.status === 'RECEIVED').reduce((s, p) => s + Number(p.total ?? 0), 0)

  const columns = [
    {
      title: 'N° OC', dataIndex: 'orderNumber', key: 'orderNumber',
      width: 140,
      render: (v: string) => <code style={{ fontSize: 11, color: '#37352f' }}>{v}</code>,
    },
    {
      title: 'Proveedor', key: 'supplier',
      render: (r: any) => <Text style={{ fontSize: 13, fontWeight: 500 }}>{r.supplier?.name ?? '—'}</Text>,
    },
    {
      title: 'Fecha OC', dataIndex: 'orderDate', key: 'orderDate', width: 110,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'F. esperada', dataIndex: 'expectedDate', key: 'expectedDate', width: 110,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : <Text type="secondary">—</Text>,
    },
    {
      title: 'Estado', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => {
        const s = STATUS_MAP[v] ?? { color: 'default', label: v }
        return <Tag color={s.color} style={{ borderRadius: 4, fontWeight: 500 }}>{s.label}</Tag>
      },
    },
    {
      title: 'Total', dataIndex: 'total', key: 'total', width: 100,
      render: (v: number) => <Text strong>${Number(v ?? 0).toFixed(2)}</Text>,
    },
    {
      title: 'Acciones', key: 'actions', width: 100, fixed: 'right' as const,
      render: (r: any) => (
        (r.status === 'SENT' || r.status === 'PARTIAL') ? (
          <Tooltip title="Registrar recepción">
            <Button
              size="small"
              icon={<InboxOutlined />}
              onClick={() => {
                setReceiveModal(r)
                receiveForm.setFieldsValue({
                  lines: (r.lines ?? []).map((l: any) => ({
                    id: l.id,
                    productId: l.productId,
                    productName: l.product?.name,
                    ordered: l.quantity,
                    received: 0,
                  })),
                })
              }}
            >
              Recibir
            </Button>
          </Tooltip>
        ) : null
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Órdenes de Compra</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Gestión de órdenes y recepción de mercancía</Text>
      </div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { title: 'Total órdenes',  value: list.length, icon: <ShoppingOutlined />,   color: token.colorPrimary },
          { title: 'Pendientes',     value: pending,     icon: <ClockCircleOutlined />, color: '#fa8c16' },
          { title: 'Recibidas',      value: received,    icon: <CheckCircleOutlined />, color: token.colorSuccess },
          { title: 'Total gastado',  value: totalSpent,  icon: null,                   color: '#787774', prefix: '$', precision: 2 },
        ].map(kpi => (
          <Col xs={12} sm={6} key={kpi.title}>
            <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Statistic
                title={<span style={{ fontSize: 12, color: '#888' }}>{kpi.title}</span>}
                value={kpi.value}
                precision={kpi.precision}
                prefix={kpi.prefix ?? (kpi.icon ? <span style={{ color: kpi.color, marginRight: 4 }}>{kpi.icon}</span> : undefined)}
                valueStyle={{ color: kpi.color, fontWeight: 700, fontSize: 22 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Toolbar */}
      <Card
        size="small"
        style={{ borderRadius: 12, marginBottom: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Tooltip title="Recargar">
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setNewModal(true); newForm.resetFields() }}
          >
            Nueva OC
          </Button>
        </div>
      </Card>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          size="small"
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 750 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: false,
            showTotal: (t) => `${t} órdenes`,
            style: { padding: '8px 16px' },
          }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      {/* ── Modal nueva OC ──────────────────────────────────────── */}
      <Modal
        open={newModal}
        title={<Space><PlusOutlined /> Nueva Orden de Compra</Space>}
        onCancel={() => setNewModal(false)}
        onOk={() => newForm.submit()}
        confirmLoading={createMutation.isPending}
        okText="Crear OC"
        okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        width={780}
        destroyOnClose
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Form form={newForm} layout="vertical" onFinish={createMutation.mutate} requiredMark={false}>

          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Encabezado</Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="supplierId" label={LBL('Proveedor')} rules={[{ required: true, message: 'Selecciona un proveedor' }]} style={MB}>
                <Select
                  showSearch
                  placeholder="Seleccionar proveedor"
                  options={(suppliers as any[]).map((s: any) => ({ value: s.id, label: s.name }))}
                  filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="expectedDate" label={LBL('Fecha esperada de entrega')} style={MB}>
                <Input type="date" style={INP_STYLE} />
              </Form.Item>
            </Col>
          </Row>

          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Líneas de ítems</Text>
          <Divider style={{ margin: '4px 0 12px', borderColor: '#e9e9e7' }} />

          {/* Header fijo de las columnas */}
          <Row gutter={8} style={{ marginBottom: 6 }}>
            <Col span={11}><Text style={{ fontSize: 11, color: '#787774', fontWeight: 600 }}>Producto</Text></Col>
            <Col span={5}><Text style={{ fontSize: 11, color: '#787774', fontWeight: 600 }}>Cantidad</Text></Col>
            <Col span={6}><Text style={{ fontSize: 11, color: '#787774', fontWeight: 600 }}>Costo unit.</Text></Col>
          </Row>

          <Form.List name="lines" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={11}>
                      <Form.Item name={[name, 'productId']} noStyle rules={[{ required: true, message: 'Selecciona producto' }]}>
                        <Select
                          showSearch
                          placeholder="Buscar producto..."
                          style={{ width: '100%', borderRadius: 8 }}
                          options={(products as any[]).map((p: any) => ({ value: p.id, label: p.name }))}
                          filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item name={[name, 'quantity']} noStyle rules={[{ required: true, message: 'Cantidad' }]}>
                        <InputNumber min={1} placeholder="Cant." style={{ width: '100%', borderRadius: 8 }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name={[name, 'unitCost']} noStyle rules={[{ required: true, message: 'Costo' }]}>
                        <InputNumber min={0} step={0.01} prefix="$" placeholder="0.00" style={{ width: '100%', borderRadius: 8 }} />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button
                        type="text"
                        size="small"
                        danger
                        onClick={() => remove(name)}
                        disabled={fields.length === 1}
                        style={{ fontSize: 12 }}
                      >
                        ✕
                      </Button>
                    </Col>
                  </Row>
                ))}
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => add({})}
                  style={{ borderRadius: 8, borderColor: '#e9e9e7', color: '#787774', marginBottom: 16 }}
                >
                  Agregar ítem
                </Button>
              </>
            )}
          </Form.List>

          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Observaciones</Text>
          <Divider style={{ margin: '4px 0 12px', borderColor: '#e9e9e7' }} />
          <Form.Item name="notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} placeholder="Notas u observaciones..." style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal recibir OC ────────────────────────────────────── */}
      <Modal
        open={receiveModal !== null}
        title={<Space><InboxOutlined /> Registrar recepción — <code style={{ fontSize: 12 }}>{receiveModal?.orderNumber ?? ''}</code></Space>}
        onCancel={() => setReceiveModal(null)}
        onOk={() => receiveForm.submit()}
        confirmLoading={receiveMutation.isPending}
        okText="Confirmar recepción"
        okButtonProps={{ style: { background: token.colorSuccess, borderColor: token.colorSuccess, borderRadius: 8, fontWeight: 600 } }}
        width={600}
        destroyOnClose
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
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
                {/* Header */}
                <Row gutter={8} style={{ marginBottom: 8, padding: '0 4px' }}>
                  <Col span={12}><Text style={{ fontSize: 11, color: '#787774', fontWeight: 600 }}>PRODUCTO</Text></Col>
                  <Col span={6}><Text style={{ fontSize: 11, color: '#787774', fontWeight: 600 }}>ORDENADO</Text></Col>
                  <Col span={6}><Text style={{ fontSize: 11, color: '#787774', fontWeight: 600 }}>RECIBIDO</Text></Col>
                </Row>
                <Divider style={{ margin: '0 0 12px', borderColor: '#e9e9e7' }} />
                {fields.map(({ key, name }) => {
                  const line = receiveForm.getFieldValue(['lines', name])
                  return (
                    <Row key={key} gutter={8} align="middle" style={{ marginBottom: 10 }}>
                      <Col span={12}>
                        <Text style={{ fontSize: 13 }}>{line?.productName ?? '—'}</Text>
                        <Form.Item name={[name, 'id']} hidden><Input /></Form.Item>
                        <Form.Item name={[name, 'productId']} hidden><Input /></Form.Item>
                        <Form.Item name={[name, 'productName']} hidden><Input /></Form.Item>
                        <Form.Item name={[name, 'ordered']} hidden><Input /></Form.Item>
                      </Col>
                      <Col span={6}>
                        <Text style={{ fontSize: 13, color: '#787774' }}>{line?.ordered ?? 0}</Text>
                      </Col>
                      <Col span={6}>
                        <Form.Item name={[name, 'received']} noStyle rules={[{ required: true, message: 'Requerido' }]}>
                          <InputNumber min={0} max={line?.ordered} style={{ width: '100%', borderRadius: 8 }} />
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

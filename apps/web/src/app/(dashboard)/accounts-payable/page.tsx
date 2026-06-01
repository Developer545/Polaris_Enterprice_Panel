'use client'
import { useState, useMemo } from 'react'
import {
  Table, Button, Tag, Typography, Modal, Form, InputNumber, Select, App,
  Row, Col, Statistic, Card, Space, Tooltip, DatePicker, Input, theme,
  Spin,
} from 'antd'
import {
  DollarOutlined, ReloadOutlined, PlusOutlined, WarningOutlined,
  ClockCircleOutlined, CheckCircleOutlined, StopOutlined, FilterOutlined,
  FundOutlined, UnorderedListOutlined, FilePdfOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { abrirAgingHtml } from '../../../lib/doc-viewer'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pendiente', color: 'orange',  icon: <ClockCircleOutlined />  },
  PARTIAL: { label: 'Abonado',   color: 'blue',    icon: <DollarOutlined />       },
  PAID:    { label: 'Pagada',    color: 'success',  icon: <CheckCircleOutlined />  },
  OVERDUE: { label: 'Vencida',   color: 'error',   icon: <WarningOutlined />      },
}

const FORMA_PAGO = [
  { value: '01', label: 'Efectivo'       },
  { value: '02', label: 'Tarjeta débito' },
  { value: '03', label: 'Tarjeta crédito'},
  { value: '04', label: 'Transferencia'  },
  { value: '05', label: 'Cheque'         },
]

const BUCKET_CONFIG = [
  { key: 'current', label: 'Al corriente', color: '#52c41a' },
  { key: 'd30',     label: '1–30 días',    color: '#faad14' },
  { key: 'd60',     label: '31–60 días',   color: '#fa8c16' },
  { key: 'd90',     label: '61–90 días',   color: '#ff4d4f' },
  { key: 'd90plus', label: '+90 días',     color: '#cf1322' },
]

export default function AccountsPayablePage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const { companyId } = useAppContext()

  const [newModal,   setNewModal]   = useState(false)
  const [payModal,   setPayModal]   = useState<any>(null)
  const [filterStatus,   setFilterStatus]   = useState<string | undefined>()
  const [filterSupplier, setFilterSupplier] = useState<string | undefined>()
  const [showAging,  setShowAging]  = useState(false)

  const [newForm] = Form.useForm()
  const [payForm] = Form.useForm()

  // ── Queries ────────────────────────────────────────────────────────────────
  const params: Record<string, string> = { companyId: companyId! }
  if (filterStatus)   params.status     = filterStatus
  if (filterSupplier) params.supplierId = filterSupplier

  const apQ = useQuery<any[]>({
    queryKey: ['accounts-payable', companyId, filterStatus, filterSupplier],
    queryFn:  () => api.get('/api/accounts-payable', { params }).then(r => r.data),
    enabled:  !!companyId,
  })

  const suppliersQ = useQuery<any[]>({
    queryKey: ['suppliers', companyId],
    queryFn:  () => api.get('/api/suppliers', { params: { companyId } }).then(r => r.data),
    enabled:  !!companyId,
  })

  const agingQ = useQuery<any>({
    queryKey: ['ap-aging', companyId],
    queryFn:  () => api.get('/api/accounts-payable/aging', { params: { companyId } }).then(r => r.data),
    enabled:  showAging && !!companyId,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/accounts-payable', { ...values, companyId }),
    onSuccess: () => {
      message.success('CxP creada')
      qc.invalidateQueries({ queryKey: ['accounts-payable'] })
      setNewModal(false)
      newForm.resetFields()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al crear'),
  })

  const payMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) =>
      api.post(`/api/accounts-payable/${id}/payment`, values),
    onSuccess: () => {
      message.success('Pago registrado')
      qc.invalidateQueries({ queryKey: ['accounts-payable'] })
      qc.invalidateQueries({ queryKey: ['ap-aging'] })
      setPayModal(null)
      payForm.resetFields()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al registrar pago'),
  })

  // ── Computed ───────────────────────────────────────────────────────────────
  const records   = apQ.data ?? []
  const suppliers = suppliersQ.data ?? []

  const isOverdue = (r: any) =>
    r.status !== 'PAID' && r.dueDate && dayjs(r.dueDate).isBefore(dayjs(), 'day')

  const totalPendiente = useMemo(() =>
    records.filter(r => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(r.status))
      .reduce((s, r) => s + Number(r.amount) - Number(r.amountPaid ?? r.paid ?? 0), 0),
    [records])

  const totalVencido = useMemo(() =>
    records.filter(r => isOverdue(r))
      .reduce((s, r) => s + Number(r.amount) - Number(r.amountPaid ?? r.paid ?? 0), 0),
    [records])

  const countVencido = useMemo(() => records.filter(isOverdue).length, [records])
  const countPendiente = useMemo(() =>
    records.filter(r => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(r.status)).length, [records])

  // ── Aging data ─────────────────────────────────────────────────────────────
  const agingData   = agingQ.data ?? { rows: [], buckets: {} }
  const agingBuckets = agingData.buckets ?? {}
  const agingRows    = agingData.rows ?? []

  const agingColumns: ColumnsType<any> = [
    {
      title: 'Proveedor', key: 'supplier',
      render: (_: any, r: any) => (
        <Text style={{ fontSize: 13 }}>{r.supplier?.name ?? '—'}</Text>
      ),
    },
    {
      title: 'Descripción', dataIndex: 'description',
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Pendiente', key: 'pending', width: 110, align: 'right' as const,
      render: (_: any, r: any) => (
        <Text strong style={{ color: token.colorError }}>${Number(r.pending ?? 0).toFixed(2)}</Text>
      ),
    },
    {
      title: 'Vencimiento', dataIndex: 'dueDate', width: 115,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v ? dayjs(v).format('DD/MM/YYYY') : '—'}</Text>,
    },
    {
      title: 'Días vencido', dataIndex: 'daysPast', width: 110, align: 'center' as const,
      render: (v: number) => (
        <Text style={{ fontSize: 12, color: v === 0 ? token.colorSuccess : v <= 30 ? '#faad14' : v <= 60 ? '#fa8c16' : token.colorError }}>
          {v === 0 ? 'Al corriente' : `${v} días`}
        </Text>
      ),
    },
    {
      title: 'Tramo', dataIndex: 'bucket', width: 115,
      render: (b: string) => {
        const cfg = BUCKET_CONFIG.find(c => c.key === b)
        return cfg ? <Tag color={cfg.color} style={{ borderRadius: 6, fontWeight: 500 }}>{cfg.label}</Tag> : <Tag>{b}</Tag>
      },
    },
  ]

  // ── Columns (lista) ────────────────────────────────────────────────────────
  const columns: ColumnsType<any> = [
    {
      title: 'Proveedor', key: 'supplier',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13, fontWeight: 500 }}>{r.supplier?.name ?? r.supplierName ?? '—'}</Text>
          {r.purchaseOrder?.orderNumber && (
            <code style={{ fontSize: 10, background: token.colorFillSecondary, padding: '1px 4px', borderRadius: 3 }}>
              OC #{r.purchaseOrder.orderNumber}
            </code>
          )}
        </Space>
      ),
    },
    {
      title: 'Descripción', dataIndex: 'description',
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Total', dataIndex: 'amount', width: 110, align: 'right' as const,
      render: (v: any) => <Text strong>${Number(v ?? 0).toFixed(2)}</Text>,
    },
    {
      title: 'Abonado', key: 'paid', width: 110, align: 'right' as const,
      render: (_: any, r: any) => (
        <Text style={{ color: token.colorSuccess }}>
          ${Number(r.amountPaid ?? r.paid ?? 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Pendiente', key: 'pending', width: 110, align: 'right' as const,
      render: (_: any, r: any) => {
        const pending = Number(r.amount ?? 0) - Number(r.amountPaid ?? r.paid ?? 0)
        return (
          <Text style={{ color: pending > 0 ? token.colorError : token.colorSuccess, fontWeight: 600 }}>
            ${pending.toFixed(2)}
          </Text>
        )
      },
    },
    {
      title: 'Vencimiento', dataIndex: 'dueDate', width: 125,
      render: (v: string, r: any) => {
        const overdue = isOverdue(r)
        return (
          <Text style={{ color: overdue ? token.colorError : undefined, fontSize: 12 }}>
            {overdue && <WarningOutlined style={{ marginRight: 4 }} />}
            {v ? dayjs(v).format('DD/MM/YYYY') : '—'}
          </Text>
        )
      },
    },
    {
      title: 'Estado', dataIndex: 'status', width: 115,
      render: (s: string) => {
        const cfg = STATUS_CONFIG[s] ?? { label: s, color: 'default', icon: null }
        return <Tag color={cfg.color} icon={cfg.icon} style={{ borderRadius: 6, fontWeight: 500 }}>{cfg.label}</Tag>
      },
    },
    {
      title: '', key: 'actions', width: 130, fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={4}>
          {['PENDING', 'PARTIAL', 'OVERDUE'].includes(r.status) && (
            <Button
              size="small"
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => {
                const pending = Number(r.amount ?? 0) - Number(r.amountPaid ?? r.paid ?? 0)
                payForm.setFieldsValue({ amount: pending, paymentMethod: '01' })
                setPayModal(r)
              }}
              style={{ background: token.colorSuccess, borderColor: token.colorSuccess, borderRadius: 6 }}
            >
              Pagar
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const kpis = [
    { title: 'Por pagar',         value: `$${totalPendiente.toFixed(2)}`, color: token.colorWarning, icon: <ClockCircleOutlined /> },
    { title: 'Vencido',           value: `$${totalVencido.toFixed(2)}`,   color: token.colorError,   icon: <WarningOutlined />     },
    { title: 'Facturas vencidas', value: countVencido,                     color: token.colorError,   icon: <StopOutlined />        },
    { title: 'Pendientes',        value: countPendiente,                   color: token.colorPrimary, icon: <FilterOutlined />      },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: '0 0 2px', fontWeight: 700 }}>Cuentas por Pagar</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Gestión de deudas con proveedores</Text>
        </div>
        <Space wrap>
          <Tooltip title="Recargar">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                qc.invalidateQueries({ queryKey: ['accounts-payable'] })
                qc.invalidateQueries({ queryKey: ['ap-aging'] })
              }}
            />
          </Tooltip>
          <Button
            icon={showAging ? <UnorderedListOutlined /> : <FundOutlined />}
            onClick={() => setShowAging(v => !v)}
            style={{ borderRadius: 8 }}
          >
            {showAging ? 'Lista' : 'Aging'}
          </Button>
          {showAging && agingData.rows.length > 0 && (
            <Button
              icon={<FilePdfOutlined />}
              style={{ borderRadius: 8 }}
              onClick={() => abrirAgingHtml(agingData.rows, agingData.buckets, 'CxP')}
            >
              Ver PDF
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { newForm.resetFields(); setNewModal(true) }}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Nueva CxP
          </Button>
        </Space>
      </div>

      {/* KPIs */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        {kpis.map(k => (
          <Col xs={12} sm={12} md={6} key={k.title}>
            <Card
              size="small"
              style={{
                borderRadius: 12, border: 'none',
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                borderTop: `3px solid ${k.color}`,
              }}
            >
              <Statistic
                title={<Text style={{ fontSize: 12, color: token.colorTextSecondary }}>{k.title}</Text>}
                value={k.value}
                prefix={<span style={{ color: k.color, marginRight: 4, fontSize: 14 }}>{k.icon}</span>}
                valueStyle={{ fontSize: 22, fontWeight: 700, color: k.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Vista Aging ─────────────────────────────────────────────────────── */}
      {showAging && (
        <div>
          {/* Buckets */}
          <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
            {BUCKET_CONFIG.map(b => (
              <Col xs={12} sm={12} md={4} key={b.key} style={{ flex: '1 1 0' }}>
                <Card
                  size="small"
                  style={{ borderRadius: 10, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: `3px solid ${b.color}` }}
                >
                  <Statistic
                    title={<Text style={{ fontSize: 11, color: token.colorTextSecondary }}>{b.label}</Text>}
                    value={agingBuckets[b.key] != null ? `$${Number(agingBuckets[b.key]).toFixed(2)}` : '—'}
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: b.color }}
                  />
                </Card>
              </Col>
            ))}
            <Col xs={12} sm={12} md={4} style={{ flex: '1 1 0' }}>
              <Card
                size="small"
                style={{ borderRadius: 10, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderTop: `3px solid ${token.colorPrimary}` }}
              >
                <Statistic
                  title={<Text style={{ fontSize: 11, color: token.colorTextSecondary }}>Total</Text>}
                  value={agingBuckets.total != null ? `$${Number(agingBuckets.total).toFixed(2)}` : '—'}
                  valueStyle={{ fontSize: 18, fontWeight: 700, color: token.colorPrimary }}
                />
              </Card>
            </Col>
          </Row>

          {/* Tabla aging */}
          <Card
            size="small"
            style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            styles={{ body: { padding: 0 } }}
          >
            {agingQ.isLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : (
              <Table
                size="small"
                columns={agingColumns}
                dataSource={agingRows}
                rowKey="id"
                scroll={{ x: 800 }}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  pageSizeOptions: ['20', '50', '100'],
                  showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} cuentas`,
                  style: { padding: '8px 16px' },
                }}
                onRow={(r: any) => ({
                  style: r.bucket === 'd90plus' ? { background: '#fff1f0' }
                    : r.bucket === 'd90' ? { background: '#fff7e6' }
                    : undefined,
                })}
                locale={{ emptyText: 'Sin cuentas pendientes' }}
              />
            )}
          </Card>
        </div>
      )}

      {/* ── Vista Lista ──────────────────────────────────────────────────────── */}
      {!showAging && (
        <div>
          {/* Filtros */}
          <Card
            size="small"
            style={{ borderRadius: 10, marginBottom: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Space wrap>
              <Select
                placeholder="Estado"
                allowClear
                style={{ width: 150 }}
                value={filterStatus}
                onChange={setFilterStatus}
                options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
              />
              <Select
                placeholder="Proveedor"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 220 }}
                value={filterSupplier}
                onChange={setFilterSupplier}
                options={suppliers.map((s: any) => ({ value: s.id, label: s.name }))}
              />
              {(filterStatus || filterSupplier) && (
                <Button onClick={() => { setFilterStatus(undefined); setFilterSupplier(undefined) }}>
                  Limpiar
                </Button>
              )}
            </Space>
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
              dataSource={records}
              rowKey="id"
              loading={apQ.isLoading}
              scroll={{ x: 900 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: ['20', '50', '100'],
                showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} cuentas`,
                style: { padding: '8px 16px' },
              }}
              rowClassName={(r: any) => isOverdue(r) ? 'ant-table-row-danger' : ''}
              onRow={(r: any) => ({
                style: isOverdue(r) ? { background: token.colorErrorBg } : {},
              })}
              locale={{ emptyText: 'Sin cuentas por pagar' }}
            />
          </Card>
        </div>
      )}

      {/* ── Modal: Nueva CxP ──────────────────────────────────────────────── */}
      <Modal
        open={newModal}
        title={<Space><PlusOutlined />Nueva cuenta por pagar</Space>}
        onCancel={() => { setNewModal(false); newForm.resetFields() }}
        onOk={() => newForm.submit()}
        confirmLoading={createMutation.isPending}
        okText="Crear CxP"
        okButtonProps={{ style: { borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={540}
        style={{ top: 40 }}
        destroyOnClose
      >
        <Form
          form={newForm}
          layout="vertical"
          requiredMark={false}
          onFinish={values => createMutation.mutate({
            ...values,
            dueDate: values.dueDate.toISOString(),
          })}
        >
          <Form.Item name="supplierId" label="Proveedor" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Seleccionar proveedor..."
              options={suppliers.map((s: any) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>

          <Form.Item name="description" label="Descripción" rules={[{ required: true, min: 2 }]} style={{ marginBottom: 14 }}>
            <Input placeholder="Ej: Factura #001 — Compra de mercadería" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Monto ($)" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                <InputNumber min={0.01} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dueDate" label="Fecha de vencimiento" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notas" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} placeholder="Opcional..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Registrar pago ─────────────────────────────────────────── */}
      <Modal
        open={!!payModal}
        title={<Space><DollarOutlined />Registrar pago</Space>}
        onCancel={() => { setPayModal(null); payForm.resetFields() }}
        onOk={() => payForm.submit()}
        confirmLoading={payMutation.isPending}
        okText="Registrar pago"
        okButtonProps={{ style: { background: token.colorSuccess, borderColor: token.colorSuccess, borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={500}
        style={{ top: 40 }}
        destroyOnClose
      >
        {payModal && (
          <>
            <div style={{ marginBottom: 14, padding: '10px 14px', background: token.colorFillAlter, borderRadius: 8 }}>
              <Text strong>{payModal.supplier?.name ?? payModal.supplierName}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{payModal.description}</Text>
              <br />
              <Space style={{ marginTop: 6 }}>
                <Text>Total: <Text strong>${Number(payModal.amount).toFixed(2)}</Text></Text>
                <Text>Abonado: <Text style={{ color: token.colorSuccess }}>${Number(payModal.amountPaid ?? 0).toFixed(2)}</Text></Text>
                <Text>Pendiente: <Text style={{ color: token.colorError, fontWeight: 600 }}>
                  ${(Number(payModal.amount) - Number(payModal.amountPaid ?? 0)).toFixed(2)}
                </Text></Text>
              </Space>
            </div>

            {/* Historial de abonos previos */}
            {(payModal.payments ?? []).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 11, color: token.colorTextSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px', display: 'block', marginBottom: 6 }}>
                  Historial de abonos
                </Text>
                <div style={{ maxHeight: 120, overflowY: 'auto', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 6 }}>
                  {(payModal.payments ?? []).map((pmt: any, i: number) => (
                    <div key={pmt.id ?? i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', borderBottom: i < payModal.payments.length - 1 ? `1px solid ${token.colorBorderSecondary}` : 'none',
                      background: i % 2 === 0 ? 'transparent' : token.colorFillAlter,
                    }}>
                      <div>
                        <Text style={{ fontSize: 11 }}>
                          {pmt.paymentDate ? dayjs(pmt.paymentDate).format('DD/MM/YYYY') : '—'}
                        </Text>
                        {pmt.reference && (
                          <Text type="secondary" style={{ fontSize: 10, marginLeft: 6 }}>Ref: {pmt.reference}</Text>
                        )}
                      </div>
                      <Text style={{ fontSize: 12, fontWeight: 600, color: token.colorSuccess }}>
                        ${Number(pmt.amount).toFixed(2)}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <Form
          form={payForm}
          layout="vertical"
          requiredMark={false}
          onFinish={values => payMutation.mutate({ id: payModal?.id, values })}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Monto a pagar ($)" rules={[{ required: true }]} style={{ marginBottom: 14 }}>
                <InputNumber
                  min={0.01}
                  max={payModal ? Number(payModal.amount) - Number(payModal.amountPaid ?? 0) : undefined}
                  precision={2}
                  prefix="$"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentMethod" label="Forma de pago" initialValue="01" style={{ marginBottom: 14 }}>
                <Select options={FORMA_PAGO} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reference" label="Referencia" style={{ marginBottom: 14 }}>
            <Input placeholder="N° cheque, transferencia, voucher..." />
          </Form.Item>
          <Form.Item name="notes" label="Notas" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} placeholder="Observaciones..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

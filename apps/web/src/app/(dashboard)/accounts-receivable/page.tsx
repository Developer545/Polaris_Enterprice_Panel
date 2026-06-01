'use client'
import { useState } from 'react'
import {
  Table, Button, Tag, Typography, Modal, Form, Select, InputNumber, Input,
  App, Row, Col, Statistic, Card, Space, Tooltip, Popconfirm, DatePicker, theme,
  Spin,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, DollarOutlined, ClockCircleOutlined,
  CheckCircleOutlined, StopOutlined, WarningOutlined, FundOutlined, UnorderedListOutlined, FilePdfOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { abrirAgingHtml } from '../../../lib/doc-viewer'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:   { label: 'Pendiente',  color: 'warning', icon: <ClockCircleOutlined />  },
  PARTIAL:   { label: 'Abonado',    color: 'blue',    icon: <DollarOutlined />        },
  PAID:      { label: 'Pagado',     color: 'success', icon: <CheckCircleOutlined />   },
  OVERDUE:   { label: 'Vencido',    color: 'error',   icon: <WarningOutlined />       },
  CANCELLED: { label: 'Cancelado',  color: 'default', icon: <StopOutlined />          },
}

const FORMA_PAGO = [
  { value: '01', label: 'Efectivo'          },
  { value: '02', label: 'Tarjeta débito'    },
  { value: '03', label: 'Tarjeta crédito'   },
  { value: '04', label: 'Transferencia'     },
  { value: '05', label: 'Cheque'            },
]

const BUCKET_CONFIG = [
  { key: 'current', label: 'Al corriente', color: '#52c41a' },
  { key: 'd30',     label: '1–30 días',    color: '#faad14' },
  { key: 'd60',     label: '31–60 días',   color: '#fa8c16' },
  { key: 'd90',     label: '61–90 días',   color: '#ff4d4f' },
  { key: 'd90plus', label: '+90 días',     color: '#cf1322' },
]

export default function AccountsReceivablePage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const { companyId } = useAppContext()

  const [newModal,    setNewModal]    = useState(false)
  const [abonoModal,  setAbonoModal]  = useState<any>(null)
  const [filterStatus,  setFilterStatus]  = useState<string | undefined>()
  const [filterClient,  setFilterClient]  = useState<string | undefined>()
  const [dateRange,   setDateRange]   = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [showAging,   setShowAging]   = useState(false)

  const [newForm]   = Form.useForm()
  const [abonoForm] = Form.useForm()

  // ── Queries ────────────────────────────────────────────────────────────────

  const statsQ = useQuery({
    queryKey: ['ar-stats', companyId],
    queryFn:  () => api.get('/api/accounts-receivable/stats', { params: { companyId } }).then(r => r.data),
    enabled:  !!companyId,
  })

  const params: Record<string, string> = { companyId: companyId! }
  if (filterStatus) params.status   = filterStatus
  if (filterClient) params.clientId = filterClient
  if (dateRange) {
    params.from = dateRange[0].startOf('day').toISOString()
    params.to   = dateRange[1].endOf('day').toISOString()
  }

  const arQ = useQuery({
    queryKey: ['accounts-receivable', companyId, filterStatus, filterClient, dateRange?.[0]?.toString()],
    queryFn:  () => api.get('/api/accounts-receivable', { params }).then(r => r.data),
    enabled:  !!companyId,
  })

  const clientsQ = useQuery({
    queryKey: ['clients', companyId],
    queryFn:  () => api.get('/api/clients', { params: { companyId, limit: 200 } }).then(r => r.data?.data ?? r.data),
    enabled:  !!companyId,
  })

  const agingQ = useQuery<any>({
    queryKey: ['ar-aging', companyId],
    queryFn:  () => api.get('/api/accounts-receivable/aging', { params: { companyId } }).then(r => r.data),
    enabled:  showAging && !!companyId,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/accounts-receivable', { ...values, companyId }),
    onSuccess: () => {
      message.success('CxC creada')
      qc.invalidateQueries({ queryKey: ['accounts-receivable'] })
      qc.invalidateQueries({ queryKey: ['ar-stats'] })
      setNewModal(false)
      newForm.resetFields()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al crear'),
  })

  const abonoMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) =>
      api.post(`/api/accounts-receivable/${id}/payments`, values),
    onSuccess: () => {
      message.success('Abono registrado')
      qc.invalidateQueries({ queryKey: ['accounts-receivable'] })
      qc.invalidateQueries({ queryKey: ['ar-stats'] })
      qc.invalidateQueries({ queryKey: ['ar-aging'] })
      setAbonoModal(null)
      abonoForm.resetFields()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al abonar'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/accounts-receivable/${id}/cancel`),
    onSuccess: () => {
      message.success('CxC cancelada')
      qc.invalidateQueries({ queryKey: ['accounts-receivable'] })
      qc.invalidateQueries({ queryKey: ['ar-stats'] })
      qc.invalidateQueries({ queryKey: ['ar-aging'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  // ── Aging data ─────────────────────────────────────────────────────────────
  const agingData    = agingQ.data ?? { rows: [], buckets: {} }
  const agingBuckets = agingData.buckets ?? {}
  const agingRows    = agingData.rows ?? []

  const agingColumns: ColumnsType<any> = [
    {
      title: 'Cliente', key: 'client',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{r.client?.name ?? '—'}</Text>
          {r.client?.numDocumento && (
            <Text type="secondary" style={{ fontSize: 11 }}>{r.client.numDocumento}</Text>
          )}
        </Space>
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
      title: 'Cliente',
      dataIndex: ['client', 'name'],
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13, fontWeight: 500 }}>{r.client?.name}</Text>
          {r.client?.numDocumento && <Text type="secondary" style={{ fontSize: 11 }}>{r.client.numDocumento}</Text>}
        </Space>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Monto',
      dataIndex: 'amount',
      width: 110,
      align: 'right',
      render: (v: any) => <Text strong>${Number(v).toFixed(2)}</Text>,
    },
    {
      title: 'Abonado',
      dataIndex: 'amountPaid',
      width: 110,
      align: 'right',
      render: (v: any) => <Text style={{ color: token.colorSuccess }}>${Number(v).toFixed(2)}</Text>,
    },
    {
      title: 'Pendiente',
      width: 110,
      align: 'right',
      render: (_: any, r: any) => {
        const pending = Number(r.amount) - Number(r.amountPaid)
        return <Text style={{ color: token.colorError, fontWeight: 600 }}>${pending.toFixed(2)}</Text>
      },
    },
    {
      title: 'Vencimiento',
      dataIndex: 'dueDate',
      width: 120,
      render: (v: string, r: any) => {
        const isOverdue = new Date(v) < new Date() && r.status !== 'PAID'
        return (
          <Text style={{ color: isOverdue ? token.colorError : undefined, fontSize: 12 }}>
            {isOverdue && <WarningOutlined style={{ marginRight: 4 }} />}
            {dayjs(v).format('DD/MM/YYYY')}
          </Text>
        )
      },
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      width: 120,
      render: (s: string) => {
        const cfg = STATUS_CONFIG[s] ?? { label: s, color: 'default', icon: null }
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>
      },
    },
    {
      title: '',
      width: 140,
      render: (_: any, r: any) => (
        <Space>
          {['PENDING', 'PARTIAL', 'OVERDUE'].includes(r.status) && (
            <Button
              size="small"
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => {
                abonoForm.resetFields()
                setAbonoModal(r)
              }}
              style={{ background: token.colorSuccess, borderColor: token.colorSuccess }}
            >
              Abonar
            </Button>
          )}
          {['PENDING', 'PARTIAL', 'OVERDUE'].includes(r.status) && (
            <Popconfirm
              title="¿Cancelar esta CxC?"
              onConfirm={() => cancelMutation.mutate(r.id)}
              okText="Sí"
              cancelText="No"
            >
              <Button size="small" danger icon={<StopOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const stats   = statsQ.data ?? {}
  const records = arQ.data ?? []
  const clients = clientsQ.data ?? []

  const pending = Number(stats.totalPendiente ?? 0)
  const vencido = Number(stats.totalVencido ?? 0)

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: '0 0 2px', fontWeight: 700 }}>Cuentas por Cobrar</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Gestión de cobros a clientes</Text>
        </div>
        <Space wrap>
          <Tooltip title="Recargar">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                qc.invalidateQueries({ queryKey: ['accounts-receivable'] })
                qc.invalidateQueries({ queryKey: ['ar-stats'] })
                qc.invalidateQueries({ queryKey: ['ar-aging'] })
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
              onClick={() => abrirAgingHtml(agingData.rows, agingData.buckets, 'CxC')}
            >
              Ver PDF
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { newForm.resetFields(); setNewModal(true) }}
            style={{ background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 }}
          >
            Nueva CxC
          </Button>
        </Space>
      </div>

      {/* KPIs */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { title: 'Total pendiente',    value: `$${pending.toFixed(2)}`,                       color: token.colorWarning },
          { title: 'Vencido',            value: `$${vencido.toFixed(2)}`,                       color: token.colorError   },
          { title: 'Cobrado este mes',   value: `$${Number(stats.cobradoMes ?? 0).toFixed(2)}`, color: token.colorSuccess },
          { title: 'Facturas vencidas',  value: stats.countVencido ?? 0,                        color: token.colorError   },
        ].map(k => (
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
                title={<Typography.Text style={{ fontSize: 12, color: token.colorTextSecondary }}>{k.title}</Typography.Text>}
                value={k.value}
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
                  showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} registros`,
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
          <Card size="small" style={{ borderRadius: 10, marginBottom: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            styles={{ body: { padding: '12px 16px' } }}>
            <Space wrap>
              <Select
                placeholder="Estado"
                allowClear
                style={{ width: 140 }}
                value={filterStatus}
                onChange={setFilterStatus}
                options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
              />
              <Select
                placeholder="Cliente"
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 220 }}
                value={filterClient}
                onChange={setFilterClient}
                options={(clients as any[]).map((c: any) => ({ value: c.id, label: c.name }))}
              />
              <RangePicker
                value={dateRange}
                onChange={(v) => setDateRange(v as any)}
                format="DD/MM/YY"
                placeholder={['Vence desde', 'Vence hasta']}
              />
              <Button onClick={() => { setFilterStatus(undefined); setFilterClient(undefined); setDateRange(null) }}>
                Limpiar
              </Button>
            </Space>
          </Card>

          {/* Tabla */}
          <Card size="small" style={{ borderRadius: 10, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            styles={{ body: { padding: 0 } }}>
            <Table
              size="small"
              columns={columns}
              dataSource={records}
              rowKey="id"
              loading={arQ.isLoading}
              scroll={{ x: 900 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: ['20', '50', '100'],
                showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} registros`,
                style: { padding: '8px 16px' },
              }}
              locale={{ emptyText: 'Sin cuentas por cobrar' }}
              rowClassName={(r: any) => r.status === 'OVERDUE' ? 'ant-table-row-danger' : ''}
            />
          </Card>
        </div>
      )}

      {/* Modal nueva CxC */}
      <Modal
        open={newModal}
        title={<Space><PlusOutlined /> Nueva cuenta por cobrar</Space>}
        onCancel={() => { setNewModal(false); newForm.resetFields() }}
        onOk={() => newForm.submit()}
        confirmLoading={createMutation.isPending}
        okText="Crear CxC"
        okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        width={520}
        style={{ top: 40 }}
        destroyOnClose
      >
        <Form form={newForm} layout="vertical" requiredMark={false}
          onFinish={(v) => createMutation.mutate({ ...v, dueDate: v.dueDate.toISOString() })}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="clientId" label="Cliente" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccionar cliente..."
                  options={(clients as any[]).map((c: any) => ({ value: c.id, label: c.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Descripción" rules={[{ required: true, min: 2 }]}>
                <Input placeholder="Ej: Factura #001 — Venta a crédito" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="amount" label="Monto ($)" rules={[{ required: true }]}>
                <InputNumber min={0.01} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dueDate" label="Fecha de vencimiento" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notas">
                <Input.TextArea rows={2} placeholder="Opcional..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal abono */}
      <Modal
        open={!!abonoModal}
        title={<Space><DollarOutlined /> Registrar abono</Space>}
        onCancel={() => { setAbonoModal(null); abonoForm.resetFields() }}
        onOk={() => abonoForm.submit()}
        confirmLoading={abonoMutation.isPending}
        okText="Registrar abono"
        okButtonProps={{ style: { background: token.colorSuccess, borderColor: token.colorSuccess, borderRadius: 8, fontWeight: 600 } }}
        width={440}
        style={{ top: 40 }}
        destroyOnClose
      >
        {abonoModal && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: token.colorFillAlter, borderRadius: 8 }}>
            <Text strong>{abonoModal.client?.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{abonoModal.description}</Text>
            <br />
            <Space style={{ marginTop: 6 }}>
              <Text>Total: <Text strong>${Number(abonoModal.amount).toFixed(2)}</Text></Text>
              <Text>Abonado: <Text style={{ color: token.colorSuccess }}>${Number(abonoModal.amountPaid).toFixed(2)}</Text></Text>
              <Text>Pendiente: <Text style={{ color: token.colorError, fontWeight: 600 }}>
                ${(Number(abonoModal.amount) - Number(abonoModal.amountPaid)).toFixed(2)}
              </Text></Text>
            </Space>
          </div>
        )}
        <Form form={abonoForm} layout="vertical" requiredMark={false}
          onFinish={(v) => abonoMutation.mutate({
            id: abonoModal?.id,
            values: { ...v, paymentDate: v.paymentDate?.toISOString() },
          })}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Monto a abonar ($)" rules={[{ required: true }]}>
                <InputNumber
                  min={0.01}
                  max={abonoModal ? Number(abonoModal.amount) - Number(abonoModal.amountPaid) : undefined}
                  precision={2}
                  prefix="$"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentMethod" label="Forma de pago" initialValue="01">
                <Select options={FORMA_PAGO} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentDate" label="Fecha de pago">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reference" label="Referencia">
                <Input placeholder="N° cheque, transf..." />
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

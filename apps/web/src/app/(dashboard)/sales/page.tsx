'use client'
import { useState } from 'react'
import {
  Table, Button, Tag, Typography, DatePicker, Select, Modal, Descriptions,
  Space, App, Badge, Input, theme, Row, Col, Card, Statistic, Divider, Tooltip,
} from 'antd'
import {
  EyeOutlined, PrinterOutlined, StopOutlined, FileTextOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const TIPO_DTE_LABEL: Record<string, { label: string; color: string }> = {
  '01': { label: 'CF',  color: 'default' },
  '03': { label: 'CCF', color: 'blue' },
  '05': { label: 'NC',  color: 'orange' },
  '06': { label: 'ND',  color: 'purple' },
}

const DTE_STATUS: Record<string, { badge: 'processing' | 'success' | 'error' | 'warning' | 'default'; label: string }> = {
  PENDING:  { badge: 'processing', label: 'Pendiente' },
  ACCEPTED: { badge: 'success',    label: 'Aceptado' },
  REJECTED: { badge: 'error',      label: 'Rechazado' },
  ANNULLED: { badge: 'warning',    label: 'Anulado' },
  ERROR:    { badge: 'error',      label: 'Error' },
}

const FORMA_PAGO_LABEL: Record<string, string> = {
  '01': 'Efectivo', '02': 'T. Débito', '03': 'T. Crédito',
  '04': 'Cheque',   '05': 'Transferencia', '06': 'D. Electrónico',
}

export default function SalesPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const { companyId } = useAppContext()

  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [filterTipoDte, setFilterTipoDte] = useState<string | undefined>(undefined)
  const [detail, setDetail] = useState<any>(null)
  const [anularModal, setAnularModal] = useState<any>(null)
  const [anularReason, setAnularReason] = useState('')

  const params: Record<string, any> = { companyId, page }
  if (dateRange?.[0]) params.from = dateRange[0].startOf('day').toISOString()
  if (dateRange?.[1]) params.to = dateRange[1].endOf('day').toISOString()
  if (filterTipoDte) params.tipoDte = filterTipoDte

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sales', companyId, page, dateRange, filterTipoDte],
    queryFn: () => api.get('/api/pos/sales', { params }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: saleDetail } = useQuery({
    queryKey: ['sale-detail', detail?.id],
    queryFn: () => api.get(`/api/pos/sales/${detail.id}`).then(r => r.data),
    enabled: !!detail?.id,
  })

  const anularMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/api/pos/sales/${id}/void`, { reason }),
    onSuccess: () => {
      message.success('Venta anulada')
      qc.invalidateQueries({ queryKey: ['sales'] })
      setAnularModal(null)
      setAnularReason('')
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al anular'),
  })

  function handlePrint(sale: any) {
    const win = window as any
    if (win.electron?.printer?.printReceipt) {
      win.electron.printer.printReceipt({
        businessName: sale.company?.name ?? sale.branch?.name ?? 'Empresa',
        branchName:   sale.branch?.name ?? '—',
        address:      sale.company?.address,
        nit:          sale.company?.nit,
        nrc:          sale.company?.nrc,
        cashierName:  sale.user?.name ?? '—',
        saleNumber:   sale.dteDocument?.numeroControl ?? sale.id?.substring(0, 8),
        date:         dayjs(sale.createdAt).format('DD/MM/YYYY HH:mm'),
        tipoDte:      TIPO_DTE_LABEL[sale.tipoDte]?.label ?? sale.tipoDte,
        items: (sale.items ?? []).map((i: any) => ({
          description: i.productName,
          qty:         Number(i.quantity),
          unitPrice:   Number(i.unitPrice),
          total:       Number(i.ventaGravada) + Number(i.ivaItem),
        })),
        subtotal:      Number(sale.totalGravada ?? 0),
        iva:           Number(sale.totalIva ?? 0),
        total:         Number(sale.totalPagar ?? 0),
        paymentMethod: sale.payments?.length
          ? (FORMA_PAGO_LABEL[sale.payments[0].formaPago] ?? sale.payments[0].formaPago)
          : '—',
        amountPaid: sale.payments?.[0]?.amount ? Number(sale.payments[0].amount) : undefined,
      })
    } else {
      window.print()
    }
  }

  // KPIs locales (de la página actual)
  const salesList: any[] = data?.sales ?? []
  const totalAmount = salesList.reduce((s: number, r: any) => s + Number(r.totalPagar ?? 0), 0)
  const accepted = salesList.filter((r: any) => r.dteDocument?.status === 'ACCEPTED').length
  const pending  = salesList.filter((r: any) => r.dteDocument?.status === 'PENDING').length

  const columns = [
    {
      title: 'Fecha', dataIndex: 'createdAt', key: 'date', width: 130,
      render: (v: string) => (
        <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YY HH:mm')}</Text>
      ),
    },
    {
      title: 'Sucursal', key: 'branch', width: 130,
      render: (r: any) => <Text style={{ fontSize: 13 }}>{r.branch?.name ?? '—'}</Text>,
    },
    {
      title: 'Cliente', key: 'client',
      render: (r: any) => (
        <Text style={{ fontSize: 13 }}>{r.client?.name ?? <Text type="secondary">Consumidor Final</Text>}</Text>
      ),
    },
    {
      title: 'Tipo', dataIndex: 'tipoDte', key: 'tipoDte', width: 70,
      render: (v: string) => {
        const t = TIPO_DTE_LABEL[v] ?? { label: v, color: 'default' }
        return <Tag color={t.color} style={{ borderRadius: 4, fontWeight: 600 }}>{t.label}</Tag>
      },
    },
    {
      title: 'N° Control', key: 'control', width: 200,
      render: (r: any) => r.dteDocument?.numeroControl
        ? <code style={{ fontSize: 11, color: '#37352f' }}>{r.dteDocument.numeroControl}</code>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Estado DTE', key: 'dteStatus', width: 120,
      render: (r: any) => {
        const s = r.dteDocument?.status
        if (!s) return <Tag style={{ borderRadius: 4 }}>Sin DTE</Tag>
        const info = DTE_STATUS[s] ?? { badge: 'default' as const, label: s }
        return <Badge status={info.badge} text={<Text style={{ fontSize: 12 }}>{info.label}</Text>} />
      },
    },
    {
      title: 'Total', dataIndex: 'totalPagar', key: 'total', width: 100,
      render: (v: number) => (
        <Text strong style={{ color: token.colorPrimary }}>${Number(v).toFixed(2)}</Text>
      ),
    },
    {
      title: 'Acciones', key: 'actions', width: 110, fixed: 'right' as const,
      render: (r: any) => (
        <Space size={4}>
          <Tooltip title="Ver detalle">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setDetail(r)} />
          </Tooltip>
          <Tooltip title="Imprimir">
            <Button type="text" size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(r)} />
          </Tooltip>
          {r.dteDocument?.status !== 'ANNULLED' && (
            <Tooltip title="Anular">
              <Button type="text" size="small" danger icon={<StopOutlined />}
                onClick={() => { setAnularModal(r); setAnularReason('') }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Historial de Ventas</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Consulta, detalle e impresión de comprobantes DTE</Text>
      </div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { title: 'Ventas (página)',  value: salesList.length, icon: <FileTextOutlined />,      color: token.colorPrimary },
          { title: 'Aceptadas DTE',   value: accepted,         icon: <CheckCircleOutlined />,   color: token.colorSuccess },
          { title: 'Pendientes DTE',  value: pending,          icon: <ClockCircleOutlined />,   color: '#fa8c16' },
          { title: 'Total facturado', value: totalAmount,      prefix: '$', precision: 2,        color: '#37352f' },
        ].map(kpi => (
          <Col xs={12} sm={6} key={kpi.title}>
            <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Statistic
                title={<span style={{ fontSize: 12, color: '#888' }}>{kpi.title}</span>}
                value={kpi.value}
                precision={(kpi as any).precision}
                prefix={(kpi as any).prefix ?? ((kpi as any).icon
                  ? <span style={{ color: kpi.color, marginRight: 4 }}>{(kpi as any).icon}</span>
                  : '$')}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Space wrap>
            <Select
              allowClear
              placeholder="Tipo DTE"
              style={{ width: 150 }}
              value={filterTipoDte}
              onChange={v => { setFilterTipoDte(v); setPage(1) }}
              options={[
                { value: '01', label: 'CF (01)' },
                { value: '03', label: 'CCF (03)' },
                { value: '05', label: 'NC (05)' },
                { value: '06', label: 'ND (06)' },
              ]}
            />
            <DatePicker.RangePicker
              value={dateRange}
              onChange={v => { setDateRange(v as any); setPage(1) }}
              format="DD/MM/YYYY"
              allowClear
            />
          </Space>
          <Tooltip title="Recargar">
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
          </Tooltip>
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
          dataSource={salesList}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            total: data?.total ?? 0,
            pageSize: 50,
            onChange: setPage,
            showTotal: (t) => `${t} ventas`,
            style: { padding: '8px 16px' },
          }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      {/* ── Modal detalle de venta ─────────────────────────────────────── */}
      <Modal
        open={!!detail}
        title={<Space><EyeOutlined />Detalle de venta</Space>}
        onCancel={() => setDetail(null)}
        footer={[
          <Button key="print" icon={<PrinterOutlined />}
            style={{ borderRadius: 8 }}
            onClick={() => saleDetail && handlePrint(saleDetail)}>
            Imprimir
          </Button>,
          <Button key="close" onClick={() => setDetail(null)} style={{ borderRadius: 8 }}>
            Cerrar
          </Button>,
        ]}
        width={720}
        destroyOnClose
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        {saleDetail && (
          <div>
            {/* Info general */}
            <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Información general
            </Text>
            <Divider style={{ margin: '4px 0 14px', borderColor: '#e9e9e7' }} />

            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}
              styles={{ label: { color: '#787774', fontSize: 12 }, content: { fontSize: 13 } }}>
              <Descriptions.Item label="Fecha">
                {dayjs(saleDetail.createdAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo DTE">
                <Tag color={TIPO_DTE_LABEL[saleDetail.tipoDte]?.color ?? 'default'}
                  style={{ borderRadius: 4, fontWeight: 600 }}>
                  {TIPO_DTE_LABEL[saleDetail.tipoDte]?.label ?? saleDetail.tipoDte}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Cliente">
                {saleDetail.client?.name ?? <Text type="secondary">Consumidor Final</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Sucursal">{saleDetail.branch?.name}</Descriptions.Item>
              {saleDetail.dteDocument?.numeroControl && (
                <Descriptions.Item label="N° Control" span={2}>
                  <code style={{ fontSize: 12, color: '#37352f' }}>{saleDetail.dteDocument.numeroControl}</code>
                </Descriptions.Item>
              )}
              {saleDetail.dteDocument?.selloRecibido && (
                <Descriptions.Item label="Sello MH" span={2}>
                  <code style={{ fontSize: 11, color: '#555', wordBreak: 'break-all' }}>
                    {saleDetail.dteDocument.selloRecibido}
                  </code>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Líneas */}
            <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Líneas de venta
            </Text>
            <Divider style={{ margin: '4px 0 12px', borderColor: '#e9e9e7' }} />

            <Table
              size="small"
              dataSource={saleDetail.items ?? []}
              rowKey="id"
              pagination={false}
              style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid #e9e9e7' }}
              columns={[
                { title: 'Producto',  dataIndex: 'productName',  key: 'name', render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text> },
                { title: 'Cant.',     dataIndex: 'quantity',     key: 'qty',  width: 65, render: (v: number) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                { title: 'Precio',    dataIndex: 'unitPrice',    key: 'price', width: 90, render: (v: number) => `$${Number(v).toFixed(2)}` },
                { title: 'Gravado',   dataIndex: 'ventaGravada', key: 'grav',  width: 90, render: (v: number) => `$${Number(v).toFixed(2)}` },
                { title: 'IVA',       dataIndex: 'ivaItem',      key: 'iva',   width: 80, render: (v: number) => `$${Number(v).toFixed(2)}` },
              ]}
            />

            {/* Totales */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ minWidth: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <Text type="secondary">IVA 13%:</Text>
                  <Text>${Number(saleDetail.totalIva).toFixed(2)}</Text>
                </div>
                <Divider style={{ margin: '6px 0', borderColor: '#e9e9e7' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                  <Text strong>Total:</Text>
                  <Text strong style={{ color: token.colorPrimary }}>${Number(saleDetail.totalPagar).toFixed(2)}</Text>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal anular venta ─────────────────────────────────────────── */}
      <Modal
        open={!!anularModal}
        title={<Space style={{ color: token.colorError }}><StopOutlined />Anular venta</Space>}
        onCancel={() => { setAnularModal(null); setAnularReason('') }}
        onOk={() => anularMutation.mutate({ id: anularModal.id, reason: anularReason })}
        confirmLoading={anularMutation.isPending}
        okText="Confirmar anulación"
        okButtonProps={{ danger: true, disabled: !anularReason.trim(), style: { borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={480}
        destroyOnClose
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 14 }}>
          Se anulará la venta{' '}
          <Text strong>{anularModal?.dteDocument?.numeroControl ?? anularModal?.id?.substring(0, 8)}</Text>.
          Esta operación no se puede deshacer.
        </Text>
        <Input.TextArea
          rows={3}
          placeholder="Motivo de anulación (requerido)"
          value={anularReason}
          onChange={e => setAnularReason(e.target.value)}
          style={{ borderRadius: 8, borderColor: '#e9e9e7' }}
          autoFocus
        />
      </Modal>
    </div>
  )
}

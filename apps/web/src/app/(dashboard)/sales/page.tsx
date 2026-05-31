'use client'
import { useState, useMemo } from 'react'
import {
  Table, Button, Tag, Typography, DatePicker, Select, Modal, Descriptions, Form,
  Space, App, Badge, Input, theme, Row, Col, Card, Statistic, Divider, Tooltip,
} from 'antd'
import {
  EyeOutlined, PrinterOutlined, StopOutlined, FileTextOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined, SearchOutlined,
  DollarOutlined, CalculatorOutlined, FileDoneOutlined, WarningOutlined,
  FileExcelOutlined, RollbackOutlined, FundOutlined, FilePdfOutlined, MailOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { downloadXlsx } from '../../../lib/download-xlsx'
import { printCartaA4 } from '../../../lib/print-receipt'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

const TIPO_DTE_LABEL: Record<string, { label: string; color: string }> = {
  '01': { label: 'CF',  color: 'default' },
  '03': { label: 'CCF', color: 'blue'    },
  '05': { label: 'NC',  color: 'orange'  },
  '06': { label: 'ND',  color: 'purple'  },
  '16': { label: 'VS',  color: 'default' },
}

const DTE_STATUS: Record<string, { badge: 'processing' | 'success' | 'error' | 'warning' | 'default'; label: string; color: string }> = {
  PENDING:  { badge: 'processing', label: 'Pendiente', color: '#fa8c16' },
  ACCEPTED: { badge: 'success',    label: 'Aceptado',  color: '#52c41a' },
  REJECTED: { badge: 'error',      label: 'Rechazado', color: '#ff4d4f' },
  CONTINGENCY: { badge: 'warning', label: 'Contingencia', color: '#faad14' },
  ANNULLED: { badge: 'warning',    label: 'Anulado',   color: '#d48806' },
  ERROR:    { badge: 'error',      label: 'Error',     color: '#ff4d4f' },
}

const FORMA_PAGO_LABEL: Record<string, string> = {
  '01': 'Efectivo', '02': 'T. Debito', '03': 'T. Credito',
  '04': 'Cheque', '05': 'Transferencia', '08': 'D. Electronico',
  '09': 'Monedero', '11': 'Bitcoin', '12': 'Cripto',
  '13': 'CxP receptor', '14': 'Giro bancario', '99': 'Otros',
}

const FORMA_PAGO_COLOR: Record<string, string> = {
  '01': 'green', '02': 'blue', '03': 'purple',
  '04': 'gold', '05': 'cyan', '08': 'geekblue',
  '09': 'blue', '11': 'orange', '12': 'volcano',
  '13': 'default', '14': 'cyan', '99': 'default',
}
const DOC_OPTIONS = [
  { value: '13', label: 'DUI (13)' },
  { value: '36', label: 'NIT (36)' },
  { value: '03', label: 'Pasaporte (03)' },
]

export default function SalesPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const { companyId } = useAppContext()

  const [page, setPage]               = useState(1)
  const [dateRange, setDateRange]     = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [filterTipoDte, setFilterTipoDte]   = useState<string | undefined>()
  const [filterStatus,  setFilterStatus]    = useState<string | undefined>()
  const [search, setSearch]           = useState('')
  const [detail, setDetail]           = useState<any>(null)
  const [anularModal, setAnularModal] = useState<any>(null)
  const [anularReason, setAnularReason] = useState('')
  const [invalidarModal, setInvalidarModal] = useState<any>(null)
  const [invalidarForm] = Form.useForm()
  const [retornoModal, setRetornoModal] = useState<any>(null)
  const [retornoForm] = Form.useForm()
  const [opEspecialModal, setOpEspecialModal] = useState<any>(null)
  const [opEspecialForm] = Form.useForm()
  const [pdfLoading, setPdfLoading]         = useState(false)
  const [emailLoading, setEmailLoading]     = useState(false)

  const params: Record<string, any> = { companyId, page }
  if (dateRange?.[0]) params.from = dateRange[0].startOf('day').toISOString()
  if (dateRange?.[1]) params.to   = dateRange[1].endOf('day').toISOString()
  if (filterTipoDte)  params.tipoDte = filterTipoDte

  const { data, isLoading } = useQuery({
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

  const opEspecialMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/dte/operacion-especial', { ...values, saleId: opEspecialModal.id }),
    onSuccess: (res) => {
      if (res.data?.ok) message.success('Operacion Especial enviada a Hacienda')
      else message.warning('Hacienda no acepto el evento de operacion especial')
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sale-detail'] })
      setOpEspecialModal(null)
      opEspecialForm.resetFields()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al emitir operacion especial'),
  })

  const retornoMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/dte/retorno', { ...values, saleId: retornoModal.id }),
    onSuccess: (res) => {
      if (res.data?.ok) message.success('Evento de Retorno enviado a Hacienda')
      else message.warning('Hacienda no acepto el evento de retorno')
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sale-detail'] })
      setRetornoModal(null)
      retornoForm.resetFields()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al emitir retorno'),
  })

  const invalidarMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/dte/anular', { ...values, saleId: invalidarModal.id }),
    onSuccess: (res) => {
      if (res.data?.ok) message.success('DTE invalidado ante Hacienda')
      else message.warning('Hacienda no acepto la invalidacion')
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sale-detail'] })
      setInvalidarModal(null)
      invalidarForm.resetFields()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al invalidar DTE'),
  })

  function openInvalidarModal(sale: any) {
    setInvalidarModal(sale)
    const userName = localStorage.getItem('userName') ?? ''
    invalidarForm.setFieldsValue({
      nombreResponsable: userName,
      tipDocResponsable: '13',
      nombreSolicita: userName,
      tipDocSolicita: '13',
    })
  }

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
          total:       sale.tipoDte === '03'
            ? Number(i.ventaGravada) + Number(i.ivaItem)
            : Number(i.ventaGravada),
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

  async function handleDownloadPdf(saleId: string, numeroControl?: string) {
    setPdfLoading(true)
    try {
      const res = await api.get(`/api/dte/pdf/${saleId}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `DTE_${numeroControl?.replace(/\//g, '-') ?? saleId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Error al descargar PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleResendEmail(saleId: string) {
    setEmailLoading(true)
    try {
      await api.post(`/api/dte/resend-email/${saleId}`)
      message.success('Correo DTE reenviado al cliente')
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Error al reenviar correo')
    } finally {
      setEmailLoading(false)
    }
  }

  function handlePrintCartaA4(sale: any) {
    printCartaA4({
      sale: {
        id: sale.id,
        tipoDte: sale.tipoDte,
        createdAt: sale.createdAt,
        totalGravada: sale.totalGravada,
        totalIva: sale.totalIva,
        totalPagar: sale.totalPagar,
        ivaRete1: sale.ivaRete1,
        totalDescuento: sale.totalDescuento,
        totalNoSuj: sale.totalNoSuj,
        totalExenta: sale.totalExenta,
        items: (sale.items ?? []).map((i: any) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          ventaGravada: i.ventaGravada,
          ivaItem: i.ivaItem,
        })),
        payments: (sale.payments ?? []).map((p: any) => ({
          formaPago: p.formaPago,
          amount: p.amount,
          reference: p.reference,
        })),
        client: sale.client ?? null,
        branch: sale.branch ?? null,
        dteDocument: sale.dteDocument ?? null,
      },
      company: {
        name: sale.company?.name ?? '',
        comercialName: sale.company?.comercialName,
        nit: sale.company?.nit,
        nrc: sale.company?.nrc,
        address: sale.company?.address,
        phone: sale.company?.phone,
        email: sale.company?.email,
        actividadEconomica: sale.company?.actividadEconomica,
        logoUrl: sale.company?.logoUrl,
      },
      branchName: sale.branch?.name ?? '',
      cashierName: sale.user?.name ?? '',
    })
  }

  // â”€â”€ Computed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const salesList: any[] = data?.sales ?? []

  const filtered = useMemo(() => {
    let list = salesList
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r: any) =>
        (r.client?.name ?? '').toLowerCase().includes(q) ||
        (r.dteDocument?.numeroControl ?? '').toLowerCase().includes(q) ||
        (r.id ?? '').toLowerCase().includes(q)
      )
    }
    if (filterStatus) {
      list = list.filter((r: any) => r.dteDocument?.status === filterStatus)
    }
    return list
  }, [salesList, search, filterStatus])

  const totalAmount  = salesList.reduce((s: number, r: any) => s + Number(r.totalPagar ?? 0), 0)
  const totalIva     = salesList.reduce((s: number, r: any) => s + Number(r.totalIva ?? 0), 0)
  const countAccepted = salesList.filter((r: any) => r.dteDocument?.status === 'ACCEPTED').length
  const countPending  = salesList.filter((r: any) => r.dteDocument?.status === 'PENDING').length
  const countAnnulled = salesList.filter((r: any) => r.dteDocument?.status === 'ANNULLED').length

  const hasFilters = !!(search || filterStatus)

  // â”€â”€ Columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const columns: ColumnsType<any> = [
    {
      title: 'Fecha', dataIndex: 'createdAt', width: 125,
      render: (v: string) => (
        <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YY HH:mm')}</Text>
      ),
    },
    {
      title: 'Cliente', key: 'client',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13, fontWeight: 500 }}>
            {r.client?.name ?? <Text type="secondary" style={{ fontWeight: 400 }}>Consumidor Final</Text>}
          </Text>
          {r.client?.numDocumento && (
            <Text type="secondary" style={{ fontSize: 11 }}>{r.client.numDocumento}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Tipo', dataIndex: 'tipoDte', width: 68,
      render: (v: string) => {
        const t = TIPO_DTE_LABEL[v] ?? { label: v, color: 'default' }
        return <Tag color={t.color} style={{ borderRadius: 4, fontWeight: 700, fontSize: 11 }}>{t.label}</Tag>
      },
    },
    {
      title: 'N° Control', key: 'control', width: 200,
      render: (_: any, r: any) => r.dteDocument?.numeroControl
        ? <code style={{ fontSize: 10, color: token.colorText }}>{r.dteDocument.numeroControl}</code>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Pago', key: 'pago', width: 130,
      responsive: ['lg'] as any,
      render: (_: any, r: any) => (
        <Space wrap size={2}>
          {(r.payments ?? []).map((p: any, i: number) => (
            <Tag
              key={i}
              color={FORMA_PAGO_COLOR[p.formaPago] ?? 'default'}
              style={{ fontSize: 10, margin: 0 }}
            >
              {FORMA_PAGO_LABEL[p.formaPago] ?? p.formaPago}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Estado DTE', key: 'dteStatus', width: 125,
      render: (_: any, r: any) => {
        const s = r.dteDocument?.status
        if (!s) return <Tag style={{ borderRadius: 4, fontSize: 11 }}>Sin DTE</Tag>
        const info = DTE_STATUS[s] ?? { badge: 'default' as const, label: s, color: token.colorTextSecondary }
        return <Badge status={info.badge} text={<Text style={{ fontSize: 12 }}>{info.label}</Text>} />
      },
    },
    {
      title: 'Total', dataIndex: 'totalPagar', width: 105, align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ color: token.colorPrimary, fontVariantNumeric: 'tabular-nums' }}>
          ${Number(v).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Acciones', key: 'actions', width: 115, fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Tooltip title="Ver detalle">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setDetail(r)} />
          </Tooltip>
          <Tooltip title="Imprimir ticket">
            <Button type="text" size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(r)} />
          </Tooltip>
          {['01', '03'].includes(r.tipoDte) && r.dteDocument?.status === 'ACCEPTED' && !r.dteDocument?.opEspecialCodigoGeneracion && (
            <Tooltip title="Operacion Especial (Tipo 17)">
              <Button
                type="text" size="small" icon={<FundOutlined style={{ color: token.colorInfo }} />}
                onClick={() => { setOpEspecialModal(r); opEspecialForm.resetFields() }}
              />
            </Tooltip>
          )}
          {r.tipoDte === '03' && r.dteDocument?.status === 'ACCEPTED' && !r.dteDocument?.retornoCodigoGeneracion && (
            <Tooltip title="Emitir Evento de Retorno (Tipo 18)">
              <Button
                type="text" size="small" icon={<RollbackOutlined style={{ color: token.colorPrimary }} />}
                onClick={() => { setRetornoModal(r); retornoForm.resetFields() }}
              />
            </Tooltip>
          )}
          {r.dteDocument?.status !== 'ANNULLED' && (
            r.dteDocument?.status === 'ACCEPTED' ? (
              <Tooltip title="Invalidar DTE ante Hacienda">
                <Button
                  type="text" size="small" danger icon={<StopOutlined />}
                  onClick={() => openInvalidarModal(r)}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Anular venta local">
                <Button
                  type="text" size="small" danger icon={<StopOutlined />}
                  onClick={() => { setAnularModal(r); setAnularReason('') }}
                />
              </Tooltip>
            )
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: '0 0 2px', fontWeight: 700 }}>Historial de Ventas</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Consulta, detalle e impresión de comprobantes DTE</Text>
        </div>
        <Tooltip title="Recargar">
          <Button icon={<ReloadOutlined />} onClick={() => qc.invalidateQueries({ queryKey: ['sales'] })} />
        </Tooltip>
      </div>

      {/* KPIs */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        {[
          { title: 'Total facturado', value: `$${totalAmount.toFixed(2)}`, color: token.colorPrimary,  icon: <DollarOutlined />        },
          { title: 'IVA generado',    value: `$${totalIva.toFixed(2)}`,    color: token.colorSuccess,      icon: <CalculatorOutlined />     },
          { title: 'Aceptados DTE',   value: countAccepted,                color: token.colorSuccess,      icon: <CheckCircleOutlined />    },
          { title: 'Pendientes DTE',  value: countPending,                 color: token.colorWarning,      icon: <ClockCircleOutlined />    },
          { title: 'Anulados',        value: countAnnulled,                color: token.colorError,    icon: <WarningOutlined />        },
        ].map(k => (
          <Col xs={12} sm={8} md={8} lg={Math.floor(24 / 5)} key={k.title}>
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
                valueStyle={{ fontSize: 20, fontWeight: 700, color: k.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Toolbar / Filtros */}
      <Card
        size="small"
        style={{ borderRadius: 12, marginBottom: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <Space wrap size={8}>
            <Input
              prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
              placeholder="Buscar cliente, N° control..."
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 240 }}
            />
            <Select
              allowClear
              placeholder="Tipo DTE"
              style={{ width: 130 }}
              value={filterTipoDte}
              onChange={v => { setFilterTipoDte(v); setPage(1) }}
              options={[
                { value: '01', label: 'CF (01)' },
                { value: '03', label: 'CCF (03)' },
                { value: '05', label: 'NC (05)'  },
                { value: '06', label: 'ND (06)'  },
                { value: '16', label: 'VS (16)'  },
              ]}
            />
            <Select
              allowClear
              placeholder="Estado DTE"
              style={{ width: 145 }}
              value={filterStatus}
              onChange={setFilterStatus}
              options={Object.entries(DTE_STATUS).map(([k, v]) => ({ value: k, label: v.label }))}
            />
            <DatePicker.RangePicker
              value={dateRange}
              onChange={v => { setDateRange(v as any); setPage(1) }}
              format="DD/MM/YY"
              allowClear
              placeholder={['Desde', 'Hasta']}
            />
            {(search || filterStatus || filterTipoDte || dateRange) && (
              <Button
                size="small"
                onClick={() => {
                  setSearch(''); setFilterStatus(undefined)
                  setFilterTipoDte(undefined); setDateRange(null); setPage(1)
                }}
              >
                Limpiar
              </Button>
            )}
          </Space>
          <Button
            icon={<FileExcelOutlined />}
            style={{ color: '#217346', borderColor: '#217346' }}
            onClick={async () => {
              const xlsxParams: Record<string, any> = { companyId }
              if (dateRange?.[0]) xlsxParams.from = dateRange[0].startOf('day').toISOString()
              if (dateRange?.[1]) xlsxParams.to   = dateRange[1].endOf('day').toISOString()
              const date = new Date().toISOString().slice(0, 10)
              await downloadXlsx('/api/reports/sales', `reporte_ventas_${date}.xlsx`, xlsxParams)
            }}
          >
            Exportar Excel
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
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 950 }}
          rowClassName={(r: any) => r.dteDocument?.status === 'ANNULLED' ? 'opacity-50' : ''}
          expandable={{
            expandedRowRender: (r: any) => (
              <div style={{ padding: '8px 16px' }}>
                <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                  {r.dteDocument?.codigoGeneracion && (
                    <Descriptions.Item label="Código generación" span={3}>
                      <code style={{ fontSize: 10, wordBreak: 'break-all', color: token.colorText }}>
                        {r.dteDocument.codigoGeneracion}
                      </code>
                    </Descriptions.Item>
                  )}
                  {r.dteDocument?.selloRecibido && (
                    <Descriptions.Item label="Sello MH" span={3}>
                      <code style={{ fontSize: 10, wordBreak: 'break-all', color: token.colorTextSecondary }}>
                        {r.dteDocument.selloRecibido}
                      </code>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Sucursal">{r.branch?.name ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Cajero">{r.user?.name ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="IVA 13%">${Number(r.totalIva ?? 0).toFixed(2)}</Descriptions.Item>
                </Descriptions>
              </div>
            ),
            rowExpandable: (r: any) => !!(r.dteDocument?.codigoGeneracion || r.dteDocument?.selloRecibido),
          }}
          pagination={{
            current: page,
            total: hasFilters ? filtered.length : (data?.total ?? 0),
            pageSize: 50,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            onChange: p => { if (!hasFilters) setPage(p) },
            showTotal: (t, range) => `${range[0]}–${range[1]} de ${t} ${hasFilters ? '(filtrado)' : 'ventas'}`,
            style: { padding: '8px 16px' },
          }}
        />
      </Card>

      {/* â”€â”€ Modal detalle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal
        open={!!detail}
        title={<Space><FileDoneOutlined />Detalle de venta</Space>}
        onCancel={() => setDetail(null)}
        footer={[
          saleDetail?.dteDocument?.status === 'ACCEPTED' && (
            <Button
              key="pdf"
              icon={<FilePdfOutlined />}
              loading={pdfLoading}
              style={{ borderRadius: 8, color: token.colorError, borderColor: token.colorError }}
              onClick={() => handleDownloadPdf(saleDetail.id, saleDetail.dteDocument?.numeroControl)}
            >
              Descargar PDF
            </Button>
          ),
          saleDetail?.dteDocument?.status === 'ACCEPTED' && saleDetail?.client?.email && (
            <Button
              key="email"
              icon={<MailOutlined />}
              loading={emailLoading}
              style={{ borderRadius: 8 }}
              onClick={() => handleResendEmail(saleDetail.id)}
            >
              Reenviar correo
            </Button>
          ),
          <Button
            key="print-a4"
            icon={<FileTextOutlined />}
            style={{ borderRadius: 8 }}
            onClick={() => saleDetail && handlePrintCartaA4(saleDetail)}
          >
            Carta A4
          </Button>,
          <Button
            key="print"
            icon={<PrinterOutlined />}
            style={{ borderRadius: 8 }}
            onClick={() => saleDetail && handlePrint(saleDetail)}
          >
            Ticket 80mm
          </Button>,
          <Button key="close" onClick={() => setDetail(null)} style={{ borderRadius: 8 }}>
            Cerrar
          </Button>,
        ]}
        width={720}
        destroyOnClose
        style={{ top: 40 }}
      >
        {saleDetail && (
          <div>
            <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Información general
            </Text>
            <Divider style={{ margin: '4px 0 14px' }} />

            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}
              styles={{ label: { color: token.colorTextSecondary, fontSize: 12 }, content: { fontSize: 13 } }}
            >
              <Descriptions.Item label="Fecha">
                {dayjs(saleDetail.createdAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo DTE">
                <Tag
                  color={TIPO_DTE_LABEL[saleDetail.tipoDte]?.color ?? 'default'}
                  style={{ borderRadius: 4, fontWeight: 600 }}
                >
                  {TIPO_DTE_LABEL[saleDetail.tipoDte]?.label ?? saleDetail.tipoDte}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Cliente">
                {saleDetail.client?.name ?? <Text type="secondary">Consumidor Final</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Sucursal">{saleDetail.branch?.name}</Descriptions.Item>
              <Descriptions.Item label="Cajero">{saleDetail.user?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Estado DTE">
                {(() => {
                  const s = saleDetail.dteDocument?.status
                  if (!s) return <Tag>Sin DTE</Tag>
                  const info = DTE_STATUS[s] ?? { badge: 'default' as const, label: s }
                  return <Badge status={info.badge} text={info.label} />
                })()}
              </Descriptions.Item>
              {saleDetail.dteDocument?.numeroControl && (
                <Descriptions.Item label="N° Control" span={2}>
                  <code style={{ fontSize: 11 }}>{saleDetail.dteDocument.numeroControl}</code>
                </Descriptions.Item>
              )}
              {saleDetail.dteDocument?.codigoGeneracion && (
                <Descriptions.Item label="Código generación" span={2}>
                  <code style={{ fontSize: 10, wordBreak: 'break-all' }}>
                    {saleDetail.dteDocument.codigoGeneracion}
                  </code>
                </Descriptions.Item>
              )}
              {saleDetail.dteDocument?.selloRecibido && (
                <Descriptions.Item label="Sello MH" span={2}>
                  <code style={{ fontSize: 10, wordBreak: 'break-all', color: token.colorTextSecondary }}>
                    {saleDetail.dteDocument.selloRecibido}
                  </code>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Líneas de venta
            </Text>
            <Divider style={{ margin: '4px 0 12px' }} />

            <Table
              size="small"
              dataSource={saleDetail.items ?? []}
              rowKey="id"
              pagination={false}
              style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: `1px solid ${token.colorBorderSecondary}` }}
              columns={[
                {
                  title: 'Producto', dataIndex: 'productName',
                  render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
                },
                {
                  title: 'Cant.', dataIndex: 'quantity', width: 65, align: 'right' as const,
                  render: (v: number) => <Text style={{ fontSize: 12 }}>{v}</Text>,
                },
                {
                  title: 'Precio', dataIndex: 'unitPrice', width: 95, align: 'right' as const,
                  render: (v: number) => `$${Number(v).toFixed(2)}`,
                },
                {
                  title: 'Gravado', dataIndex: 'ventaGravada', width: 95, align: 'right' as const,
                  render: (v: number) => `$${Number(v).toFixed(2)}`,
                },
                {
                  title: 'IVA', dataIndex: 'ivaItem', width: 80, align: 'right' as const,
                  render: (v: number) => `$${Number(v).toFixed(2)}`,
                },
              ]}
            />

            {/* Totales + Pagos */}
            <Row gutter={24}>
              <Col flex="1">
                {(saleDetail.payments ?? []).length > 0 && (
                  <>
                    <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Pagos
                    </Text>
                    <Divider style={{ margin: '4px 0 10px' }} />
                    {(saleDetail.payments ?? []).map((p: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <Tag color={FORMA_PAGO_COLOR[p.formaPago] ?? 'default'} style={{ fontSize: 11 }}>
                          {FORMA_PAGO_LABEL[p.formaPago] ?? p.formaPago}
                        </Tag>
                        <Text strong>${Number(p.amount).toFixed(2)}</Text>
                      </div>
                    ))}
                  </>
                )}
              </Col>
              <Col>
                <div style={{ minWidth: 210 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <Text type="secondary">Venta gravada:</Text>
                    <Text>${Number(saleDetail.totalGravada ?? 0).toFixed(2)}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <Text type="secondary">IVA 13%:</Text>
                    <Text>${Number(saleDetail.totalIva ?? 0).toFixed(2)}</Text>
                  </div>
                  {Number(saleDetail.ivaRete1 ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <Text type="secondary">Retencion IVA 1%:</Text>
                      <Text>-${Number(saleDetail.ivaRete1 ?? 0).toFixed(2)}</Text>
                    </div>
                  )}
                  <Divider style={{ margin: '6px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                    <Text strong>Total:</Text>
                    <Text strong style={{ color: token.colorPrimary }}>
                      ${Number(saleDetail.totalPagar).toFixed(2)}
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* â”€â”€ Modal anular â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
      >
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 14 }}>
          Se anulará la venta{' '}
          <Text strong>{anularModal?.dteDocument?.numeroControl ?? anularModal?.id?.substring(0, 8)}</Text>
          {' '}por un total de{' '}
          <Text strong style={{ color: token.colorError }}>
            ${Number(anularModal?.totalPagar ?? 0).toFixed(2)}
          </Text>.
          Esta operación no se puede deshacer.
        </Text>
        <Input.TextArea
          rows={3}
          placeholder="Motivo de anulación (requerido)"
          value={anularReason}
          onChange={e => setAnularReason(e.target.value)}
          style={{ borderRadius: 8 }}
          autoFocus
        />
      </Modal>

      <Modal
        open={!!invalidarModal}
        title={<Space style={{ color: token.colorError }}><StopOutlined />Invalidar DTE ante Hacienda</Space>}
        onCancel={() => { setInvalidarModal(null); invalidarForm.resetFields() }}
        onOk={() => invalidarForm.submit()}
        confirmLoading={invalidarMutation.isPending}
        okText="Enviar invalidacion"
        okButtonProps={{ danger: true, style: { borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={640}
        destroyOnClose
        style={{ top: 40 }}
      >
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 14 }}>
          Se enviara el evento de invalidacion para el DTE{' '}
          <Text strong>{invalidarModal?.dteDocument?.numeroControl ?? invalidarModal?.id?.substring(0, 8)}</Text>
          {' '}por un total de{' '}
          <Text strong style={{ color: token.colorError }}>
            ${Number(invalidarModal?.totalPagar ?? 0).toFixed(2)}
          </Text>.
        </Text>
        <Form
          form={invalidarForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => invalidarMutation.mutate(values)}
        >
          <Form.Item
            name="motivo"
            label="Motivo"
            rules={[{ required: true, min: 5, message: 'Describe el motivo legal' }]}
          >
            <Input.TextArea rows={3} placeholder="Ej. Error en datos del receptor" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name="nombreResponsable"
                label="Responsable"
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={10} md={6}>
              <Form.Item
                name="tipDocResponsable"
                label="Tipo doc."
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <Select options={DOC_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={14} md={6}>
              <Form.Item
                name="numDocResponsable"
                label="Documento"
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name="nombreSolicita"
                label="Solicita"
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={10} md={6}>
              <Form.Item
                name="tipDocSolicita"
                label="Tipo doc."
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <Select options={DOC_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={14} md={6}>
              <Form.Item
                name="numDocSolicita"
                label="Documento"
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
      {/* ── Modal Operacion Especial (Tipo 17) ───────────────────────────── */}
      <Modal
        open={!!opEspecialModal}
        title={<Space style={{ color: token.colorInfo }}><FundOutlined />Operacion Especial (Tipo 17)</Space>}
        onCancel={() => { setOpEspecialModal(null); opEspecialForm.resetFields() }}
        onOk={() => opEspecialForm.submit()}
        confirmLoading={opEspecialMutation.isPending}
        okText="Enviar evento a Hacienda"
        okButtonProps={{ style: { background: token.colorInfo, borderColor: token.colorInfo, borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={640}
        destroyOnClose
        style={{ top: 40 }}
      >
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 14 }}>
          Evento de operacion especial para el DTE{' '}
          <Text strong>{opEspecialModal?.dteDocument?.numeroControl ?? opEspecialModal?.id?.substring(0, 8)}</Text>
          {' '}por{' '}
          <Text strong style={{ color: token.colorInfo }}>
            ${Number(opEspecialModal?.totalPagar ?? 0).toFixed(2)}
          </Text>.
        </Text>
        <Form
          form={opEspecialForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => opEspecialMutation.mutate(values)}
        >
          <Form.Item
            name="tipoOperacion"
            label="Tipo de operacion especial (CAT-022)"
            rules={[{ required: true, message: 'Seleccione tipo' }]}
          >
            <Select
              style={{ borderRadius: 8 }}
              options={[
                { value: '01', label: '01 — Anticipo' },
                { value: '02', label: '02 — Permuta' },
                { value: '03', label: '03 — Retiro de bienes' },
                { value: '04', label: '04 — Dacion en pago' },
                { value: '05', label: '05 — Autoconsumo' },
                { value: '99', label: '99 — Otro' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="motivo"
            label="Descripcion de la operacion"
            rules={[{ required: true, min: 5, message: 'Describe la operacion especial' }]}
          >
            <Input.TextArea rows={3} placeholder="Ej. Anticipo recibido por servicio a ejecutar en enero..." style={{ borderRadius: 8 }} />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="nombreResponsable" label="Responsable" rules={[{ required: true, message: 'Requerido' }]}>
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={10} md={6}>
              <Form.Item name="tipDocResponsable" label="Tipo doc." rules={[{ required: true, message: 'Requerido' }]}>
                <Select options={DOC_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={14} md={6}>
              <Form.Item name="numDocResponsable" label="Documento" rules={[{ required: true, message: 'Requerido' }]}>
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="nombreSolicita" label="Solicita" rules={[{ required: true, message: 'Requerido' }]}>
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={10} md={6}>
              <Form.Item name="tipDocSolicita" label="Tipo doc." rules={[{ required: true, message: 'Requerido' }]}>
                <Select options={DOC_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={14} md={6}>
              <Form.Item name="numDocSolicita" label="Documento" rules={[{ required: true, message: 'Requerido' }]}>
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Modal Evento Retorno (Tipo 18) ────────────────────────────────── */}
      <Modal
        open={!!retornoModal}
        title={<Space style={{ color: token.colorPrimary }}><RollbackOutlined />Evento de Retorno (Tipo 18)</Space>}
        onCancel={() => { setRetornoModal(null); retornoForm.resetFields() }}
        onOk={() => retornoForm.submit()}
        confirmLoading={retornoMutation.isPending}
        okText="Enviar evento a Hacienda"
        okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={640}
        destroyOnClose
        style={{ top: 40 }}
      >
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 14 }}>
          Evento de retorno de bienes para el CCF{' '}
          <Text strong>{retornoModal?.dteDocument?.numeroControl ?? retornoModal?.id?.substring(0, 8)}</Text>
          {' '}por un total de{' '}
          <Text strong style={{ color: token.colorPrimary }}>
            ${Number(retornoModal?.totalPagar ?? 0).toFixed(2)}
          </Text>.
        </Text>
        <Form
          form={retornoForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => retornoMutation.mutate(values)}
        >
          <Form.Item
            name="motivo"
            label="Motivo del retorno"
            rules={[{ required: true, min: 5, message: 'Describe el motivo del retorno' }]}
          >
            <Input.TextArea rows={3} placeholder="Ej. Producto defectuoso, error en pedido..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="nombreResponsable" label="Responsable" rules={[{ required: true, message: 'Requerido' }]}>
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={10} md={6}>
              <Form.Item name="tipDocResponsable" label="Tipo doc." rules={[{ required: true, message: 'Requerido' }]}>
                <Select options={DOC_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={14} md={6}>
              <Form.Item name="numDocResponsable" label="Documento" rules={[{ required: true, message: 'Requerido' }]}>
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="nombreSolicita" label="Solicita" rules={[{ required: true, message: 'Requerido' }]}>
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={10} md={6}>
              <Form.Item name="tipDocSolicita" label="Tipo doc." rules={[{ required: true, message: 'Requerido' }]}>
                <Select options={DOC_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={14} md={6}>
              <Form.Item name="numDocSolicita" label="Documento" rules={[{ required: true, message: 'Requerido' }]}>
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

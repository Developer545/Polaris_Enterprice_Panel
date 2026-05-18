'use client'
import { useState } from 'react'
import {
  Table, Button, Tag, Typography, DatePicker, Select, Modal, Descriptions,
  Space, App, Badge, Input, theme, Row, Col,
} from 'antd'
import { EyeOutlined, PrinterOutlined, StopOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const TIPO_DTE_LABEL: Record<string, { label: string; color: string }> = {
  '01': { label: 'CF',  color: 'default' },
  '03': { label: 'CCF', color: 'blue' },
  '05': { label: 'NC',  color: 'orange' },
  '06': { label: 'ND',  color: 'purple' },
}

const DTE_STATUS_BADGE: Record<string, 'processing' | 'success' | 'error' | 'warning' | 'default'> = {
  PENDING:  'processing',
  ACCEPTED: 'success',
  REJECTED: 'error',
  ANNULLED: 'warning',
  ERROR:    'error',
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

  const columns = [
    {
      title: 'Fecha', dataIndex: 'createdAt', key: 'date',
      render: (v: string) => dayjs(v).format('DD/MM/YY HH:mm'),
    },
    { title: 'Sucursal', key: 'branch', render: (r: any) => r.branch?.name },
    { title: 'Cliente',  key: 'client', render: (r: any) => r.client?.name ?? 'Consumidor Final' },
    {
      title: 'Tipo DTE', dataIndex: 'tipoDte', key: 'tipoDte',
      render: (v: string) => {
        const t = TIPO_DTE_LABEL[v] ?? { label: v, color: 'default' }
        return <Tag color={t.color}>{t.label}</Tag>
      },
    },
    {
      title: 'N° Control', key: 'control',
      render: (r: any) => r.dteDocument?.numeroControl
        ? <code style={{ fontSize: 11 }}>{r.dteDocument.numeroControl}</code>
        : '—',
    },
    {
      title: 'Estado DTE', key: 'dteStatus',
      render: (r: any) => {
        const s = r.dteDocument?.status
        if (!s) return <Tag color="default">Sin DTE</Tag>
        return <Badge status={DTE_STATUS_BADGE[s] ?? 'default'} text={s} />
      },
    },
    {
      title: 'Total', dataIndex: 'totalPagar', key: 'total',
      render: (v: number) => (
        <strong style={{ color: token.colorPrimary }}>${Number(v).toFixed(2)}</strong>
      ),
    },
    {
      title: 'Acciones', key: 'actions',
      render: (r: any) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetail(r)} />
          <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(r)} />
          {r.dteDocument?.status !== 'ANNULLED' && (
            <Button size="small" danger icon={<StopOutlined />}
              onClick={() => { setAnularModal(r); setAnularReason('') }} />
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Typography.Title level={4} style={{ margin: 0 }}>Historial de Ventas</Typography.Title>
        </Col>
        <Col>
          <Space>
            <Select
              allowClear
              placeholder="Tipo DTE"
              style={{ width: 140 }}
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
            />
          </Space>
        </Col>
      </Row>

      <Table
        size="small"
        columns={columns}
        dataSource={data?.sales ?? []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: 50,
          onChange: setPage,
          showTotal: (t) => `${t} ventas`,
        }}
        style={{ borderRadius: 10, overflow: 'hidden' }}
      />

      {/* ── Detalle de venta ───────────────────────────────────────────── */}
      <Modal
        open={!!detail}
        title="Detalle de venta"
        onCancel={() => setDetail(null)}
        footer={[
          <Button key="print" icon={<PrinterOutlined />}
            onClick={() => saleDetail && handlePrint(saleDetail)}>
            Imprimir
          </Button>,
          <Button key="close" onClick={() => setDetail(null)}>Cerrar</Button>,
        ]}
        width={700}
      >
        {saleDetail && (
          <div>
            <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Fecha">
                {dayjs(saleDetail.createdAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo DTE">
                <Tag color={TIPO_DTE_LABEL[saleDetail.tipoDte]?.color ?? 'default'}>
                  {TIPO_DTE_LABEL[saleDetail.tipoDte]?.label ?? saleDetail.tipoDte}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Cliente">
                {saleDetail.client?.name ?? 'Consumidor Final'}
              </Descriptions.Item>
              <Descriptions.Item label="Sucursal">{saleDetail.branch?.name}</Descriptions.Item>
              {saleDetail.dteDocument?.numeroControl && (
                <Descriptions.Item label="N° Control" span={2}>
                  <code>{saleDetail.dteDocument.numeroControl}</code>
                </Descriptions.Item>
              )}
              {saleDetail.dteDocument?.selloRecibido && (
                <Descriptions.Item label="Sello MH" span={2}>
                  <code style={{ fontSize: 11, wordBreak: 'break-all' }}>
                    {saleDetail.dteDocument.selloRecibido}
                  </code>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Table
              size="small"
              dataSource={saleDetail.items ?? []}
              rowKey="id"
              pagination={false}
              columns={[
                { title: 'Producto',  dataIndex: 'productName',  key: 'name' },
                { title: 'Cant.',     dataIndex: 'quantity',     key: 'qty',  width: 70 },
                { title: 'Precio',    dataIndex: 'unitPrice',    key: 'price', render: (v: number) => `$${Number(v).toFixed(2)}` },
                { title: 'Gravado',   dataIndex: 'ventaGravada', key: 'grav',  render: (v: number) => `$${Number(v).toFixed(2)}` },
                { title: 'IVA',       dataIndex: 'ivaItem',      key: 'iva',   render: (v: number) => `$${Number(v).toFixed(2)}` },
              ]}
              style={{ marginBottom: 12 }}
            />

            <div style={{ textAlign: 'right' }}>
              <div>IVA: <strong>${Number(saleDetail.totalIva).toFixed(2)}</strong></div>
              <div style={{ fontSize: 16, fontWeight: 700, color: token.colorPrimary }}>
                Total: ${Number(saleDetail.totalPagar).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Anular venta ───────────────────────────────────────────────── */}
      <Modal
        open={!!anularModal}
        title={<span style={{ color: token.colorError }}><StopOutlined style={{ marginRight: 8 }} />Anular venta</span>}
        onCancel={() => setAnularModal(null)}
        onOk={() => anularMutation.mutate({ id: anularModal.id, reason: anularReason })}
        confirmLoading={anularMutation.isPending}
        okText="Confirmar anulación"
        okButtonProps={{ danger: true, disabled: !anularReason.trim() }}
      >
        <p style={{ color: token.colorTextSecondary }}>
          Se anulará la venta{' '}
          <strong>{anularModal?.dteDocument?.numeroControl ?? anularModal?.id?.substring(0, 8)}</strong>.
          Esta operación no se puede deshacer.
        </p>
        <Input.TextArea
          rows={3}
          placeholder="Motivo de anulación (requerido)"
          value={anularReason}
          onChange={e => setAnularReason(e.target.value)}
          autoFocus
        />
      </Modal>
    </div>
  )
}

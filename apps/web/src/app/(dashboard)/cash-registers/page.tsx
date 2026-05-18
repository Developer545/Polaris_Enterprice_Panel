'use client'

import { useState, useMemo } from 'react'
import {
  Card, Row, Col, Button, InputNumber, Table, Tag, Statistic,
  Modal, Descriptions, Alert, Space, Divider, Input, theme, Typography, App,
} from 'antd'
import {
  LockOutlined, UnlockOutlined, DollarCircleOutlined,
  ShoppingCartOutlined, CreditCardOutlined, CalculatorOutlined,
  BankOutlined, QrcodeOutlined, EyeOutlined, FileTextOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const { Text } = Typography

const BILLETES = [100, 50, 20, 10, 5, 1]
const MONEDAS  = [0.25, 0.10, 0.05, 0.01]

const fmt = (n: number | string | null | undefined) =>
  n != null ? `$${Number(n).toFixed(2)}` : '—'

function calcTotal(arqueo: Record<string, number>, denominaciones: number[]) {
  return denominaciones.reduce((s, d) => s + d * (arqueo[String(d)] || 0), 0)
}

function sumByFormaPago(paymentsByMethod: any[], codes: string[]): number {
  return (paymentsByMethod ?? [])
    .filter((p: any) => codes.includes(p.formaPago))
    .reduce((s: number, p: any) => s + Number(p._sum?.amount ?? 0), 0)
}

export default function CashRegistersPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const primary = token.colorPrimary
  const qc = useQueryClient()

  const { companyId, branchId } = useAppContext()

  // ── State ──────────────────────────────────────────────────────────────────
  const [openModal, setOpenModal]   = useState(false)
  const [montoInicial, setMontoInicial] = useState<number>(0)
  const [notasApertura, setNotasApertura] = useState('')

  const [closeModal, setCloseModal] = useState(false)
  const [arqueoBilletes, setArqueoBilletes] = useState<Record<string, number>>({})
  const [arqueoMonedas,  setArqueoMonedas]  = useState<Record<string, number>>({})
  const [notasCierre, setNotasCierre] = useState('')

  const [detailRecord, setDetailRecord] = useState<any>(null)

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: registers = [], isLoading } = useQuery({
    queryKey: ['cash-registers', branchId],
    queryFn: () => api.get('/api/cash-registers', { params: { branchId } }).then(r => r.data),
    enabled: !!branchId,
  })

  const activeRegister = useMemo(
    () => (registers as any[]).find(r => !r.closedAt) ?? null,
    [registers],
  )

  const { data: activeSummary } = useQuery({
    queryKey: ['cash-register-summary', activeRegister?.id],
    queryFn: () => api.get(`/api/cash-registers/${activeRegister!.id}/summary`).then(r => r.data),
    enabled: !!activeRegister?.id,
    refetchInterval: 30_000,
  })

  const { data: detailSummary } = useQuery({
    queryKey: ['cash-register-summary', detailRecord?.id],
    queryFn: () => api.get(`/api/cash-registers/${detailRecord!.id}/summary`).then(r => r.data),
    enabled: !!detailRecord,
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', companyId],
    queryFn: () => api.get('/api/branches', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  // ── Computed live KPIs ─────────────────────────────────────────────────────
  const totalEfectivo = useMemo(
    () => sumByFormaPago(activeSummary?.paymentsByMethod, ['01']),
    [activeSummary],
  )
  const totalTarjeta = useMemo(
    () => sumByFormaPago(activeSummary?.paymentsByMethod, ['02', '03']),
    [activeSummary],
  )
  const totalTransf = useMemo(
    () => sumByFormaPago(activeSummary?.paymentsByMethod, ['04', '05']),
    [activeSummary],
  )
  const montoEsperado = useMemo(
    () => Number(activeRegister?.openingBalance ?? 0) + totalEfectivo,
    [activeRegister, totalEfectivo],
  )

  const totalContadoBilletes = calcTotal(arqueoBilletes, BILLETES)
  const totalContadoMonedas  = calcTotal(arqueoMonedas, MONEDAS)
  const totalContado = parseFloat((totalContadoBilletes + totalContadoMonedas).toFixed(2))
  const diferenciaCierre = parseFloat((totalContado - montoEsperado).toFixed(2))

  // ── Mutations ──────────────────────────────────────────────────────────────
  const openMutation = useMutation({
    mutationFn: () => api.post('/api/cash-registers/open', {
      companyId,
      branchId,
      openingBalance: montoInicial,
      notes: notasApertura || undefined,
    }),
    onSuccess: () => {
      message.success('Caja abierta')
      qc.invalidateQueries({ queryKey: ['cash-registers'] })
      setOpenModal(false)
      setMontoInicial(0)
      setNotasApertura('')
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al abrir caja'),
  })

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/api/cash-registers/${activeRegister!.id}/close`, {
      closingBalance: totalContado,
      arqueoCaja: { billetes: arqueoBilletes, monedas: arqueoMonedas, totalContado },
      notes: notasCierre || undefined,
    }),
    onSuccess: () => {
      message.success('Caja cerrada')
      qc.invalidateQueries({ queryKey: ['cash-registers'] })
      setCloseModal(false)
      setArqueoBilletes({})
      setArqueoMonedas({})
      setNotasCierre('')
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al cerrar caja'),
  })

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: '#',
      render: (_: unknown, __: unknown, idx: number) => (registers as any[]).length - idx,
      width: 40,
    },
    {
      title: 'Apertura',
      dataIndex: 'openedAt',
      render: (v: string) => dayjs(v).format('DD/MM/YY HH:mm'),
    },
    {
      title: 'Cierre',
      dataIndex: 'closedAt',
      render: (v: string | null) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—',
    },
    {
      title: 'Cajero',
      key: 'openedBy',
      render: (r: any) => r.openedBy?.name,
    },
    {
      title: 'Estado',
      key: 'estado',
      render: (r: any) =>
        r.closedAt
          ? <Tag color="default">CERRADA</Tag>
          : <Tag color="green">ABIERTA</Tag>,
    },
    {
      title: 'Ventas',
      key: 'ventas',
      align: 'center' as const,
      render: (r: any) => r.cantidadVentas ?? r._count?.sales ?? 0,
    },
    {
      title: 'Total',
      key: 'total',
      align: 'right' as const,
      render: (r: any) => (
        <b style={{ color: primary }}>{fmt(r.totalVentas ?? 0)}</b>
      ),
    },
    {
      title: 'Diferencia',
      dataIndex: 'difference',
      align: 'right' as const,
      render: (v: number | null) => {
        if (v == null) return '—'
        const n = Number(v)
        const color = n > 0 ? token.colorWarning : n < 0 ? token.colorError : primary
        return <b style={{ color }}>{n >= 0 ? '+' : ''}{fmt(n)}</b>
      },
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (r: any) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailRecord(r)} />
      ),
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24 }}>

      {/* Banner estado caja */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          {activeRegister ? (
            <Alert
              type="success"
              showIcon
              message={
                <Row justify="space-between" align="middle">
                  <Col>
                    <b style={{ color: primary }}>
                      <Space size={6}><UnlockOutlined style={{ color: primary }} /><span>Caja abierta</span></Space>
                    </b>
                    <span style={{ color: token.colorTextSecondary, marginLeft: 12, fontSize: 12 }}>
                      {activeRegister.openedBy?.name} · Desde {dayjs(activeRegister.openedAt).format('DD/MM/YY HH:mm')}
                    </span>
                  </Col>
                  <Col>
                    <Button danger icon={<LockOutlined />}
                      onClick={() => {
                        setCloseModal(true)
                        setArqueoBilletes({})
                        setArqueoMonedas({})
                        setNotasCierre('')
                      }}>
                      Cerrar Caja
                    </Button>
                  </Col>
                </Row>
              }
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              message={
                <Row justify="space-between" align="middle">
                  <Col>
                    <b><Space size={4}><LockOutlined />No hay caja abierta</Space></b>
                    {' '}— No se pueden registrar ventas
                  </Col>
                  <Col>
                    <Button type="primary" icon={<UnlockOutlined />}
                      onClick={() => { setOpenModal(true); setMontoInicial(0); setNotasApertura('') }}>
                      Abrir Caja
                    </Button>
                  </Col>
                </Row>
              }
            />
          )}
        </Col>
      </Row>

      {/* KPIs turno activo */}
      {activeRegister && (
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          {[
            { title: <Space size={6}><DollarCircleOutlined /><span>Fondo inicial</span></Space>,   value: Number(activeRegister.openingBalance), prefix: '$', precision: 2 },
            { title: <Space size={6}><ShoppingCartOutlined /><span>Ventas</span></Space>,           value: activeSummary?.salesCount ?? 0,        prefix: undefined, precision: 0 },
            { title: <Space size={6}><CalculatorOutlined /><span>Efectivo</span></Space>,           value: totalEfectivo,                          prefix: '$', precision: 2 },
            { title: <Space size={6}><CreditCardOutlined /><span>Tarjeta</span></Space>,            value: totalTarjeta,                           prefix: '$', precision: 2 },
          ].map((k, i) => (
            <Col xs={12} sm={12} md={6} key={i}>
              <Card size="small">
                <Statistic title={k.title} value={k.value} prefix={k.prefix} precision={k.precision}
                  valueStyle={{ color: primary, fontSize: 'clamp(16px, 4vw, 22px)' }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Historial */}
      <Card
        title={<Space size={6}><FileTextOutlined /><span>Historial de Cajas</span></Space>}
        size="small"
      >
        <div style={{ overflowX: 'auto' }}>
          <Table
            dataSource={registers as any[]}
            columns={columns}
            rowKey="id"
            size="small"
            loading={isLoading}
            scroll={{ x: 720 }}
            pagination={{ pageSize: 15, size: 'small' }}
          />
        </div>
      </Card>

      {/* ── Modal: Abrir caja ─────────────────────────────────────────────── */}
      <Modal
        open={openModal}
        title={<Space size={8}><UnlockOutlined /><span>Abrir caja</span></Space>}
        onCancel={() => setOpenModal(false)}
        onOk={() => openMutation.mutate()}
        confirmLoading={openMutation.isPending}
        okText="Abrir Caja"
        okButtonProps={{ style: { background: primary, borderColor: primary } }}
      >
        <p style={{ color: token.colorTextSecondary, marginBottom: 16 }}>
          Ingresa el efectivo con el que abres la caja (fondo de cambio).
        </p>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 8 }}>
            Monto inicial (efectivo en caja)
          </div>
          <InputNumber
            size="large" prefix="$" style={{ width: 200 }}
            value={montoInicial} min={0} precision={2}
            onChange={v => setMontoInicial(v || 0)}
            autoFocus
          />
        </div>
        <Input.TextArea rows={2} placeholder="Notas (opcional)" value={notasApertura}
          onChange={e => setNotasApertura(e.target.value)} />
      </Modal>

      {/* ── Modal: Cerrar caja con arqueo ─────────────────────────────────── */}
      <Modal
        open={closeModal}
        title="Cierre de Caja — Arqueo"
        onCancel={() => setCloseModal(false)}
        onOk={() => closeMutation.mutate()}
        confirmLoading={closeMutation.isPending}
        okText="Confirmar Cierre"
        okButtonProps={{ danger: true }}
        width={620}
      >
        {activeRegister && (
          <>
            {/* Resumen del sistema */}
            <Card size="small" style={{ marginBottom: 16, background: `${primary}14` }}>
              <Row gutter={[8, 8]}>
                <Col xs={12} md={8}>
                  <Statistic
                    title={<Space size={4}><DollarCircleOutlined /><span>Fondo inicial</span></Space>}
                    value={Number(activeRegister.openingBalance)} prefix="$" precision={2}
                  />
                </Col>
                <Col xs={12} md={8}>
                  <Statistic
                    title={<Space size={4}><CalculatorOutlined /><span>Ventas efectivo</span></Space>}
                    value={totalEfectivo} prefix="$" precision={2}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Statistic
                    title={<Space size={4}><DollarCircleOutlined /><span>Esperado en caja</span></Space>}
                    value={montoEsperado} prefix="$" precision={2}
                    valueStyle={{ color: primary, fontWeight: 700 }}
                  />
                </Col>
              </Row>
              <Divider style={{ margin: '8px 0' }} />
              <Row gutter={[8, 8]}>
                <Col xs={8}>
                  <Statistic
                    title={<Space size={4}><CreditCardOutlined /><span>Tarjeta</span></Space>}
                    value={totalTarjeta} prefix="$" precision={2}
                  />
                </Col>
                <Col xs={8}>
                  <Statistic
                    title={<Space size={4}><BankOutlined /><span>Transferencia</span></Space>}
                    value={totalTransf} prefix="$" precision={2}
                  />
                </Col>
                <Col xs={8}>
                  <Statistic
                    title={<Space size={4}><QrcodeOutlined /><span>QR / Dinero elec.</span></Space>}
                    value={sumByFormaPago(activeSummary?.paymentsByMethod, ['06'])}
                    prefix="$" precision={2}
                  />
                </Col>
              </Row>
            </Card>

            {/* Arqueo físico */}
            <Row gutter={[8, 16]}>
              <Col xs={24} sm={12}>
                <b>Billetes</b>
                <table style={{ width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontWeight: 500, color: token.colorTextTertiary, fontSize: 11 }}>Denominación</th>
                      <th style={{ textAlign: 'center', fontWeight: 500, color: token.colorTextTertiary, fontSize: 11 }}>Cantidad</th>
                      <th style={{ textAlign: 'right', fontWeight: 500, color: token.colorTextTertiary, fontSize: 11 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BILLETES.map(b => {
                      const cant = arqueoBilletes[String(b)] || 0
                      return (
                        <tr key={b}>
                          <td style={{ padding: '3px 0', fontSize: 12 }}>${b}.00</td>
                          <td style={{ textAlign: 'center' }}>
                            <InputNumber
                              size="small" style={{ width: '100%', maxWidth: 80 }} min={0}
                              value={cant || undefined}
                              onChange={v => setArqueoBilletes(prev => ({ ...prev, [String(b)]: v || 0 }))}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: cant > 0 ? primary : token.colorTextDisabled }}>
                            ${(b * cant).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 700, paddingTop: 6 }}>Subtotal billetes</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: primary, paddingTop: 6 }}>
                        ${totalContadoBilletes.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>

              <Col xs={24} sm={12}>
                <b>Monedas</b>
                <table style={{ width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontWeight: 500, color: token.colorTextTertiary, fontSize: 11 }}>Denominación</th>
                      <th style={{ textAlign: 'center', fontWeight: 500, color: token.colorTextTertiary, fontSize: 11 }}>Cantidad</th>
                      <th style={{ textAlign: 'right', fontWeight: 500, color: token.colorTextTertiary, fontSize: 11 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONEDAS.map(m => {
                      const cant = arqueoMonedas[String(m)] || 0
                      return (
                        <tr key={m}>
                          <td style={{ padding: '3px 0', fontSize: 12 }}>${m.toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <InputNumber
                              size="small" style={{ width: '100%', maxWidth: 80 }} min={0}
                              value={cant || undefined}
                              onChange={v => setArqueoMonedas(prev => ({ ...prev, [String(m)]: v || 0 }))}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: cant > 0 ? primary : token.colorTextDisabled }}>
                            ${(m * cant).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 700, paddingTop: 6 }}>Subtotal monedas</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: primary, paddingTop: 6 }}>
                        ${totalContadoMonedas.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
            </Row>

            <Divider />

            {/* Resultado diferencia */}
            <Card size="small" style={{
              background: diferenciaCierre === 0 ? `${primary}14`
                : diferenciaCierre > 0 ? token.colorWarningBg
                : token.colorErrorBg,
            }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <div style={{ fontSize: 12, color: token.colorTextTertiary }}>Total contado</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>${totalContado.toFixed(2)}</div>
                </Col>
                <Col>
                  <div style={{ fontSize: 12, color: token.colorTextTertiary }}>Esperado</div>
                  <div style={{ fontSize: 18 }}>${montoEsperado.toFixed(2)}</div>
                </Col>
                <Col>
                  <div style={{ fontSize: 12, color: token.colorTextTertiary }}>Diferencia</div>
                  <div style={{
                    fontSize: 22, fontWeight: 700,
                    color: diferenciaCierre === 0 ? primary
                      : diferenciaCierre > 0 ? token.colorWarning
                      : token.colorError,
                  }}>
                    {diferenciaCierre >= 0 ? '+' : ''}{diferenciaCierre.toFixed(2)}
                    {diferenciaCierre > 0  && ' (SOBRANTE)'}
                    {diferenciaCierre < 0  && ' (FALTANTE)'}
                    {diferenciaCierre === 0 && ' (EXACTO)'}
                  </div>
                </Col>
              </Row>
            </Card>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 4 }}>Notas de cierre</div>
              <Input.TextArea rows={2} placeholder="Observaciones del cierre..."
                value={notasCierre} onChange={e => setNotasCierre(e.target.value)} />
            </div>
          </>
        )}
      </Modal>

      {/* ── Modal: Detalle de caja ────────────────────────────────────────── */}
      <Modal
        open={!!detailRecord}
        title={detailRecord
          ? `Detalle — ${dayjs(detailRecord.openedAt).format('DD/MM/YY HH:mm')}`
          : ''}
        onCancel={() => setDetailRecord(null)}
        footer={[<Button key="close" onClick={() => setDetailRecord(null)}>Cerrar</Button>]}
        width={600}
      >
        {detailRecord && (() => {
          const pm = detailSummary?.paymentsByMethod ?? []
          const efec = Number(detailRecord.totalEfectivo ?? sumByFormaPago(pm, ['01']))
          const tarj = Number(detailRecord.totalTarjeta ?? sumByFormaPago(pm, ['02', '03']))
          const tran = Number(detailRecord.totalTransferencia ?? sumByFormaPago(pm, ['04', '05']))
          const qr   = Number(detailRecord.totalQR ?? sumByFormaPago(pm, ['06']))
          const tVentas = Number(detailRecord.totalVentas ?? detailSummary?.totalSales ?? 0)
          const diff = detailRecord.difference != null ? Number(detailRecord.difference) : null

          return (
            <>
              <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Estado">
                  {detailRecord.closedAt
                    ? <Tag color="default">CERRADA</Tag>
                    : <Tag color="green">ABIERTA</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Cajero apertura">{detailRecord.openedBy?.name}</Descriptions.Item>
                <Descriptions.Item label="Apertura">
                  {dayjs(detailRecord.openedAt).format('DD/MM/YY HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="Cierre">
                  {detailRecord.closedAt ? dayjs(detailRecord.closedAt).format('DD/MM/YY HH:mm') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Cajero cierre">{detailRecord.closedBy?.name ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Ventas">
                  {detailRecord.cantidadVentas ?? detailSummary?.salesCount ?? 0}
                </Descriptions.Item>
              </Descriptions>

              <Card size="small" style={{ marginBottom: 12, background: token.colorFillAlter }}>
                <Row gutter={[8, 8]}>
                  <Col xs={12} sm={6}>
                    <Statistic title="Fondo inicial" value={Number(detailRecord.openingBalance)}
                      prefix="$" precision={2} valueStyle={{ fontSize: 14 }} />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic title="Efectivo" value={efec}
                      prefix="$" precision={2} valueStyle={{ fontSize: 14 }} />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic title="Tarjeta" value={tarj}
                      prefix="$" precision={2} valueStyle={{ fontSize: 14 }} />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic title="Transfer. / QR" value={tran + qr}
                      prefix="$" precision={2} valueStyle={{ fontSize: 14 }} />
                  </Col>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row gutter={[8, 8]}>
                  <Col xs={8}>
                    <Statistic title="Total ventas" value={tVentas}
                      prefix="$" precision={2}
                      valueStyle={{ fontSize: 14, color: primary, fontWeight: 700 }} />
                  </Col>
                  <Col xs={8}>
                    <Statistic title="Esperado en caja" value={Number(detailRecord.montoEsperado ?? 0)}
                      prefix="$" precision={2} valueStyle={{ fontSize: 14 }} />
                  </Col>
                  <Col xs={8}>
                    <Statistic title="Contado" value={Number(detailRecord.closingBalance ?? 0)}
                      prefix="$" precision={2} valueStyle={{ fontSize: 14 }} />
                  </Col>
                </Row>
              </Card>

              {diff != null && (
                <Card size="small" style={{
                  marginBottom: 12,
                  background: diff === 0 ? `${primary}14`
                    : diff > 0 ? token.colorWarningBg
                    : token.colorErrorBg,
                }}>
                  <Row justify="space-between" align="middle">
                    <Col><Text strong>Diferencia</Text></Col>
                    <Col>
                      <Text strong style={{
                        fontSize: 18,
                        color: diff === 0 ? primary : diff > 0 ? token.colorWarning : token.colorError,
                      }}>
                        {diff >= 0 ? '+' : ''}{fmt(diff)}
                        {diff > 0  && ' (SOBRANTE)'}
                        {diff < 0  && ' (FALTANTE)'}
                        {diff === 0 && ' (EXACTO)'}
                      </Text>
                    </Col>
                  </Row>
                </Card>
              )}

              {detailRecord.notes && (
                <Card size="small" title="Notas"><Text>{detailRecord.notes}</Text></Card>
              )}
            </>
          )
        })()}
      </Modal>
    </div>
  )
}

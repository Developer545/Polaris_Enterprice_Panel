'use client'

import { useState, useMemo } from 'react'
import {
  Card, Row, Col, Button, InputNumber, Table, Tag, Statistic,
  Modal, Descriptions, Space, Divider, Input, Select, theme, Typography, App, Tooltip, Badge,
} from 'antd'
import {
  LockOutlined, UnlockOutlined, DollarCircleOutlined,
  ShoppingCartOutlined, CreditCardOutlined, CalculatorOutlined,
  BankOutlined, QrcodeOutlined, EyeOutlined, FileTextOutlined,
  WalletOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const { Text, Title } = Typography

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

const LBL = (text: string) => (
  <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>{text}</span>
)

export default function CashRegistersPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const primary = token.colorPrimary
  const qc = useQueryClient()
  const { companyId, branchId } = useAppContext()

  const [openModal, setOpenModal]       = useState(false)
  const [montoInicial, setMontoInicial] = useState<number>(0)
  const [notasApertura, setNotasApertura] = useState('')
  const [modalBranchId, setModalBranchId] = useState<string>('')

  const [closeModal, setCloseModal]     = useState(false)
  const [arqueoBilletes, setArqueoBilletes] = useState<Record<string, number>>({})
  const [arqueoMonedas,  setArqueoMonedas]  = useState<Record<string, number>>({})
  const [notasCierre, setNotasCierre]   = useState('')

  const [detailRecord, setDetailRecord] = useState<any>(null)

  const { data: registers = [], isLoading } = useQuery({
    queryKey: ['cash-registers', branchId],
    queryFn: () => api.get('/api/cash-registers', { params: { branchId } }).then(r => r.data),
    enabled: !!branchId,
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list', companyId],
    queryFn: () => api.get('/api/branches', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
    staleTime: 10 * 60_000,
  })
  const currentBranch = useMemo(
    () => (branches as any[]).find(b => b.id === branchId) ?? null,
    [branches, branchId],
  )

  const activeRegister = useMemo(
    () => (registers as any[]).find(r => !r.closedAt) ?? null,
    [registers],
  )

  const { data: activeSummary } = useQuery({
    queryKey: ['cash-register-summary', activeRegister?.id],
    queryFn: () => api.get(`/api/cash-registers/${activeRegister!.id}/summary`).then(r => r.data),
    enabled: !!activeRegister?.id,
    refetchInterval: 5 * 60_000,
  })

  const { data: detailSummary } = useQuery({
    queryKey: ['cash-register-summary', detailRecord?.id],
    queryFn: () => api.get(`/api/cash-registers/${detailRecord!.id}/summary`).then(r => r.data),
    enabled: !!detailRecord,
  })

  const totalEfectivo = useMemo(
    () => sumByFormaPago(activeSummary?.paymentsByMethod, ['01']),
    [activeSummary],
  )
  const totalTarjeta = useMemo(
    () => sumByFormaPago(activeSummary?.paymentsByMethod, ['02', '03']),
    [activeSummary],
  )
  const totalTransf = useMemo(
    () => sumByFormaPago(activeSummary?.paymentsByMethod, ['05', '14']),
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

  const effectiveBranchId = modalBranchId || branchId

  const openMutation = useMutation({
    mutationFn: () => api.post('/api/cash-registers/open', {
      companyId,
      branchId: effectiveBranchId,
      openingBalance: montoInicial,
      notes: notasApertura || undefined,
    }),
    onSuccess: () => {
      message.success('Caja abierta')
      qc.invalidateQueries({ queryKey: ['cash-registers'] })
      setOpenModal(false); setMontoInicial(0); setNotasApertura(''); setModalBranchId('')
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
      setCloseModal(false); setArqueoBilletes({}); setArqueoMonedas({}); setNotasCierre('')
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al cerrar caja'),
  })

  const columns = [
    {
      title: '#', width: 40,
      render: (_: unknown, __: unknown, idx: number) => (registers as any[]).length - idx,
    },
    {
      title: 'Apertura', dataIndex: 'openedAt', width: 130,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YY HH:mm')}</Text>,
    },
    {
      title: 'Cierre', dataIndex: 'closedAt', width: 130,
      render: (v: string | null) => v
        ? <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YY HH:mm')}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Cajero', key: 'openedBy',
      render: (r: any) => <Text style={{ fontSize: 13, fontWeight: 500 }}>{r.openedBy?.name ?? '—'}</Text>,
    },
    {
      title: 'Sucursal', key: 'branch',
      render: (r: any) => <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.branch?.name ?? '—'}</Text>,
    },
    {
      title: 'Estado', key: 'estado', width: 100,
      render: (r: any) => r.closedAt
        ? <Tag style={{ borderRadius: 4, fontWeight: 500 }}>Cerrada</Tag>
        : <Tag color="green" style={{ borderRadius: 4, fontWeight: 500 }}>Abierta</Tag>,
    },
    {
      title: 'Ventas', key: 'ventas', align: 'center' as const, width: 80,
      render: (r: any) => <Text style={{ fontSize: 13 }}>{r.cantidadVentas ?? r._count?.sales ?? 0}</Text>,
    },
    {
      title: 'Total', key: 'total', align: 'right' as const, width: 110,
      render: (r: any) => (
        <Text strong style={{ color: primary }}>{fmt(r.totalVentas ?? 0)}</Text>
      ),
    },
    {
      title: 'Diferencia', dataIndex: 'difference', align: 'right' as const, width: 110,
      render: (v: number | null) => {
        if (v == null) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        const n = Number(v)
        const color = n > 0 ? token.colorWarning : n < 0 ? token.colorError : token.colorSuccess
        return <Text strong style={{ color }}>{n >= 0 ? '+' : ''}{fmt(n)}</Text>
      },
    },
    {
      title: '', key: 'actions', width: 50, fixed: 'right' as const,
      render: (r: any) => (
        <Tooltip title="Ver detalle">
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setDetailRecord(r)} />
        </Tooltip>
      ),
    },
  ]

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Caja / Turnos</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Control de apertura, cierre y arqueo de caja</Text>
      </div>

      {/* ── Banner estado de caja ──────────────────────────────────────── */}
      <Card
        size="small"
        style={{
          marginBottom: 20, borderRadius: 12, border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          background: activeRegister ? token.colorSuccessBg : token.colorWarningBg,
          borderLeft: `4px solid ${activeRegister ? token.colorSuccess : token.colorWarning}`,
        }}
        styles={{ body: { padding: '14px 20px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Badge status={activeRegister ? 'success' : 'warning'} />
            <div>
              <Text style={{ fontWeight: 600, fontSize: 14, color: token.colorText }}>
                {activeRegister ? 'Caja abierta' : 'Sin caja abierta'}
              </Text>
              {activeRegister && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 10 }}>
                  {activeRegister.branch?.name && (
                    <><BankOutlined style={{ marginRight: 4 }} />{activeRegister.branch.name} · </>
                  )}
                  {activeRegister.openedBy?.name} · Desde {dayjs(activeRegister.openedAt).format('DD/MM/YY HH:mm')}
                </Text>
              )}
              {!activeRegister && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 10 }}>
                  No se pueden registrar ventas hasta abrir caja
                </Text>
              )}
            </div>
          </div>
          {activeRegister ? (
            <Button
              danger
              icon={<LockOutlined />}
              style={{ borderRadius: 8, fontWeight: 600 }}
              onClick={() => { setCloseModal(true); setArqueoBilletes({}); setArqueoMonedas({}); setNotasCierre('') }}
            >
              Cerrar Caja
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<UnlockOutlined />}
              style={{ background: primary, borderColor: primary, borderRadius: 8, fontWeight: 600 }}
              onClick={() => { setOpenModal(true); setMontoInicial(0); setNotasApertura(''); setModalBranchId('') }}
            >
              Abrir Caja
            </Button>
          )}
        </div>
      </Card>

      {/* ── KPIs turno activo ─────────────────────────────────────────── */}
      {activeRegister && (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {[
            { title: 'Fondo inicial',  value: Number(activeRegister.openingBalance), icon: <WalletOutlined />,       color: token.colorTextSecondary, prefix: '$', precision: 2 },
            { title: 'Ventas',         value: activeSummary?.salesCount ?? 0,        icon: <ShoppingCartOutlined />, color: primary,   prefix: undefined, precision: 0 },
            { title: 'Efectivo',       value: totalEfectivo,                         icon: <CalculatorOutlined />,   color: token.colorSuccess, prefix: '$', precision: 2 },
            { title: 'Tarjeta',        value: totalTarjeta,                          icon: <CreditCardOutlined />,   color: primary,   prefix: '$', precision: 2 },
          ].map((k, i) => (
            <Col xs={12} sm={12} md={6} key={i}>
              <Card
                size="small"
                style={{
                  borderRadius: 12, border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  borderTop: `3px solid ${k.color}`,
                }}
              >
                <Statistic
                  title={<span style={{ fontSize: 12, color: token.colorTextSecondary }}>{k.title}</span>}
                  value={k.value}
                  prefix={<span style={{ color: k.color, marginRight: 4 }}>{k.icon}</span>}
                  precision={k.precision}
                  valueStyle={{ color: k.color, fontWeight: 700, fontSize: 22 }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* ── Historial ─────────────────────────────────────────────────── */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileTextOutlined style={{ color: token.colorTextSecondary }} />
          <Text style={{ fontWeight: 600, fontSize: 14, color: token.colorText }}>Historial de Cajas</Text>
        </div>
        <Table
          dataSource={registers as any[]}
          columns={columns}
          rowKey="id"
          size="small"
          loading={isLoading}
          scroll={{ x: 750 }}
          pagination={{
            pageSize: 15, size: 'small',
            showTotal: (t) => `${t} turnos`,
            style: { padding: '8px 16px' },
          }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      {/* ── Modal: Abrir caja ──────────────────────────────────────────── */}
      <Modal
        open={openModal}
        title={<Space><UnlockOutlined />Abrir Caja</Space>}
        onCancel={() => setOpenModal(false)}
        onOk={() => openMutation.mutate()}
        confirmLoading={openMutation.isPending}
        okText="Abrir Caja"
        okButtonProps={{ style: { background: primary, borderColor: primary, borderRadius: 8, fontWeight: 600 }, disabled: !effectiveBranchId }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={420}
        destroyOnHidden
        style={{ top: 40 }}
        styles={{ header: { borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
          Ingresa el efectivo con el que abres la caja (fondo de cambio).
        </Text>

        <div style={{ marginBottom: 16 }}>
          {LBL('Sucursal')}
          {branchId ? (
            <Input
              size="large"
              prefix={<BankOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={currentBranch?.name ?? branchId}
              readOnly
              style={{ marginTop: 6, borderRadius: 8, background: token.colorFillAlter, cursor: 'default' }}
            />
          ) : (
            <Select
              size="large"
              style={{ width: '100%', marginTop: 6 }}
              placeholder="Selecciona una sucursal"
              value={modalBranchId || undefined}
              onChange={(v) => setModalBranchId(v)}
              options={(branches as any[]).map((b: any) => ({ value: b.id, label: b.name }))}
              showSearch
              optionFilterProp="label"
            />
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          {LBL('Monto inicial (efectivo en caja)')}
          <div style={{ marginTop: 6 }}>
            <InputNumber
              size="large"
              prefix="$"
              style={{ width: '100%', borderRadius: 8 }}
              value={montoInicial}
              min={0}
              precision={2}
              onChange={v => setMontoInicial(v || 0)}
              autoFocus
            />
          </div>
        </div>

        <div>
          {LBL('Notas de apertura (opcional)')}
          <Input.TextArea
            rows={2}
            placeholder="Observaciones..."
            value={notasApertura}
            onChange={e => setNotasApertura(e.target.value)}
            style={{ marginTop: 6, borderRadius: 8, borderColor: token.colorBorderSecondary }}
          />
        </div>
      </Modal>

      {/* ── Modal: Cerrar caja con arqueo ──────────────────────────────── */}
      <Modal
        open={closeModal}
        title={<Space><LockOutlined />Cierre de Caja — Arqueo</Space>}
        onCancel={() => setCloseModal(false)}
        onOk={() => closeMutation.mutate()}
        confirmLoading={closeMutation.isPending}
        okText="Confirmar Cierre"
        okButtonProps={{ danger: true, style: { borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={640}
        destroyOnHidden
        style={{ top: 24 }}
        styles={{
          header: { borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 16 },
          body: { paddingTop: 16, maxHeight: '78vh', overflowY: 'auto' },
        }}
      >
        {activeRegister && (
          <>
            {/* Resumen sistema */}
            <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Resumen del sistema
            </Text>
            <Divider style={{ margin: '4px 0 14px', borderColor: token.colorBorderSecondary }} />

            <Card size="small" style={{ marginBottom: 20, background: token.colorFillAlter, borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}
              styles={{ body: { padding: '12px 16px' } }}>
              <Row gutter={[8, 12]}>
                <Col xs={12} md={8}>
                  <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Fondo inicial</span>}
                    value={Number(activeRegister.openingBalance)} prefix="$" precision={2}
                    valueStyle={{ fontSize: 16, fontWeight: 600 }} />
                </Col>
                <Col xs={12} md={8}>
                  <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Ventas efectivo</span>}
                    value={totalEfectivo} prefix="$" precision={2}
                    valueStyle={{ fontSize: 16, fontWeight: 600 }} />
                </Col>
                <Col xs={24} md={8}>
                  <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Esperado en caja</span>}
                    value={montoEsperado} prefix="$" precision={2}
                    valueStyle={{ fontSize: 16, fontWeight: 700, color: primary }} />
                </Col>
              </Row>
              <Divider style={{ margin: '10px 0 10px', borderColor: token.colorBorderSecondary }} />
              <Row gutter={[8, 8]}>
                <Col xs={8}>
                  <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Tarjeta</span>}
                    value={totalTarjeta} prefix="$" precision={2}
                    valueStyle={{ fontSize: 14 }} />
                </Col>
                <Col xs={8}>
                  <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Transferencia</span>}
                    value={totalTransf} prefix="$" precision={2}
                    valueStyle={{ fontSize: 14 }} />
                </Col>
                <Col xs={8}>
                  <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>QR / Dinero elec.</span>}
                    value={sumByFormaPago(activeSummary?.paymentsByMethod, ['08', '09', '11', '12'])}
                    prefix="$" precision={2}
                    valueStyle={{ fontSize: 14 }} />
                </Col>
              </Row>
            </Card>

            {/* Arqueo físico */}
            <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Conteo físico
            </Text>
            <Divider style={{ margin: '4px 0 14px', borderColor: token.colorBorderSecondary }} />

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {/* Billetes */}
              <Col xs={24} sm={12}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: token.colorText }}>Billetes</Text>
                <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                      <th style={{ textAlign: 'left', fontWeight: 500, color: token.colorTextSecondary, fontSize: 11, padding: '4px 0' }}>Denominación</th>
                      <th style={{ textAlign: 'center', fontWeight: 500, color: token.colorTextSecondary, fontSize: 11 }}>Cant.</th>
                      <th style={{ textAlign: 'right', fontWeight: 500, color: token.colorTextSecondary, fontSize: 11 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BILLETES.map(b => {
                      const cant = arqueoBilletes[String(b)] || 0
                      return (
                        <tr key={b}>
                          <td style={{ padding: '4px 0', fontSize: 12, color: token.colorText }}>${b}.00</td>
                          <td style={{ textAlign: 'center', padding: '2px 0' }}>
                            <InputNumber
                              size="small" style={{ width: 72, borderRadius: 6 }} min={0}
                              value={cant || undefined}
                              onChange={v => setArqueoBilletes(prev => ({ ...prev, [String(b)]: v || 0 }))}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: cant > 0 ? token.colorText : token.colorTextQuaternary }}>
                            ${(b * cant).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                      <td colSpan={2} style={{ fontWeight: 700, paddingTop: 6, fontSize: 12 }}>Subtotal</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: primary, paddingTop: 6, fontSize: 12 }}>
                        ${totalContadoBilletes.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>

              {/* Monedas */}
              <Col xs={24} sm={12}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: token.colorText }}>Monedas</Text>
                <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                      <th style={{ textAlign: 'left', fontWeight: 500, color: token.colorTextSecondary, fontSize: 11, padding: '4px 0' }}>Denominación</th>
                      <th style={{ textAlign: 'center', fontWeight: 500, color: token.colorTextSecondary, fontSize: 11 }}>Cant.</th>
                      <th style={{ textAlign: 'right', fontWeight: 500, color: token.colorTextSecondary, fontSize: 11 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONEDAS.map(m => {
                      const cant = arqueoMonedas[String(m)] || 0
                      return (
                        <tr key={m}>
                          <td style={{ padding: '4px 0', fontSize: 12, color: token.colorText }}>${m.toFixed(2)}</td>
                          <td style={{ textAlign: 'center', padding: '2px 0' }}>
                            <InputNumber
                              size="small" style={{ width: 72, borderRadius: 6 }} min={0}
                              value={cant || undefined}
                              onChange={v => setArqueoMonedas(prev => ({ ...prev, [String(m)]: v || 0 }))}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: cant > 0 ? token.colorText : token.colorTextQuaternary }}>
                            ${(m * cant).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                      <td colSpan={2} style={{ fontWeight: 700, paddingTop: 6, fontSize: 12 }}>Subtotal</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: primary, paddingTop: 6, fontSize: 12 }}>
                        ${totalContadoMonedas.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Col>
            </Row>

            {/* Resultado diferencia */}
            <Divider style={{ margin: '0 0 14px', borderColor: token.colorBorderSecondary }} />
            <Card
              size="small"
              style={{
                borderRadius: 10, marginBottom: 16,
                border: `1px solid ${diferenciaCierre === 0 ? token.colorBorderSecondary : diferenciaCierre > 0 ? token.colorWarningBorder : token.colorErrorBorder}`,
                background: diferenciaCierre === 0 ? token.colorFillAlter : diferenciaCierre > 0 ? token.colorWarningBg : token.colorErrorBg,
              }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <Row justify="space-between" align="middle">
                <Col>
                  <div style={{ fontSize: 11, color: token.colorTextSecondary, marginBottom: 2 }}>Total contado</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: token.colorText }}>${totalContado.toFixed(2)}</div>
                </Col>
                <Col>
                  <div style={{ fontSize: 11, color: token.colorTextSecondary, marginBottom: 2 }}>Esperado</div>
                  <div style={{ fontSize: 18, color: token.colorText }}>${montoEsperado.toFixed(2)}</div>
                </Col>
                <Col style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: token.colorTextSecondary, marginBottom: 2 }}>Diferencia</div>
                  <div style={{
                    fontSize: 22, fontWeight: 700,
                    color: diferenciaCierre === 0 ? token.colorSuccess
                      : diferenciaCierre > 0 ? token.colorWarning
                      : token.colorError,
                  }}>
                    {diferenciaCierre >= 0 ? '+' : ''}{diferenciaCierre.toFixed(2)}
                    <div style={{ fontSize: 11, fontWeight: 400 }}>
                      {diferenciaCierre > 0 && 'SOBRANTE'}
                      {diferenciaCierre < 0 && 'FALTANTE'}
                      {diferenciaCierre === 0 && 'EXACTO'}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Notas */}
            <div>
              {LBL('Notas de cierre (opcional)')}
              <Input.TextArea rows={2} placeholder="Observaciones del cierre..."
                value={notasCierre} onChange={e => setNotasCierre(e.target.value)}
                style={{ marginTop: 6, borderRadius: 8, borderColor: token.colorBorderSecondary }} />
            </div>
          </>
        )}
      </Modal>

      {/* ── Modal: Detalle de caja ──────────────────────────────────────── */}
      <Modal
        open={!!detailRecord}
        title={
          <Space>
            <ClockCircleOutlined />
            {detailRecord ? `Detalle — ${dayjs(detailRecord.openedAt).format('DD/MM/YYYY HH:mm')}` : ''}
          </Space>
        }
        onCancel={() => setDetailRecord(null)}
        footer={[
          <Button key="close" onClick={() => setDetailRecord(null)} style={{ borderRadius: 8 }}>
            Cerrar
          </Button>,
        ]}
        width={600}
        destroyOnHidden
        style={{ top: 40 }}
        styles={{ header: { borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        {detailRecord && (() => {
          const pm   = detailSummary?.paymentsByMethod ?? []
          const efec = Number(detailRecord.totalEfectivo ?? sumByFormaPago(pm, ['01']))
          const tarj = Number(detailRecord.totalTarjeta ?? sumByFormaPago(pm, ['02', '03']))
          const tran = Number(detailRecord.totalTransferencia ?? sumByFormaPago(pm, ['05', '14']))
          const qr   = Number(detailRecord.totalQR ?? sumByFormaPago(pm, ['08', '09', '11', '12']))
          const tVentas = Number(detailRecord.totalVentas ?? detailSummary?.totalSales ?? 0)
          const diff = detailRecord.difference != null ? Number(detailRecord.difference) : null

          return (
            <>
              <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Información del turno
              </Text>
              <Divider style={{ margin: '4px 0 14px', borderColor: token.colorBorderSecondary }} />

              <Descriptions size="small" column={2} style={{ marginBottom: 16 }}
                styles={{ label: { color: token.colorTextSecondary, fontSize: 12 }, content: { fontSize: 13 } }}>
                <Descriptions.Item label="Sucursal" span={2}>
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>{detailRecord.branch?.name ?? '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Estado">
                  {detailRecord.closedAt
                    ? <Tag style={{ borderRadius: 4 }}>Cerrada</Tag>
                    : <Tag color="green" style={{ borderRadius: 4 }}>Abierta</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Cajero apertura">
                  <Text style={{ fontSize: 13 }}>{detailRecord.openedBy?.name ?? '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Apertura">
                  {dayjs(detailRecord.openedAt).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="Cierre">
                  {detailRecord.closedAt ? dayjs(detailRecord.closedAt).format('DD/MM/YYYY HH:mm') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Cajero cierre">
                  {detailRecord.closedBy?.name ?? '—'}
                </Descriptions.Item>
                <Descriptions.Item label="N° ventas">
                  {detailRecord.cantidadVentas ?? detailSummary?.salesCount ?? 0}
                </Descriptions.Item>
              </Descriptions>

              <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Resumen financiero
              </Text>
              <Divider style={{ margin: '4px 0 14px', borderColor: token.colorBorderSecondary }} />

              <Card size="small" style={{ marginBottom: 12, background: token.colorFillAlter, borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}
                styles={{ body: { padding: '12px 16px' } }}>
                <Row gutter={[8, 12]}>
                  <Col xs={12} sm={6}>
                    <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Fondo inicial</span>}
                      value={Number(detailRecord.openingBalance)} prefix="$" precision={2}
                      valueStyle={{ fontSize: 14 }} />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Efectivo</span>}
                      value={efec} prefix="$" precision={2}
                      valueStyle={{ fontSize: 14 }} />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Tarjeta</span>}
                      value={tarj} prefix="$" precision={2}
                      valueStyle={{ fontSize: 14 }} />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Transfer. / QR</span>}
                      value={tran + qr} prefix="$" precision={2}
                      valueStyle={{ fontSize: 14 }} />
                  </Col>
                </Row>
                <Divider style={{ margin: '10px 0', borderColor: token.colorBorderSecondary }} />
                <Row gutter={[8, 8]}>
                  <Col xs={8}>
                    <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Total ventas</span>}
                      value={tVentas} prefix="$" precision={2}
                      valueStyle={{ fontSize: 14, color: primary, fontWeight: 700 }} />
                  </Col>
                  <Col xs={8}>
                    <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Esperado en caja</span>}
                      value={Number(detailRecord.montoEsperado ?? 0)} prefix="$" precision={2}
                      valueStyle={{ fontSize: 14 }} />
                  </Col>
                  <Col xs={8}>
                    <Statistic title={<span style={{ fontSize: 11, color: token.colorTextSecondary }}>Contado</span>}
                      value={Number(detailRecord.closingBalance ?? 0)} prefix="$" precision={2}
                      valueStyle={{ fontSize: 14 }} />
                  </Col>
                </Row>
              </Card>

              {diff != null && (
                <Card size="small" style={{
                  marginBottom: 12, borderRadius: 10,
                  border: `1px solid ${diff === 0 ? token.colorBorderSecondary : diff > 0 ? token.colorWarningBorder : token.colorErrorBorder}`,
                  background: diff === 0 ? token.colorFillAlter : diff > 0 ? token.colorWarningBg : token.colorErrorBg,
                }}
                  styles={{ body: { padding: '10px 16px' } }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 600 }}>Diferencia de cierre</Text>
                    <Text strong style={{
                      fontSize: 18,
                      color: diff === 0 ? token.colorSuccess : diff > 0 ? token.colorWarning : token.colorError,
                    }}>
                      {diff >= 0 ? '+' : ''}{fmt(diff)}
                      <Text style={{ fontSize: 11, fontWeight: 400, marginLeft: 6 }}>
                        {diff > 0 ? '(SOBRANTE)' : diff < 0 ? '(FALTANTE)' : '(EXACTO)'}
                      </Text>
                    </Text>
                  </div>
                </Card>
              )}

              {detailRecord.notes && (
                <Card size="small" style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}
                  styles={{ body: { padding: '10px 16px' } }}>
                  <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notas</Text>
                  <div style={{ marginTop: 6 }}><Text style={{ fontSize: 13 }}>{detailRecord.notes}</Text></div>
                </Card>
              )}
            </>
          )
        })()}
      </Modal>
    </div>
  )
}

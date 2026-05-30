'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Row, Col, Card, Statistic, Table, Typography, Tag, Empty, Spin,
  Space, Button, Alert, Progress, Tabs,
} from 'antd'
import {
  ShoppingCartOutlined, DollarOutlined, WalletOutlined, ShopOutlined,
  WarningOutlined, RiseOutlined, FallOutlined, FileExcelOutlined,
  CheckCircleOutlined, TeamOutlined, BarChartOutlined, FileDoneOutlined,
  MinusOutlined, FireOutlined, ExclamationCircleOutlined, FileTextOutlined,
  UserOutlined, InboxOutlined, CreditCardOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { theme } from 'antd'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar,
} from 'recharts'
import { api } from '../../lib/api'
import { OWNER_FROM_KEY, OWNER_TO_KEY, OWNER_BRANCH_KEY } from './layout'

const { Text } = Typography

const PIE_COLORS = ['#f47920', '#52c41a', '#1677ff', '#faad14', '#6366f1', '#eb5757', '#0891b2', '#a855f7']
const money = (v: number) => `$${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── VarBadge ─────────────────────────────────────────────────────────────────
function VarBadge({ value }: { value: number | null }) {
  if (value === null) return <span style={{ fontSize: 11, color: '#8c8c8c' }}>—</span>
  const up = value > 0; const neutral = value === 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: neutral ? 'rgba(150,150,150,0.1)' : up ? 'rgba(82,196,26,0.12)' : 'rgba(255,77,79,0.12)',
      color: neutral ? '#888' : up ? '#52c41a' : '#ff4d4f',
    }}>
      {neutral ? <MinusOutlined /> : up ? <RiseOutlined /> : <FallOutlined />}
      {Math.abs(value)}%
    </span>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, suffix, icon, color, badge, extra, precision = 2, loading }: {
  label: string; value: number; suffix?: string; icon: React.ReactNode
  color: string; badge?: React.ReactNode; extra?: React.ReactNode
  precision?: number; loading?: boolean
}) {
  const { token: t } = theme.useToken()
  return (
    <Card size="small" style={{
      borderRadius: 14, border: `1px solid ${color}30`,
      background: `linear-gradient(135deg, ${color}10 0%, ${t.colorBgContainer} 65%)`,
      boxShadow: `0 2px 12px ${color}15`, height: '100%',
    }} styles={{ body: { padding: '16px 18px' } }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color, fontSize: 18 }}>{icon}</span>
        </div>
        {badge}
      </div>
      <Statistic
        value={value}
        precision={precision}
        suffix={suffix ? <span style={{ fontSize: 12, color: t.colorTextSecondary }}>{suffix}</span> : undefined}
        valueStyle={{ color, fontSize: 22, fontWeight: 800 }}
        loading={loading}
      />
      <div style={{ fontSize: 11, color: t.colorTextSecondary, marginTop: 2 }}>{label}</div>
      {extra}
    </Card>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  const { token: t } = theme.useToken()
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: t.colorBgContainer, border: `1px solid ${t.colorBorderSecondary}`,
      borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ fontSize: 12, color: p.color }}>
          {p.name}: <b>{money(p.value)}</b>
        </div>
      ))}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
type ExtendedData = {
  panel: {
    ventas: number; countVentas: number; gastos: number; neto: number
    varVentas: number | null; varGastos: number | null; varNeto: number | null
    margenPct: number; dteTotales: number; dteAceptados: number; tasaDte: number
    clientesNuevos: number; totalClientes: number; empleadosActivos: number
    itemsBajoMinimo: number; totalSucursales: number
  }
  evolucion: { mes: string; ventas: number; gastos: number; neto: number }[]
  branches: { branchId: string; branchName: string; ventas: number; countVentas: number }[]
  topProducts: { productName: string; cantidad: number; ventaGravada: number }[]
  gastosPorCategoria: { nombre: string; color: string; total: number; count: number }[]
  gastosEvolucion: { mes: string; gastos: number }[]
  comprasEvolucion: { mes: string; total: number; count: number }[]
  cxp: { montoVencido: number; montoVigente: number; montoPorVencer: number; countVencidas: number; countVigentes: number; countPorVencer: number }
  planillaEvolucion: { periodo: string; totalBruto: number; totalDeducciones: number; totalNeto: number; costoPatronal: number; estado: string }[]
  planillaTotals: { totalBruto: number; totalNeto: number; totalDeducciones: number; totalPatronal: number }
}

// ── Reporte card ──────────────────────────────────────────────────────────────
const REPORTS = [
  { key: 'ventas',     label: 'Ventas del período',        icon: <ShoppingCartOutlined />, desc: 'Listado completo de ventas POS',           color: '#f47920', period: true  },
  { key: 'dte',        label: 'Documentos DTE',             icon: <FileDoneOutlined />,     desc: 'CF, CCF, NC, ND emitidos con estado DTE',  color: '#1677ff', period: true  },
  { key: 'gastos',     label: 'Gastos del período',         icon: <WalletOutlined />,       desc: 'Registro de gastos operativos',             color: '#ff4d4f', period: true  },
  { key: 'compras',    label: 'Compras del período',        icon: <InboxOutlined />,        desc: 'Órdenes de compra a proveedores',           color: '#faad14', period: true  },
  { key: 'planilla',   label: 'Planilla del año',           icon: <TeamOutlined />,         desc: 'Nómina por período con deducciones',        color: '#6366f1', period: false },
  { key: 'cxp',        label: 'Cuentas por pagar',          icon: <CreditCardOutlined />,   desc: 'Estado actual de deudas con proveedores',   color: '#eb5757', period: false },
  { key: 'clientes',   label: 'Clientes',                   icon: <UserOutlined />,         desc: 'Directorio completo de clientes',           color: '#52c41a', period: false },
  { key: 'inventario', label: 'Inventario actual',          icon: <BarChartOutlined />,     desc: 'Stock actual por producto y sucursal',      color: '#0891b2', period: false },
]

// ── Main Component ────────────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const { token } = theme.useToken()
  const router = useRouter()
  const sp = useSearchParams()

  const [companyId, setCompanyId] = useState('')
  const [from,      setFrom]      = useState('')
  const [to,        setTo]        = useState('')
  const [branchId,  setBranchId]  = useState('all')
  const [pending,   setPending]   = useState<string | null>(null)

  const activeTab = sp.get('tab') ?? 'panel'

  function goTab(tab: string) {
    const params = new URLSearchParams(sp.toString())
    params.set('tab', tab)
    router.push(`/owner?${params.toString()}`)
  }

  // Leer filtros desde localStorage en mount
  useEffect(() => {
    const cid = localStorage.getItem('companyId') ?? ''
    const f   = localStorage.getItem(OWNER_FROM_KEY) ?? ''
    const t   = localStorage.getItem(OWNER_TO_KEY)   ?? ''
    const b   = localStorage.getItem(OWNER_BRANCH_KEY) ?? 'all'
    setCompanyId(cid)
    setFrom(f)
    setTo(t)
    setBranchId(b)
  }, [])

  // Escuchar cambios del layout
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d.from)          setFrom(d.from)
      if (d.to)            setTo(d.to)
      if (d.branchFilter !== undefined) setBranchId(d.branchFilter)
    }
    window.addEventListener('owner-filter-change', handler)
    return () => window.removeEventListener('owner-filter-change', handler)
  }, [])

  const enabled = !!companyId && !!from && !!to

  const { data, isLoading, error } = useQuery<ExtendedData>({
    queryKey: ['owner-extended', companyId, from, to, branchId],
    queryFn: () =>
      api.get('/api/dashboard/extended', {
        params: { companyId, from, to, branchId: branchId !== 'all' ? branchId : undefined },
      }).then(r => r.data),
    enabled,
    staleTime: 60_000,
  })

  const p = data?.panel
  const PRIMARY = token.colorPrimary
  const SUCCESS = token.colorSuccess
  const ERROR   = token.colorError
  const WARNING = token.colorWarning
  const INDIGO  = '#6366f1'

  // ── Descargar reporte ─────────────────────────────────────────────────────
  async function downloadReport(key: string) {
    if (pending) return
    setPending(key)
    try {
      const params: Record<string, string> = { companyId }
      if (from && ['ventas', 'dte', 'gastos', 'compras'].includes(key)) {
        params.from = from; params.to = to
      }
      if (branchId !== 'all') params.branchId = branchId

      const res = await api.get(`/api/reports/${key}`, { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${key}-${from ?? 'actual'}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore — API may not have all endpoints yet
    } finally {
      setPending(null)
    }
  }

  if (error) return <Alert type="error" showIcon message="No se pudo cargar el panel de propietario" style={{ borderRadius: 10 }} />

  const evolucion = data?.evolucion ?? []

  // ── Tabs content ─────────────────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'panel',
      label: 'Panel ejecutivo',
      children: (
        <div>
          <Row gutter={[14, 14]}>
            <Col xs={12} sm={8} md={6}>
              <KpiCard label={`Ventas del período`} value={p?.ventas ?? 0} suffix="USD"
                icon={<ShoppingCartOutlined />} color={PRIMARY} loading={isLoading}
                badge={<VarBadge value={p?.varVentas ?? null} />} />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <KpiCard label="Gastos del período" value={p?.gastos ?? 0} suffix="USD"
                icon={<WalletOutlined />} color={ERROR} loading={isLoading}
                badge={<VarBadge value={p?.varGastos ?? null} />} />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <KpiCard label="Utilidad neta" value={p?.neto ?? 0} suffix="USD"
                icon={p?.neto ?? 0 >= 0 ? <RiseOutlined /> : <FallOutlined />}
                color={(p?.neto ?? 0) >= 0 ? SUCCESS : ERROR} loading={isLoading}
                badge={<VarBadge value={p?.varNeto ?? null} />}
                extra={<div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 2 }}>Margen: {p?.margenPct ?? 0}%</div>} />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <KpiCard label="N° ventas realizadas" value={p?.countVentas ?? 0} suffix=""
                icon={<BarChartOutlined />} color={PRIMARY} precision={0} loading={isLoading} />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <KpiCard label="DTE aceptados" value={p?.dteAceptados ?? 0} suffix=""
                icon={<CheckCircleOutlined />} color={SUCCESS} precision={0} loading={isLoading}
                extra={
                  <div style={{ marginTop: 6 }}>
                    <Progress percent={p?.tasaDte ?? 0} size="small" showInfo={false}
                      strokeColor={SUCCESS} trailColor={`${SUCCESS}20`} />
                    <span style={{ fontSize: 10, color: token.colorTextSecondary }}>{p?.tasaDte ?? 0}% tasa aceptación</span>
                  </div>
                } />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <KpiCard label="Clientes nuevos" value={p?.clientesNuevos ?? 0} suffix=""
                icon={<TeamOutlined />} color="#722ed1" precision={0} loading={isLoading}
                extra={<div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 2 }}>{p?.totalClientes ?? 0} total registrados</div>} />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <KpiCard label="Empleados activos" value={p?.empleadosActivos ?? 0} suffix=""
                icon={<UserOutlined />} color="#0891b2" precision={0} loading={isLoading} />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <KpiCard label="Sucursales activas" value={p?.totalSucursales ?? 0} suffix=""
                icon={<ShopOutlined />} color={WARNING} precision={0} loading={isLoading} />
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'metricas',
      label: 'Métricas financieras',
      children: (
        <div>
          {/* Area chart evolución */}
          <Card size="small" title="Flujo financiero — últimos 6 meses" style={{ borderRadius: 14, marginBottom: 14 }}>
            {evolucion.length === 0
              ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin datos" style={{ padding: 40 }} />
              : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={evolucion} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={PRIMARY} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ERROR} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={ERROR} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gNeto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SUCCESS} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={SUCCESS} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: token.colorText }} />
                    <YAxis tick={{ fontSize: 11, fill: token.colorTextSecondary }} width={62}
                      tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                    <ReTooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Area type="monotone" dataKey="ventas" name="Ventas" stroke={PRIMARY} strokeWidth={2.5} fill="url(#gVentas)" />
                    <Area type="monotone" dataKey="gastos" name="Gastos" stroke={ERROR} strokeWidth={2} strokeDasharray="5 3" fill="url(#gGastos)" />
                    <Area type="monotone" dataKey="neto"   name="Neto"   stroke={SUCCESS} strokeWidth={2} fill="url(#gNeto)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
          </Card>

          {/* Radial (tasa DTE) + comparativa */}
          <Row gutter={[14, 14]}>
            <Col xs={24} md={8}>
              <Card size="small" title="Tasa de aprobación DTE" style={{ borderRadius: 14, height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
                  <div style={{ position: 'relative', width: 160, height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="90%"
                        data={[{ value: p?.tasaDte ?? 0, fill: SUCCESS }]} startAngle={90} endAngle={-270}>
                        <RadialBar dataKey="value" cornerRadius={8} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 26, fontWeight: 800, color: SUCCESS }}>{p?.tasaDte ?? 0}%</span>
                      <span style={{ fontSize: 11, color: token.colorTextSecondary }}>aceptados</span>
                    </div>
                  </div>
                  <Row gutter={8} style={{ width: '100%', marginTop: 12 }}>
                    <Col span={12} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: SUCCESS }}>{p?.dteAceptados ?? 0}</div>
                      <div style={{ fontSize: 11, color: token.colorTextSecondary }}>Aceptados</div>
                    </Col>
                    <Col span={12} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: token.colorTextSecondary }}>{p?.dteTotales ?? 0}</div>
                      <div style={{ fontSize: 11, color: token.colorTextSecondary }}>Total emitidos</div>
                    </Col>
                  </Row>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={16}>
              <Card size="small" title="Resumen del período" style={{ borderRadius: 14, height: '100%' }}>
                {[
                  { label: 'Ventas', cur: p?.ventas ?? 0,  var: p?.varVentas ?? null, color: PRIMARY },
                  { label: 'Gastos', cur: p?.gastos ?? 0,  var: p?.varGastos ?? null, color: ERROR   },
                  { label: 'Neto',   cur: p?.neto ?? 0,    var: p?.varNeto   ?? null, color: (p?.neto ?? 0) >= 0 ? SUCCESS : ERROR },
                ].map((row) => (
                  <div key={row.label} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{row.label}</span>
                      <Space>
                        <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{money(row.cur)}</span>
                        <VarBadge value={row.var} />
                      </Space>
                    </div>
                    <Progress
                      percent={Math.min(100, row.cur > 0 ? 100 : row.cur < 0 ? 0 : 0)}
                      showInfo={false} strokeColor={row.color} size="small" />
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: '10px 14px', background: `${PRIMARY}08`, borderRadius: 10, border: `1px solid ${PRIMARY}20` }}>
                  <div style={{ fontSize: 12, color: token.colorTextSecondary }}>Margen de utilidad</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: (p?.neto ?? 0) >= 0 ? SUCCESS : ERROR }}>{p?.margenPct ?? 0}%</div>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'ranking',
      label: 'Ranking sucursales',
      children: (
        <div>
          <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
            {/* Bar chart sucursales */}
            <Col xs={24} lg={14}>
              <Card size="small" title="Ventas por sucursal" style={{ borderRadius: 14, height: '100%' }}>
                {(data?.branches ?? []).length === 0
                  ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin datos" style={{ padding: 40 }} />
                  : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data?.branches ?? []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={token.colorBorderSecondary} />
                        <XAxis dataKey="branchName" tick={{ fontSize: 11, fill: token.colorText }}
                          tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + '…' : v} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                        <ReTooltip content={<ChartTooltip />} />
                        <Bar dataKey="ventas" name="Ventas" fill={PRIMARY} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </Card>
            </Col>
            {/* Top productos pie */}
            <Col xs={24} lg={10}>
              <Card size="small" title="Top productos" style={{ borderRadius: 14, height: '100%' }}>
                {(data?.topProducts ?? []).length === 0
                  ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin datos" style={{ padding: 40 }} />
                  : (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={data?.topProducts ?? []} dataKey="ventaGravada" nameKey="productName"
                            cx="50%" cy="50%" innerRadius={50} outerRadius={78}>
                            {(data?.topProducts ?? []).map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <ReTooltip formatter={(v: any) => money(Number(v ?? 0))} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ marginTop: 8 }}>
                        {(data?.topProducts ?? []).slice(0, 5).map((p, i) => (
                          <div key={p.productName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Space size={6}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                              <Text style={{ fontSize: 11 }} ellipsis={{ tooltip: p.productName }}>
                                {p.productName.length > 22 ? p.productName.slice(0, 22) + '…' : p.productName}
                              </Text>
                            </Space>
                            <Text style={{ fontSize: 11, fontWeight: 600 }}>{money(p.ventaGravada)}</Text>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
              </Card>
            </Col>
          </Row>

          {/* Ranking table */}
          <Card size="small" title="Ranking de sucursales" style={{ borderRadius: 14 }}>
            {(data?.branches ?? []).map((b, i) => {
              const max = data?.branches?.[0]?.ventas ?? 1
              const pct = max > 0 ? (b.ventas / max) * 100 : 0
              return (
                <div key={b.branchId} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: i < 3 ? [`${PRIMARY}20`, `${SUCCESS}20`, `${WARNING}20`][i] : `${token.colorBorderSecondary}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                    color: i < 3 ? [PRIMARY, SUCCESS, WARNING][i] : token.colorTextSecondary,
                  }}>
                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 13 }}>{b.branchName}</Text>
                      <Space>
                        <Text style={{ fontSize: 13, fontWeight: 700, color: PRIMARY }}>{money(b.ventas)}</Text>
                        <Tag color="blue" style={{ fontSize: 10 }}>{b.countVentas} ventas</Tag>
                      </Space>
                    </div>
                    <Progress percent={parseFloat(pct.toFixed(1))} showInfo={false}
                      strokeColor={i < 3 ? [PRIMARY, SUCCESS, WARNING][i] : token.colorTextSecondary} size="small" />
                  </div>
                </div>
              )
            })}
            {(data?.branches ?? []).length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin ventas en el período" />}
          </Card>
        </div>
      ),
    },
    {
      key: 'gastos',
      label: 'Análisis de gastos',
      children: (
        <div>
          <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
            <Col xs={12} sm={6}>
              <KpiCard label="Total gastos período" value={data?.gastosPorCategoria.reduce((s, c) => s + c.total, 0) ?? 0}
                suffix="USD" icon={<WalletOutlined />} color={ERROR} loading={isLoading} />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard label="Categorías distintas" value={data?.gastosPorCategoria.length ?? 0}
                suffix="" icon={<BarChartOutlined />} color={WARNING} precision={0} loading={isLoading} />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard label="Mayor categoría" value={data?.gastosPorCategoria[0]?.total ?? 0}
                suffix="USD" icon={<FireOutlined />} color="#eb5757" loading={isLoading}
                extra={<div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 2 }}>{data?.gastosPorCategoria[0]?.nombre ?? '—'}</div>} />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard label="Transacciones" value={data?.gastosPorCategoria.reduce((s, c) => s + c.count, 0) ?? 0}
                suffix="" icon={<CheckCircleOutlined />} color={PRIMARY} precision={0} loading={isLoading} />
            </Col>
          </Row>

          <Row gutter={[14, 14]}>
            {/* Pie categorías */}
            <Col xs={24} md={10}>
              <Card size="small" title="Gastos por categoría" style={{ borderRadius: 14, height: '100%' }}>
                {(data?.gastosPorCategoria ?? []).length === 0
                  ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin gastos" style={{ padding: 40 }} />
                  : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={data?.gastosPorCategoria ?? []} dataKey="total" nameKey="nombre"
                            cx="50%" cy="50%" innerRadius={55} outerRadius={85}>
                            {(data?.gastosPorCategoria ?? []).map((c, i) => (
                              <Cell key={c.nombre} fill={c.color || PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <ReTooltip formatter={(v: any) => money(Number(v ?? 0))} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div>
                        {(data?.gastosPorCategoria ?? []).map((c, i) => (
                          <div key={c.nombre} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                            <Space size={6}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color || PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                              <span>{c.nombre}</span>
                              <Tag style={{ fontSize: 10 }}>{c.count} movs.</Tag>
                            </Space>
                            <Text strong style={{ fontSize: 12 }}>{money(c.total)}</Text>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
              </Card>
            </Col>
            {/* Area evolución gastos */}
            <Col xs={24} md={14}>
              <Card size="small" title="Evolución de gastos — últimos 6 meses" style={{ borderRadius: 14, height: '100%' }}>
                {(data?.gastosEvolucion ?? []).length === 0
                  ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin datos" style={{ padding: 40 }} />
                  : (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={data?.gastosEvolucion ?? []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={ERROR} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={ERROR} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                        <ReTooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="gastos" name="Gastos" stroke={ERROR} strokeWidth={2.5} fill="url(#gG)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'cuentas',
      label: 'Compras y cuentas',
      children: (
        <div>
          <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
            <Col xs={12} sm={6}>
              <KpiCard label="Total compras período" value={data?.comprasEvolucion.reduce((s, c) => s + c.total, 0) ?? 0}
                suffix="USD" icon={<InboxOutlined />} color={WARNING} loading={isLoading} />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard label="Órdenes de compra" value={data?.comprasEvolucion.reduce((s, c) => s + c.count, 0) ?? 0}
                suffix="" icon={<BarChartOutlined />} color={PRIMARY} precision={0} loading={isLoading} />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard label="CxP vencidas" value={data?.cxp.montoVencido ?? 0} suffix="USD"
                icon={<ExclamationCircleOutlined />} color={ERROR} loading={isLoading}
                extra={<div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 2 }}>{data?.cxp.countVencidas ?? 0} facturas</div>} />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard label="CxP por vencer (30d)" value={data?.cxp.montoPorVencer ?? 0} suffix="USD"
                icon={<CreditCardOutlined />} color={WARNING} loading={isLoading}
                extra={<div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 2 }}>{data?.cxp.countPorVencer ?? 0} facturas</div>} />
            </Col>
          </Row>

          <Row gutter={[14, 14]}>
            {/* Compras evolución stacked bar */}
            <Col xs={24} lg={15}>
              <Card size="small" title="Compras últimos 6 meses" style={{ borderRadius: 14, height: '100%' }}>
                {(data?.comprasEvolucion ?? []).length === 0
                  ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin datos" style={{ padding: 40 }} />
                  : (
                    <ResponsiveContainer width="100%" height={270}>
                      <BarChart data={data?.comprasEvolucion ?? []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={token.colorBorderSecondary} />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                        <ReTooltip content={<ChartTooltip />} />
                        <Bar dataKey="total" name="Compras" fill={WARNING} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </Card>
            </Col>
            {/* CxP pie */}
            <Col xs={24} lg={9}>
              <Card size="small" title="Estado cuentas por pagar" style={{ borderRadius: 14, height: '100%' }}>
                {(() => {
                  const cxp = data?.cxp
                  const cxpData = [
                    { name: 'Vencidas',    value: cxp?.montoVencido   ?? 0, fill: ERROR   },
                    { name: 'Por vencer',  value: cxp?.montoPorVencer ?? 0, fill: WARNING  },
                    { name: 'Vigentes',    value: cxp?.montoVigente   ?? 0, fill: SUCCESS  },
                  ].filter(d => d.value > 0)
                  return cxpData.length === 0
                    ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin deudas pendientes" style={{ padding: 40 }} />
                    : (
                      <>
                        <ResponsiveContainer width="100%" height={170}>
                          <PieChart>
                            <Pie data={cxpData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={78}>
                              {cxpData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <ReTooltip formatter={(v: any) => money(Number(v ?? 0))} />
                          </PieChart>
                        </ResponsiveContainer>
                        {cxpData.map(d => (
                          <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                            <Space size={6}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                              <span>{d.name}</span>
                            </Space>
                            <Text strong style={{ color: d.fill }}>{money(d.value)}</Text>
                          </div>
                        ))}
                      </>
                    )
                })()}
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'planilla',
      label: 'Planilla y nómina',
      children: (
        <div>
          <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
            <Col xs={12} sm={6}>
              <KpiCard label="Salario bruto (períodos)" value={data?.planillaTotals.totalBruto ?? 0}
                suffix="USD" icon={<DollarOutlined />} color={PRIMARY} loading={isLoading} />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard label="Salario neto (períodos)" value={data?.planillaTotals.totalNeto ?? 0}
                suffix="USD" icon={<CheckCircleOutlined />} color={SUCCESS} loading={isLoading} />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard label="Deducciones empleados" value={data?.planillaTotals.totalDeducciones ?? 0}
                suffix="USD" icon={<FallOutlined />} color={ERROR} loading={isLoading} />
            </Col>
            <Col xs={12} sm={6}>
              <KpiCard label="Costo patronal" value={data?.planillaTotals.totalPatronal ?? 0}
                suffix="USD" icon={<TeamOutlined />} color={INDIGO} loading={isLoading} />
            </Col>
          </Row>

          {/* Grouped bar planilla */}
          <Card size="small" title="Costo laboral por período" style={{ borderRadius: 14, marginBottom: 14 }}>
            {(data?.planillaEvolucion ?? []).length === 0
              ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin planillas registradas" style={{ padding: 40 }} />
              : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data?.planillaEvolucion ?? []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={token.colorBorderSecondary} />
                    <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                    <ReTooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="totalBruto"       name="Bruto"       fill={PRIMARY}  radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalNeto"        name="Neto"        fill={SUCCESS}  radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalDeducciones" name="Deducciones" fill={ERROR}    radius={[4, 4, 0, 0]} />
                    <Bar dataKey="costoPatronal"    name="Patronal"    fill={INDIGO}   radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </Card>

          {/* Tabla detalle planilla */}
          {(data?.planillaEvolucion ?? []).length > 0 && (
            <Card size="small" title="Detalle de planillas" style={{ borderRadius: 14 }}>
              <Table
                size="small" rowKey="periodo" pagination={false}
                dataSource={[...(data?.planillaEvolucion ?? [])]}
                scroll={{ x: 700 }}
                summary={() => {
                  const t = data?.planillaTotals
                  return (
                    <Table.Summary.Row style={{ background: `${PRIMARY}08`, fontWeight: 700 }}>
                      <Table.Summary.Cell index={0}>TOTAL</Table.Summary.Cell>
                      <Table.Summary.Cell index={1}><Text strong style={{ color: PRIMARY }}>{money(t?.totalBruto ?? 0)}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={2}><Text strong style={{ color: ERROR }}>{money(t?.totalDeducciones ?? 0)}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={3}><Text strong style={{ color: SUCCESS }}>{money(t?.totalNeto ?? 0)}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={4}><Text strong style={{ color: INDIGO }}>{money(t?.totalPatronal ?? 0)}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={5} />
                    </Table.Summary.Row>
                  )
                }}
                columns={[
                  { title: 'Período', dataIndex: 'periodo', key: 'periodo', width: 140 },
                  { title: 'Bruto', dataIndex: 'totalBruto', key: 'totalBruto', align: 'right' as const, render: (v: number) => <Text style={{ color: PRIMARY }}>{money(v)}</Text> },
                  { title: 'Deducciones', dataIndex: 'totalDeducciones', key: 'totalDeducciones', align: 'right' as const, render: (v: number) => <Text style={{ color: ERROR }}>{money(v)}</Text> },
                  { title: 'Neto', dataIndex: 'totalNeto', key: 'totalNeto', align: 'right' as const, render: (v: number) => <Text style={{ color: SUCCESS }}>{money(v)}</Text> },
                  { title: 'Patronal', dataIndex: 'costoPatronal', key: 'costoPatronal', align: 'right' as const, render: (v: number) => <Text style={{ color: INDIGO }}>{money(v)}</Text> },
                  {
                    title: 'Estado', dataIndex: 'estado', key: 'estado', width: 100,
                    render: (v: string) => {
                      const map: Record<string, string> = { PAID: 'success', APPROVED: 'blue', DRAFT: 'default' }
                      const label: Record<string, string> = { PAID: 'PAGADA', APPROVED: 'APROBADA', DRAFT: 'BORRADOR' }
                      return <Tag color={map[v] ?? 'default'}>{label[v] ?? v}</Tag>
                    },
                  },
                ]}
              />
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'reportes',
      label: 'Reportes',
      children: (
        <div>
          <Card size="small" style={{ borderRadius: 14, marginBottom: 14, border: `1px solid ${PRIMARY}20`, background: `${PRIMARY}05` }}
            styles={{ body: { padding: '14px 18px' } }}>
            <Space>
              <FileExcelOutlined style={{ color: PRIMARY, fontSize: 20 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Reportes del sistema</div>
                <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                  Descarga reportes Excel con los filtros de fecha y sucursal activos.
                  {from && <> Período: <b>{from}</b> al <b>{to}</b>.</>}
                </div>
              </div>
            </Space>
          </Card>
          <Row gutter={[14, 14]}>
            {REPORTS.map((r) => (
              <Col key={r.key} xs={24} sm={12} lg={8}>
                <Card size="small" style={{ borderRadius: 14, height: '100%', border: `1px solid ${r.color}20` }}
                  styles={{ body: { padding: '16px 18px' } }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${r.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: r.color, fontSize: 18 }}>{r.icon}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: token.colorTextSecondary, marginBottom: 8 }}>{r.desc}</div>
                      <Tag style={{ fontSize: 10 }}>{r.period ? 'Período seleccionado' : 'Estado actual'}</Tag>
                    </div>
                  </div>
                  <Button
                    size="small" block icon={<FileExcelOutlined />} style={{ marginTop: 12, borderRadius: 8 }}
                    loading={pending === r.key}
                    onClick={() => downloadReport(r.key)}
                  >
                    Descargar Excel
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ),
    },
  ]

  return (
    <Spin spinning={isLoading && !data}>
      <Tabs
        activeKey={activeTab}
        onChange={goTab}
        size="small"
        tabBarStyle={{ marginBottom: 20 }}
        items={tabItems.map(t => ({ key: t.key, label: t.label, children: <div>{t.children}</div> }))}
      />
    </Spin>
  )
}

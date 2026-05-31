'use client'
import { useMemo, useState } from 'react'
import {
  Card, Row, Col, Statistic, Typography, Table, Select, Empty, Alert, Tag, Space,
  DatePicker, Button, Tooltip, Divider, Progress,
} from 'antd'
import {
  ShoppingCartOutlined, DollarOutlined, WalletOutlined, ShopOutlined,
  WarningOutlined, RiseOutlined, FallOutlined, TeamOutlined, FileTextOutlined,
  FileExcelOutlined, ReloadOutlined, BankOutlined, UserOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { downloadXlsx } from '../../../lib/download-xlsx'
import { useAppContext } from '../../../hooks/use-app-context'
import { theme } from 'antd'
import dayjs from 'dayjs'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const money = (v: number) => `$${Number(v ?? 0).toFixed(2)}`
const pct   = (v: number | null) => v === null ? null : `${v > 0 ? '+' : ''}${v}%`

function VarTag({ v }: { v: number | null }) {
  if (v === null) return null
  const up = v >= 0
  return (
    <Tag
      icon={up ? <RiseOutlined /> : <FallOutlined />}
      color={up ? 'success' : 'error'}
      style={{ borderRadius: 6, fontWeight: 600, marginLeft: 4 }}
    >
      {pct(v)}
    </Tag>
  )
}

type Extended = {
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
  cxp: {
    montoVencido: number; montoVigente: number; montoPorVencer: number
    countVencidas: number; countVigentes: number; countPorVencer: number
  }
  planillaTotals: { totalBruto: number; totalNeto: number; totalDeducciones: number; totalPatronal: number }
}

export default function PanelCentralPage() {
  const { companyId } = useAppContext()
  const { token } = theme.useToken()

  const now = dayjs()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    now.startOf('month'), now.endOf('month'),
  ])
  const [branchFilter, setBranchFilter] = useState<string>('all')

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me').then(r => r.data),
    staleTime: 5 * 60_000,
  })
  const canViewAll = me?.role?.permissions?.['branches.view_all'] === true

  const { data, isLoading, error, refetch } = useQuery<Extended>({
    queryKey: ['dashboard-extended', companyId, dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD'), branchFilter],
    queryFn: () =>
      api.get('/api/dashboard/extended', {
        params: {
          companyId,
          from: dateRange[0].format('YYYY-MM-DD'),
          to: dateRange[1].format('YYYY-MM-DD'),
          branchId: branchFilter !== 'all' ? branchFilter : undefined,
        },
      }).then(r => r.data),
    enabled: !!companyId && canViewAll,
  })

  const p = data?.panel
  const evolucion = data?.evolucion ?? []
  const gastosCat = data?.gastosPorCategoria ?? []
  const cxp = data?.cxp
  const planilla = data?.planillaTotals

  const branchOptions = useMemo(() => [
    { value: 'all', label: 'Todas las sucursales' },
    ...(data?.branches ?? []).map(b => ({ value: b.branchId, label: b.branchName })),
  ], [data?.branches])

  const topProductsData = (data?.topProducts ?? []).map(p => ({
    name: p.productName.length > 18 ? p.productName.slice(0, 18) + '…' : p.productName,
    gravado: p.ventaGravada,
  }))

  const date = new Date().toISOString().slice(0, 10)

  if (me && !canViewAll) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Acceso restringido"
        description="El panel central consolidado está disponible solo para el dueño."
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Panel central</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>Consolidado de todas las sucursales</Text>
        </div>
        <Space wrap>
          <Select
            value={branchFilter}
            style={{ minWidth: 200 }}
            onChange={setBranchFilter}
            options={branchOptions}
          />
          <RangePicker
            value={dateRange}
            onChange={v => v && setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
            format="DD/MM/YY"
            allowClear={false}
          />
          <Tooltip title="Recargar">
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
          </Tooltip>
        </Space>
      </div>

      {error ? (
        <Alert type="error" showIcon message="No se pudo cargar el panel central" />
      ) : (
        <>
          {/* KPIs fila 1: financieros */}
          <Row gutter={[14, 14]}>
            {[
              {
                title: 'Ventas', value: money(p?.ventas ?? 0),
                icon: <ShoppingCartOutlined />, color: token.colorPrimary,
                sub: <VarTag v={p?.varVentas ?? null} />,
              },
              {
                title: 'Gastos', value: money(p?.gastos ?? 0),
                icon: <WalletOutlined />, color: token.colorWarning,
                sub: <VarTag v={p?.varGastos ?? null} />,
              },
              {
                title: 'Neto', value: money(p?.neto ?? 0),
                icon: <RiseOutlined />, color: (p?.neto ?? 0) >= 0 ? token.colorSuccess : token.colorError,
                sub: <VarTag v={p?.varNeto ?? null} />,
              },
              {
                title: 'Margen %', value: `${p?.margenPct ?? 0}%`,
                icon: <DollarOutlined />, color: token.colorInfo,
                sub: null,
              },
            ].map(k => (
              <Col xs={12} sm={12} lg={6} key={k.title}>
                <Card size="small" style={{ borderRadius: 10, borderTop: `3px solid ${k.color}` }}>
                  <Statistic
                    title={<Text style={{ fontSize: 12, color: token.colorTextSecondary }}>{k.title}</Text>}
                    value={k.value}
                    prefix={<span style={{ color: k.color }}>{k.icon}</span>}
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: k.color }}
                    loading={isLoading}
                  />
                  {k.sub}
                </Card>
              </Col>
            ))}
          </Row>

          {/* KPIs fila 2: operacionales */}
          <Row gutter={[14, 14]} style={{ marginTop: 12 }}>
            {[
              { title: 'N° ventas',        value: p?.countVentas ?? 0,       icon: <FileTextOutlined />, color: token.colorPrimary },
              { title: 'DTE aceptados',    value: `${p?.dteAceptados ?? 0} / ${p?.dteTotales ?? 0}`, icon: <FileTextOutlined />, color: token.colorSuccess, badge: `${p?.tasaDte ?? 0}%` },
              { title: 'Clientes nuevos',  value: p?.clientesNuevos ?? 0,    icon: <UserOutlined />,    color: token.colorInfo },
              { title: 'Empleados activos',value: p?.empleadosActivos ?? 0,  icon: <TeamOutlined />,    color: token.colorInfo },
              { title: 'Bajo mínimo',      value: p?.itemsBajoMinimo ?? 0,   icon: <WarningOutlined />, color: (p?.itemsBajoMinimo ?? 0) > 0 ? token.colorWarning : token.colorTextQuaternary },
              { title: 'Sucursales',       value: p?.totalSucursales ?? 0,   icon: <ShopOutlined />,    color: token.colorInfo },
            ].map(k => (
              <Col xs={12} sm={8} lg={4} key={k.title}>
                <Card size="small" style={{ borderRadius: 10 }}>
                  <Statistic
                    title={<Text style={{ fontSize: 11, color: token.colorTextSecondary }}>{k.title}</Text>}
                    value={k.value}
                    prefix={<span style={{ color: k.color, fontSize: 12 }}>{k.icon}</span>}
                    valueStyle={{ fontSize: 16, fontWeight: 700 }}
                    loading={isLoading}
                  />
                  {(k as any).badge && (
                    <Tag color="success" style={{ marginTop: 2 }}>{(k as any).badge} aceptación</Tag>
                  )}
                </Card>
              </Col>
            ))}
          </Row>

          {/* Gráficas fila 1: Evolución + Gastos por categoría */}
          <Row gutter={[14, 14]} style={{ marginTop: 14 }}>
            <Col xs={24} lg={15}>
              <Card size="small" title="Evolución ventas vs gastos (6 meses)" style={{ borderRadius: 10 }}>
                {evolucion.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={evolucion} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={token.colorPrimary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={token.colorPrimary} stopOpacity={0.03} />
                        </linearGradient>
                        <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={token.colorWarning} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={token.colorWarning} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                      <RTooltip formatter={(v, name) => [money(Number(v)), name === 'ventas' ? 'Ventas' : name === 'gastos' ? 'Gastos' : 'Neto']} />
                      <Legend formatter={v => v === 'ventas' ? 'Ventas' : v === 'gastos' ? 'Gastos' : 'Neto'} />
                      <Area type="monotone" dataKey="ventas" stroke={token.colorPrimary} fill="url(#gVentas)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="gastos" stroke={token.colorWarning} fill="url(#gGastos)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={9}>
              <Card size="small" title="Gastos por categoría" style={{ borderRadius: 10, height: '100%' }}>
                {gastosCat.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={gastosCat}
                          dataKey="total"
                          nameKey="nombre"
                          cx="50%"
                          cy="50%"
                          outerRadius={65}
                          innerRadius={35}
                        >
                          {gastosCat.map((entry, i) => (
                            <Cell key={i} fill={entry.color ?? `hsl(${i * 47}, 65%, 55%)`} />
                          ))}
                        </Pie>
                        <RTooltip formatter={(v, name) => [money(Number(v)), String(name)]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop: 4 }}>
                      {gastosCat.slice(0, 5).map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Space size={4}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color ?? `hsl(${i * 47}, 65%, 55%)` }} />
                            <Text style={{ fontSize: 11 }}>{c.nombre}</Text>
                          </Space>
                          <Text style={{ fontSize: 11, fontWeight: 600 }}>{money(c.total)}</Text>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </Col>
          </Row>

          {/* Gráficas fila 2: Top productos + CxP */}
          <Row gutter={[14, 14]} style={{ marginTop: 14 }}>
            <Col xs={24} lg={14}>
              <Card size="small" title="Top productos por venta" style={{ borderRadius: 10 }}>
                {topProductsData.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topProductsData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                      <RTooltip formatter={(v) => [money(Number(v)), 'Venta gravada']} />
                      <Bar dataKey="gravado" fill={token.colorPrimary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card size="small" title="Cuentas por pagar" style={{ borderRadius: 10 }}>
                {!cxp ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    {[
                      { label: 'Vencidas',    monto: cxp.montoVencido,   count: cxp.countVencidas,  color: token.colorError },
                      { label: 'Vigentes',    monto: cxp.montoVigente,   count: cxp.countVigentes,  color: token.colorWarning },
                      { label: 'Por vencer',  monto: cxp.montoPorVencer, count: cxp.countPorVencer, color: token.colorInfo },
                    ].map(row => (
                      <div key={row.label} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <Space size={4}>
                            <BankOutlined style={{ color: row.color }} />
                            <Text style={{ fontSize: 12 }}>{row.label}</Text>
                            <Tag style={{ fontSize: 10 }}>{row.count}</Tag>
                          </Space>
                          <Text strong style={{ color: row.color }}>{money(row.monto)}</Text>
                        </div>
                        <Progress
                          percent={cxp.montoVencido + cxp.montoVigente + cxp.montoPorVencer > 0
                            ? Math.round(row.monto / (cxp.montoVencido + cxp.montoVigente + cxp.montoPorVencer) * 100)
                            : 0}
                          showInfo={false}
                          strokeColor={row.color}
                          size="small"
                        />
                      </div>
                    ))}
                    {planilla && (
                      <>
                        <Divider style={{ margin: '8px 0' }} />
                        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Planilla (últimos 12 períodos)</Text>
                        <Row gutter={8} style={{ marginTop: 6 }}>
                          <Col span={12}>
                            <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>Bruto total</Text>
                            <div><Text strong style={{ fontSize: 13 }}>{money(planilla.totalBruto)}</Text></div>
                          </Col>
                          <Col span={12}>
                            <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>Neto total</Text>
                            <div><Text strong style={{ fontSize: 13 }}>{money(planilla.totalNeto)}</Text></div>
                          </Col>
                        </Row>
                      </>
                    )}
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Sucursales ranking */}
          <Card size="small" title="Ranking de sucursales" style={{ borderRadius: 10, marginTop: 14 }}>
            <Table
              size="small"
              rowKey="branchId"
              loading={isLoading}
              dataSource={data?.branches ?? []}
              pagination={false}
              columns={[
                { title: '#', key: 'idx', width: 36, render: (_: any, __: any, i: number) => <Text type="secondary">{i + 1}</Text> },
                { title: 'Sucursal', dataIndex: 'branchName', key: 'branchName' },
                {
                  title: 'Ventas', dataIndex: 'ventas', key: 'ventas',
                  sorter: (a: any, b: any) => a.ventas - b.ventas,
                  render: (v: number) => <b style={{ color: token.colorPrimary }}>{money(v)}</b>,
                },
                { title: 'N° ventas', dataIndex: 'countVentas', key: 'countVentas', width: 90 },
              ]}
            />
          </Card>

          {/* Exportar reportes */}
          <Card
            size="small"
            title="Exportar reportes"
            style={{ borderRadius: 10, marginTop: 14 }}
            extra={<Text type="secondary" style={{ fontSize: 11 }}>Aplica el rango de fechas seleccionado</Text>}
          >
            <Space wrap>
              <Button
                icon={<FileExcelOutlined />}
                style={{ color: '#217346', borderColor: '#217346' }}
                onClick={() => downloadXlsx('/api/reports/sales', `reporte_ventas_${date}.xlsx`, {
                  companyId,
                  from: dateRange[0].format('YYYY-MM-DD'),
                  to: dateRange[1].format('YYYY-MM-DD'),
                  branchId: branchFilter !== 'all' ? branchFilter : undefined,
                })}
              >
                Ventas
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                style={{ color: '#217346', borderColor: '#217346' }}
                onClick={() => downloadXlsx('/api/reports/expenses', `reporte_gastos_${date}.xlsx`, {
                  companyId,
                  from: dateRange[0].format('YYYY-MM-DD'),
                  to: dateRange[1].format('YYYY-MM-DD'),
                  branchId: branchFilter !== 'all' ? branchFilter : undefined,
                })}
              >
                Gastos
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                style={{ color: '#217346', borderColor: '#217346' }}
                onClick={() => downloadXlsx('/api/reports/inventory', `reporte_inventario_${date}.xlsx`, {
                  companyId,
                  branchId: branchFilter !== 'all' ? branchFilter : undefined,
                })}
              >
                Inventario
              </Button>
            </Space>
          </Card>
        </>
      )}
    </div>
  )
}

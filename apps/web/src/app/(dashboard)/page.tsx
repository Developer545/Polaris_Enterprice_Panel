'use client'
import { Card, Row, Col, Statistic, Typography, Table, Tag, Spin, Alert, Space, Empty } from 'antd'
import {
  ShoppingCartOutlined, DollarOutlined, TeamOutlined, WalletOutlined,
  UnlockOutlined, LockOutlined, BarChartOutlined, WarningOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAppContext } from '../../hooks/use-app-context'
import { theme } from 'antd'
import dayjs from 'dayjs'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const MOCK_CHART: { day: string; total: number }[] = Array.from({ length: 7 }, (_, i) => ({
  day: dayjs().subtract(6 - i, 'day').format('DD/MM'),
  total: 0,
}))

const DTE_STATUS: Record<string, { color: string; label: string }> = {
  ACCEPTED:    { color: 'green',   label: 'Aceptado' },
  REJECTED:    { color: 'red',     label: 'Rechazado' },
  PENDING:     { color: 'blue',    label: 'Pendiente' },
  QUEUED:      { color: 'blue',    label: 'Pendiente' },
  CONTINGENCY: { color: 'orange',  label: 'Contingencia' },
  NO_DTE:      { color: 'default', label: 'Sin DTE' },
}

const DTE_PIE_COLORS: Record<string, string> = {
  ACCEPTED:    '#52c41a',
  PENDING:     '#1677ff',
  QUEUED:      '#1677ff',
  REJECTED:    '#ff4d4f',
  CONTINGENCY: '#fa8c16',
  NO_DTE:      '#8c8c8c',
}

export default function DashboardPage() {
  const { companyId, branchId } = useAppContext()
  const { token } = theme.useToken()

  const { data: openRegister } = useQuery({
    queryKey: ['open-register', branchId],
    queryFn: () => api.get(`/api/cash-registers/open/${branchId}`).then(r => r.data).catch(() => null),
    enabled: !!branchId,
    refetchInterval: 5 * 60_000,
  })

  const { data: statsToday, isLoading: loadingToday } = useQuery({
    queryKey: ['pos-stats', companyId, 'today'],
    queryFn: () =>
      api.get('/api/pos/stats', { params: { companyId, period: 'today' } })
        .then(r => r.data)
        .catch(() => null),
    enabled: !!companyId,
  })

  const { data: statsMonth, isLoading: loadingMonth } = useQuery({
    queryKey: ['pos-stats', companyId, 'month'],
    queryFn: () =>
      api.get('/api/pos/stats', { params: { companyId, period: 'month' } })
        .then(r => r.data)
        .catch(() => null),
    enabled: !!companyId,
  })

  const { data: recentSales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['recent-sales', companyId],
    queryFn: () =>
      api.get('/api/pos/sales', { params: { companyId, page: 1 } })
        .then(r => r.data?.sales ?? [])
        .catch(() => []),
    enabled: !!companyId,
  })

  const chartData: { day: string; total: number }[] =
    statsMonth?.last7Days ?? MOCK_CHART

  const last6Months: { month: string; total: number }[] =
    statsMonth?.last6Months ?? []

  const topProducts: { name: string; total: number }[] =
    statsMonth?.topProducts ?? []

  const expensesByCategory: { name: string; color: string; total: number }[] =
    statsMonth?.expensesByCategory ?? []

  const dteStatus: Record<string, number> =
    statsMonth?.dteStatus ?? {}

  const lowStock: { count: number; items: { productName: string; stock: number; minStock: number }[] } =
    statsMonth?.lowStock ?? { count: 0, items: [] }

  const ticketPromedio = statsMonth?.countSales > 0
    ? statsMonth.totalSales / statsMonth.countSales
    : 0

  // Build DTE donut data — merge PENDING+QUEUED
  const dteDonutData = [
    { name: 'Aceptado',     value: (dteStatus.ACCEPTED ?? 0),    color: DTE_PIE_COLORS.ACCEPTED },
    { name: 'Pendiente',    value: (dteStatus.PENDING ?? 0) + (dteStatus.QUEUED ?? 0), color: DTE_PIE_COLORS.PENDING },
    { name: 'Rechazado',    value: (dteStatus.REJECTED ?? 0),    color: DTE_PIE_COLORS.REJECTED },
    { name: 'Contingencia', value: (dteStatus.CONTINGENCY ?? 0), color: DTE_PIE_COLORS.CONTINGENCY },
    { name: 'Sin DTE',      value: (dteStatus.NO_DTE ?? 0),      color: DTE_PIE_COLORS.NO_DTE },
  ].filter(d => d.value > 0)

  const saleColumns = [
    {
      title: 'N° DTE', key: 'dte',
      render: (r: any) => r.dteDocument?.codigoGeneracion
        ? <code style={{ fontSize: 11 }}>{r.dteDocument.codigoGeneracion.substring(0, 8)}…</code>
        : <span style={{ color: token.colorTextSecondary, fontSize: 11 }}>{r.id?.substring(0, 8)}</span>,
    },
    {
      title: 'Fecha', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => dayjs(v).format('DD/MM/YY HH:mm'),
    },
    { title: 'Cliente', key: 'client', render: (r: any) => r.client?.name ?? 'Consumidor final' },
    {
      title: 'Total', dataIndex: 'totalPagar', key: 'totalPagar',
      render: (v: number) => `$${Number(v ?? 0).toFixed(2)}`,
    },
    {
      title: 'DTE', key: 'estadoDte',
      render: (r: any) => {
        const status = r.dteDocument?.status
        if (!status) return <Tag color="default">Sin DTE</Tag>
        const s = DTE_STATUS[status] ?? { color: 'default', label: status }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
  ]

  const lowStockColumns = [
    { title: 'Producto', dataIndex: 'productName', key: 'productName' },
    {
      title: 'Stock actual', dataIndex: 'stock', key: 'stock',
      render: (v: number) => <span style={{ color: token.colorError, fontWeight: 600 }}>{v}</span>,
    },
    { title: 'Stock mínimo', dataIndex: 'minStock', key: 'minStock' },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>Dashboard</Typography.Title>

      {/* Estado de caja */}
      {branchId && (
        <div style={{ marginBottom: 16 }}>
          {openRegister ? (
            <Alert
              type="success"
              showIcon
              message={
                <Space size={6}>
                  <UnlockOutlined style={{ color: token.colorPrimary }} />
                  <b style={{ color: token.colorPrimary }}>Caja abierta</b>
                  <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                    — {openRegister.openedBy?.name} · desde {
                      new Date(openRegister.openedAt).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })
                    }
                  </span>
                </Space>
              }
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              message={
                <Space size={6}>
                  <LockOutlined />
                  <b>Sin caja abierta</b>
                  <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>— No se pueden registrar ventas</span>
                </Space>
              }
            />
          )}
        </div>
      )}

      {/* Row 1: 5 KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={Math.floor(24 / 5) as any} style={{ flex: '0 0 20%', maxWidth: '20%' }}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic
              title="Ventas hoy"
              value={statsToday?.totalSales ?? 0}
              precision={2}
              prefix={<ShoppingCartOutlined style={{ color: token.colorPrimary }} />}
              suffix="USD"
              valueStyle={{ color: token.colorPrimary }}
              loading={loadingToday}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={Math.floor(24 / 5) as any} style={{ flex: '0 0 20%', maxWidth: '20%' }}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic
              title="Ventas del mes"
              value={statsMonth?.totalSales ?? 0}
              precision={2}
              prefix={<DollarOutlined style={{ color: token.colorInfo }} />}
              suffix="USD"
              valueStyle={{ color: token.colorInfo }}
              loading={loadingMonth}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={Math.floor(24 / 5) as any} style={{ flex: '0 0 20%', maxWidth: '20%' }}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic
              title="Clientes activos"
              value={statsMonth?.activeClients ?? 0}
              prefix={<TeamOutlined style={{ color: token.colorSuccess }} />}
              valueStyle={{ color: token.colorSuccess }}
              loading={loadingMonth}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={Math.floor(24 / 5) as any} style={{ flex: '0 0 20%', maxWidth: '20%' }}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic
              title="Gastos del mes"
              value={statsMonth?.totalExpenses ?? 0}
              precision={2}
              prefix={<WalletOutlined style={{ color: token.colorWarning }} />}
              suffix="USD"
              valueStyle={{ color: token.colorWarning }}
              loading={loadingMonth}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={Math.floor(24 / 5) as any} style={{ flex: '0 0 20%', maxWidth: '20%' }}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic
              title="Ticket promedio"
              value={ticketPromedio}
              precision={2}
              prefix={<BarChartOutlined style={{ color: token.colorTextSecondary }} />}
              suffix="USD"
              valueStyle={{ color: token.colorTextSecondary }}
              loading={loadingMonth}
            />
          </Card>
        </Col>
      </Row>

      {/* Row 2: Área chart 6 meses + Donut DTE status */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={15}>
          <Card size="small" title="Ventas últimos 6 meses" style={{ borderRadius: 10 }}>
            {last6Months.length === 0 ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="Sin datos" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={last6Months} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={token.colorPrimary} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={token.colorPrimary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Ventas']} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={token.colorPrimary}
                    strokeWidth={2}
                    fill="url(#colorVentas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card size="small" title="Estado DTE del mes" style={{ borderRadius: 10 }}>
            {dteDonutData.length === 0 ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="Sin ventas DTE" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={dteDonutData}
                    cx="40%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dteDonutData.map((entry, index) => (
                      <Cell key={`dte-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
                  />
                  <Tooltip formatter={(v, name) => [v, name]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 3: Top 5 productos + Gastos por categoría */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card size="small" title="Top 5 productos del mes" style={{ borderRadius: 10 }}>
            {topProducts.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="Sin datos" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  layout="vertical"
                  data={topProducts}
                  margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={110}
                    tickFormatter={(v: string) => v.length > 14 ? `${v.substring(0, 14)}…` : v}
                  />
                  <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Ingresos']} />
                  <Bar dataKey="total" fill={token.colorPrimary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="Gastos por categoría" style={{ borderRadius: 10 }}>
            {expensesByCategory.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="Sin gastos este mes" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="40%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="name"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`exp-${index}`} fill={entry.color ?? token.colorPrimary} />
                    ))}
                  </Pie>
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                  />
                  <Tooltip formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 4: Stock bajo (si count > 0) + Últimas ventas DTE */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {lowStock.count > 0 && (
          <Col xs={24} lg={10}>
            <Card
              size="small"
              title={
                <Space>
                  <WarningOutlined style={{ color: token.colorWarning }} />
                  <span>Stock bajo ({lowStock.count})</span>
                </Space>
              }
              style={{ borderRadius: 10, borderColor: token.colorWarningBorder }}
            >
              <Table
                size="small"
                columns={lowStockColumns}
                dataSource={lowStock.items}
                rowKey="productName"
                pagination={false}
                style={{ fontSize: 12 }}
              />
            </Card>
          </Col>
        )}
        <Col xs={24} lg={lowStock.count > 0 ? 14 : 24}>
          <Card size="small" title="Últimas ventas DTE" style={{ borderRadius: 10 }}>
            {loadingSales ? (
              <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
            ) : (
              <Table
                size="small"
                columns={saleColumns}
                dataSource={recentSales.slice(0, 10)}
                rowKey="id"
                pagination={false}
                style={{ fontSize: 12 }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

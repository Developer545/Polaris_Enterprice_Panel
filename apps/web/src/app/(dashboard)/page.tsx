'use client'
import { Card, Row, Col, Statistic, Typography, Table, Tag, Spin, Alert, Space } from 'antd'
import {
  ShoppingCartOutlined, DollarOutlined, TeamOutlined, WalletOutlined,
  UnlockOutlined, LockOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAppContext } from '../../hooks/use-app-context'
import { theme } from 'antd'
import dayjs from 'dayjs'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const MOCK_CHART: { day: string; total: number }[] = Array.from({ length: 7 }, (_, i) => ({
  day: dayjs().subtract(6 - i, 'day').format('DD/MM'),
  total: 0,
}))

const DTE_STATUS: Record<string, { color: string; label: string }> = {
  ACCEPTED: { color: 'green',  label: 'Aceptado' },
  REJECTED: { color: 'red',    label: 'Rechazado' },
  PENDING:  { color: 'blue',   label: 'Pendiente' },
  CONTINGENCY: { color: 'orange', label: 'Contingencia' },
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

  const saleColumns = [
    {
      title: 'N° DTE', key: 'dte',
      render: (r: any) => r.codigoGeneracion
        ? <code style={{ fontSize: 11 }}>{r.codigoGeneracion.substring(0, 8)}…</code>
        : r.id?.substring(0, 8),
    },
    {
      title: 'Fecha', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    { title: 'Cliente', key: 'client', render: (r: any) => r.client?.name ?? 'Consumidor final' },
    {
      title: 'Total', dataIndex: 'total', key: 'total',
      render: (v: number) => `$${Number(v ?? 0).toFixed(2)}`,
    },
    {
      title: 'Estado DTE', dataIndex: 'estadoDte', key: 'estadoDte',
      render: (v: string) => {
        if (!v) return <Tag color="default">Sin DTE</Tag>
        const s = DTE_STATUS[v] ?? { color: 'default', label: v }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
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

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
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
        <Col xs={24} sm={12} lg={6}>
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
        <Col xs={24} sm={12} lg={6}>
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
        <Col xs={24} sm={12} lg={6}>
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
      </Row>

      {/* Chart */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card size="small" title="Ventas últimos 7 días" style={{ borderRadius: 10 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Ventas']} />
                <Bar dataKey="total" fill={token.colorPrimary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Recent DTE */}
        <Col xs={24} lg={10}>
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

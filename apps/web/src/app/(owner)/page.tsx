'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Row, Col, Card, Statistic, Table, Typography, Tag, Empty, Spin, Space, Button, Alert,
} from 'antd'
import {
  ShoppingCartOutlined, DollarOutlined, WalletOutlined, ShopOutlined,
  WarningOutlined, RiseOutlined, FallOutlined, FileExcelOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { theme } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import { api } from '../../lib/api'
import { downloadXlsx } from '../../lib/download-xlsx'
import { OWNER_PERIOD_KEY, OWNER_BRANCH_KEY } from './layout'

const { Title, Text } = Typography
const money = (v: number) => `$${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type BranchRow = {
  branchId: string; branchName: string
  ventas: number; countVentas: number
  gastos: number; neto: number
  cajasAbiertas: number; itemsBajoMinimo: number
}
type Consolidated = {
  period: string
  totals: { ventas: number; countVentas: number; gastos: number; neto: number; cajasAbiertas: number; itemsBajoMinimo: number; totalSucursales: number }
  branches: BranchRow[]
  topProducts: { productName: string; cantidad: number; ventaGravada: number }[]
}

// ── KPI Card helper ────────────────────────────────────────────────────────────
function KpiCard({ title, value, prefix, color, suffix = 'USD', loading }: {
  title: string; value: number; prefix: React.ReactNode; color: string; suffix?: string; loading?: boolean
}) {
  return (
    <Card size="small" style={{ borderRadius: 12, height: '100%' }}>
      <Statistic
        title={<span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>}
        value={value}
        precision={suffix === 'USD' ? 2 : 0}
        prefix={<span style={{ color }}>{prefix}</span>}
        suffix={<span style={{ fontSize: 12, color: '#8c8c8c' }}>{suffix}</span>}
        valueStyle={{ color, fontWeight: 700, fontSize: 22 }}
        loading={loading}
      />
    </Card>
  )
}

export default function OwnerDashboard() {
  const { token } = theme.useToken()
  const [companyId, setCompanyId] = useState('')
  const [period,    setPeriod]    = useState<'today' | 'month'>('today')
  const [branch,    setBranch]    = useState<string>('all')
  const [xlsxLoading, setXlsxLoading] = useState(false)

  // Leer filtros iniciales desde localStorage (set por layout)
  useEffect(() => {
    setCompanyId(localStorage.getItem('companyId') ?? '')
    setPeriod((localStorage.getItem(OWNER_PERIOD_KEY) ?? 'today') as 'today' | 'month')
    setBranch(localStorage.getItem(OWNER_BRANCH_KEY) ?? 'all')
  }, [])

  // Escuchar cambios del layout (selects del top bar)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.period)       setPeriod(detail.period as 'today' | 'month')
      if (detail.branchFilter) setBranch(detail.branchFilter)
    }
    window.addEventListener('owner-filter-change', handler)
    return () => window.removeEventListener('owner-filter-change', handler)
  }, [])

  const { data, isLoading, error } = useQuery<Consolidated>({
    queryKey: ['dashboard-consolidated', companyId, period],
    queryFn: () =>
      api.get('/api/dashboard/consolidated', { params: { companyId, period } }).then(r => r.data),
    enabled: !!companyId,
    staleTime: 60_000,
  })

  const branches = data?.branches ?? []

  const visibleBranches = useMemo(
    () => (branch === 'all' ? branches : branches.filter(b => b.branchId === branch)),
    [branches, branch],
  )

  const totals = useMemo(() => {
    if (branch === 'all') return data?.totals
    const b = branches.find(x => x.branchId === branch)
    if (!b) return data?.totals
    return { ventas: b.ventas, countVentas: b.countVentas, gastos: b.gastos, neto: b.neto, cajasAbiertas: b.cajasAbiertas, itemsBajoMinimo: b.itemsBajoMinimo, totalSucursales: 1 }
  }, [data, branches, branch])

  async function exportExcel() {
    setXlsxLoading(true)
    try {
      const branchId = branch !== 'all' ? branch : undefined
      await downloadXlsx('/api/reports/sales', `ventas-${period}-${Date.now()}.xlsx`, { companyId, period, branchId })
    } finally {
      setXlsxLoading(false)
    }
  }

  if (error) return <Alert type="error" showIcon message="No se pudo cargar el panel de propietario" />

  const chartData = visibleBranches.map(b => ({
    name: b.branchName.length > 12 ? b.branchName.slice(0, 12) + '…' : b.branchName,
    ventas: b.ventas,
    gastos: b.gastos,
  }))

  const periodLabel = period === 'today' ? 'hoy' : 'este mes'

  const columns = [
    {
      title: 'Sucursal', dataIndex: 'branchName', key: 'branchName',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Ventas', dataIndex: 'ventas', key: 'ventas',
      sorter: (a: BranchRow, b: BranchRow) => a.ventas - b.ventas,
      render: (v: number) => <Text strong style={{ color: token.colorPrimary }}>{money(v)}</Text>,
      defaultSortOrder: 'descend' as const,
    },
    { title: 'N° ventas', dataIndex: 'countVentas', key: 'countVentas', align: 'center' as const },
    { title: 'Gastos',    dataIndex: 'gastos',       key: 'gastos',      render: (v: number) => money(v) },
    {
      title: 'Neto', dataIndex: 'neto', key: 'neto',
      render: (v: number) => (
        <Space>
          {v >= 0 ? <RiseOutlined style={{ color: token.colorSuccess }} /> : <FallOutlined style={{ color: token.colorError }} />}
          <Text style={{ color: v >= 0 ? token.colorSuccess : token.colorError, fontWeight: 600 }}>{money(v)}</Text>
        </Space>
      ),
    },
    {
      title: 'Cajas', dataIndex: 'cajasAbiertas', key: 'cajasAbiertas', align: 'center' as const,
      render: (v: number) => v > 0 ? <Tag color="green">{v} abiertas</Tag> : <Tag>Cerradas</Tag>,
    },
    {
      title: 'Bajo mínimo', dataIndex: 'itemsBajoMinimo', key: 'itemsBajoMinimo', align: 'center' as const,
      render: (v: number) => v > 0 ? <Tag color="orange" icon={<WarningOutlined />}>{v} items</Tag> : <Tag color="default">OK</Tag>,
    },
  ]

  return (
    <Spin spinning={isLoading}>
      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Resumen {periodLabel}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {branch === 'all'
              ? `${totals?.totalSucursales ?? 0} sucursales activas`
              : `Sucursal seleccionada`}
          </Text>
        </div>
        <Button
          icon={<FileExcelOutlined />}
          loading={xlsxLoading}
          onClick={exportExcel}
          style={{ borderRadius: 8 }}
        >
          Exportar Excel
        </Button>
      </div>

      {/* ── KPIs principales ───────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <KpiCard title="Ventas totales" value={totals?.ventas ?? 0}
            prefix={<ShoppingCartOutlined />} color={token.colorPrimary} loading={isLoading} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <KpiCard title="N° de ventas" value={totals?.countVentas ?? 0}
            prefix={<DollarOutlined />} color={token.colorInfo} suffix="" loading={isLoading} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <KpiCard title="Gastos" value={totals?.gastos ?? 0}
            prefix={<WalletOutlined />} color={token.colorWarning} loading={isLoading} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <KpiCard title="Neto" value={totals?.neto ?? 0}
            prefix={(totals?.neto ?? 0) >= 0 ? <RiseOutlined /> : <FallOutlined />}
            color={(totals?.neto ?? 0) >= 0 ? token.colorSuccess : token.colorError}
            loading={isLoading} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <KpiCard title="Sucursales" value={totals?.totalSucursales ?? 0}
            prefix={<ShopOutlined />} color={token.colorInfo} suffix="" loading={isLoading} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <KpiCard title="Bajo mínimo" value={totals?.itemsBajoMinimo ?? 0}
            prefix={<WarningOutlined />}
            color={(totals?.itemsBajoMinimo ?? 0) > 0 ? token.colorWarning : token.colorSuccess}
            suffix="items" loading={isLoading} />
        </Col>
      </Row>

      {/* ── Gráficas ───────────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Barras: ventas vs gastos por sucursal */}
        <Col xs={24} lg={15}>
          <Card size="small" title="Ventas y gastos por sucursal" style={{ borderRadius: 12 }}>
            {chartData.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin datos en este período" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <RechartTooltip formatter={(v, name) => [money(Number(v)), name === 'ventas' ? 'Ventas' : 'Gastos']} />
                  <Legend formatter={(v) => v === 'ventas' ? 'Ventas' : 'Gastos'} />
                  <Bar dataKey="ventas" fill={token.colorPrimary}  radius={[4,4,0,0]} />
                  <Bar dataKey="gastos" fill={token.colorWarning}   radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Top productos */}
        <Col xs={24} lg={9}>
          <Card size="small" title="Top 10 productos" style={{ borderRadius: 12, height: '100%' }}>
            <Table
              size="small"
              rowKey="productName"
              pagination={false}
              loading={isLoading}
              scroll={{ y: 240 }}
              dataSource={data?.topProducts ?? []}
              columns={[
                { title: 'Producto',  dataIndex: 'productName', key: 'productName', ellipsis: true },
                { title: 'Cant.',     dataIndex: 'cantidad',    key: 'cantidad',    width: 55, align: 'center' as const, render: (v: number) => Number(v).toFixed(0) },
                { title: 'Gravado',   dataIndex: 'ventaGravada', key: 'ventaGravada', width: 80, render: (v: number) => money(v) },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Tabla detalle sucursales ────────────────────────────────────────── */}
      <Card size="small" title="Detalle por sucursal" style={{ borderRadius: 12 }}>
        {visibleBranches.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin ventas en este período" />
        ) : (
          <Table
            size="small"
            rowKey="branchId"
            loading={isLoading}
            dataSource={visibleBranches}
            columns={columns}
            pagination={false}
            rowClassName={(r: BranchRow) => r.itemsBajoMinimo > 0 ? 'ant-table-row-warning' : ''}
          />
        )}
      </Card>
    </Spin>
  )
}

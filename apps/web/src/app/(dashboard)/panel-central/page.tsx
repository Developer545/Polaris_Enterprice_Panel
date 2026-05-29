'use client'
import { useMemo, useState } from 'react'
import {
  Card, Row, Col, Statistic, Typography, Table, Segmented, Select, Empty, Alert, Tag, Space,
} from 'antd'
import {
  ShoppingCartOutlined, DollarOutlined, WalletOutlined, ShopOutlined,
  WarningOutlined, RiseOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import { theme } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type BranchRow = {
  branchId: string
  branchName: string
  ventas: number
  countVentas: number
  gastos: number
  neto: number
  cajasAbiertas: number
  itemsBajoMinimo: number
}

type Consolidated = {
  period: 'today' | 'month'
  totals: {
    ventas: number
    countVentas: number
    gastos: number
    neto: number
    cajasAbiertas: number
    itemsBajoMinimo: number
    totalSucursales: number
  }
  branches: BranchRow[]
  topProducts: { productName: string; cantidad: number; ventaGravada: number }[]
}

const money = (v: number) => `$${Number(v ?? 0).toFixed(2)}`

export default function PanelCentralPage() {
  const { companyId } = useAppContext()
  const { token } = theme.useToken()
  const [period, setPeriod] = useState<'today' | 'month'>('today')
  const [branchFilter, setBranchFilter] = useState<string>('all')

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me').then(r => r.data),
    staleTime: 5 * 60_000,
  })
  const canViewAll = me?.role?.permissions?.['branches.view_all'] === true

  const { data, isLoading, error } = useQuery<Consolidated>({
    queryKey: ['dashboard-consolidated', companyId, period],
    queryFn: () =>
      api.get('/api/dashboard/consolidated', { params: { companyId, period } }).then(r => r.data),
    enabled: !!companyId && canViewAll,
  })

  const branches = data?.branches ?? []
  const visibleBranches = useMemo(
    () => (branchFilter === 'all' ? branches : branches.filter(b => b.branchId === branchFilter)),
    [branches, branchFilter],
  )

  const totals = useMemo(() => {
    if (branchFilter === 'all') return data?.totals
    const b = branches.find(x => x.branchId === branchFilter)
    if (!b) return data?.totals
    return {
      ventas: b.ventas,
      countVentas: b.countVentas,
      gastos: b.gastos,
      neto: b.neto,
      cajasAbiertas: b.cajasAbiertas,
      itemsBajoMinimo: b.itemsBajoMinimo,
      totalSucursales: 1,
    }
  }, [data, branches, branchFilter])

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

  const columns = [
    { title: 'Sucursal', dataIndex: 'branchName', key: 'branchName' },
    {
      title: 'Ventas', dataIndex: 'ventas', key: 'ventas',
      sorter: (a: BranchRow, b: BranchRow) => a.ventas - b.ventas,
      render: (v: number) => <b>{money(v)}</b>,
    },
    { title: 'N° ventas', dataIndex: 'countVentas', key: 'countVentas' },
    { title: 'Gastos', dataIndex: 'gastos', key: 'gastos', render: (v: number) => money(v) },
    {
      title: 'Neto', dataIndex: 'neto', key: 'neto',
      render: (v: number) => <span style={{ color: v >= 0 ? token.colorSuccess : token.colorError }}>{money(v)}</span>,
    },
    {
      title: 'Cajas abiertas', dataIndex: 'cajasAbiertas', key: 'cajasAbiertas',
      render: (v: number) => v > 0 ? <Tag color="green">{v}</Tag> : <Tag>0</Tag>,
    },
    {
      title: 'Bajo mínimo', dataIndex: 'itemsBajoMinimo', key: 'itemsBajoMinimo',
      render: (v: number) => v > 0 ? <Tag color="orange">{v}</Tag> : <Tag color="default">0</Tag>,
    },
  ]

  const chartData = visibleBranches.map(b => ({ name: b.branchName, ventas: b.ventas }))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Panel central — todas las sucursales</Typography.Title>
        <Space wrap>
          <Select
            value={branchFilter}
            style={{ minWidth: 200 }}
            onChange={setBranchFilter}
            options={[
              { value: 'all', label: 'Todas las sucursales' },
              ...branches.map(b => ({ value: b.branchId, label: b.branchName })),
            ]}
          />
          <Segmented
            value={period}
            onChange={(v) => setPeriod(v as 'today' | 'month')}
            options={[{ label: 'Hoy', value: 'today' }, { label: 'Mes', value: 'month' }]}
          />
        </Space>
      </div>

      {error ? (
        <Alert type="error" showIcon message="No se pudo cargar el panel central" />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="Ventas" value={totals?.ventas ?? 0} precision={2} prefix={<ShoppingCartOutlined style={{ color: token.colorPrimary }} />} suffix="USD" valueStyle={{ color: token.colorPrimary }} loading={isLoading} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="Gastos" value={totals?.gastos ?? 0} precision={2} prefix={<WalletOutlined style={{ color: token.colorWarning }} />} suffix="USD" valueStyle={{ color: token.colorWarning }} loading={isLoading} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="Neto" value={totals?.neto ?? 0} precision={2} prefix={<RiseOutlined style={{ color: token.colorSuccess }} />} suffix="USD" valueStyle={{ color: (totals?.neto ?? 0) >= 0 ? token.colorSuccess : token.colorError }} loading={isLoading} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="Sucursales" value={totals?.totalSucursales ?? 0} prefix={<ShopOutlined style={{ color: token.colorInfo }} />} loading={isLoading} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 4 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="N° ventas" value={totals?.countVentas ?? 0} prefix={<DollarOutlined style={{ color: token.colorPrimary }} />} loading={isLoading} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="Cajas abiertas" value={totals?.cajasAbiertas ?? 0} prefix={<WalletOutlined style={{ color: token.colorSuccess }} />} loading={isLoading} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="Items bajo mínimo" value={totals?.itemsBajoMinimo ?? 0} prefix={<WarningOutlined style={{ color: token.colorWarning }} />} valueStyle={{ color: (totals?.itemsBajoMinimo ?? 0) > 0 ? token.colorWarning : undefined }} loading={isLoading} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={14}>
              <Card size="small" title="Ventas por sucursal" style={{ borderRadius: 10 }}>
                {chartData.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
                      <Tooltip formatter={(v) => [money(Number(v)), 'Ventas']} />
                      <Bar dataKey="ventas" fill={token.colorPrimary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card size="small" title="Top productos" style={{ borderRadius: 10 }}>
                <Table
                  size="small"
                  rowKey="productName"
                  pagination={false}
                  loading={isLoading}
                  dataSource={data?.topProducts ?? []}
                  columns={[
                    { title: 'Producto', dataIndex: 'productName', key: 'productName' },
                    { title: 'Cant.', dataIndex: 'cantidad', key: 'cantidad', render: (v: number) => Number(v).toFixed(0) },
                    { title: 'Gravado', dataIndex: 'ventaGravada', key: 'ventaGravada', render: (v: number) => money(v) },
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <Card size="small" title="Detalle por sucursal" style={{ borderRadius: 10, marginTop: 16 }}>
            <Table
              size="small"
              rowKey="branchId"
              loading={isLoading}
              dataSource={visibleBranches}
              columns={columns}
              pagination={false}
            />
          </Card>
        </>
      )}
    </div>
  )
}

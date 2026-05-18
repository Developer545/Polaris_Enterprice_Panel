'use client'
import { Card, Row, Col, Statistic, Typography, Space } from 'antd'
import {
  TeamOutlined, CheckCircleOutlined, PauseCircleOutlined,
  ClockCircleOutlined, CloudServerOutlined, WarningOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

const { Title, Text } = Typography

const CARD = {
  size: 'small' as const,
  style: { borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
}

export default function AdminOverviewPage() {
  const { data: tenants = [] } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => api.get('/api/control-plane/tenants').then((r) => r.data),
  })

  const active    = tenants.filter((t: any) => t.status === 'ACTIVE').length
  const trial     = tenants.filter((t: any) => t.status === 'TRIAL').length
  const suspended = tenants.filter((t: any) => t.status === 'SUSPENDED').length
  const pending   = tenants.filter((t: any) => !t.provisioned).length

  const kpis = [
    { title: 'Total Tenants',  value: tenants.length, icon: <TeamOutlined />,         color: '#722ed1' },
    { title: 'Activos',        value: active,          icon: <CheckCircleOutlined />,   color: '#52c41a' },
    { title: 'En prueba',      value: trial,           icon: <ClockCircleOutlined />,   color: '#faad14' },
    { title: 'Suspendidos',    value: suspended,       icon: <PauseCircleOutlined />,   color: '#ff4d4f' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Overview</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Polaris Enterprise · Panel de control de plataforma</Text>
      </div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {kpis.map((kpi) => (
          <Col key={kpi.title} xs={12} sm={6}>
            <Card {...CARD}>
              <Statistic
                title={<span style={{ fontSize: 12, color: '#888' }}>{kpi.title}</span>}
                value={kpi.value}
                valueStyle={{ color: kpi.color, fontWeight: 700, fontSize: 26 }}
                prefix={<span style={{ color: kpi.color, marginRight: 4 }}>{kpi.icon}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* Estado */}
        <Col xs={24} md={12}>
          <Card
            {...CARD}
            title={<span style={{ fontSize: 13, fontWeight: 600, color: '#37352f' }}>Estado de plataforma</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Aprovisionados',              value: tenants.length - pending, color: '#722ed1' },
                { label: 'Pendientes aprovisionamiento', value: pending,                  color: pending > 0 ? '#fa8c16' : '#52c41a', icon: pending > 0 ? <WarningOutlined /> : undefined },
                { label: 'Con Electron activo',          value: tenants.filter((t: any) => t.appVersion).length, color: '#1677ff' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={6}>
                    {row.icon && <span style={{ color: row.color, fontSize: 12 }}>{row.icon}</span>}
                    <Text style={{ fontSize: 13, color: '#37352f' }}>{row.label}</Text>
                  </Space>
                  <Text style={{ fontWeight: 700, fontSize: 16, color: row.color }}>{row.value}</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* BD Strategies */}
        <Col xs={24} md={12}>
          <Card
            {...CARD}
            title={<span style={{ fontSize: 13, fontWeight: 600, color: '#37352f' }}>Estrategias de base de datos</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { strategy: 'NEON_SHARED',    color: '#13c2c2' },
                { strategy: 'NEON_DEDICATED', color: '#722ed1' },
                { strategy: 'LOCAL_DEDICATED',color: '#fa8c16' },
              ].map(({ strategy, color }) => {
                const count = tenants.filter((t: any) => t.dbStrategy === strategy).length
                return (
                  <div key={strategy} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space size={8}>
                      <CloudServerOutlined style={{ color, fontSize: 14 }} />
                      <Text style={{ fontSize: 13, color: '#37352f' }}>{strategy.replace(/_/g, ' ')}</Text>
                    </Space>
                    <Text style={{ fontWeight: 700, fontSize: 16, color: '#37352f' }}>{count}</Text>
                  </div>
                )
              })}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

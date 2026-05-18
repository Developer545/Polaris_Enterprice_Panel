'use client'
import { Card, Row, Col, Statistic, Typography } from 'antd'
import { TeamOutlined, CheckCircleOutlined, PauseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export default function AdminOverviewPage() {
  const { data: tenants = [] } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => api.get('/api/control-plane/tenants').then((r) => r.data),
  })

  const active = tenants.filter((t: any) => t.status === 'ACTIVE').length
  const trial = tenants.filter((t: any) => t.status === 'TRIAL').length
  const suspended = tenants.filter((t: any) => t.status === 'SUSPENDED').length

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>Overview</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Total Tenants" value={tenants.length} prefix={<TeamOutlined style={{ color: '#1677ff' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Activos" value={active} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="En prueba" value={trial} prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Suspendidos" value={suspended} prefix={<PauseCircleOutlined style={{ color: '#ff4d4f' }} />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

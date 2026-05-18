'use client'
import { Table, Button, Tag, Space, Typography, Badge } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '../../../lib/api'
import dayjs from 'dayjs'

const STATUS_COLOR: Record<string, string> = {
  TRIAL: 'blue', ACTIVE: 'green', SUSPENDED: 'red', CANCELLED: 'default',
}
const STATUS_LABEL: Record<string, string> = {
  TRIAL: 'Prueba', ACTIVE: 'Activo', SUSPENDED: 'Suspendido', CANCELLED: 'Cancelado',
}

export default function TenantsPage() {
  const router = useRouter()
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => api.get('/api/control-plane/tenants').then((r) => r.data),
  })

  const columns = [
    { title: 'Slug', dataIndex: 'slug', key: 'slug', render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code> },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Plan', key: 'plan', render: (r: any) => <Tag color="purple">{r.plan?.name ?? '—'}</Tag> },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: 'DB Strategy', dataIndex: 'dbStrategy', key: 'dbStrategy',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Versión app', dataIndex: 'appVersion', key: 'appVersion',
      render: (v: string) => v ? <Badge color="green" text={`v${v}`} /> : <Badge color="gray" text="N/A" />,
    },
    {
      title: 'Último acceso', dataIndex: 'lastSeenAt', key: 'lastSeenAt',
      render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—',
    },
    {
      title: 'Acciones', key: 'actions',
      render: (r: any) => (
        <Space>
          <Button size="small" type="link" onClick={() => router.push(`/tenants/${r.id}`)}>Ver</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Tenants</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/tenants/new')}>
          Nuevo tenant
        </Button>
      </div>
      <Table
        size="small"
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (t) => `${t} tenants` }}
        style={{ borderRadius: 10, overflow: 'hidden' }}
      />
    </div>
  )
}

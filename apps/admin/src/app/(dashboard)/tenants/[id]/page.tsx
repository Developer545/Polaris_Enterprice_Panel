'use client'
import { use } from 'react'
import {
  Card, Tabs, Tag, Badge, Button, Typography, Space, App,
  Descriptions, Select, Skeleton,
} from 'antd'
import {
  ArrowLeftOutlined, AppstoreOutlined, FileTextOutlined,
  BranchesOutlined, TeamOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '../../../../lib/api'
import ModulosTab from './tabs/ModulosTab'
import DocumentosFiscalesTab from './tabs/DocumentosFiscalesTab'
import SucursalesTab from './tabs/SucursalesTab'
import UsuariosTab from './tabs/UsuariosTab'

const STATUS_COLOR: Record<string, string> = {
  TRIAL: 'blue', ACTIVE: 'green', SUSPENDED: 'red', CANCELLED: 'default',
}
const STATUS_LABEL: Record<string, string> = {
  TRIAL: 'Prueba', ACTIVE: 'Activo', SUSPENDED: 'Suspendido', CANCELLED: 'Cancelado',
}

type TenantStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'

function TenantDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin', 'tenant', id],
    queryFn: () => api.get(`/api/control-plane/tenants/${id}`).then((r) => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: (status: TenantStatus) =>
      api.put(`/api/control-plane/tenants/${id}`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] })
      message.success('Estado actualizado')
    },
    onError: () => message.error('Error al actualizar estado'),
  })

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />

  const tabItems = [
    {
      key: 'modulos',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AppstoreOutlined /> Módulos</span>,
      children: <ModulosTab tenantId={id} modules={(tenant?.modules as Record<string, boolean>) ?? {}} />,
    },
    {
      key: 'dte',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileTextOutlined /> Documentos Fiscales</span>,
      children: <DocumentosFiscalesTab tenantId={id} dteAllowedTypes={(tenant?.dteAllowedTypes as string[]) ?? []} />,
    },
    {
      key: 'sucursales',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BranchesOutlined /> Sucursales</span>,
      children: <SucursalesTab tenantId={id} />,
    },
    {
      key: 'usuarios',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TeamOutlined /> Usuarios</span>,
      children: <UsuariosTab tenantId={id} />,
    },
  ]

  return (
    <div>
      {/* Back + Header */}
      <div style={{ marginBottom: 20 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/tenants')}
          style={{ marginBottom: 12, padding: '4px 8px', color: '#888' }}
        >
          Volver a tenants
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>{tenant?.name}</Typography.Title>
            <Space size={8} style={{ marginTop: 4 }}>
              <code style={{ fontSize: 12, background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{tenant?.slug}</code>
              <Tag color={STATUS_COLOR[tenant?.status]}>{STATUS_LABEL[tenant?.status] ?? tenant?.status}</Tag>
              {tenant?.provisioned
                ? <Badge color="green" text="Aprovisionado" />
                : <Badge color="orange" text="Sin aprovisionar" />
              }
            </Space>
          </div>
          <Space>
            <Select
              value={tenant?.status}
              size="small"
              style={{ width: 140 }}
              loading={statusMutation.isPending}
              onChange={(status: TenantStatus) => statusMutation.mutate(status)}
              options={[
                { value: 'TRIAL', label: 'Prueba' },
                { value: 'ACTIVE', label: 'Activo' },
                { value: 'SUSPENDED', label: 'Suspendido' },
                { value: 'CANCELLED', label: 'Cancelado' },
              ]}
            />
          </Space>
        </div>
      </div>

      {/* Summary Card */}
      <Card size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Email">{tenant?.email}</Descriptions.Item>
          <Descriptions.Item label="Teléfono">{tenant?.phone ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Plan">
            <Tag color="purple">{tenant?.plan?.name}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="BD">
            <Tag>{tenant?.dbStrategy}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Versión app">
            {tenant?.appVersion ? `v${tenant.appVersion}` : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Empresas">
            {tenant?.companies?.length ?? 0}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Tabs */}
      <Card styles={{ body: { padding: '0 0 16px' } }} style={{ borderRadius: 10 }}>
        <Tabs
          defaultActiveKey="modulos"
          items={tabItems}
          tabBarStyle={{ padding: '0 24px', marginBottom: 0 }}
          style={{ minHeight: 300 }}
          tabBarGutter={8}
        />
      </Card>
    </div>
  )
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <App>
      <TenantDetailContent id={id} />
    </App>
  )
}

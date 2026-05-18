'use client'
import { Table, Tag, Badge, Typography, Alert, Card, Space } from 'antd'
import { ShopOutlined, PhoneOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../../../lib/api'

const { Text } = Typography
const CARD_SHADOW = { borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

interface Props { tenantId: string }

export default function SucursalesTab({ tenantId }: Props) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['admin', 'tenant', tenantId, 'branches'],
    queryFn: () => api.get(`/api/control-plane/tenants/${tenantId}/branches`).then((r) => r.data),
  })

  if (isError) {
    return (
      <div style={{ padding: '20px 24px' }}>
        <Alert
          type="warning"
          message="No se pudo cargar las sucursales"
          description="El tenant puede no estar aprovisionado o su BD no está accesible."
          showIcon
          style={{ borderRadius: 8 }}
        />
      </div>
    )
  }

  const columns = [
    {
      title: 'Sucursal',
      key: 'name',
      render: (r: any) => (
        <Space>
          <ShopOutlined style={{ color: '#722ed1', fontSize: 16 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.address || '—'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Empresa',
      key: 'company',
      render: (r: any) => <Text style={{ fontSize: 13, color: '#787774' }}>{r.company?.name ?? '—'}</Text>,
    },
    {
      title: 'Teléfono',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (v: string) => v
        ? <Space size={4}><PhoneOutlined style={{ color: '#999', fontSize: 12 }} /><Text style={{ fontSize: 12 }}>{v}</Text></Space>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Código MH',
      key: 'codes',
      width: 160,
      render: (r: any) => r.codEstableMH
        ? <Space size={4}>
            <Tag style={{ fontSize: 11, borderRadius: 4, fontFamily: 'monospace' }}>{r.codEstableMH}</Tag>
            {r.codPuntoVentaMH && <Tag style={{ fontSize: 11, borderRadius: 4, fontFamily: 'monospace' }}>{r.codPuntoVentaMH}</Tag>}
          </Space>
        : <Text type="secondary" style={{ fontSize: 12 }}>Sin configurar</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'} style={{ borderRadius: 4, fontWeight: 500 }}>
          {v ? 'Activa' : 'Inactiva'}
        </Tag>
      ),
    },
  ]

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ marginBottom: 14 }}>
        <Text style={{ fontWeight: 600, fontSize: 14, color: '#37352f' }}>Sucursales del tenant</Text>
        <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>({data.length} registradas)</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>Vista de solo lectura — se gestionan desde el sistema del cliente</Text>
      </div>

      <Card size="small" style={CARD_SHADOW} styles={{ body: { padding: 0 } }}>
        <Table
          size="small"
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          style={{ borderRadius: 12, overflow: 'hidden' }}
          locale={{ emptyText: 'Sin sucursales registradas' }}
        />
      </Card>
    </div>
  )
}

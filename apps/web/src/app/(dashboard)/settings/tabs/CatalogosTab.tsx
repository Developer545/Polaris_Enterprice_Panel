'use client'

import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Tabs, Typography, Alert, Card, Statistic, Row, Col, Space } from 'antd'
import { DatabaseOutlined, EnvironmentOutlined, AppstoreOutlined, GlobalOutlined } from '@ant-design/icons'
import { api } from '../../../../lib/api'

const { Text, Title } = Typography

export default function CatalogosTab() {
  const { data: departamentos = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['catalogs-departamentos'],
    queryFn: () => api.get('/api/catalogs/departamentos').then(r => r.data),
    staleTime: 60 * 60_000,
  })

  const { data: actividades = [], isLoading: loadingActs } = useQuery({
    queryKey: ['catalogs-actividades'],
    queryFn: () => api.get('/api/catalogs/actividades').then(r => r.data),
    staleTime: 60 * 60_000,
  })

  const tabItems = [
    {
      key: 'departamentos',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <EnvironmentOutlined /> Departamentos
        </span>
      ),
      children: (
        <Table
          dataSource={departamentos}
          rowKey="id"
          loading={loadingDepts}
          size="small"
          pagination={false}
          columns={[
            { title: 'Código', dataIndex: 'codigo', width: 80, render: (v: string) => <Tag>{v}</Tag> },
            { title: 'Departamento', dataIndex: 'nombre' },
          ]}
        />
      ),
    },
    {
      key: 'actividades',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AppstoreOutlined /> Actividades Económicas
        </span>
      ),
      children: (
        <Table
          dataSource={actividades}
          rowKey="id"
          loading={loadingActs}
          size="small"
          pagination={{ pageSize: 15, size: 'small' }}
          columns={[
            { title: 'Código CIIU', dataIndex: 'codigo', width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: 'Actividad', dataIndex: 'nombre' },
            { title: 'Estado', dataIndex: 'isActive', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activa' : 'Inactiva'}</Tag> },
          ]}
        />
      ),
    },
  ]

  return (
    <div style={{ padding: '16px 24px' }}>
      <Alert
        type="info"
        showIcon
        icon={<DatabaseOutlined />}
        message="Gestión de Catálogos"
        description={
          <span>
            Los catálogos de Departamentos, Municipios y Actividades Económicas son datos globales del sistema.
            Para agregar, editar o desactivar registros (por ejemplo, nuevos municipios o cambios en el catálogo
            del Ministerio de Hacienda), acceda al <strong>Panel de Administración</strong> (SuperAdmin).
            Todos los tenants del sistema verán los cambios automáticamente.
          </span>
        }
        style={{ marginBottom: 20 }}
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Departamentos"
              value={departamentos.length}
              prefix={<GlobalOutlined style={{ color: '#f47920' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Actividades Económicas"
              value={actividades.length}
              prefix={<AppstoreOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Municipios"
              value={261}
              prefix={<EnvironmentOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs items={tabItems} size="small" />
    </div>
  )
}

'use client'


import { Tabs, Typography, Card, App } from 'antd'
import {
  BankOutlined, BranchesOutlined, TeamOutlined,
  SafetyOutlined, AppstoreOutlined, DatabaseOutlined, ApiOutlined,
} from '@ant-design/icons'
import { useAppContext } from '../../../hooks/use-app-context'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import EmpresaTab from './tabs/EmpresaTab'
import SucursalesTab from './tabs/SucursalesTab'
import UsuariosTab from './tabs/UsuariosTab'
import RolesTab from './tabs/RolesTab'
import CategoriasTab from './tabs/CategoriasTab'
import CatalogosTab from './tabs/CatalogosTab'
import IntegracionesTab from './tabs/IntegracionesTab'
import RespaldosTab from './tabs/RespaldosTab'

const { Title, Text } = Typography

function SettingsContent() {
  const { companyId } = useAppContext()
  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-info'],
    queryFn: () => api.get('/api/auth/tenant-info').then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const tabItems = [
    {
      key: 'empresa',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BankOutlined /> Empresa</span>,
      children: <EmpresaTab companyId={companyId} />,
    },
    {
      key: 'sucursales',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BranchesOutlined /> Sucursales</span>,
      children: <SucursalesTab companyId={companyId} />,
    },
    {
      key: 'usuarios',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TeamOutlined /> Usuarios</span>,
      children: <UsuariosTab companyId={companyId} />,
    },
    {
      key: 'roles',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SafetyOutlined /> Roles y Permisos</span>,
      children: <RolesTab companyId={companyId} />,
    },
    {
      key: 'categorias',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AppstoreOutlined /> Categorías</span>,
      children: <CategoriasTab companyId={companyId} />,
    },
    {
      key: 'catalogos',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DatabaseOutlined /> Catálogos SV</span>,
      children: <CatalogosTab />,
    },
    {
      key: 'integraciones',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ApiOutlined /> Integraciones DTE</span>,
      children: <IntegracionesTab companyId={companyId} />,
    },
    ...(tenantInfo?.localBundle ? [{
      key: 'respaldos',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DatabaseOutlined /> Respaldos</span>,
      children: <RespaldosTab />,
    }] : []),
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Configuración</Title>
        <Text type="secondary">Gestione la empresa, sucursales, usuarios y parámetros del sistema</Text>
      </div>

      <Card styles={{ body: { padding: '0 0 16px' } }} style={{ borderRadius: 10 }}>
        <Tabs
          defaultActiveKey="empresa"
          items={tabItems}
          tabBarStyle={{ padding: '0 24px', marginBottom: 0 }}
          style={{ minHeight: 400 }}
          tabBarGutter={8}
        />
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <App>
      <SettingsContent />
    </App>
  )
}

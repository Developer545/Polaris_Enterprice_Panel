'use client'


import { Tabs, Typography, Card, App } from 'antd'
import {
  BankOutlined, BranchesOutlined, TeamOutlined,
  SafetyOutlined, AppstoreOutlined, DatabaseOutlined,
} from '@ant-design/icons'
import { useAppContext } from '../../../hooks/use-app-context'
import EmpresaTab from './tabs/EmpresaTab'
import SucursalesTab from './tabs/SucursalesTab'
import UsuariosTab from './tabs/UsuariosTab'
import RolesTab from './tabs/RolesTab'
import CategoriasTab from './tabs/CategoriasTab'
import CatalogosTab from './tabs/CatalogosTab'

const { Title, Text } = Typography

function SettingsContent() {
  const { companyId } = useAppContext()

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

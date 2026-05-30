'use client'
import { Card, Tabs, Typography, App } from 'antd'
import { GlobalOutlined, EnvironmentOutlined, ApartmentOutlined, PushpinOutlined } from '@ant-design/icons'
import DepartamentosTab from './tabs/DepartamentosTab'
import MunicipiosTab from './tabs/MunicipiosTab'
import DistritosTab from './tabs/DistritosTab'
import ActividadesTab from './tabs/ActividadesTab'

export default function CatalogsPage() {
  return (
    <App>
      <div>
        <div style={{ marginBottom: 20 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Catálogos Ministerio de Hacienda</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Gestiona departamentos, municipios, distritos y actividades económicas — datos consumidos por todos los tenants
          </Typography.Text>
        </div>

        <Card styles={{ body: { padding: '0 0 16px' } }} style={{ borderRadius: 10 }}>
          <Tabs
            defaultActiveKey="departamentos"
            tabBarStyle={{ padding: '0 24px', marginBottom: 0 }}
            tabBarGutter={8}
            items={[
              {
                key: 'departamentos',
                label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GlobalOutlined /> Departamentos</span>,
                children: <DepartamentosTab />,
              },
              {
                key: 'municipios',
                label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><EnvironmentOutlined /> Municipios</span>,
                children: <MunicipiosTab />,
              },
              {
                key: 'distritos',
                label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PushpinOutlined /> Distritos</span>,
                children: <DistritosTab />,
              },
              {
                key: 'actividades',
                label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ApartmentOutlined /> Actividades Económicas</span>,
                children: <ActividadesTab />,
              },
            ]}
          />
        </Card>
      </div>
    </App>
  )
}

'use client'
import { useState } from 'react'
import { Layout, Menu, Typography, theme as antTheme } from 'antd'
import {
  DashboardOutlined, TeamOutlined, CrownOutlined,
  AuditOutlined, ControlOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons'
import { usePathname, useRouter } from 'next/navigation'

const { Sider, Header, Content } = Layout

const NAV_ITEMS = [
  { key: '/',               label: 'Overview',   icon: <DashboardOutlined /> },
  { key: '/tenants',        label: 'Tenants',    icon: <TeamOutlined /> },
  { key: '/plans',          label: 'Planes',     icon: <CrownOutlined /> },
  { key: '/audit',          label: 'Auditoría',  icon: <AuditOutlined /> },
]

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { token } = antTheme.useToken()

  const selectedKey = NAV_ITEMS.find((i) => pathname === i.key || pathname.startsWith(i.key + '/'))?.key ?? '/'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsed={collapsed} trigger={null} width={220} style={{ background: '#001529', position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? 0 : '0 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <ControlOutlined style={{ color: '#f47920', fontSize: 24, flexShrink: 0 }} />
          {!collapsed && (
            <Typography.Text strong style={{ color: '#fff', marginLeft: 10, fontSize: 14, whiteSpace: 'nowrap' }}>
              Admin Panel
            </Typography.Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={NAV_ITEMS}
          onClick={({ key }) => router.push(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Header style={{ background: token.colorBgContainer, padding: '0 24px', display: 'flex', alignItems: 'center', borderBottom: `1px solid ${token.colorBorderSecondary}`, position: 'sticky', top: 0, zIndex: 99 }}>
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: token.colorText }}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
          <Typography.Text strong style={{ marginLeft: 16, color: token.colorTextSecondary, fontSize: 13 }}>
            Speeddan System — Control Panel
          </Typography.Text>
        </Header>
        <Content style={{ margin: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { Layout, Avatar, Dropdown, Typography, theme as antTheme, Tooltip, App } from 'antd'
import {
  DashboardOutlined, TeamOutlined, CrownOutlined, AuditOutlined,
  BookOutlined, LogoutOutlined, UserOutlined, ControlOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
  CaretDownOutlined, AppstoreOutlined, DesktopOutlined, KeyOutlined,
} from '@ant-design/icons'
import { usePathname, useRouter } from 'next/navigation'
import { api } from '../../lib/api'

const { Sider, Header, Content } = Layout
const { Text } = Typography

// ── Nav groups ────────────────────────────────────────────────────────────────

type NavItem  = { key: string; label: string; icon: React.ReactNode }
type NavGroup = { key: string; label: string; icon: React.ReactNode; color: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'gestion',
    label: 'Gestión',
    icon: <AppstoreOutlined />,
    color: '#722ed1',
    items: [
      { key: '/',        label: 'Overview',  icon: <DashboardOutlined /> },
      { key: '/tenants', label: 'Tenants',   icon: <TeamOutlined /> },
    ],
  },
  {
    key: 'plataforma',
    label: 'Plataforma',
    icon: <CrownOutlined />,
    color: '#1677ff',
    items: [
      { key: '/plans',    label: 'Planes',          icon: <CrownOutlined /> },
      { key: '/licenses', label: 'Licencias',        icon: <KeyOutlined /> },
      { key: '/catalogs', label: 'Catálogos',        icon: <BookOutlined /> },
      { key: '/releases', label: 'Versión Desktop',  icon: <DesktopOutlined /> },
    ],
  },
  {
    key: 'sistema',
    label: 'Sistema',
    icon: <ControlOutlined />,
    color: '#52c41a',
    items: [
      { key: '/audit', label: 'Auditoría', icon: <AuditOutlined /> },
    ],
  },
]

function isActive(itemKey: string, pathname: string) {
  if (itemKey === '/') return pathname === '/'
  return pathname === itemKey || pathname.startsWith(itemKey + '/')
}

function getActiveGroupKey(pathname: string) {
  for (const g of NAV_GROUPS) {
    if (g.items.some((i) => isActive(i.key, pathname))) return g.key
  }
  return 'gestion'
}

// ── Layout ────────────────────────────────────────────────────────────────────

function AdminDashboardContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed]     = useState(false)
  const [openGroups, setOpenGroups]   = useState<Set<string>>(new Set(['gestion']))
  const pathname  = usePathname()
  const router    = useRouter()
  const { token } = antTheme.useToken()
  const { message } = App.useApp()

  useEffect(() => {
    const key = getActiveGroupKey(pathname)
    setOpenGroups((prev) => new Set([...prev, key]))
  }, [pathname])

  async function logout() {
    try {
      await api.post('/api/control-plane/admin-auth/logout')
    } catch {/* ignore */}
    router.push('/login')
  }

  function toggleGroup(key: string) {
    if (collapsed) return
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const userMenu = {
    items: [
      { key: 'label', label: <Text type="secondary" style={{ fontSize: 12 }}>Super Admin</Text>, disabled: true },
      { type: 'divider' as const },
      { key: 'logout', label: 'Cerrar sesión', icon: <LogoutOutlined />, danger: true },
    ],
    onClick: ({ key }: { key: string }) => { if (key === 'logout') logout() },
  }

  return (
    <Layout style={{ minHeight: '100vh', position: 'relative', background: 'transparent' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Sider
        collapsed={collapsed}
        width={240}
        collapsedWidth={64}
        style={{
          background: '#fbfbfa',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRight: '1px solid #e9e9e7',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 16px',
          borderBottom: '1px solid #e9e9e7',
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #722ed1, #9254de)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ControlOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: '#37352f', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                Polaris Enterprise
              </div>
              <div style={{ color: '#9b9b99', fontSize: 11 }}>
                Admin · Speeddan
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
          {NAV_GROUPS.map((group) => {
            const isOpen    = openGroups.has(group.key)
            const hasActive = group.items.some((i) => isActive(i.key, pathname))

            return (
              <div key={group.key}>
                {/* Group header */}
                {collapsed ? (
                  <Tooltip title={group.label} placement="right">
                    <div
                      onClick={() => toggleGroup(group.key)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: 36, margin: '2px 8px', borderRadius: 8,
                        cursor: 'pointer', fontSize: 16, transition: 'all 0.15s',
                        color:      hasActive ? group.color : '#9b9b99',
                        background: hasActive ? `${group.color}18` : 'transparent',
                      }}
                    >
                      {group.icon}
                    </div>
                  </Tooltip>
                ) : (
                  <div
                    onClick={() => toggleGroup(group.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 16px', cursor: 'pointer', userSelect: 'none', marginTop: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: group.color, fontSize: 13 }}>{group.icon}</span>
                      <Text style={{
                        color: '#9b9b99', fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>
                        {group.label}
                      </Text>
                    </div>
                    <span style={{
                      color: '#c7c7c5', fontSize: 10, transition: 'transform 0.2s',
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      display: 'inline-block',
                    }}>
                      <CaretDownOutlined />
                    </span>
                  </div>
                )}

                {/* Group items */}
                {(isOpen || collapsed) && group.items.map((item) => {
                  const active = isActive(item.key, pathname)
                  return collapsed ? (
                    <Tooltip key={item.key} title={item.label} placement="right">
                      <div
                        onClick={() => router.push(item.key)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          height: 36, margin: '1px 8px', borderRadius: 8,
                          cursor: 'pointer', fontSize: 15, transition: 'all 0.15s',
                          color:      active ? '#722ed1' : '#9b9b99',
                          background: active ? '#f0e6ff' : 'transparent',
                        }}
                      >
                        {item.icon}
                      </div>
                    </Tooltip>
                  ) : (
                    <div
                      key={item.key}
                      onClick={() => router.push(item.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 16px 7px 36px',
                        margin: '1px 8px', borderRadius: 8,
                        cursor: 'pointer', fontSize: 13, transition: 'all 0.15s',
                        color:      active ? '#722ed1' : '#37352f',
                        background: active ? '#f0e6ff' : 'transparent',
                        fontWeight: active ? 600 : 400,
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#ebebea' }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    </div>
                  )
                })}

                {!collapsed && (
                  <div style={{ margin: '4px 16px', borderBottom: '1px solid #ebebea' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* User card at bottom */}
        {!collapsed ? (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e9e9e7', flexShrink: 0 }}>
            <Dropdown menu={userMenu} placement="topRight" trigger={['click']}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', padding: '6px 8px', borderRadius: 8, transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#ebebea' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <Avatar
                  size={30}
                  style={{ background: 'linear-gradient(135deg, #722ed1, #9254de)', fontWeight: 700, flexShrink: 0, fontSize: 12 }}
                >
                  SA
                </Avatar>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ color: '#37352f', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Super Admin
                  </div>
                  <div style={{ color: '#9b9b99', fontSize: 11, whiteSpace: 'nowrap' }}>
                    Speeddan System
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        ) : (
          <div style={{ padding: '12px 0', borderTop: '1px solid #e9e9e7', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
            <Dropdown menu={userMenu} placement="topRight" trigger={['click']}>
              <Avatar
                size={30}
                style={{ background: 'linear-gradient(135deg, #722ed1, #9254de)', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
              >
                SA
              </Avatar>
            </Dropdown>
          </div>
        )}
      </Sider>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <Layout style={{ marginLeft: collapsed ? 64 : 240, transition: 'margin-left 0.2s', position: 'relative', zIndex: 1, background: 'transparent' }}>
        <Header style={{
          background: token.colorBgContainer,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          position: 'sticky',
          top: 0,
          zIndex: 99,
          height: 64,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: token.colorText, padding: '4px 8px', borderRadius: 6,
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>

          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <div style={{
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 8px', borderRadius: 8, transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f1ef' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Avatar
                size={30}
                style={{ background: 'linear-gradient(135deg, #722ed1, #9254de)', fontWeight: 700, fontSize: 12 }}
              >
                SA
              </Avatar>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#37352f' }}>Super Admin</div>
                <div style={{ fontSize: 11, color: '#9b9b99' }}>Polaris Enterprise</div>
              </div>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, minHeight: 'calc(100vh - 112px)', background: 'transparent' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <App>
      <AdminDashboardContent>{children}</AdminDashboardContent>
    </App>
  )
}

'use client'
import { useState, useEffect } from 'react'
import {
  Layout, Avatar, Dropdown, Typography, theme as antTheme,
  Tooltip, Badge,
} from 'antd'
import TitleBar, { TITLEBAR_HEIGHT } from '@/components/electron/TitleBar'
import { isElectron } from '@/lib/is-electron'
import {
  DashboardOutlined, ShoppingCartOutlined, TeamOutlined, AppstoreOutlined,
  FileTextOutlined, UserOutlined, SettingOutlined, LogoutOutlined,
  ShopOutlined, ShoppingOutlined, WalletOutlined, IdcardOutlined,
  CalculatorOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  CaretDownOutlined, CaretRightOutlined, BankOutlined,
  TagOutlined, SafetyOutlined, DatabaseOutlined, AccountBookOutlined,
} from '@ant-design/icons'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

const { Sider, Header, Content } = Layout
const { Text } = Typography

// ── Tipos ─────────────────────────────────────────────────────────────────────

type NavItem = { key: string; label: string; icon: React.ReactNode }
type NavGroup = {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  items: NavItem[]
}

// ── Grupos de navegación ──────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'ventas',
    label: 'Ventas',
    icon: <ShoppingCartOutlined />,
    color: 'var(--ant-color-primary)',
    items: [
      { key: '/',               label: 'Dashboard',     icon: <DashboardOutlined /> },
      { key: '/pos',                   label: 'Caja / POS',         icon: <ShoppingCartOutlined /> },
      { key: '/sales',                 label: 'Ventas',             icon: <FileTextOutlined /> },
      { key: '/accounts-receivable',   label: 'Cuentas por cobrar', icon: <AccountBookOutlined /> },
      { key: '/cash-registers',        label: 'Turnos de caja',     icon: <WalletOutlined /> },
    ],
  },
  {
    key: 'clientes',
    label: 'Clientes',
    icon: <TeamOutlined />,
    color: '#1677ff',
    items: [
      { key: '/clients',   label: 'Clientes',   icon: <TeamOutlined /> },
      { key: '/products',  label: 'Productos',  icon: <AppstoreOutlined /> },
      { key: '/inventory', label: 'Inventario', icon: <DatabaseOutlined /> },
      { key: '/services',  label: 'Servicios',  icon: <TagOutlined /> },
    ],
  },
  {
    key: 'rrhh',
    label: 'Recursos Humanos',
    icon: <IdcardOutlined />,
    color: 'var(--ant-color-success)',
    items: [
      { key: '/employees', label: 'Empleados', icon: <IdcardOutlined /> },
      { key: '/payroll',   label: 'Planilla',  icon: <CalculatorOutlined /> },
    ],
  },
  {
    key: 'compras',
    label: 'Compras',
    icon: <ShoppingOutlined />,
    color: '#722ed1',
    items: [
      { key: '/suppliers',        label: 'Proveedores',      icon: <BankOutlined /> },
      { key: '/purchases',        label: 'Órdenes de compra', icon: <ShoppingOutlined /> },
      { key: '/accounts-payable', label: 'Cuentas por pagar', icon: <WalletOutlined /> },
      { key: '/expenses',         label: 'Gastos',           icon: <FileTextOutlined /> },
    ],
  },
  {
    key: 'config',
    label: 'Configuración',
    icon: <SettingOutlined />,
    color: '#eb2f96',
    items: [
      { key: '/settings',    label: 'Configuración', icon: <SettingOutlined /> },
    ],
  },
]

// ── Helper: ¿está activo? ─────────────────────────────────────────────────────

function isActive(itemKey: string, pathname: string) {
  if (itemKey === '/') return pathname === '/'
  return pathname === itemKey || pathname.startsWith(itemKey + '/')
}

function getActiveGroup(pathname: string) {
  for (const group of NAV_GROUPS) {
    if (group.items.some(i => isActive(i.key, pathname))) return group.key
  }
  return 'ventas'
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['ventas']))
  // Evaluated after mount to avoid SSR/hydration mismatch
  const [inElectron, setInElectron] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { token } = antTheme.useToken()

  // Auto-open group that has the active route
  useEffect(() => {
    const activeGroup = getActiveGroup(pathname)
    setOpenGroups(prev => new Set([...prev, activeGroup]))
  }, [pathname])

  useEffect(() => { setInElectron(isElectron) }, [])

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me').then(r => r.data),
    staleTime: 5 * 60_000,
    retry: 1,
  })

  async function logout() {
    await api.post('/api/auth/logout').catch(() => {})
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }
    router.push('/login')
  }

  function toggleGroup(key: string) {
    if (collapsed) return
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const userMenu = {
    items: [
      { key: 'name', label: <Text strong>{user?.name ?? 'Usuario'}</Text>, disabled: true },
      { key: 'email', label: <Text type="secondary" style={{ fontSize: 12 }}>{user?.email ?? ''}</Text>, disabled: true },
      { type: 'divider' as const },
      { key: 'logout', label: 'Cerrar sesión', icon: <LogoutOutlined />, danger: true },
    ],
    onClick: ({ key }: { key: string }) => { if (key === 'logout') logout() },
  }

  const tbOffset = inElectron ? TITLEBAR_HEIGHT : 0

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent', paddingTop: tbOffset }}>
      <TitleBar sidebarWidth={collapsed ? 64 : 240} />
      {/* Sidebar */}
      <Sider
        collapsed={collapsed}
        width={240}
        collapsedWidth={64}
        style={{
          background: '#fbfbfa',
          position: 'fixed',
          height: `calc(100vh - ${tbOffset}px)`,
          left: 0,
          top: tbOffset,
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
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: token.colorPrimary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ShopOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          {!collapsed && (
            <div style={{ marginLeft: 10, overflow: 'hidden' }}>
              <div style={{ color: '#37352f', fontWeight: 700, fontSize: 14, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                Polaris
              </div>
              <div style={{ color: '#9b9b99', fontSize: 11, whiteSpace: 'nowrap' }}>
                Enterprise
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
          {NAV_GROUPS.map(group => {
            const isOpen = openGroups.has(group.key)
            const hasActive = group.items.some(i => isActive(i.key, pathname))

            return (
              <div key={group.key}>
                {/* Group header */}
                {collapsed ? (
                  /* Collapsed: show first active item icon or group icon */
                  <Tooltip title={group.label} placement="right">
                    <div
                      onClick={() => toggleGroup(group.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 40,
                        margin: '2px 8px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        color: hasActive ? group.color : '#9b9b99',
                        background: hasActive ? `${group.color}18` : 'transparent',
                        fontSize: 16,
                        transition: 'all 0.2s',
                      }}
                    >
                      {group.icon}
                    </div>
                  </Tooltip>
                ) : (
                  <div
                    onClick={() => toggleGroup(group.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 16px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      marginTop: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: group.color, fontSize: 14 }}>{group.icon}</span>
                      <Text style={{ color: '#37352f', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {group.label}
                      </Text>
                    </div>
                    <span style={{ color: '#c7c7c5', fontSize: 10, transition: 'transform 0.2s', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                      <CaretDownOutlined />
                    </span>
                  </div>
                )}

                {/* Group items */}
                {(isOpen || collapsed) && group.items.map(item => {
                  const active = isActive(item.key, pathname)
                  return collapsed ? (
                    <Tooltip key={item.key} title={item.label} placement="right">
                      <div
                        onClick={() => router.push(item.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 36,
                          margin: '1px 8px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          color: active ? '#2383e2' : '#9b9b99',
                          background: active ? '#e8f0fc' : 'transparent',
                          fontSize: 15,
                          transition: 'all 0.15s',
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '7px 16px 7px 36px',
                        margin: '1px 8px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        color: active ? '#2383e2' : '#37352f',
                        background: active ? '#e8f0fc' : 'transparent',
                        fontWeight: active ? 600 : 400,
                        fontSize: 13,
                        transition: 'all 0.15s',
                        borderLeft: active ? 'none' : '2px solid transparent',
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#ebebea' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    </div>
                  )
                })}

                {!collapsed && <div style={{ margin: '4px 16px', borderBottom: '1px solid #ebebea' }} />}
              </div>
            )
          })}
        </div>

        {/* User card */}
        {!collapsed && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #e9e9e7',
            flexShrink: 0,
          }}>
            <Dropdown menu={userMenu} placement="topRight" trigger={['click']}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ebebea' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <Avatar size={32} style={{ background: token.colorPrimary, fontWeight: 700, flexShrink: 0 }}>
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </Avatar>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ color: '#37352f', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name ?? '...'}
                  </div>
                  <div style={{ color: '#9b9b99', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.role?.name ?? 'Administrador'}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        )}
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 64 : 240, transition: 'margin-left 0.2s', background: 'transparent' }}>
        {/* Header */}
        <Header style={{
          background: token.colorBgContainer,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          position: 'sticky',
          top: tbOffset,
          zIndex: 99,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: token.colorText, padding: '4px 8px', borderRadius: 6 }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>

          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 8 }}>
              <Avatar style={{ background: token.colorPrimary, fontWeight: 700 }} size={32}>
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </Avatar>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name ?? '...'}</div>
                <div style={{ fontSize: 11, color: token.colorTextSecondary }}>{user?.email ?? ''}</div>
              </div>
            </div>
          </Dropdown>
        </Header>

        <Content className="stellar-dashboard-shell" style={{ margin: 24, minHeight: 'calc(100vh - 112px)', background: 'transparent' }}>
          <div className="stellar-dashboard-content">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

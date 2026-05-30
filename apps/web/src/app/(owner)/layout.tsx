'use client'
import { useEffect, useState } from 'react'
import { Layout, Avatar, Dropdown, Typography, theme as antTheme, Select, Segmented, Space, Tooltip } from 'antd'
import { LogoutOutlined, ShopOutlined, ReloadOutlined } from '@ant-design/icons'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

const { Header, Content } = Layout
const { Text } = Typography

// ── Contexto owner (period + branch) exportado via localStorage + evento ──────
export const OWNER_PERIOD_KEY  = 'owner_period'
export const OWNER_BRANCH_KEY  = 'owner_branch'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const { token }   = antTheme.useToken()
  const queryClient = useQueryClient()

  const [period,       setPeriodState]  = useState<string>('today')
  const [branchFilter, setBranchState]  = useState<string>('all')

  // ── Protección: si no es owner, redirigir al dashboard normal ────────────────
  useEffect(() => {
    const can = localStorage.getItem('canViewAllBranches')
    if (can !== '1') router.replace('/')
  }, [router])

  // ── Restaurar período/sucursal desde localStorage ─────────────────────────
  useEffect(() => {
    setPeriodState(localStorage.getItem(OWNER_PERIOD_KEY)  ?? 'today')
    setBranchState(localStorage.getItem(OWNER_BRANCH_KEY)  ?? 'all')
  }, [])

  function setPeriod(v: string) {
    localStorage.setItem(OWNER_PERIOD_KEY, v)
    setPeriodState(v)
    window.dispatchEvent(new CustomEvent('owner-filter-change', { detail: { period: v, branchFilter } }))
  }
  function setBranch(v: string) {
    localStorage.setItem(OWNER_BRANCH_KEY, v)
    setBranchState(v)
    window.dispatchEvent(new CustomEvent('owner-filter-change', { detail: { period, branchFilter: v } }))
  }

  // ── Datos usuario y sucursales disponibles ────────────────────────────────
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') ?? '' : ''

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me').then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: dashData } = useQuery({
    queryKey: ['dashboard-consolidated', companyId, 'today'],
    queryFn: () => api.get('/api/dashboard/consolidated', { params: { companyId, period: 'today' } }).then(r => r.data),
    enabled: !!companyId,
    staleTime: 60_000,
  })
  const branches: { branchId: string; branchName: string }[] = dashData?.branches ?? []

  async function logout() {
    await api.post('/api/auth/logout').catch(() => {})
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = 'pos_session=; path=/; max-age=0; SameSite=Lax'
    router.push('/login')
  }

  const userMenu = {
    items: [
      { key: 'name',    label: <Text strong>{me?.name ?? 'Dueño'}</Text>,        disabled: true },
      { key: 'email',   label: <Text type="secondary" style={{ fontSize: 12 }}>{me?.email ?? ''}</Text>, disabled: true },
      { type: 'divider' as const },
      { key: 'logout',  label: 'Cerrar sesión', icon: <LogoutOutlined />, danger: true },
    ],
    onClick: ({ key }: { key: string }) => { if (key === 'logout') logout() },
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--owner-bg, #f0f2f5)' }}>
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <Header style={{
        background: token.colorBgContainer,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        gap: 16,
      }}>
        {/* Logo + nombre sistema */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: token.colorPrimary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShopOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: token.colorText }}>Polaris</div>
            <div style={{ fontSize: 10, color: token.colorTextSecondary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Panel dueño
            </div>
          </div>
        </div>

        {/* Filtros centrales */}
        <Space wrap style={{ flex: 1, justifyContent: 'center' }}>
          <Select
            value={branchFilter}
            onChange={setBranch}
            style={{ minWidth: 180 }}
            options={[
              { value: 'all', label: 'Todas las sucursales' },
              ...branches.map(b => ({ value: b.branchId, label: b.branchName })),
            ]}
          />
          <Segmented
            value={period}
            onChange={v => setPeriod(v as string)}
            options={[
              { label: 'Hoy',  value: 'today' },
              { label: 'Mes',  value: 'month' },
            ]}
          />
          <Tooltip title="Actualizar datos">
            <ReloadOutlined
              style={{ fontSize: 16, cursor: 'pointer', color: token.colorTextSecondary }}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard-consolidated'] })}
            />
          </Tooltip>
        </Space>

        {/* Usuario */}
        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 8, flexShrink: 0 }}>
            <Avatar style={{ background: token.colorPrimary, fontWeight: 700 }} size={32}>
              {me?.name?.[0]?.toUpperCase() ?? 'D'}
            </Avatar>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{me?.name ?? 'Dueño'}</div>
              <div style={{ fontSize: 11, color: token.colorTextSecondary }}>Propietario</div>
            </div>
          </div>
        </Dropdown>
      </Header>

      {/* ── Contenido ────────────────────────────────────────────────────────── */}
      <Content style={{ padding: 24, minHeight: 'calc(100vh - 64px)' }}>
        {children}
      </Content>
    </Layout>
  )
}

'use client'

/**
 * ThemeSelector — Modal de selección de temas para Polaris Enterprise.
 * Organizado en 2 pestañas: Claros y Oscuros.
 * Muestra preview de colores + nombre + emoji + indicador claro/oscuro.
 */

import { Modal, Tabs, Tooltip } from 'antd'
import {
  CheckOutlined,
  SunOutlined,
  MoonOutlined,
  BgColorsOutlined,
} from '@ant-design/icons'
import { usePolarisTheme } from '@/context/ThemeContext'
import { THEMES_LIGHT, THEMES_DARK, type PolarisTheme } from '@/config/polaris-themes'

// ─── ThemeCard ────────────────────────────────────────────────────────────────

function ThemeCard({
  theme,
  active,
  onSelect,
}: {
  theme:    PolarisTheme
  active:   boolean
  onSelect: (id: string) => void
}) {
  const [sidebarColor, primaryColor, contentColor] = theme.preview

  return (
    <Tooltip title={theme.description} placement="top">
      <button
        type="button"
        onClick={() => onSelect(theme.id)}
        style={{
          position:     'relative',
          border:       active ? `2px solid ${primaryColor}` : '2px solid transparent',
          borderRadius: 12,
          padding:      0,
          cursor:       'pointer',
          background:   'transparent',
          outline:      active ? `3px solid ${primaryColor}40` : 'none',
          transition:   'transform 0.15s ease, border-color 0.15s ease, outline 0.15s ease',
          width:        '100%',
          overflow:     'hidden',
        }}
        onMouseEnter={e => {
          if (!active) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
        }}
      >
        {/* Preview miniatura */}
        <div style={{ display: 'flex', height: 64, borderRadius: 10, overflow: 'hidden' }}>
          {/* Sidebar strip */}
          <div style={{ width: 24, background: sidebarColor, flexShrink: 0 }} />
          {/* Content area */}
          <div style={{ flex: 1, background: contentColor, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Fake header bar */}
            <div style={{ height: 6, borderRadius: 3, background: primaryColor, width: '60%' }} />
            {/* Fake rows */}
            <div style={{ height: 4, borderRadius: 2, background: `${sidebarColor}40`, width: '80%' }} />
            <div style={{ height: 4, borderRadius: 2, background: `${sidebarColor}30`, width: '65%' }} />
            {/* Fake badge */}
            <div style={{
              marginTop: 'auto',
              height:    12,
              borderRadius: 4,
              background: primaryColor,
              width:      32,
              opacity:    0.85,
            }} />
          </div>
        </div>

        {/* Label */}
        <div style={{
          padding:    '6px 8px',
          background: active ? `${primaryColor}15` : 'var(--bg-surface, #f9fafb)',
          display:    'flex',
          alignItems: 'center',
          gap:        4,
        }}>
          {/* Emoji */}
          <span style={{ fontSize: 11, flexShrink: 0 }}>{theme.emoji}</span>
          <span style={{
            fontSize:     11,
            fontWeight:   active ? 700 : 500,
            color:        active ? primaryColor : 'var(--text-primary, #1e293b)',
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            flex:         1,
          }}>
            {theme.name}
          </span>
          {/* Claro / Oscuro */}
          {theme.isDark
            ? <MoonOutlined style={{ fontSize: 9, opacity: 0.55 }} title="Oscuro" />
            : <SunOutlined  style={{ fontSize: 9, opacity: 0.55 }} title="Claro"  />
          }
          {active && (
            <CheckOutlined style={{ fontSize: 10, color: primaryColor }} />
          )}
        </div>
      </button>
    </Tooltip>
  )
}

// ─── ThemeGrid ────────────────────────────────────────────────────────────────

function ThemeGrid({
  themes,
  activeId,
  onSelect,
}: {
  themes:   PolarisTheme[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap:                 12,
      padding:             '12px 0',
    }}>
      {themes.map(t => (
        <ThemeCard
          key={t.id}
          theme={t}
          active={t.id === activeId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

// ─── ThemeSelector (Modal) ────────────────────────────────────────────────────

interface ThemeSelectorProps {
  open:    boolean
  onClose: () => void
}

export default function ThemeSelector({ open, onClose }: ThemeSelectorProps) {
  const { themeId, setTheme } = usePolarisTheme()

  function handleSelect(id: string) {
    setTheme(id)
  }

  const tabItems = [
    {
      key:   'light',
      label: <span><SunOutlined style={{ marginRight: 5 }} />Claros</span>,
      children: (
        <ThemeGrid
          themes={THEMES_LIGHT}
          activeId={themeId}
          onSelect={handleSelect}
        />
      ),
    },
    {
      key:   'dark',
      label: <span><MoonOutlined style={{ marginRight: 5 }} />Oscuros</span>,
      children: (
        <ThemeGrid
          themes={THEMES_DARK}
          activeId={themeId}
          onSelect={handleSelect}
        />
      ),
    },
  ]

  // Determina la pestaña activa según el tema seleccionado
  const activeTab = (() => {
    const found = [...THEMES_LIGHT, ...THEMES_DARK].find(t => t.id === themeId)
    return found?.isDark ? 'dark' : 'light'
  })()

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BgColorsOutlined style={{ fontSize: 18 }} />
          <span style={{ fontWeight: 700 }}>Seleccionar tema visual</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={540}
      styles={{
        body: { padding: '0 4px 8px' },
      }}
    >
      <p style={{
        margin:   '4px 0 8px',
        fontSize: 12.5,
        color:    'var(--text-secondary, #64748b)',
      }}>
        El tema se aplica de inmediato y se guarda automáticamente.
      </p>

      <Tabs
        defaultActiveKey={activeTab}
        items={tabItems}
        size="small"
        tabBarStyle={{ marginBottom: 0 }}
      />
    </Modal>
  )
}

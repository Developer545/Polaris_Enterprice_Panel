'use client'

/**
 * ThemeSelector — Modal de selección de temas + personalización de apariencia.
 * Pestañas: Claros | Oscuros | Apariencia
 */

import { Modal, Tabs, Tooltip, Button, ColorPicker } from 'antd'
import {
  CheckOutlined,
  SunOutlined,
  MoonOutlined,
  BgColorsOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { usePolarisTheme } from '@/context/ThemeContext'
import { useAppearance } from '@/context/AppearanceContext'
import {
  THEMES_LIGHT, THEMES_DARK, type PolarisTheme,
} from '@/config/polaris-themes'
import {
  FONT_OPTIONS, PRESET_COLORS,
} from '@/config/appearance'

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
          <div style={{ width: 24, background: sidebarColor, flexShrink: 0 }} />
          <div style={{ flex: 1, background: contentColor, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ height: 6, borderRadius: 3, background: primaryColor, width: '60%' }} />
            <div style={{ height: 4, borderRadius: 2, background: `${sidebarColor}40`, width: '80%' }} />
            <div style={{ height: 4, borderRadius: 2, background: `${sidebarColor}30`, width: '65%' }} />
            <div style={{ marginTop: 'auto', height: 12, borderRadius: 4, background: primaryColor, width: 32, opacity: 0.85 }} />
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
          {theme.isDark
            ? <MoonOutlined style={{ fontSize: 9, opacity: 0.55 }} />
            : <SunOutlined  style={{ fontSize: 9, opacity: 0.55 }} />
          }
          {active && <CheckOutlined style={{ fontSize: 10, color: primaryColor }} />}
        </div>
      </button>
    </Tooltip>
  )
}

// ─── ThemeGrid ────────────────────────────────────────────────────────────────

function ThemeGrid({ themes, activeId, onSelect }: {
  themes:   PolarisTheme[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, padding: '12px 0' }}>
      {themes.map(t => (
        <ThemeCard key={t.id} theme={t} active={t.id === activeId} onSelect={onSelect} />
      ))}
    </div>
  )
}

// ─── AppearanceTab ────────────────────────────────────────────────────────────

function AppearanceTab() {
  const { appearance, setAppearance, resetAppearance } = useAppearance()

  return (
    <div style={{ padding: '8px 0 8px' }}>

      {/* ── Color de acento ──────────────────────────────────────── */}
      <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary, #1e293b)', marginBottom: 10 }}>
        Color de acento
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <Tooltip title="Usar color del tema activo">
          <button
            type="button"
            onClick={() => setAppearance({ customPrimary: null })}
            style={{
              width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
              background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
              border: appearance.customPrimary === null
                ? '3px solid var(--brand-primary, #2563eb)'
                : '2px solid var(--sidebar-border, #e2e8f0)',
              position: 'relative',
            }}
          >
            {appearance.customPrimary === null && (
              <CheckOutlined style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontSize: 11, textShadow: '0 0 3px rgba(0,0,0,0.7)' }} />
            )}
          </button>
        </Tooltip>
        {PRESET_COLORS.map(hex => (
          <Tooltip key={hex} title={hex}>
            <button
              type="button"
              onClick={() => setAppearance({ customPrimary: hex })}
              style={{
                width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                background: hex, position: 'relative',
                border: appearance.customPrimary === hex ? `3px solid ${hex}` : '2px solid transparent',
                outline: appearance.customPrimary === hex ? `2px solid ${hex}50` : 'none',
              }}
            >
              {appearance.customPrimary === hex && (
                <CheckOutlined style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontSize: 11, textShadow: '0 0 3px rgba(0,0,0,0.5)' }} />
              )}
            </button>
          </Tooltip>
        ))}
        <Tooltip title="Color personalizado">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ColorPicker
              value={appearance.customPrimary ?? 'var(--brand-primary)'}
              onChange={(_, hex) => setAppearance({ customPrimary: hex })}
              size="middle"
              showText={false}
            />
          </div>
        </Tooltip>
      </div>
      {appearance.customPrimary && (
        <p style={{ margin: '0 0 16px', fontSize: 11, color: 'var(--text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: appearance.customPrimary, display: 'inline-block' }} />
          {appearance.customPrimary}
        </p>
      )}

      {/* ── Tipografía ───────────────────────────────────────────── */}
      <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary, #1e293b)', marginBottom: 10, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--sidebar-border, #e2e8f0)' }}>
        Tipografía
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {FONT_OPTIONS.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setAppearance({ fontFamily: f.id })}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
              border: appearance.fontFamily === f.id
                ? '2px solid var(--brand-primary, #2563eb)'
                : '2px solid var(--sidebar-border, #e2e8f0)',
              background: appearance.fontFamily === f.id
                ? 'var(--brand-primary-light, #dbeafe)'
                : 'var(--bg-surface, #fff)',
            }}
          >
            <span style={{ fontFamily: `'${f.id}', sans-serif`, fontSize: 14, fontWeight: 500, color: 'var(--text-primary, #1e293b)' }}>
              {f.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary, #64748b)' }}>{f.preview}</span>
            {appearance.fontFamily === f.id && <CheckOutlined style={{ fontSize: 11, color: 'var(--brand-primary, #2563eb)', marginLeft: 4 }} />}
          </button>
        ))}
      </div>

      {/* ── Reset ────────────────────────────────────────────────── */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--sidebar-border, #e2e8f0)' }}>
        <Button icon={<ReloadOutlined />} onClick={resetAppearance} size="small" style={{ fontSize: 12 }}>
          Restablecer predeterminado
        </Button>
      </div>
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

  const activeTab = (() => {
    const found = [...THEMES_LIGHT, ...THEMES_DARK].find(t => t.id === themeId)
    return found?.isDark ? 'dark' : 'light'
  })()

  const tabItems = [
    {
      key:      'light',
      label:    <span><SunOutlined style={{ marginRight: 5 }} />Claros</span>,
      children: <ThemeGrid themes={THEMES_LIGHT} activeId={themeId} onSelect={setTheme} />,
    },
    {
      key:      'dark',
      label:    <span><MoonOutlined style={{ marginRight: 5 }} />Oscuros</span>,
      children: <ThemeGrid themes={THEMES_DARK} activeId={themeId} onSelect={setTheme} />,
    },
    {
      key:      'appearance',
      label:    <span><BgColorsOutlined style={{ marginRight: 5 }} />Apariencia</span>,
      children: <AppearanceTab />,
    },
  ]

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BgColorsOutlined style={{ fontSize: 18 }} />
          <span style={{ fontWeight: 700 }}>Personalizar interfaz</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      styles={{ body: { padding: '0 4px 8px', maxHeight: '75vh', overflowY: 'auto' } }}
    >
      <p style={{ margin: '4px 0 8px', fontSize: 12.5, color: 'var(--text-secondary, #64748b)' }}>
        Los cambios se aplican de inmediato y se guardan automáticamente.
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

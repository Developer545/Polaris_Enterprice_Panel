'use client'

/**
 * ThemeSelector — Modal de selección de temas + personalización de apariencia.
 * Pestañas: Claros | Oscuros | Apariencia
 */

import { Modal, Tabs, Tooltip, Radio, Slider, Button, ColorPicker } from 'antd'
import {
  CheckOutlined,
  SunOutlined,
  MoonOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { usePolarisTheme } from '@/context/ThemeContext'
import { useAppearance } from '@/context/AppearanceContext'
import {
  THEMES_LIGHT, THEMES_DARK, type PolarisTheme,
} from '@/config/polaris-themes'
import {
  FONT_OPTIONS, FONT_SIZE_OPTIONS, BORDER_RADIUS_OPTIONS, DENSITY_OPTIONS,
  PRESET_COLORS, DEFAULT_APPEARANCE,
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

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 18 }}>
      <span style={{ color: 'var(--brand-primary, #2563eb)', fontSize: 14 }}>{icon}</span>
      <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary, #1e293b)' }}>{label}</span>
    </div>
  )
}

function AppearanceTab() {
  const { appearance, setAppearance, resetAppearance } = useAppearance()

  return (
    <div style={{ padding: '4px 0 8px' }}>

      {/* ── Tipografía ───────────────────────────────────────────── */}
      <SectionLabel icon={<FontSizeOutlined />} label="Tipografía" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FONT_OPTIONS.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setAppearance({ fontFamily: f.id })}
            style={{
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'space-between',
              padding:      '10px 14px',
              borderRadius: 10,
              border:       appearance.fontFamily === f.id
                ? '2px solid var(--brand-primary, #2563eb)'
                : '2px solid var(--sidebar-border, #e2e8f0)',
              background:   appearance.fontFamily === f.id
                ? 'var(--brand-primary-light, #dbeafe)'
                : 'var(--bg-surface, #fff)',
              cursor:       'pointer',
              transition:   'all 0.15s',
            }}
          >
            <span style={{
              fontFamily: `'${f.id}', sans-serif`,
              fontSize:   15,
              fontWeight: 500,
              color:      'var(--text-primary, #1e293b)',
            }}>
              {f.label}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
              {f.preview}
            </span>
            {appearance.fontFamily === f.id && (
              <CheckOutlined style={{ fontSize: 12, color: 'var(--brand-primary, #2563eb)', marginLeft: 4 }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tamaño de texto ──────────────────────────────────────── */}
      <SectionLabel icon={<span style={{ fontSize: 13, fontWeight: 700 }}>Aa</span>} label="Tamaño de texto" />
      <Radio.Group
        value={appearance.fontSize}
        onChange={e => setAppearance({ fontSize: e.target.value })}
        buttonStyle="solid"
        size="middle"
        style={{ display: 'flex', gap: 8 }}
      >
        {FONT_SIZE_OPTIONS.map(o => (
          <Radio.Button
            key={o.value}
            value={o.value}
            style={{ flex: 1, textAlign: 'center', borderRadius: 8 }}
          >
            {o.label}
          </Radio.Button>
        ))}
      </Radio.Group>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {FONT_SIZE_OPTIONS.map(o => (
          <span key={o.value} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--text-secondary, #64748b)' }}>
            {o.value}px
          </span>
        ))}
      </div>

      {/* ── Bordes ───────────────────────────────────────────────── */}
      <SectionLabel icon={<span style={{ fontSize: 14 }}>▢</span>} label="Radio de bordes" />
      <div style={{ display: 'flex', gap: 8 }}>
        {BORDER_RADIUS_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => setAppearance({ borderRadius: o.value })}
            style={{
              flex:         1,
              padding:      '10px 4px 8px',
              display:      'flex',
              flexDirection: 'column',
              alignItems:   'center',
              gap:          4,
              borderRadius: Math.min(o.value + 4, 16),
              border:       appearance.borderRadius === o.value
                ? '2px solid var(--brand-primary, #2563eb)'
                : '2px solid var(--sidebar-border, #e2e8f0)',
              background:   appearance.borderRadius === o.value
                ? 'var(--brand-primary-light, #dbeafe)'
                : 'var(--bg-surface, #fff)',
              cursor:       'pointer',
              transition:   'all 0.15s',
            }}
          >
            {/* Mini preview box */}
            <div style={{
              width:        28,
              height:       20,
              borderRadius: o.value,
              background:   appearance.borderRadius === o.value
                ? 'var(--brand-primary, #2563eb)'
                : 'var(--sidebar-border, #e2e8f0)',
              transition:   'all 0.15s',
            }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary, #1e293b)' }}>{o.label}</span>
          </button>
        ))}
      </div>

      {/* ── Densidad ──────────────────────────────────────────────── */}
      <SectionLabel icon={<span style={{ fontSize: 13 }}>☰</span>} label="Densidad de la interfaz" />
      <div style={{ display: 'flex', gap: 8 }}>
        {DENSITY_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => setAppearance({ density: o.value })}
            style={{
              flex:         1,
              padding:      '10px 6px',
              display:      'flex',
              flexDirection: 'column',
              alignItems:   'center',
              gap:          3,
              borderRadius: 10,
              border:       appearance.density === o.value
                ? '2px solid var(--brand-primary, #2563eb)'
                : '2px solid var(--sidebar-border, #e2e8f0)',
              background:   appearance.density === o.value
                ? 'var(--brand-primary-light, #dbeafe)'
                : 'var(--bg-surface, #fff)',
              cursor:       'pointer',
              transition:   'all 0.15s',
            }}
          >
            {/* Mini density preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: o.value === 'compact' ? 2 : o.value === 'comfortable' ? 5 : 3, marginBottom: 2 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:        32,
                  height:       o.value === 'compact' ? 4 : o.value === 'comfortable' ? 6 : 5,
                  borderRadius: 2,
                  background:   appearance.density === o.value
                    ? 'var(--brand-primary, #2563eb)'
                    : 'var(--sidebar-border, #e2e8f0)',
                  opacity:      i === 0 ? 1 : i === 1 ? 0.7 : 0.4,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>{o.label}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary, #64748b)' }}>{o.desc}</span>
          </button>
        ))}
      </div>

      {/* ── Color de acento ──────────────────────────────────────── */}
      <SectionLabel icon={<span style={{ fontSize: 14 }}>◉</span>} label="Color de acento" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {/* Reset to theme color */}
        <Tooltip title="Usar color del tema activo">
          <button
            type="button"
            onClick={() => setAppearance({ customPrimary: null })}
            style={{
              width:        32,
              height:       32,
              borderRadius: '50%',
              border:       appearance.customPrimary === null
                ? '3px solid var(--brand-primary, #2563eb)'
                : '2px solid var(--sidebar-border, #e2e8f0)',
              background:   'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
              cursor:       'pointer',
              position:     'relative',
              flexShrink:   0,
            }}
          >
            {appearance.customPrimary === null && (
              <CheckOutlined style={{
                position:  'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                color:     '#fff', fontSize: 12,
                textShadow: '0 0 3px rgba(0,0,0,0.6)',
              }} />
            )}
          </button>
        </Tooltip>
        {/* Preset swatches */}
        {PRESET_COLORS.map(hex => (
          <Tooltip key={hex} title={hex}>
            <button
              type="button"
              onClick={() => setAppearance({ customPrimary: hex })}
              style={{
                width:        32,
                height:       32,
                borderRadius: '50%',
                border:       appearance.customPrimary === hex
                  ? `3px solid ${hex}`
                  : '2px solid transparent',
                outline:      appearance.customPrimary === hex ? `2px solid ${hex}50` : 'none',
                background:   hex,
                cursor:       'pointer',
                flexShrink:   0,
                position:     'relative',
              }}
            >
              {appearance.customPrimary === hex && (
                <CheckOutlined style={{
                  position:  'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  color:     '#fff', fontSize: 12,
                  textShadow: '0 0 3px rgba(0,0,0,0.5)',
                }} />
              )}
            </button>
          </Tooltip>
        ))}
        {/* Custom color picker */}
        <Tooltip title="Color personalizado">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ColorPicker
              value={appearance.customPrimary ?? '#2563eb'}
              onChange={(_, hex) => setAppearance({ customPrimary: hex })}
              size="middle"
              showText={false}
              style={{ borderRadius: '50%' }}
            />
          </div>
        </Tooltip>
      </div>
      {appearance.customPrimary && (
        <div style={{
          fontSize: 11, color: 'var(--text-secondary, #64748b)',
          marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: appearance.customPrimary, display: 'inline-block', flexShrink: 0 }} />
          Color activo: {appearance.customPrimary}
        </div>
      )}

      {/* ── Reset ────────────────────────────────────────────────── */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--sidebar-border, #e2e8f0)' }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={resetAppearance}
          size="small"
          style={{ fontSize: 12 }}
        >
          Restablecer apariencia predeterminada
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

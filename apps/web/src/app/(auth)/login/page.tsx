'use client'
import { useState, useEffect } from 'react'
import { useAppearance } from '@/context/AppearanceContext'
import { PRESET_COLORS, FONT_OPTIONS } from '@/config/appearance'
import Aurora  from './_designs/aurora'
import Bloom   from './_designs/bloom'
import Cloud   from './_designs/cloud'
import Petal   from './_designs/petal'
import Dreamy  from './_designs/dreamy'
import Candy   from './_designs/candy'
import Velvet  from './_designs/velvet'
import Spring  from './_designs/spring'
import Carbon  from './_designs/carbon'
import Command from './_designs/command'
import Steel   from './_designs/steel'
import Forge   from './_designs/forge'
import Nexus   from './_designs/nexus'

const DESIGNS = {
  aurora: Aurora, bloom: Bloom, cloud: Cloud,
  petal: Petal, dreamy: Dreamy, candy: Candy, velvet: Velvet, spring: Spring,
  carbon: Carbon, command: Command, steel: Steel, forge: Forge, nexus: Nexus,
} as const
type DesignKey = keyof typeof DESIGNS

const GROUPS: { label: string; keys: DesignKey[] }[] = [
  { label: '✦ Femenino', keys: ['aurora', 'bloom', 'cloud', 'petal', 'dreamy', 'candy', 'velvet', 'spring'] },
  { label: '◈ Masculino', keys: ['carbon', 'command', 'steel', 'forge', 'nexus'] },
]

const DESIGN_KEY = 'polaris-login-design'
const DEFAULT: DesignKey = 'aurora'

function isSavedKey(v: unknown): v is DesignKey {
  return typeof v === 'string' && v in DESIGNS
}

// ── Floating button base style ───────────────────────────────────────────────
const floatBtn: React.CSSProperties = {
  position: 'fixed', zIndex: 9999,
  width: 36, height: 36, borderRadius: '50%', border: 'none',
  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
  transition: 'background 0.15s',
}

export default function LoginPage() {
  const [active,       setActive]       = useState<DesignKey>(DEFAULT)
  const [designOpen,   setDesignOpen]   = useState(false)
  const [paletteOpen,  setPaletteOpen]  = useState(false)
  const [ready,        setReady]        = useState(false)
  const { appearance, setAppearance }   = useAppearance()

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DESIGN_KEY)
      if (isSavedKey(saved)) setActive(saved)
    } catch {}
    setReady(true)
  }, [])

  function selectDesign(key: DesignKey) {
    setActive(key); setDesignOpen(false)
    try { localStorage.setItem(DESIGN_KEY, key) } catch {}
  }

  if (!ready) return null
  const Active = DESIGNS[active]

  return (
    <>
      <Active />

      {/* ── Design switcher (bottom-right) ── */}
      <button
        onClick={() => { setDesignOpen(o => !o); setPaletteOpen(false) }}
        title="Cambiar diseño de login"
        style={{ ...floatBtn, bottom: 20, right: 20, transform: designOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20 12h-2M6 12H4M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 20v-2M12 6V4"/>
        </svg>
      </button>

      {designOpen && (
        <div style={{
          position: 'fixed', bottom: 64, right: 20, zIndex: 9998,
          background: 'rgba(8,8,12,0.88)', backdropFilter: 'blur(16px)',
          borderRadius: 16, padding: '14px 14px 10px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.07)', width: 160,
          animation: 'slideUp 0.18s ease',
        }}>
          {GROUPS.map(({ label, keys }) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 2 }}>
                {label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {keys.map(key => (
                  <button key={key} onClick={() => selectDesign(key)} style={{
                    padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontWeight: active === key ? 700 : 400,
                    background: active === key ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.06)',
                    color: active === key ? '#111' : 'rgba(255,255,255,0.65)',
                    fontSize: 11, letterSpacing: '0.03em', transition: 'all 0.12s',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 7,
                  }}>
                    {active === key && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />}
                    {key}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 7, marginTop: 4, color: 'rgba(255,255,255,0.18)', fontSize: 8, letterSpacing: '0.06em', textAlign: 'center' }}>
            guardado automáticamente
          </div>
        </div>
      )}

      {/* ── Palette button (bottom-left) ── */}
      <button
        onClick={() => { setPaletteOpen(o => !o); setDesignOpen(false) }}
        title="Personalizar color y fuente"
        style={{ ...floatBtn, bottom: 20, left: 20 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="13.5" cy="6.5" r="1" fill="rgba(255,255,255,0.9)"/>
          <circle cx="17.5" cy="10.5" r="1" fill="rgba(255,255,255,0.9)"/>
          <circle cx="8.5"  cy="7.5"  r="1" fill="rgba(255,255,255,0.9)"/>
          <circle cx="6.5"  cy="12.5" r="1" fill="rgba(255,255,255,0.9)"/>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
            stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" fill="none"/>
        </svg>
      </button>

      {paletteOpen && (
        <div style={{
          position: 'fixed', bottom: 64, left: 20, zIndex: 9998,
          background: 'rgba(8,8,12,0.92)', backdropFilter: 'blur(20px)',
          borderRadius: 16, padding: '14px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.07)', width: 210,
          animation: 'slideUp 0.18s ease',
        }}>
          {/* Color section */}
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
            Color de acento
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
            {/* Reset to theme color */}
            <button
              onClick={() => setAppearance({ customPrimary: null })}
              title="Color del tema activo"
              style={{
                width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
                boxShadow: appearance.customPrimary === null ? '0 0 0 2px #fff, 0 0 0 4px rgba(255,255,255,0.3)' : 'none',
                flexShrink: 0,
              }}
            />
            {PRESET_COLORS.map(hex => (
              <button
                key={hex}
                onClick={() => setAppearance({ customPrimary: hex })}
                title={hex}
                style={{
                  width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: hex, flexShrink: 0,
                  boxShadow: appearance.customPrimary === hex
                    ? `0 0 0 2px #fff, 0 0 0 4px ${hex}80`
                    : 'none',
                  transition: 'box-shadow 0.12s',
                }}
              />
            ))}
          </div>

          {/* Font section */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Tipografía
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {FONT_OPTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setAppearance({ fontFamily: f.id })}
                  style={{
                    padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: appearance.fontFamily === f.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.06)',
                    color: appearance.fontFamily === f.id ? '#111' : 'rgba(255,255,255,0.7)',
                    fontFamily: `'${f.id}', sans-serif`,
                    fontSize: 12, fontWeight: appearance.fontFamily === f.id ? 700 : 400,
                    textAlign: 'left', transition: 'all 0.12s',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span>{f.label}</span>
                  {appearance.fontFamily === f.id && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 7, marginTop: 10, color: 'rgba(255,255,255,0.18)', fontSize: 8, letterSpacing: '0.06em', textAlign: 'center' }}>
            guardado automáticamente
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

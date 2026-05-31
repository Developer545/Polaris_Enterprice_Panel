'use client'
import { useState, useEffect } from 'react'
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

const STORAGE_KEY = 'polaris-login-design'
const DEFAULT: DesignKey = 'aurora'

function isSavedKey(v: unknown): v is DesignKey {
  return typeof v === 'string' && v in DESIGNS
}

export default function LoginPage() {
  const [active, setActive] = useState<DesignKey>(DEFAULT)
  const [open,   setOpen]   = useState(false)
  const [ready,  setReady]  = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (isSavedKey(saved)) setActive(saved)
    } catch {}
    setReady(true)
  }, [])

  function select(key: DesignKey) {
    setActive(key)
    setOpen(false)
    try { localStorage.setItem(STORAGE_KEY, key) } catch {}
  }

  if (!ready) return null
  const Active = DESIGNS[active]

  return (
    <>
      <Active />

      {/* ── Toggle button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Cambiar diseño de login"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          transition: 'transform 0.2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20 12h-2M6 12H4M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 20v-2M12 6V4"/>
        </svg>
      </button>

      {/* ── Panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 64, right: 20, zIndex: 9998,
          background: 'rgba(8,8,12,0.88)', backdropFilter: 'blur(16px)',
          borderRadius: 16, padding: '14px 14px 10px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.07)',
          width: 160,
          animation: 'slideUp 0.18s ease',
        }}>
          {GROUPS.map(({ label, keys }) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{
                color: 'rgba(255,255,255,0.3)', fontSize: 9,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                marginBottom: 6, paddingLeft: 2,
              }}>
                {label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {keys.map(key => (
                  <button
                    key={key}
                    onClick={() => select(key)}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontWeight: active === key ? 700 : 400,
                      background: active === key ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.06)',
                      color: active === key ? '#111' : 'rgba(255,255,255,0.65)',
                      fontSize: 11, letterSpacing: '0.03em',
                      transition: 'all 0.12s',
                      textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 7,
                    }}
                  >
                    {active === key && (
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                    )}
                    {key}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 7, marginTop: 4,
            color: 'rgba(255,255,255,0.18)', fontSize: 8,
            letterSpacing: '0.06em', textAlign: 'center',
          }}>
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

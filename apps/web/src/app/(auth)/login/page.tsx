'use client'
import { useState, useEffect } from 'react'
import Aurora from './_designs/aurora'
import Bloom  from './_designs/bloom'
import Cloud  from './_designs/cloud'

const DESIGNS = { aurora: Aurora, bloom: Bloom, cloud: Cloud } as const
type DesignKey = keyof typeof DESIGNS
const STORAGE_KEY = 'polaris-login-design'
const DEFAULT: DesignKey = 'aurora'

function isSavedKey(v: unknown): v is DesignKey {
  return typeof v === 'string' && v in DESIGNS
}

export default function LoginPage() {
  const [active, setActive]   = useState<DesignKey>(DEFAULT)
  const [open,   setOpen]     = useState(false)
  const [ready,  setReady]    = useState(false)

  // Restore saved design on mount
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

      {/* ── Toggle pill ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Cambiar diseño de login"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
          transition: 'transform 0.2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20 12h-2M6 12H4M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 20v-2M12 6V4"/>
        </svg>
      </button>

      {/* ── Panel de diseños ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 64, right: 20, zIndex: 9998,
          display: 'flex', flexDirection: 'column', gap: 4,
          background: 'rgba(10,10,10,0.82)', backdropFilter: 'blur(14px)',
          borderRadius: 14, padding: '12px 14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.08)',
          minWidth: 130,
          animation: 'slideUp 0.18s ease',
        }}>
          <span style={{
            color: 'rgba(255,255,255,0.35)', fontSize: 9,
            textAlign: 'center', letterSpacing: '0.14em',
            textTransform: 'uppercase', marginBottom: 4,
          }}>
            diseño de login
          </span>

          {(Object.keys(DESIGNS) as DesignKey[]).map(key => (
            <button
              key={key}
              onClick={() => select(key)}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: active === key ? 700 : 400,
                background: active === key ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.08)',
                color: active === key ? '#111' : 'rgba(255,255,255,0.7)',
                fontSize: 12, letterSpacing: '0.04em',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {active === key && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              )}
              {key}
            </button>
          ))}

          <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 6 }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, letterSpacing: '0.06em' }}>
              guardado automáticamente
            </span>
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

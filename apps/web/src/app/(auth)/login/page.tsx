'use client'
// ─── SELECTOR DE DISEÑO ─────────────────────────────────────────────────────
// Botón flotante (abajo derecha) para cambiar entre diseños en tiempo real.
// Para producción: quitar el wrapper y exportar directamente el diseño activo:
//   export { default } from './_designs/aurora'
// ─────────────────────────────────────���───────────────────────────────────────
import { useState } from 'react'
import Aurora from './_designs/aurora'
import Bloom  from './_designs/bloom'
import Cloud  from './_designs/cloud'

const DESIGNS = { aurora: Aurora, bloom: Bloom, cloud: Cloud } as const
type DesignKey = keyof typeof DESIGNS

export default function LoginPage() {
  const [active, setActive] = useState<DesignKey>('aurora')
  const Active = DESIGNS[active]

  return (
    <>
      <Active />

      {/* ── Switcher flotante temporal ── */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 6,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(10px)',
        borderRadius: 14,
        padding: '10px 12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <span style={{
          color: 'rgba(255,255,255,0.4)', fontSize: 9,
          textAlign: 'center', letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>diseño</span>

        {(Object.keys(DESIGNS) as DesignKey[]).map(key => (
          <button
            key={key}
            onClick={() => setActive(key)}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: active === key ? 700 : 400,
              background: active === key ? '#fff' : 'rgba(255,255,255,0.12)',
              color: active === key ? '#222' : 'rgba(255,255,255,0.75)',
              fontSize: 12,
              letterSpacing: '0.03em',
              transition: 'all 0.15s',
            }}
          >
            {key}
          </button>
        ))}
      </div>
    </>
  )
}

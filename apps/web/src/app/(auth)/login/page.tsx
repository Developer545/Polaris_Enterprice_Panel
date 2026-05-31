'use client'
import { useState, useEffect, useRef } from 'react'
import { useAppearance } from '@/context/AppearanceContext'
import { PRESET_COLORS, PRESET_TEXT_COLORS, FONT_OPTIONS } from '@/config/appearance'
import { getClient } from '@pos-dte/shared-api'
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

const floatBtn: React.CSSProperties = {
  position: 'fixed', zIndex: 9999,
  width: 36, height: 36, borderRadius: '50%', border: 'none',
  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
}

interface Branding { name: string; logoUrl: string | null }

export default function LoginPage() {
  const [active,       setActive]       = useState<DesignKey>(DEFAULT)
  const [designOpen,   setDesignOpen]   = useState(false)
  const [paletteOpen,  setPaletteOpen]  = useState(false)
  const [ready,        setReady]        = useState(false)
  const { appearance, setAppearance }   = useAppearance()
  const colorInputRef   = useRef<HTMLInputElement>(null)
  const textInputRef    = useRef<HTMLInputElement>(null)

  // ── Branding / 2-step state ───────────────────────────────────────────────
  const [step,          setStep]          = useState<'company' | 'login'>('company')
  const [branding,      setBranding]      = useState<Branding | null>(null)
  const [companyInput,  setCompanyInput]  = useState('')
  const [brandingError, setBrandingError] = useState<string | null>(null)
  const [brandingLoad,  setBrandingLoad]  = useState(false)

  async function fetchBranding(id: string): Promise<boolean> {
    setBrandingLoad(true)
    setBrandingError(null)
    try {
      const res = await getClient().get(`/api/auth/branding?companyId=${encodeURIComponent(id)}`)
      const b = { name: res.data.name, logoUrl: res.data.logoUrl ?? null }
      setBranding(b)
      try {
        if (b.logoUrl) localStorage.setItem('companyLogoUrl', b.logoUrl)
        else localStorage.removeItem('companyLogoUrl')
        localStorage.setItem('companyName', b.name)
      } catch {}
      return true
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 404) {
        setBrandingError('Empresa no encontrada. Verifica el ID.')
      } else {
        setBrandingError('Error al conectar con el servidor.')
      }
      return false
    } finally {
      setBrandingLoad(false)
    }
  }

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = companyInput.trim()
    if (!id) return
    const ok = await fetchBranding(id)
    if (ok) {
      try { localStorage.setItem('companyId', id) } catch {}
      setStep('login')
    }
  }

  function goBackToCompany() {
    setStep('company')
    setBranding(null)
    setBrandingError(null)
    try {
      localStorage.removeItem('companyId')
      localStorage.removeItem('companyLogoUrl')
      localStorage.removeItem('companyName')
    } catch {}
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DESIGN_KEY)
      if (isSavedKey(saved)) setActive(saved)
    } catch {}

    // Si hay companyId guardado, saltar directo al paso 2
    const savedCompanyId = (() => { try { return localStorage.getItem('companyId') } catch { return null } })()
    if (savedCompanyId) {
      setCompanyInput(savedCompanyId)
      fetchBranding(savedCompanyId).then(ok => {
        if (ok) setStep('login')
      })
    }

    setReady(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function selectDesign(key: DesignKey) {
    setActive(key); setDesignOpen(false)
    try { localStorage.setItem(DESIGN_KEY, key) } catch {}
  }

  if (!ready) return null
  const Active = DESIGNS[active]

  // ── Paso 1: EnterpriseGate — split layout premium ─────────────────────────
  if (step === 'company') {
    return (
      <>
        <style>{`
          @keyframes eg-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes eg-fade-in {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes eg-pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.5; }
          }
          * { box-sizing: border-box; }
          .eg-wrap {
            display: flex;
            min-height: 100vh;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          /* ── Panel izquierdo ── */
          .eg-left {
            width: 48%;
            flex-shrink: 0;
            position: relative;
            overflow: hidden;
            background-color: #050508;
            background-image:
              linear-gradient(rgba(124,58,237,0.35) 1px, transparent 1px),
              linear-gradient(90deg, rgba(124,58,237,0.35) 1px, transparent 1px);
            background-size: 44px 44px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 52px;
          }
          .eg-left-glow {
            position: absolute;
            inset: 0;
            background:
              radial-gradient(ellipse 70% 55% at 15% 40%, rgba(124,58,237,0.30) 0%, transparent 65%),
              radial-gradient(ellipse 50% 40% at 85% 70%, rgba(79,70,229,0.18) 0%, transparent 60%);
            pointer-events: none;
          }
          .eg-left-vignette {
            position: absolute;
            inset: 0;
            background:
              linear-gradient(to right, transparent 70%, #050508 100%),
              linear-gradient(to bottom, transparent 70%, #050508 100%);
            pointer-events: none;
          }
          /* ── Panel derecho ── */
          .eg-right {
            flex: 1;
            background: #F8F9FB;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px 32px;
            position: relative;
          }
          .eg-right::before {
            content: '';
            position: absolute;
            top: 0; left: 0; bottom: 0;
            width: 1px;
            background: linear-gradient(to bottom, transparent, rgba(124,58,237,0.15) 30%, rgba(124,58,237,0.15) 70%, transparent);
          }
          /* ── Input ── */
          .eg-input {
            display: block;
            width: 100%;
            height: 50px;
            border: 1.5px solid #E2E5EA;
            border-radius: 12px;
            padding: 0 46px 0 16px;
            font-size: 15px;
            color: #0F172A;
            background: #FFFFFF;
            font-family: inherit;
            transition: border-color 0.15s, box-shadow 0.15s;
            letter-spacing: 0.01em;
          }
          .eg-input::placeholder { color: #B0B8C6; }
          .eg-input:focus {
            border-color: #7C3AED;
            box-shadow: 0 0 0 4px rgba(124,58,237,0.10);
            outline: none;
          }
          .eg-input.error { border-color: #EF4444; }
          .eg-input.error:focus { box-shadow: 0 0 0 4px rgba(239,68,68,0.10); }
          /* ── Botón ── */
          .eg-btn {
            width: 100%;
            height: 50px;
            background: #7C3AED;
            color: #fff;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-family: inherit;
            letter-spacing: 0.01em;
            box-shadow: 0 4px 14px rgba(124,58,237,0.35);
          }
          .eg-btn:hover:not(:disabled) {
            background: #6D28D9;
            box-shadow: 0 6px 20px rgba(124,58,237,0.45);
          }
          .eg-btn:active:not(:disabled) { transform: translateY(1px); }
          .eg-btn:disabled {
            background: #C4B5FD;
            box-shadow: none;
            cursor: not-allowed;
          }
          .eg-error { animation: eg-fade-in 0.18s ease; }
          @media (max-width: 820px) {
            .eg-left { display: none; }
            .eg-right::before { display: none; }
          }
        `}</style>

        <div className="eg-wrap">

          {/* ══ PANEL IZQUIERDO ══════════════════════════════════════════════ */}
          <div className="eg-left">
            <div className="eg-left-glow" />
            <div className="eg-left-vignette" />

            {/* Logo + nombre */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(124,58,237,0.20)',
                  border: '1px solid rgba(124,58,237,0.50)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0 24px rgba(124,58,237,0.25)',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z"
                      stroke="rgba(196,181,253,0.9)" strokeWidth="1.5" fill="rgba(124,58,237,0.15)" />
                    <path d="M12 6L17 8.5V13.5L12 16L7 13.5V8.5L12 6Z"
                      fill="rgba(167,139,250,0.35)" stroke="rgba(196,181,253,0.7)" strokeWidth="0.75" />
                  </svg>
                </div>
                <div>
                  <div style={{ color: '#F1F0FF', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    Polaris Enterprise
                  </div>
                  <div style={{ color: '#6B7AA0', fontSize: 12, marginTop: 3, letterSpacing: '0.01em' }}>
                    Sistema ERP · El Salvador
                  </div>
                </div>
              </div>

              {/* Separador */}
              <div style={{ height: 1, background: 'rgba(124,58,237,0.25)', marginBottom: 40 }} />

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {[
                  { icon: '◈', text: 'Facturación DTE certificada MH' },
                  { icon: '◈', text: 'Multi-sucursal y multi-usuario' },
                  { icon: '◈', text: 'Planilla ISSS · AFP · Renta ISR' },
                  { icon: '◈', text: 'Inventario y punto de venta' },
                  { icon: '◈', text: 'Reportes y contabilidad' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ color: '#A78BFA', fontSize: 14, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
                    <span style={{ color: '#94A3B8', fontSize: 13.5, lineHeight: 1.4 }}>{text}</span>
                  </div>
                ))}
              </div>

              {/* Status badge */}
              <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 99, padding: '4px 10px',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#10B981',
                    animation: 'eg-pulse 2s ease-in-out infinite', flexShrink: 0,
                  }} />
                  <span style={{ color: '#6EE7B7', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em' }}>
                    Todos los sistemas operativos
                  </span>
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ position: 'relative', zIndex: 2, color: '#2D3748', fontSize: 11, letterSpacing: '0.03em' }}>
              © {new Date().getFullYear()} Polaris Enterprise
            </div>
          </div>

          {/* ══ PANEL DERECHO ════════════════════════════════════════════════ */}
          <div className="eg-right">
            <div style={{ width: '100%', maxWidth: 390 }}>

              {/* Badge */}
              <div style={{ marginBottom: 28 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: '1px solid #E2E5EA',
                  color: '#64748B',
                  fontSize: 11, fontWeight: 500,
                  borderRadius: 99,
                  padding: '4px 12px',
                  background: '#FFFFFF',
                  letterSpacing: '0.03em',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7C3AED', flexShrink: 0 }} />
                  ERP · El Salvador
                </span>
              </div>

              {/* Título */}
              <h1 style={{
                margin: 0,
                color: '#0F172A',
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: '-0.6px',
                lineHeight: 1.2,
                fontFamily: 'inherit',
              }}>
                Accede a tu empresa
              </h1>
              <p style={{ margin: '10px 0 0', color: '#64748B', fontSize: 14, lineHeight: 1.6 }}>
                Ingresa el identificador de tu empresa para continuar al sistema.
              </p>

              <div style={{ marginTop: 36 }} />

              {/* Formulario */}
              <form onSubmit={handleCompanySubmit}>
                <label style={{
                  display: 'block',
                  color: '#64748B',
                  fontSize: 11.5,
                  fontWeight: 600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  fontFamily: 'inherit',
                }}>
                  ID de empresa
                </label>

                {/* Input wrapper con ícono */}
                <div style={{ position: 'relative' }}>
                  <input
                    className={`eg-input${brandingError ? ' error' : ''}`}
                    type="text"
                    value={companyInput}
                    onChange={e => setCompanyInput(e.target.value)}
                    placeholder="ej: garcia-market"
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <span style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    color: brandingError ? '#EF4444' : companyInput ? '#7C3AED' : '#CBD5E1',
                    transition: 'color 0.15s', pointerEvents: 'none',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                  </span>
                </div>

                {/* Error */}
                {brandingError && (
                  <div className="eg-error" style={{
                    marginTop: 8, color: '#EF4444', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.4,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2" />
                      <path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    {brandingError}
                  </div>
                )}

                {/* Botón */}
                <button
                  type="submit"
                  className="eg-btn"
                  disabled={brandingLoad || !companyInput.trim()}
                  style={{ marginTop: brandingError ? 16 : 20 }}
                >
                  {brandingLoad ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        style={{ animation: 'eg-spin 0.75s linear infinite', flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      Verificando...
                    </>
                  ) : (
                    <>
                      Continuar
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Hint */}
              <p style={{ marginTop: 20, color: '#94A3B8', fontSize: 13, textAlign: 'center', cursor: 'default', userSelect: 'none' }}>
                ¿No tienes acceso?{' '}
                <span style={{ color: '#7C3AED', cursor: 'pointer' }}>Contacta a soporte</span>
              </p>

              {/* Footer */}
              <p style={{ marginTop: 44, color: '#CBD5E1', fontSize: 11.5, textAlign: 'center', letterSpacing: '0.02em' }}>
                © {new Date().getFullYear()} Polaris Enterprise
              </p>
            </div>
          </div>

        </div>
      </>
    )
  }

  const sectionLabel = (text: string) => (
    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
      {text}
    </div>
  )

  const colorDot = (hex: string | null, isActive: boolean, onClick: () => void, title: string, isRainbow = false) => (
    <button
      key={hex ?? 'reset'}
      onClick={onClick}
      title={title}
      style={{
        width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
        background: isRainbow ? 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' : (hex ?? '#888'),
        boxShadow: isActive ? '0 0 0 2px #fff, 0 0 0 4px rgba(255,255,255,0.25)' : 'none',
        transition: 'box-shadow 0.12s',
      }}
    />
  )

  return (
    <>
      <Active />

      {/* ── Branding overlay (logo empresa) ── */}
      {branding?.logoUrl && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
          borderRadius: 12, padding: '8px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          pointerEvents: 'none',
        }}>
          <img src={branding.logoUrl} alt={branding.name} style={{ height: 36, objectFit: 'contain' }} />
          <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{branding.name}</span>
        </div>
      )}

      {/* ── Cambiar empresa (bottom-left, encima de la paleta) ── */}
      <button
        onClick={goBackToCompany}
        title="Cambiar empresa"
        style={{
          position: 'fixed', bottom: 64, left: 20, zIndex: 9997,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20, padding: '6px 14px',
          color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Cambiar empresa
      </button>

      {/* ── Design switcher (bottom-right) ── */}
      <button
        onClick={() => { setDesignOpen(o => !o); setPaletteOpen(false) }}
        title="Cambiar diseño de login"
        style={{ ...floatBtn, bottom: 20, right: 20, transform: designOpen ? 'rotate(45deg)' : 'none' }}
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
              {keys.map(key => (
                <button key={key} onClick={() => selectDesign(key)} style={{
                  width: '100%', padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: active === key ? 700 : 400,
                  background: active === key ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.06)',
                  color: active === key ? '#111' : 'rgba(255,255,255,0.65)',
                  fontSize: 11, letterSpacing: '0.03em', transition: 'all 0.12s',
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3,
                }}>
                  {active === key && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />}
                  {key}
                </button>
              ))}
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
          position: 'fixed', bottom: 108, left: 20, zIndex: 9998,
          background: 'rgba(8,8,12,0.93)', backdropFilter: 'blur(20px)',
          borderRadius: 16, padding: '14px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.07)', width: 224,
          animation: 'slideUp 0.18s ease',
        }}>

          {/* ── Accent color ── */}
          {sectionLabel('Color principal')}

          {/* Full spectrum bar → opens native color picker */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <button
              onClick={() => colorInputRef.current?.click()}
              style={{
                width: '100%', height: 22, borderRadius: 11, border: '1.5px solid rgba(255,255,255,0.12)',
                background: 'linear-gradient(to right, hsl(0,100%,55%),hsl(30,100%,55%),hsl(60,100%,55%),hsl(90,100%,55%),hsl(120,100%,55%),hsl(150,100%,55%),hsl(180,100%,55%),hsl(210,100%,55%),hsl(240,100%,55%),hsl(270,100%,55%),hsl(300,100%,55%),hsl(330,100%,55%),hsl(360,100%,55%))',
                cursor: 'pointer', display: 'block',
                position: 'relative', overflow: 'hidden',
              }}
              title="Abrir selector de color completo"
            >
              {appearance.customPrimary && (
                <span style={{
                  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                  left: '50%', marginLeft: '-11px',
                  width: 16, height: 16, borderRadius: '50%',
                  background: appearance.customPrimary,
                  border: '2px solid white',
                  boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                  display: 'block',
                }}/>
              )}
            </button>
            <input
              ref={colorInputRef}
              type="color"
              value={appearance.customPrimary ?? '#2563eb'}
              onChange={e => setAppearance({ customPrimary: e.target.value })}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, top: 0, left: 0 }}
            />
          </div>

          {/* Preset dots */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {colorDot(null, appearance.customPrimary === null, () => setAppearance({ customPrimary: null }), 'Color del tema activo', true)}
            {PRESET_COLORS.map(hex =>
              colorDot(hex, appearance.customPrimary === hex, () => setAppearance({ customPrimary: hex }), hex)
            )}
          </div>

          {/* ── Text color ── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
            {sectionLabel('Color de texto')}

            {/* Full spectrum bar for text color */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <button
                onClick={() => textInputRef.current?.click()}
                style={{
                  width: '100%', height: 22, borderRadius: 11, border: '1.5px solid rgba(255,255,255,0.12)',
                  background: 'linear-gradient(to right, #000000, #1e293b, #3b1f6e, #831843, #ffffff, #f0fdf4, #ecfeff)',
                  cursor: 'pointer', display: 'block', position: 'relative', overflow: 'hidden',
                }}
                title="Abrir selector de color de texto"
              >
                {appearance.customTextColor && (
                  <span style={{
                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    left: '50%', marginLeft: '-11px',
                    width: 16, height: 16, borderRadius: '50%',
                    background: appearance.customTextColor,
                    border: '2px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                    display: 'block',
                  }}/>
                )}
              </button>
              <input
                ref={textInputRef}
                type="color"
                value={appearance.customTextColor ?? '#1a1a2e'}
                onChange={e => setAppearance({ customTextColor: e.target.value })}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, top: 0, left: 0 }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {colorDot(null, appearance.customTextColor === null, () => setAppearance({ customTextColor: null }), 'Color de texto automático', true)}
              {PRESET_TEXT_COLORS.map(hex =>
                colorDot(hex, appearance.customTextColor === hex, () => setAppearance({ customTextColor: hex }), hex)
              )}
            </div>
          </div>

          {/* ── Font ── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
            {sectionLabel('Tipografía')}
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

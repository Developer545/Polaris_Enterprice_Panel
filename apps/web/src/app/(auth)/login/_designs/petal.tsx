'use client'
import { LoginSplitBase } from './_shared/LoginSplitBase'

const FEATURES = [
  'Facturación DTE certificada MH',
  'Multi-sucursal y multi-usuario',
  'Planilla ISSS · AFP · Renta ISR',
  'Inventario y punto de venta',
  'Reportes financieros en tiempo real',
]

const AC = '#34D399'

export default function LoginPetal({ companyId }: { companyId?: string }) {
  return (
    <LoginSplitBase companyId={companyId}>
      <div style={{
        width: '100%', height: '100%',
        background: '#030d08',
        backgroundImage: [
          'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(16,185,129,0.25) 0%, transparent 60%)',
          'radial-gradient(ellipse 60% 50% at 80% 75%, rgba(52,211,153,0.15) 0%, transparent 55%)',
          'linear-gradient(rgba(16,185,129,0.07) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(16,185,129,0.07) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'auto, auto, 44px 44px, 44px 44px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '52px', position: 'relative',
      }}>

        <div style={{ position: 'relative', zIndex: 2 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: 'rgba(16,185,129,0.18)',
              border: '1px solid rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z" stroke={AC} strokeWidth="1.5" fill="rgba(16,185,129,0.2)" />
                <path d="M12 6L17 8.5V13.5L12 16L7 13.5V8.5L12 6Z" fill="rgba(52,211,153,0.3)" stroke="rgba(110,231,183,0.8)" strokeWidth="0.75" />
              </svg>
            </div>
            <div>
              <div style={{ color: '#F1F0FF', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Polaris Enterprise
              </div>
              <div style={{ color: '#6B7AA0', fontSize: 12, marginTop: 2 }}>
                Sistema ERP · El Salvador
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(16,185,129,0.25)', marginBottom: 36 }} />

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(16,185,129,0.18)',
                  border: '1px solid rgba(16,185,129,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke={AC} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.4 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Status badge */}
          <div style={{ marginTop: 44 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 99, padding: '5px 12px',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'lp-pulse 2s ease-in-out infinite', flexShrink: 0 }} />
              <span style={{ color: '#6EE7B7', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em' }}>
                Todos los sistemas operativos
              </span>
            </span>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, color: '#334155', fontSize: 11, letterSpacing: '0.03em' }}>
          © {new Date().getFullYear()} Polaris Enterprise
        </div>
      </div>
    </LoginSplitBase>
  )
}

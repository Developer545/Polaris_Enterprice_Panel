'use client'
import { LoginSplitBase } from './_shared/LoginSplitBase'

const FEATURES = ['Facturación DTE certificada MH','Multi-sucursal y multi-usuarios','Planilla ISSS · AFP · Renta ISR','Inventario y punto de venta','Reportes financieros en tiempo real']

export default function LoginCommand({ companyId }: { companyId?: string }) {
  const accent = '#4ADE80'

  return (
    <LoginSplitBase companyId={companyId}>
      <div style={{
        width: '100%', height: '100%',
        background: '#030906',
        backgroundImage: 'radial-gradient(ellipse 80% 55% at 50% 40%, rgba(74,222,128,0.14) 0%, transparent 65%), repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(74,222,128,0.05) 39px, rgba(74,222,128,0.05) 40px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '52px', position: 'relative',
      }}>
        {/* Terminal prompt decoration */}
        <div style={{ position: 'absolute', top: 24, right: 28, fontSize: 10, color: '#4ADE8033', fontFamily: 'monospace', letterSpacing: '0.04em', userSelect: 'none', zIndex: 1 }}>
          {'> polaris --init --prod'}
        </div>

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: accent+'18', border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z" stroke={accent} strokeWidth="1.5" fill={accent+'22'} />
                <path d="M12 6L17 8.5V13.5L12 16L7 13.5V8.5L12 6Z" fill={accent+'35'} stroke={accent+'cc'} strokeWidth="0.75" />
              </svg>
            </div>
            <div>
              <div style={{ color: '#F1F0FF', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Polaris Enterprise</div>
              <div style={{ color: '#6B7AA0', fontSize: 12, marginTop: 2 }}>Sistema ERP · El Salvador</div>
            </div>
          </div>
          <div style={{ height: 1, background: accent+'28', marginBottom: 36 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: accent+'18', border: `1px solid ${accent}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <span style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.4 }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 44 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 99, padding: '5px 12px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'lp-pulse 2s ease-in-out infinite', flexShrink: 0 }} />
              <span style={{ color: '#6EE7B7', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em' }}>Todos los sistemas operativos</span>
            </span>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 2, color: '#1E293B', fontSize: 11, letterSpacing: '0.03em' }}>
          © {new Date().getFullYear()} Polaris Enterprise
        </div>
      </div>
    </LoginSplitBase>
  )
}

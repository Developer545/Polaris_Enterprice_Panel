'use client'
import { LoginSplitBase } from './_shared/LoginSplitBase'

const FEATURES = [
  'Facturación DTE certificada MH',
  'Multi-sucursal y multi-usuario',
  'Planilla ISSS · AFP · Renta ISR',
  'Inventario y punto de venta',
  'Reportes financieros en tiempo real',
]

export default function LoginAurora({ companyId }: { companyId?: string }) {
  return (
    <LoginSplitBase companyId={companyId}>
      <style>{`
        @keyframes blob-1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.08)} 66%{transform:translate(-15px,25px) scale(0.96)} }
        @keyframes blob-2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-25px,30px) scale(0.95)} 66%{transform:translate(20px,-15px) scale(1.05)} }
        @keyframes blob-3 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(15px,20px) scale(1.06)} 66%{transform:translate(-20px,-25px) scale(0.97)} }
      `}</style>
      <div style={{
        width: '100%', height: '100%',
        background: 'var(--lp-dk-bg,#090914)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '52px', position: 'relative', overflow: 'hidden',
      }}>

        {/* Animated blobs */}
        <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', background: 'var(--lp-a20,#7C3AED33)', filter: 'blur(80px)', top: '5%', left: '10%', animation: 'blob-1 8s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'var(--lp-a15,#7C3AED26)', filter: 'blur(60px)', bottom: '15%', right: '5%', animation: 'blob-2 10s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'var(--lp-a10,#7C3AED1A)', filter: 'blur(50px)', top: '55%', left: '40%', animation: 'blob-3 12s ease-in-out infinite', pointerEvents: 'none' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: 'var(--lp-a20,#7C3AED33)',
              border: '1px solid var(--lp-a30,#7C3AED4D)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z" style={{ stroke: 'var(--lp-1,#7C3AED)', fill: 'var(--lp-a20,#7C3AED33)' }} strokeWidth="1.5" />
                <path d="M12 6L17 8.5V13.5L12 16L7 13.5V8.5L12 6Z" style={{ fill: 'var(--lp-a30,#7C3AED4D)', stroke: 'var(--lp-2,#A78BFA)' }} strokeWidth="0.75" />
              </svg>
            </div>
            <div>
              <div style={{ color: 'var(--lp-dk-txt-h,#F1F0FF)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Polaris Enterprise
              </div>
              <div style={{ color: 'var(--lp-dk-txt-b,#6B7AA0)', fontSize: 12, marginTop: 2 }}>
                Sistema ERP · El Salvador
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--lp-a25,#7C3AED40)', marginBottom: 36 }} />

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--lp-a15,#7C3AED26)',
                  border: '1px solid var(--lp-a25,#7C3AED40)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" style={{ stroke: 'var(--lp-1,#7C3AED)' }} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ color: 'var(--lp-dk-txt-b,#94A3B8)', fontSize: 13, lineHeight: 1.4 }}>{f}</span>
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

        <div style={{ position: 'relative', zIndex: 2, color: 'var(--lp-dk-txt-b,#334155)', fontSize: 11, letterSpacing: '0.03em' }}>
          © {new Date().getFullYear()} Polaris Enterprise
        </div>
      </div>
    </LoginSplitBase>
  )
}

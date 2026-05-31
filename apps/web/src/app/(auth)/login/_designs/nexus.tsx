'use client'
import { LoginSplitBase } from './_shared/LoginSplitBase'

const FEATURES = [
  'Facturación DTE certificada MH',
  'Multi-sucursal y multi-usuario',
  'Planilla ISSS · AFP · Renta ISR',
  'Inventario y punto de venta',
  'Reportes financieros en tiempo real',
]

export default function LoginNexus({ companyId }: { companyId?: string }) {
  return (
    <LoginSplitBase companyId={companyId}>
      <div style={{
        width: '100%', height: '100%',
        background: 'var(--lp-dk-bg,#090914)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '52px', position: 'relative', overflow: 'hidden',
      }}>

        {/* Animated SVG network */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }} viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
          <style>{`
            @keyframes node-pulse  { 0%,100%{opacity:0.4;r:4}   50%{opacity:1;r:5.5} }
            @keyframes node-pulse2 { 0%,100%{opacity:0.3;r:3}   50%{opacity:0.9;r:4.5} }
            .n1 { animation: node-pulse  3s   ease-in-out infinite; }
            .n2 { animation: node-pulse2 4s   ease-in-out infinite 0.5s; }
            .n3 { animation: node-pulse  3.5s ease-in-out infinite 1s; }
            .n4 { animation: node-pulse2 5s   ease-in-out infinite 1.5s; }
          `}</style>
          {/* Lines */}
          <line x1="80"  y1="120" x2="200" y2="200" style={{ stroke: 'var(--lp-a15,#7C3AED26)' }} strokeWidth="1"/>
          <line x1="200" y1="200" x2="320" y2="160" style={{ stroke: 'var(--lp-a15,#7C3AED26)' }} strokeWidth="1"/>
          <line x1="200" y1="200" x2="160" y2="380" style={{ stroke: 'var(--lp-a10,#7C3AED1A)' }} strokeWidth="1"/>
          <line x1="320" y1="160" x2="340" y2="320" style={{ stroke: 'var(--lp-a10,#7C3AED1A)' }} strokeWidth="1"/>
          <line x1="160" y1="380" x2="280" y2="460" style={{ stroke: 'var(--lp-a15,#7C3AED26)' }} strokeWidth="1"/>
          <line x1="60"  y1="420" x2="160" y2="380" style={{ stroke: 'var(--lp-a10,#7C3AED1A)' }} strokeWidth="1"/>
          <line x1="280" y1="460" x2="350" y2="560" style={{ stroke: 'var(--lp-a10,#7C3AED1A)' }} strokeWidth="1"/>
          {/* Nodes */}
          <circle cx="80"  cy="120" r="4" className="n1" style={{ fill: 'var(--lp-1,#7C3AED)' }}/>
          <circle cx="200" cy="200" r="6" className="n3" style={{ fill: 'var(--lp-1,#7C3AED)' }}/>
          <circle cx="320" cy="160" r="4" className="n2" style={{ fill: 'var(--lp-2,#A78BFA)' }}/>
          <circle cx="160" cy="380" r="5" className="n1" style={{ fill: 'var(--lp-1,#7C3AED)' }}/>
          <circle cx="340" cy="320" r="3" className="n4" style={{ fill: 'var(--lp-2,#A78BFA)' }}/>
          <circle cx="280" cy="460" r="4" className="n2" style={{ fill: 'var(--lp-1,#7C3AED)' }}/>
          <circle cx="60"  cy="420" r="3" className="n3" style={{ fill: 'var(--lp-2,#A78BFA)' }}/>
          <circle cx="350" cy="560" r="4" className="n4" style={{ fill: 'var(--lp-1,#7C3AED)' }}/>
        </svg>

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

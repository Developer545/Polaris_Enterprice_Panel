'use client'
import { LoginFullBase } from './_shared/LoginFullBase'

export default function LoginForge({ companyId }: { companyId?: string }) {
  return (
    <LoginFullBase
      companyId={companyId}
      formDark={true}
      wrapStyle={{ justifyContent:'flex-end', padding:'0 8% 0 0' }}
      cardStyle={{ maxWidth:400 }}
    >
      <>
        <style>{`@keyframes forge-glow { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }`}</style>
        <div style={{ width:'100%', height:'100%', background:'var(--lp-dk-bg,#090914)', backgroundImage:'radial-gradient(ellipse 85% 70% at 20% 50%, var(--lp-a30,#7C3AED4D) 0%, transparent 65%)' }}>
          {/* Animated central glow */}
          <div style={{ position:'absolute', width:500, height:700, borderRadius:'50%', background:'var(--lp-a20,#7C3AED33)', filter:'blur(140px)', top:'-10%', left:'-5%', animation:'forge-glow 6s ease-in-out infinite', pointerEvents:'none' }} />
          {/* Left branding text */}
          <div style={{ position:'absolute', left:'6%', top:'50%', transform:'translateY(-50%)', zIndex:2, maxWidth:360 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:44, height:44, borderRadius:11, background:'var(--lp-a20,#7C3AED33)', border:'1px solid var(--lp-a30,#7C3AED4D)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z" style={{stroke:'var(--lp-1,#7C3AED)',fill:'var(--lp-a20,#7C3AED33)'}} strokeWidth="1.5"/>
                  <path d="M12 6L17 8.5V13.5L12 16L7 13.5V8.5L12 6Z" style={{fill:'var(--lp-a30,#7C3AED4D)',stroke:'var(--lp-2,#A78BFA)'}} strokeWidth="0.75"/>
                </svg>
              </div>
              <div style={{ color:'var(--lp-dk-txt-h,#F1F0FF)', fontWeight:700, fontSize:18, letterSpacing:'-0.02em' }}>Polaris Enterprise</div>
            </div>
            <div style={{ color:'var(--lp-dk-txt-h,#F1F0FF)', fontSize:36, fontWeight:800, letterSpacing:'-1px', lineHeight:1.1, marginBottom:16 }}>
              ERP empresarial<br/>para El Salvador
            </div>
            <div style={{ height:2, width:60, background:'var(--lp-1,#7C3AED)', borderRadius:1, marginBottom:20 }} />
            <p style={{ color:'var(--lp-dk-txt-b,#94A3B8)', fontSize:15, lineHeight:1.7, maxWidth:320 }}>
              Facturación DTE · Planilla · Inventario · Punto de venta
            </p>
          </div>
          {/* Bottom-left status */}
          <div style={{ position:'absolute', bottom:32, left:'6%', zIndex:2 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:99, padding:'5px 12px' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', animation:'lp-pulse 2s ease-in-out infinite', flexShrink:0 }} />
              <span style={{ color:'#6EE7B7', fontSize:11, fontWeight:500 }}>Sistemas operativos</span>
            </span>
          </div>
        </div>
      </>
    </LoginFullBase>
  )
}

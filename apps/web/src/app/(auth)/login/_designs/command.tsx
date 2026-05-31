'use client'
import { LoginFullBase } from './_shared/LoginFullBase'

export default function LoginCommand({ companyId }: { companyId?: string }) {
  return (
    <LoginFullBase
      companyId={companyId}
      formDark={true}
      cardStyle={{
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
        border: '1px solid var(--lp-a25,#7C3AED40)',
        background: 'rgba(4,6,8,0.92)',
        boxShadow: '0 0 0 1px var(--lp-a15,#7C3AED26), 0 32px 80px rgba(0,0,0,0.8)',
      }}
    >
      <>
        <style>{`
          @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
          @keyframes type-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        `}</style>
        <div style={{ width:'100%', height:'100%', background:'#030407', backgroundImage:'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.015) 39px, rgba(255,255,255,0.015) 40px)' }}>
          {/* Animated scanline */}
          <div style={{ position:'absolute', width:'100%', height:2, background:'linear-gradient(90deg, transparent, var(--lp-a15,#7C3AED26), transparent)', animation:'scanline 4s linear infinite', pointerEvents:'none', zIndex:2 }} />
          {/* Top left corner decoration */}
          <div style={{ position:'absolute', top:32, left:40, fontFamily:"'IBM Plex Mono','Courier New',monospace", fontSize:11, color:'var(--lp-a40,#7C3AED66)', userSelect:'none', letterSpacing:'0.05em', lineHeight:1.8 }}>
            <div>$ polaris-erp --connect</div>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span>{'>'} Auth service</span>
              <span style={{ display:'inline-block', width:7, height:12, background:'var(--lp-1,#7C3AED)', animation:'type-blink 1s step-end infinite', marginLeft:4, verticalAlign:'middle' }} />
            </div>
          </div>
          {/* Accent glow */}
          <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'var(--lp-a15,#7C3AED26)', filter:'blur(120px)', bottom:0, right:0, pointerEvents:'none' }} />
        </div>
      </>
    </LoginFullBase>
  )
}

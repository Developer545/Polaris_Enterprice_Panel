'use client'
import { LoginFullBase } from './_shared/LoginFullBase'

export default function LoginCandy({ companyId }: { companyId?: string }) {
  return (
    <LoginFullBase
      companyId={companyId}
      formDark={true}
      cardStyle={{
        border: '1px solid var(--lp-1,#7C3AED)',
        boxShadow: '0 0 0 1px var(--lp-a30,#7C3AED4D), 0 0 40px var(--lp-a30,#7C3AED4D), 0 32px 80px rgba(0,0,0,0.8)',
        background: 'rgba(6,6,10,0.90)',
      }}
    >
      <div style={{ width: '100%', height: '100%', background: '#06060a' }}>
        {/* Subtle grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--lp-a10,#7C3AED1A) 1px, transparent 1px), linear-gradient(90deg, var(--lp-a10,#7C3AED1A) 1px, transparent 1px)', backgroundSize: '44px 44px', opacity: 0.6 }} />
        {/* Corner glow */}
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'var(--lp-a20,#7C3AED33)', filter: 'blur(100px)', top: '-10%', right: '-5%', pointerEvents: 'none' }} />
      </div>
    </LoginFullBase>
  )
}

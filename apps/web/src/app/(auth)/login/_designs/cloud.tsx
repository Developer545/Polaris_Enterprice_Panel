'use client'
import { LoginFullBase } from './_shared/LoginFullBase'

export default function LoginCloud({ companyId }: { companyId?: string }) {
  return (
    <LoginFullBase companyId={companyId} formDark={false}>
      <div style={{
        width: '100%', height: '100%',
        background: 'var(--lp-dk-bg,#090914)',
        backgroundImage: 'radial-gradient(ellipse 80% 60% at 30% 30%, var(--lp-a40,#7C3AED66) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 70% 70%, var(--lp-a25,#7C3AED40) 0%, transparent 55%)',
      }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'var(--lp-a15,#7C3AED26)', filter: 'blur(120px)', top: '10%', left: '5%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'var(--lp-a10,#7C3AED1A)', filter: 'blur(100px)', bottom: '10%', right: '5%', pointerEvents: 'none' }} />
      </div>
    </LoginFullBase>
  )
}

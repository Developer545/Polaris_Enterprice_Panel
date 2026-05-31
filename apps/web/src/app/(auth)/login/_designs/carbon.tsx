'use client'
import { LoginFullBase } from './_shared/LoginFullBase'

export default function LoginCarbon({ companyId }: { companyId?: string }) {
  return (
    <LoginFullBase
      companyId={companyId}
      formDark={false}
      cardStyle={{
        background: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)',
        backdropFilter: 'none',
      }}
    >
      {/* Pure light background */}
      <div style={{ width: '100%', height: '100%', background: 'var(--lp-bg,#F8F9FA)' }}>
        {/* Subtle top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--lp-1,#7C3AED), var(--lp-2,#A78BFA))' }} />
      </div>
    </LoginFullBase>
  )
}

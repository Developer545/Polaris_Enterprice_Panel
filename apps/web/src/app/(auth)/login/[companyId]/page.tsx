'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function DirectLoginPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const router = useRouter()

  useEffect(() => {
    if (companyId) {
      try { localStorage.setItem('companyId', companyId) } catch {}
      router.replace('/login')
    }
  }, [companyId, router])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        color: 'rgba(255,255,255,0.4)', fontSize: 13,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="rgba(99,102,241,0.8)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        Cargando...
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

'use client'
import { LoginFullBase } from './_shared/LoginFullBase'

export default function LoginDreamy({ companyId }: { companyId?: string }) {
  return (
    <LoginFullBase companyId={companyId} formDark={true}>
      <>
        <style>{`
          @keyframes db1{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(40px,-30px)scale(1.12)}}
          @keyframes db2{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(-35px,40px)scale(0.9)}}
          @keyframes db3{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(25px,35px)scale(1.08)}}
          @keyframes db4{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(-20px,-30px)scale(0.95)}}
        `}</style>
        <div style={{ width: '100%', height: '100%', background: 'var(--lp-dk-bg,#090914)' }}>
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'var(--lp-a25,#7C3AED40)', filter: 'blur(140px)', top: '-10%', left: '-10%', animation: 'db1 9s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'var(--lp-a20,#7C3AED33)', filter: 'blur(120px)', bottom: '-5%', right: '-10%', animation: 'db2 11s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'var(--lp-a15,#7C3AED26)', filter: 'blur(80px)', top: '40%', left: '40%', animation: 'db3 13s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: 'var(--lp-a10,#7C3AED1A)', filter: 'blur(60px)', top: '10%', right: '20%', animation: 'db4 7s ease-in-out infinite', pointerEvents: 'none' }} />
        </div>
      </>
    </LoginFullBase>
  )
}

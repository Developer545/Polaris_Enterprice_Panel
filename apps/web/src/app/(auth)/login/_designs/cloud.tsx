'use client'
/**
 * Login Soft Cloud — Tarjeta glassmorphism centrada
 * Fondo: degradado naranja pastel → violeta pastel
 * Card: vidrio esmerilado con blur, formas flotantes
 */
import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'


interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }
const SAVED_KEY = 'pos_saved_credentials'

export default function LoginCloud({ companyId: propCompanyId = '' }: { companyId?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form] = Form.useForm<LoginForm>()
  const [isLocal, setIsLocal] = useState(false)

  useEffect(() => {
    const local = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    setIsLocal(local)
    try {
      const saved = localStorage.getItem(SAVED_KEY)
      if (saved) form.setFieldsValue({ ...JSON.parse(saved), remember: true })
    } catch {}
    const cid = local ? 'local' : propCompanyId || (()=>{try{return localStorage.getItem('companyId')??''}catch{return ''}})(); if (cid) form.setFieldsValue({ companyId: cid })
  }, [form])

  async function onFinish(values: LoginForm) {
    setLoading(true); setError(null)
    try {
      const res = await getClient().post('/api/auth/login', values)
      if (res.data?.tenantSlug) setTenantSlug(res.data.tenantSlug)
      if (values.remember) {
        localStorage.setItem(SAVED_KEY, JSON.stringify({ companyId: values.companyId, email: values.email }))
      } else {
        localStorage.removeItem(SAVED_KEY)
      }
      localStorage.setItem('companyId', values.companyId)
      const perms: Record<string, boolean> = res.data?.user?.permissions ?? {}
      const isOwner = perms['branches.view_all'] === true
      if (res.data?.user) {
        localStorage.setItem('userId',             res.data.user.id)
        localStorage.setItem('userName',           res.data.user.name)
        localStorage.setItem('userEmail',          res.data.user.email)
        localStorage.setItem('roleId',             res.data.user.roleId)
        localStorage.setItem('branchIds',          JSON.stringify(res.data.user.branchIds ?? []))
        localStorage.setItem('permissions',        JSON.stringify(perms))
        localStorage.setItem('canViewAllBranches', isOwner ? '1' : '0')
      }
      document.cookie = `pos_session=1; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`
      router.push(isOwner ? '/owner' : '/')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Credenciales inválidas')
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }

        @keyframes floatCloud {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-24px) scale(1.05); }
        }
        @keyframes driftSlow {
          0%, 100% { transform: translate(0,0) rotate(0deg); }
          33%       { transform: translate(12px,-15px) rotate(5deg); }
          66%       { transform: translate(-8px,10px) rotate(-3deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .cloud-input .ant-input,
        .cloud-input .ant-input-affix-wrapper {
          background: var(--lp-bg-input) !important;
          border-color: rgba(201,184,232,0.5) !important;
          border-radius: 12px !important;
          color: var(--lp-txt-h) !important;
          height: 48px !important;
          font-size: 14px !important;
          backdrop-filter: blur(8px);
          transition: all 0.2s !important;
        }
        .cloud-input .ant-input-affix-wrapper:hover,
        .cloud-input .ant-input-affix-wrapper-focused {
          border-color: var(--lp-1) !important;
          background: var(--lp-bg-card) !important;
          box-shadow: 0 0 0 3px var(--lp-a20) !important;
        }
        .cloud-input .ant-input-affix-wrapper .ant-input {
          background: transparent !important;
          height: auto !important;
          color: var(--lp-txt-h) !important;
        }
        .cloud-input .ant-input-prefix { color: var(--lp-1) !important; margin-right: 10px; }
        .cloud-input .ant-input-password-icon { color: var(--lp-1) !important; }
        .cloud-input .ant-input::placeholder { color: #c4b5fd !important; }
        .cloud-input .ant-form-item-label > label { color: var(--lp-txt-l) !important; font-size: 12px !important; font-weight: 600 !important; letter-spacing: 0.04em !important; text-transform: uppercase; }
        .cloud-input .ant-form-item-explain-error { color: #e879a8 !important; font-size: 12px !important; }
        .cloud-checkbox .ant-checkbox-inner { border-color: #c9b8e8 !important; border-radius: 5px !important; background: rgba(255,255,255,0.7) !important; }
        .cloud-checkbox .ant-checkbox-checked .ant-checkbox-inner { background: var(--lp-1) !important; border-color: var(--lp-1) !important; }
        .cloud-checkbox span { color: var(--lp-txt-b) !important; font-size: 13px !important; }
        .cloud-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 32px var(--lp-a50) !important; }
        .cloud-btn:active { transform: translateY(0) !important; }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        background: 'var(--lp-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Blobs flotantes en el fondo */}
        {[
          { w: 320, h: 260, top: '-10%', left: '-8%',   bg: 'var(--lp-a25)', dur: '9s',  delay: '0s'   },
          { w: 280, h: 220, top: '5%',   right: '-6%',  bg: 'var(--lp-a20)', dur: '11s', delay: '1s'   },
          { w: 200, h: 200, bottom: '8%',left: '10%',   bg: 'var(--lp-a15)', dur: '8s',  delay: '0.5s' },
          { w: 260, h: 200, bottom: '-8%',right: '5%',  bg: 'var(--lp-a20)', dur: '10s', delay: '2s'   },
          { w: 140, h: 140, top: '40%',  left: '5%',    bg: 'var(--lp-a10)', dur: '7s',  delay: '1.5s' },
          { w: 100, h: 100, top: '20%',  right: '15%',  bg: 'var(--lp-a15)', dur: '6s',  delay: '0.8s' },
        ].map((b, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: b.w, height: b.h,
            borderRadius: '60% 40% 50% 50% / 50% 50% 60% 40%',
            background: b.bg,
            top: (b as any).top, left: (b as any).left,
            right: (b as any).right, bottom: (b as any).bottom,
            animation: `driftSlow ${b.dur} ease-in-out infinite ${b.delay}`,
            filter: 'blur(2px)',
            pointerEvents: 'none',
          }} />
        ))}

        {/* ── Tarjeta glass ── */}
        <div style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: 460,
          margin: '20px',
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 8px 40px rgba(155,142,196,0.2), 0 2px 8px rgba(0,0,0,0.04)',
          padding: '44px 48px',
          animation: 'fadeUp 0.6s ease both',
        }}>
          {/* Header de la card */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            {/* Logo */}
            <div style={{
              width: 60, height: 60, borderRadius: 18, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, var(--lp-1) 0%, var(--lp-2) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px var(--lp-a40)',
              animation: 'floatCloud 5s ease-in-out infinite',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.6 9.8L22 12L13.6 14.2L12 22L10.4 14.2L2 12L10.4 9.8Z" fill="white" />
              </svg>
            </div>
            <Typography.Title level={2} style={{ margin: '0 0 6px', color: 'var(--lp-txt-h)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em' }}>
              Polaris Enterprise
            </Typography.Title>
            <Typography.Text style={{ color: 'var(--lp-txt-b)', fontSize: 14 }}>
              {isLocal ? 'Entorno local detectado' : 'Inicia sesión en tu cuenta'}
            </Typography.Text>
          </div>

          {error && (
            <Alert message={error} type="error" showIcon closable onClose={() => setError(null)}
              style={{ marginBottom: 20, borderRadius: 10, fontSize: 13, background: '#fff0f7', border: '1px solid #f4a7b940' }}
            />
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="cloud-input">
            <Form.Item name="companyId" hidden><Input /></Form.Item>
            <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email', message: 'Correo inválido' }]} style={{ marginBottom: 16 }}>
              <Input prefix={<UserOutlined />} placeholder="usuario@empresa.com" autoComplete="email" size="large" />
            </Form.Item>
            <Form.Item name="password" label="Contraseña" rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 16 }}>
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" size="large" />
            </Form.Item>
            <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 24 }}>
              <Checkbox className="cloud-checkbox">Recordar empresa y correo</Checkbox>
            </Form.Item>
            <Button
              type="primary" htmlType="submit" block loading={loading} size="large"
              icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end"
              className="cloud-btn"
              style={{
                height: 52, borderRadius: 14, fontWeight: 700, fontSize: 15, border: 'none',
                background: 'linear-gradient(135deg, var(--lp-1) 0%, var(--lp-2) 100%)',
                boxShadow: '0 6px 20px var(--lp-a35)',
                transition: 'all 0.2s',
              }}
            >
              Iniciar sesión
            </Button>
          </Form>

          <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(201,184,232,0.3)' }} />
            <span style={{ color: 'var(--lp-txt-b)', fontSize: 10, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>CONEXIÓN SEGURA · TLS 1.3</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(201,184,232,0.3)' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <span style={{ color: 'var(--lp-txt-b)', fontSize: 10 }}>© {new Date().getFullYear()} Polaris Enterprise </span>
          </div>
        </div>
      </div>
    </>
  )
}

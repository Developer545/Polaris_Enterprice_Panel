'use client'
/**
 * Login Bloom — Pantalla dividida
 * Izquierda: degradado violeta → rosado con formas florales
 * Derecha: formulario blanco limpio
 */
import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'


interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }
const SAVED_KEY = 'pos_saved_credentials'

// Colores pastel base
const P2 = '#E879A8' // rosado medio (error — kept as-is)

export default function LoginBloom({ companyId: propCompanyId = '' }: { companyId?: string }) {
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

        @keyframes floatBloom {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%       { transform: translateY(-18px) rotate(8deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .bloom-input .ant-input,
        .bloom-input .ant-input-affix-wrapper {
          background: var(--lp-bg-input) !important;
          border-color: #e2d9f3 !important;
          border-radius: 12px !important;
          color: var(--lp-txt-h) !important;
          height: 48px !important;
          font-size: 14px !important;
          transition: all 0.2s !important;
        }
        .bloom-input .ant-input-affix-wrapper:hover,
        .bloom-input .ant-input-affix-wrapper-focused {
          border-color: var(--lp-1) !important;
          box-shadow: 0 0 0 3px var(--lp-a15) !important;
        }
        .bloom-input .ant-input-affix-wrapper .ant-input {
          background: transparent !important;
          height: auto !important;
          color: var(--lp-txt-h) !important;
        }
        .bloom-input .ant-input-prefix { color: var(--lp-1) !important; margin-right: 10px; }
        .bloom-input .ant-input-password-icon { color: var(--lp-1) !important; }
        .bloom-input .ant-input::placeholder { color: #c4b5fd !important; }
        .bloom-input .ant-form-item-label > label { color: var(--lp-txt-l) !important; font-size: 12px !important; font-weight: 600 !important; letter-spacing: 0.04em !important; text-transform: uppercase; }
        .bloom-input .ant-form-item-explain-error { color: #e879a8 !important; font-size: 12px !important; }
        .bloom-checkbox .ant-checkbox-inner { border-color: var(--lp-3) !important; border-radius: 5px !important; }
        .bloom-checkbox .ant-checkbox-checked .ant-checkbox-inner { background: var(--lp-1) !important; border-color: var(--lp-1) !important; }
        .bloom-checkbox span { color: var(--lp-txt-b) !important; font-size: 13px !important; }
        .bloom-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 10px 28px var(--lp-a50) !important; }
        .bloom-btn:active { transform: translateY(0) !important; }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, display: 'flex' }}>

        {/* ══ IZQUIERDA — panel degradado ══ */}
        <div style={{
          width: '45%', flexShrink: 0, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(145deg, var(--lp-3) 0%, var(--lp-2) 45%, var(--lp-a25) 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px 52px',
        }}>
          {/* Formas florales flotantes */}
          {[
            { size: 180, top: -50,  left: -50,  color: 'rgba(255,255,255,0.25)', delay: '0s',   dur: '7s'  },
            { size: 120, top: 60,   right: -30, color: 'rgba(232,121,168,0.20)', delay: '1s',   dur: '9s'  },
            { size: 90,  bottom: 80,left: 40,   color: 'rgba(201,184,232,0.30)', delay: '0.5s', dur: '8s'  },
            { size: 200, bottom: -80,right: -60,color: 'rgba(255,255,255,0.15)', delay: '2s',   dur: '10s' },
            { size: 60,  top: '45%',left: '55%',color: 'rgba(255,212,163,0.40)', delay: '1.5s', dur: '6s'  },
          ].map((s, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: s.size, height: s.size,
              borderRadius: '60% 40% 55% 45% / 45% 55% 45% 55%',
              background: s.color,
              top: (s as any).top, left: (s as any).left,
              right: (s as any).right, bottom: (s as any).bottom,
              animation: `floatBloom ${s.dur} ease-in-out infinite ${s.delay}`,
              pointerEvents: 'none',
            }} />
          ))}

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 1, animation: 'fadeUp 0.6s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(255,255,255,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px var(--lp-a35)',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L13.6 9.8L22 12L13.6 14.2L12 22L10.4 14.2L2 12L10.4 9.8Z"
                    fill="var(--lp-1)" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>Polaris</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>Enterprise</div>
              </div>
            </div>
          </div>

          {/* Centro — copy */}
          <div style={{ position: 'relative', zIndex: 1, animation: 'fadeUp 0.7s ease 0.1s both' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 16 }}>
              Tu negocio,<br />
              <span style={{ color: 'rgba(255,255,255,0.75)' }}>todo en uno.</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.7, margin: '0 0 32px' }}>
              POS, facturación DTE y ERP<br />para empresas de El Salvador.
            </p>
            {['CF, CCF, Notas de Crédito y Débito', 'POS táctil + impresión térmica', 'Multi-sucursal con control de acceso'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>© {new Date().getFullYear()} Polaris Enterprise </span>
          </div>
        </div>

        {/* ══ DERECHA — formulario blanco ══ */}
        <div style={{
          flex: 1, background: 'var(--lp-bg-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 60px', position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Acento decorativo superior */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
            background: 'linear-gradient(90deg, var(--lp-3), var(--lp-2), var(--lp-a25))',
          }} />

          {/* Forma decorativa fondo */}
          <div style={{
            position: 'absolute', bottom: -60, right: -60, width: 300, height: 300,
            borderRadius: '60% 40% 55% 45% / 45% 55% 45% 55%',
            background: 'radial-gradient(circle, var(--lp-a15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp 0.5s ease 0.2s both' }}>
            <div style={{ marginBottom: 36 }}>
              <Typography.Title level={2} style={{ margin: '0 0 8px', color: 'var(--lp-txt-h)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em' }}>
                Bienvenida 🌸
              </Typography.Title>
              <Typography.Text style={{ color: 'var(--lp-txt-b)', fontSize: 14 }}>
                {isLocal ? 'Ingresa tus credenciales para continuar' : 'Accede a tu panel con tus credenciales'}
              </Typography.Text>
            </div>

            {error && (
              <Alert message={error} type="error" showIcon closable onClose={() => setError(null)}
                style={{ marginBottom: 24, borderRadius: 10, fontSize: 13, background: '#fff0f4', border: `1px solid ${P2}40`, color: P2 }}
              />
            )}

            <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="bloom-input">
              <Form.Item name="companyId" hidden><Input /></Form.Item>
              <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email', message: 'Correo inválido' }]} style={{ marginBottom: 18 }}>
                <Input prefix={<UserOutlined />} placeholder="usuario@empresa.com" autoComplete="email" size="large" />
              </Form.Item>
              <Form.Item name="password" label="Contraseña" rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 18 }}>
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" size="large" />
              </Form.Item>
              <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 28 }}>
                <Checkbox className="bloom-checkbox">Recordar empresa y correo</Checkbox>
              </Form.Item>
              <Button
                type="primary" htmlType="submit" block loading={loading} size="large"
                icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end"
                className="bloom-btn"
                style={{
                  height: 50, borderRadius: 12, fontWeight: 700, fontSize: 15, border: 'none',
                  background: 'linear-gradient(135deg, var(--lp-1) 0%, var(--lp-2) 100%)',
                  boxShadow: '0 6px 20px var(--lp-a40)',
                  transition: 'all 0.2s',
                }}
              >
                Iniciar sesión
              </Button>
            </Form>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <span style={{ color: '#c4b5fd', fontSize: 11, letterSpacing: '0.08em' }}>CONEXIÓN SEGURA · TLS 1.3</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

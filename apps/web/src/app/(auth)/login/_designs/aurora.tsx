'use client'
/**
 * Login Pastel Aurora — Fondo con ondas de colores animadas
 * Celeste, rosado, violeta y naranja
 * Card blanca flotante con acento naranja
 */
import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'


interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }
const SAVED_KEY = 'pos_saved_credentials'

export default function LoginAurora() {
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
    if (local) form.setFieldsValue({ companyId: 'local' })
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

        @keyframes waveShift {
          0%   { transform: translateX(0) translateY(0); }
          50%  { transform: translateX(-3%) translateY(8px); }
          100% { transform: translateX(0) translateY(0); }
        }
        @keyframes waveShift2 {
          0%   { transform: translateX(0) translateY(0); }
          50%  { transform: translateX(2%) translateY(-10px); }
          100% { transform: translateX(0) translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.04); }
        }

        .aurora-input .ant-input,
        .aurora-input .ant-input-affix-wrapper {
          background: var(--lp-bg-input) !important;
          border-color: #e2d9f3 !important;
          border-radius: 12px !important;
          color: var(--lp-txt-h) !important;
          height: 48px !important;
          font-size: 14px !important;
          transition: all 0.2s !important;
        }
        .aurora-input .ant-input-affix-wrapper:hover,
        .aurora-input .ant-input-affix-wrapper-focused {
          border-color: var(--lp-1) !important;
          box-shadow: 0 0 0 3px var(--lp-a15) !important;
        }
        .aurora-input .ant-input-affix-wrapper .ant-input {
          background: transparent !important;
          height: auto !important;
          color: var(--lp-txt-h) !important;
        }
        .aurora-input .ant-input-prefix { color: var(--lp-1) !important; margin-right: 10px; }
        .aurora-input .ant-input-password-icon { color: var(--lp-1) !important; }
        .aurora-input .ant-input::placeholder { color: #fdba74 !important; }
        .aurora-input .ant-form-item-label > label { color: var(--lp-txt-l) !important; font-size: 12px !important; font-weight: 600 !important; letter-spacing: 0.04em !important; text-transform: uppercase; }
        .aurora-input .ant-form-item-explain-error { color: #e879a8 !important; font-size: 12px !important; }
        .aurora-checkbox .ant-checkbox-inner { border-color: #ffd4a3 !important; border-radius: 5px !important; }
        .aurora-checkbox .ant-checkbox-checked .ant-checkbox-inner { background: var(--lp-1) !important; border-color: var(--lp-1) !important; }
        .aurora-checkbox span { color: var(--lp-txt-b) !important; font-size: 13px !important; }
        .aurora-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 32px var(--lp-a50) !important; opacity: 0.95; }
        .aurora-btn:active { transform: translateY(0) !important; }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, background: 'var(--lp-bg)', overflow: 'hidden' }}>

        {/* ── Ondas SVG de fondo ── */}
        {/* Onda superior celeste */}
        <svg viewBox="0 0 1440 320" style={{
          position: 'absolute', top: 0, left: 0, width: '110%', opacity: 0.65,
          animation: 'waveShift 12s ease-in-out infinite',
        }} preserveAspectRatio="none">
          <path fill="var(--lp-a20)"
            d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,138.7C672,128,768,128,864,149.3C960,171,1056,213,1152,218.7C1248,224,1344,192,1392,176L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" />
        </svg>

        {/* Onda rosada media-superior */}
        <svg viewBox="0 0 1440 320" style={{
          position: 'absolute', top: '-20px', left: '-5%', width: '110%', opacity: 0.5,
          animation: 'waveShift2 15s ease-in-out infinite 1s',
        }} preserveAspectRatio="none">
          <path fill="var(--lp-a15)"
            d="M0,160L60,149.3C120,139,240,117,360,128C480,139,600,181,720,197.3C840,213,960,203,1080,181.3C1200,160,1320,128,1380,112L1440,96L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z" />
        </svg>

        {/* Onda violeta fondo */}
        <svg viewBox="0 0 1440 480" style={{
          position: 'absolute', top: '-40px', left: 0, width: '100%', opacity: 0.35,
          animation: 'waveShift 18s ease-in-out infinite 2s',
        }} preserveAspectRatio="none">
          <path fill="var(--lp-a10)"
            d="M0,224L80,213.3C160,203,320,181,480,186.7C640,192,800,224,960,229.3C1120,235,1280,213,1360,202.7L1440,192L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z" />
        </svg>

        {/* Onda naranja inferior */}
        <svg viewBox="0 0 1440 320" style={{
          position: 'absolute', bottom: 0, left: 0, width: '110%', opacity: 0.55,
          animation: 'waveShift2 13s ease-in-out infinite 0.5s',
        }} preserveAspectRatio="none">
          <path fill="var(--lp-a25)"
            d="M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,197.3C672,213,768,235,864,234.7C960,235,1056,213,1152,192C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>

        {/* Onda rosada inferior secundaria */}
        <svg viewBox="0 0 1440 320" style={{
          position: 'absolute', bottom: '-10px', left: '-3%', width: '110%', opacity: 0.4,
          animation: 'waveShift 16s ease-in-out infinite 3s',
        }} preserveAspectRatio="none">
          <path fill="var(--lp-a15)"
            d="M0,288L60,277.3C120,267,240,245,360,250.7C480,256,600,288,720,293.3C840,299,960,277,1080,261.3C1200,245,1320,235,1380,229.3L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
        </svg>

        {/* ── Contenido centrado ── */}
        <div style={{
          position: 'relative', zIndex: 10,
          height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          {/* Badge superior */}
          <div style={{ marginBottom: 20, animation: 'fadeUp 0.5s ease both' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid var(--lp-a30)',
              borderRadius: 20, padding: '6px 16px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 2px 12px var(--lp-a15)',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--lp-1)',
                boxShadow: '0 0 6px var(--lp-1)',
                animation: 'pulse 2s ease-in-out infinite',
              }} />
              <span style={{ color: 'var(--lp-txt-b)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Sistema DTE oficial · El Salvador
              </span>
            </div>
          </div>

          {/* Card principal */}
          <div style={{
            width: '100%', maxWidth: 440,
            background: 'var(--lp-bg-card)',
            borderRadius: 24,
            boxShadow: '0 4px 24px rgba(155,142,196,0.18), 0 1px 4px rgba(0,0,0,0.04)',
            border: '1px solid rgba(201,184,232,0.35)',
            borderTop: '4px solid var(--lp-1)',
            padding: '40px 44px',
            animation: 'fadeUp 0.6s ease 0.1s both',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <div style={{
                width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--lp-1) 0%, var(--lp-2) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 18px var(--lp-a35)',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L13.6 9.8L22 12L13.6 14.2L12 22L10.4 14.2L2 12L10.4 9.8Z" fill="white" />
                </svg>
              </div>
              <div>
                <Typography.Title level={3} style={{ margin: 0, color: 'var(--lp-txt-h)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
                  Polaris Enterprise
                </Typography.Title>
                <Typography.Text style={{ color: 'var(--lp-txt-b)', fontSize: 13 }}>
                  {isLocal ? 'Entorno local' : 'Inicia sesión en tu cuenta'}
                </Typography.Text>
              </div>
            </div>

            {error && (
              <Alert message={error} type="error" showIcon closable onClose={() => setError(null)}
                style={{ marginBottom: 20, borderRadius: 10, fontSize: 13, background: '#fff8f0', border: '1px solid var(--lp-a25)' }}
              />
            )}

            <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="aurora-input">
              {isLocal ? (
                <Form.Item name="companyId" hidden><Input /></Form.Item>
              ) : (
                <Form.Item name="companyId" label="ID de empresa" rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 16 }}>
                  <Input prefix={<ShopOutlined />} placeholder="company-id" size="large" />
                </Form.Item>
              )}
              <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email', message: 'Correo inválido' }]} style={{ marginBottom: 16 }}>
                <Input prefix={<UserOutlined />} placeholder="usuario@empresa.com" autoComplete="email" size="large" />
              </Form.Item>
              <Form.Item name="password" label="Contraseña" rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 16 }}>
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" size="large" />
              </Form.Item>
              <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 24 }}>
                <Checkbox className="aurora-checkbox">Recordar empresa y correo</Checkbox>
              </Form.Item>
              <Button
                type="primary" htmlType="submit" block loading={loading} size="large"
                icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end"
                className="aurora-btn"
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

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <span style={{ color: '#c4b5fd', fontSize: 10, letterSpacing: '0.08em' }}>CONEXIÓN SEGURA · TLS 1.3</span>
            </div>
          </div>

          <div style={{ marginTop: 16, animation: 'fadeUp 0.6s ease 0.3s both' }}>
            <span style={{ color: 'var(--lp-txt-b)', fontSize: 11 }}>© {new Date().getFullYear()} Polaris Enterprise </span>
          </div>
        </div>
      </div>
    </>
  )
}

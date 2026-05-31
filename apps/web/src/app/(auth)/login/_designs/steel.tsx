'use client'
import { useState, useEffect } from 'react'
import { Inter } from 'next/font/google'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] })

interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }
const SAVED_KEY = 'pos_saved_credentials'

export default function LoginSteel() {
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
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }
        html, body { margin: 0; padding: 0; overflow: hidden; }
        .steel-wrap {
          min-height: 100vh;
          display: flex;
          font-family: ${inter.style.fontFamily};
          overflow: hidden;
        }

        /* ── LEFT PANEL ── */
        .steel-left {
          width: 42%;
          background: linear-gradient(170deg, #0F1923 0%, #162232 60%, #0D2137 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 56px 48px;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        /* Decorative thin horizontal lines — steel grain */
        .steel-grain-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.06) 70%, transparent 100%);
          pointer-events: none;
        }
        /* Floating geometric shapes */
        .steel-geo {
          position: absolute;
          pointer-events: none;
          opacity: 0.04;
          border: 1px solid #7EB3D4;
        }
        .steel-logo-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--lp-2) 0%, var(--lp-4) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 28px;
          box-shadow: 0 8px 32px var(--lp-a50), 0 0 0 1px var(--lp-a10);
          flex-shrink: 0;
        }
        .steel-left-title {
          color: #E2E8F0 !important;
          font-size: 30px !important;
          font-weight: 800 !important;
          line-height: 1.15 !important;
          margin-bottom: 8px !important;
        }
        .steel-left-sub {
          color: rgba(255,255,255,0.55);
          font-size: 14px;
          margin-bottom: 36px;
          line-height: 1.5;
        }
        .steel-bullet {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .steel-bullet-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--lp-2);
          flex-shrink: 0;
        }
        .steel-bullet-text {
          color: rgba(255,255,255,0.7);
          font-size: 13px;
          font-weight: 500;
        }

        /* ── RIGHT PANEL ── */
        .steel-right {
          flex: 1;
          background: #F8FAFC;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          border-left: 4px solid var(--lp-4);
        }
        .steel-form-box {
          width: 100%;
          max-width: 400px;
        }
        .steel-form-title {
          color: #0F1923 !important;
          font-size: 22px !important;
          font-weight: 800 !important;
          margin-bottom: 4px !important;
        }
        .steel-form-sub {
          color: var(--lp-4);
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 28px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .steel-input .ant-form-item-label > label {
          color: #475569 !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.06em !important;
        }
        .steel-input .ant-input-affix-wrapper,
        .steel-input .ant-input-password {
          background: #F1F5F9 !important;
          border: 1px solid #CBD5E1 !important;
          border-radius: 8px !important;
        }
        .steel-input .ant-input-affix-wrapper:hover,
        .steel-input .ant-input-password:hover,
        .steel-input .ant-input-affix-wrapper:focus,
        .steel-input .ant-input-affix-wrapper-focused {
          border-color: var(--lp-4) !important;
          box-shadow: 0 0 0 2px var(--lp-a10) !important;
        }
        .steel-input .ant-input {
          background: #F1F5F9 !important;
          color: #0F1923 !important;
          font-size: 14px !important;
        }
        .steel-input .ant-input::placeholder {
          color: #94A3B8 !important;
        }
        .steel-input .ant-input-prefix {
          color: var(--lp-2) !important;
          margin-right: 8px;
        }
        .steel-input .ant-input-password-icon {
          color: #94A3B8 !important;
        }
        .steel-input .ant-input-password-icon:hover {
          color: var(--lp-4) !important;
        }
        .steel-input .ant-form-item-explain-error {
          color: #DC2626 !important;
          font-size: 12px !important;
        }
        .steel-checkbox .ant-checkbox-wrapper {
          color: #475569 !important;
          font-size: 13px !important;
        }
        .steel-checkbox .ant-checkbox-inner {
          background: #F1F5F9 !important;
          border-color: #CBD5E1 !important;
          border-radius: 4px !important;
        }
        .steel-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background: var(--lp-4) !important;
          border-color: var(--lp-4) !important;
        }
        .steel-btn.ant-btn-primary {
          background: linear-gradient(135deg, var(--lp-4) 0%, var(--lp-1) 100%) !important;
          box-shadow: 0 6px 20px var(--lp-a30) !important;
        }
        .steel-btn.ant-btn-primary:hover {
          background: linear-gradient(135deg, var(--lp-3) 0%, var(--lp-2) 100%) !important;
          box-shadow: 0 10px 28px var(--lp-a40) !important;
          transform: translateY(-1px);
        }
        .steel-btn.ant-btn-primary:active {
          transform: translateY(0);
        }
        .steel-footer {
          margin-top: 24px;
          text-align: center;
          color: #94A3B8;
          font-size: 12px;
        }

        @media (max-width: 768px) {
          .steel-left { display: none; }
          .steel-right { border-left: none; padding: 32px 24px; }
        }
      `}</style>

      <div className="steel-wrap">
        {/* ── LEFT ── */}
        <div className="steel-left">
          {/* Steel grain lines */}
          {[18, 30, 45, 62, 78].map((pct, i) => (
            <div key={i} className="steel-grain-line" style={{ top: `${pct}%` }} />
          ))}
          {/* Floating rectangles */}
          <div className="steel-geo" style={{ width: 120, height: 60, top: '8%', right: '10%', transform: 'rotate(-12deg)' }} />
          <div className="steel-geo" style={{ width: 70, height: 70, bottom: '12%', left: '8%', transform: 'rotate(20deg)' }} />
          <div className="steel-geo" style={{ width: 200, height: 1, bottom: '25%', right: '-20px', background: 'rgba(100,180,255,0.07)', border: 'none' }} />

          {/* Logo */}
          <div className="steel-logo-circle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="white" />
            </svg>
          </div>

          <Typography.Title level={2} className="steel-left-title">
            Polaris<br />Enterprise
          </Typography.Title>
          <p className="steel-left-sub">
            Plataforma de gestión empresarial<br />con facturación DTE El Salvador
          </p>

          {/* Feature bullets */}
          {[
            'Punto de Venta (POS) en tiempo real',
            'Facturación DTE · MH El Salvador',
            'Multi-sucursal y multi-usuario',
          ].map((txt, i) => (
            <div key={i} className="steel-bullet">
              <div className="steel-bullet-dot" />
              <span className="steel-bullet-text">{txt}</span>
            </div>
          ))}
        </div>

        {/* ── RIGHT ── */}
        <div className="steel-right">
          <div className="steel-form-box">
            <Typography.Title level={3} className="steel-form-title">Iniciar sesión</Typography.Title>
            <p className="steel-form-sub">Acceso al panel de control</p>

            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{
                  marginBottom: 20,
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  color: '#DC2626',
                }}
              />
            )}

            <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="steel-input">
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
                <Checkbox className="steel-checkbox">Recordar empresa y correo</Checkbox>
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading} size="large"
                icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end"
                className="steel-btn"
                style={{ height: 52, borderRadius: 10, fontWeight: 700, fontSize: 15, border: 'none', transition: 'all 0.2s' }}
              >
                Iniciar sesión
              </Button>
            </Form>

            <div className="steel-footer">
              Polaris Enterprise &copy; {new Date().getFullYear()} · Speeddan System
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

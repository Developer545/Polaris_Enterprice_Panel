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

export default function LoginNexus() {
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
        .nexus-wrap {
          min-height: 100vh;
          background-color: #030610;
          background-image:
            linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: ${inter.style.fontFamily};
        }
        .nexus-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
        }
        .nexus-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          background: rgba(0,20,40,0.7);
          border: 1px solid rgba(0,245,255,0.2);
          border-top: 2px solid #00F5FF;
          border-radius: 12px;
          padding: 40px 36px 36px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 0 20px rgba(0,245,255,0.2),
            inset 0 0 40px rgba(0,245,255,0.02),
            0 32px 80px rgba(0,0,0,0.7);
        }
        .nexus-logo {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: rgba(0,245,255,0.1);
          border: 1px solid rgba(0,245,255,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          box-shadow: 0 0 20px rgba(0,245,255,0.2), inset 0 0 12px rgba(0,245,255,0.05);
          flex-shrink: 0;
        }
        .nexus-title {
          color: #00F5FF !important;
          font-size: 24px !important;
          font-weight: 800 !important;
          margin-bottom: 4px !important;
          line-height: 1.2 !important;
          text-shadow: 0 0 20px rgba(0,245,255,0.5) !important;
        }
        .nexus-subtitle {
          color: rgba(0,245,255,0.5);
          font-size: 13px;
          margin-bottom: 32px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .nexus-input .ant-form-item-label > label {
          color: rgba(0,245,255,0.6) !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
        }
        .nexus-input .ant-input-affix-wrapper,
        .nexus-input .ant-input-password {
          background: rgba(0,245,255,0.04) !important;
          border: 1px solid rgba(0,245,255,0.15) !important;
          border-radius: 8px !important;
        }
        .nexus-input .ant-input-affix-wrapper:hover,
        .nexus-input .ant-input-password:hover,
        .nexus-input .ant-input-affix-wrapper:focus,
        .nexus-input .ant-input-affix-wrapper-focused {
          border-color: rgba(0,245,255,0.5) !important;
          box-shadow: 0 0 0 2px rgba(0,245,255,0.1), 0 0 12px rgba(0,245,255,0.1) !important;
        }
        .nexus-input .ant-input {
          background: transparent !important;
          color: #E0F7FA !important;
          font-size: 14px !important;
        }
        .nexus-input .ant-input::placeholder {
          color: rgba(0,245,255,0.25) !important;
        }
        .nexus-input .ant-input-prefix {
          color: #00F5FF !important;
          margin-right: 8px;
        }
        .nexus-input .ant-input-password-icon {
          color: rgba(0,245,255,0.3) !important;
        }
        .nexus-input .ant-input-password-icon:hover {
          color: #00F5FF !important;
        }
        .nexus-input .ant-form-item-explain-error {
          color: #FF4757 !important;
          font-size: 12px !important;
        }
        .nexus-checkbox .ant-checkbox-wrapper {
          color: rgba(0,245,255,0.55) !important;
          font-size: 13px !important;
        }
        .nexus-checkbox .ant-checkbox-inner {
          background: rgba(0,245,255,0.04) !important;
          border-color: rgba(0,245,255,0.2) !important;
          border-radius: 4px !important;
        }
        .nexus-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background: rgba(0,245,255,0.8) !important;
          border-color: #00F5FF !important;
        }
        .nexus-checkbox .ant-checkbox-checked .ant-checkbox-inner::after {
          border-color: #030610 !important;
        }
        .nexus-btn.ant-btn-primary {
          background: linear-gradient(135deg, rgba(0,245,255,0.85) 0%, rgba(0,150,200,0.95) 100%) !important;
          color: #030610 !important;
          box-shadow: 0 0 20px rgba(0,245,255,0.4), 0 8px 24px rgba(0,245,255,0.25) !important;
          font-weight: 800 !important;
        }
        .nexus-btn.ant-btn-primary:hover {
          background: linear-gradient(135deg, rgba(0,255,255,0.95) 0%, rgba(0,180,220,1) 100%) !important;
          box-shadow: 0 0 30px rgba(0,245,255,0.55), 0 12px 32px rgba(0,245,255,0.35) !important;
          transform: translateY(-1px);
          color: #030610 !important;
        }
        .nexus-btn.ant-btn-primary:active {
          transform: translateY(0);
        }
        .nexus-btn .anticon {
          color: #030610 !important;
        }
        .nexus-footer {
          margin-top: 24px;
          text-align: center;
          color: rgba(0,245,255,0.2);
          font-size: 12px;
          letter-spacing: 0.04em;
        }
      `}</style>

      <div className="nexus-wrap">
        {/* Neon glow blobs */}
        <div className="nexus-blob" style={{
          width: 520, height: 520,
          background: 'rgba(0,245,255,0.12)',
          top: -160, left: -120,
        }} />
        <div className="nexus-blob" style={{
          width: 440, height: 440,
          background: 'rgba(0,100,255,0.10)',
          bottom: -100, right: -100,
        }} />
        <div className="nexus-blob" style={{
          width: 380, height: 380,
          background: 'rgba(100,0,255,0.08)',
          top: '35%', right: '5%',
        }} />

        <div className="nexus-card">
          {/* Logo — hexagon-style SVG */}
          <div className="nexus-logo">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z"
                stroke="#00F5FF"
                strokeWidth="1.5"
                fill="rgba(0,245,255,0.08)"
              />
              <path
                d="M12 6L17 8.5V13.5L12 16L7 13.5V8.5L12 6Z"
                fill="rgba(0,245,255,0.3)"
                stroke="#00F5FF"
                strokeWidth="0.75"
              />
            </svg>
          </div>

          <Typography.Title level={3} className="nexus-title">Polaris Enterprise</Typography.Title>
          <p className="nexus-subtitle">DTE · El Salvador · Sistema POS</p>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{
                marginBottom: 20,
                background: 'rgba(255,71,87,0.1)',
                border: '1px solid rgba(255,71,87,0.3)',
                borderRadius: 8,
                color: '#FF4757',
              }}
            />
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="nexus-input">
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
              <Checkbox className="nexus-checkbox">Recordar empresa y correo</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} size="large"
              icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end"
              className="nexus-btn"
              style={{ height: 52, borderRadius: 8, fontWeight: 700, fontSize: 15, border: 'none', transition: 'all 0.2s' }}
            >
              Iniciar sesión
            </Button>
          </Form>

          <div className="nexus-footer">
            POLARIS ENTERPRISE &copy; {new Date().getFullYear()} · SPEEDDAN SYSTEM
          </div>
        </div>
      </div>
    </>
  )
}

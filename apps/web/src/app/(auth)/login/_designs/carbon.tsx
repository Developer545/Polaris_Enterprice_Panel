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

export default function LoginCarbon() {
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
        .carbon-wrap {
          min-height: 100vh;
          background-color: #080808;
          background-image: radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 24px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: ${inter.style.fontFamily};
        }
        .carbon-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .carbon-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          background: #111118;
          border: 1px solid #1E1E2E;
          border-left: 3px solid #2563EB;
          border-radius: 16px;
          padding: 40px 36px 36px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
        }
        .carbon-logo {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          box-shadow: 0 8px 24px rgba(37,99,235,0.35);
        }
        .carbon-title {
          color: #E2E8F0 !important;
          font-weight: 800 !important;
          font-size: 24px !important;
          margin-bottom: 4px !important;
          line-height: 1.2 !important;
        }
        .carbon-subtitle {
          color: #64748B;
          font-size: 14px;
          margin-bottom: 32px;
        }
        .carbon-input .ant-form-item-label > label {
          color: #64748B !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
        }
        .carbon-input .ant-input-affix-wrapper,
        .carbon-input .ant-input-password {
          background: #0D0D15 !important;
          border: 1px solid #1E293B !important;
          border-radius: 10px !important;
        }
        .carbon-input .ant-input-affix-wrapper:focus,
        .carbon-input .ant-input-affix-wrapper-focused,
        .carbon-input .ant-input-password:focus,
        .carbon-input .ant-input-affix-wrapper:hover,
        .carbon-input .ant-input-password:hover {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.15) !important;
        }
        .carbon-input .ant-input {
          background: #0D0D15 !important;
          color: #E2E8F0 !important;
          font-size: 14px !important;
        }
        .carbon-input .ant-input::placeholder {
          color: #334155 !important;
        }
        .carbon-input .ant-input-prefix {
          color: #3B82F6 !important;
          margin-right: 8px;
        }
        .carbon-input .ant-input-password-icon {
          color: #334155 !important;
        }
        .carbon-input .ant-input-password-icon:hover {
          color: #3B82F6 !important;
        }
        .carbon-input .ant-form-item-explain-error {
          color: #EF4444 !important;
          font-size: 12px !important;
        }
        .carbon-checkbox .ant-checkbox-wrapper {
          color: #64748B !important;
          font-size: 13px !important;
        }
        .carbon-checkbox .ant-checkbox-inner {
          background: #0D0D15 !important;
          border-color: #1E293B !important;
          border-radius: 4px !important;
        }
        .carbon-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background: #2563EB !important;
          border-color: #2563EB !important;
        }
        .carbon-btn.ant-btn-primary {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          box-shadow: 0 8px 24px rgba(37,99,235,0.4) !important;
        }
        .carbon-btn.ant-btn-primary:hover {
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%) !important;
          box-shadow: 0 12px 32px rgba(37,99,235,0.55) !important;
          transform: translateY(-1px);
        }
        .carbon-btn.ant-btn-primary:active {
          transform: translateY(0);
        }
        .carbon-footer {
          margin-top: 24px;
          text-align: center;
          color: #334155;
          font-size: 12px;
        }
      `}</style>

      <div className="carbon-wrap">
        {/* Blurred glow blobs */}
        <div className="carbon-blob" style={{
          width: 500, height: 500,
          background: 'rgba(0,120,255,0.08)',
          top: -120, left: -100,
        }} />
        <div className="carbon-blob" style={{
          width: 400, height: 400,
          background: 'rgba(0,200,255,0.06)',
          bottom: -80, right: -60,
        }} />
        <div className="carbon-blob" style={{
          width: 360, height: 360,
          background: 'rgba(100,0,255,0.05)',
          top: '40%', right: '15%',
        }} />

        <div className="carbon-card">
          {/* Logo */}
          <div className="carbon-logo">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="white"
                strokeWidth="0"
              />
            </svg>
          </div>

          {/* Heading */}
          <Typography.Title level={3} className="carbon-title">Polaris Enterprise</Typography.Title>
          <p className="carbon-subtitle">Sistema de facturación DTE · El Salvador</p>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{
                marginBottom: 20,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                color: '#EF4444',
              }}
            />
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="carbon-input">
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
              <Checkbox className="carbon-checkbox">Recordar empresa y correo</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} size="large"
              icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end"
              className="carbon-btn"
              style={{ height: 52, borderRadius: 14, fontWeight: 700, fontSize: 15, border: 'none', transition: 'all 0.2s' }}
            >
              Iniciar sesión
            </Button>
          </Form>

          <div className="carbon-footer">
            Polaris Enterprise &copy; {new Date().getFullYear()} · Speeddan System
          </div>
        </div>
      </div>
    </>
  )
}

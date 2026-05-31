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

export default function LoginForge() {
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
        .forge-wrap {
          min-height: 100vh;
          background-color: #080400;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: ${inter.style.fontFamily};
        }
        /* Ember glow blobs at corners */
        .forge-ember {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
        }
        .forge-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          background: rgba(20,10,0,0.85);
          border: 1px solid rgba(255,100,0,0.2);
          border-top: 3px solid #FF6B1A;
          border-radius: 16px;
          padding: 40px 36px 36px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 24px 64px rgba(0,0,0,0.7),
            0 0 60px rgba(255,80,0,0.06),
            inset 0 1px 0 rgba(255,120,0,0.08);
        }
        .forge-logo {
          width: 52px;
          height: 52px;
          border-radius: 10px;
          background: linear-gradient(135deg, #FF6B1A 0%, #FF4500 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          box-shadow: 0 8px 28px rgba(255,107,26,0.4), 0 0 0 1px rgba(255,150,80,0.2);
          flex-shrink: 0;
        }
        .forge-title {
          color: #FFF0E0 !important;
          font-size: 24px !important;
          font-weight: 800 !important;
          margin-bottom: 4px !important;
          line-height: 1.2 !important;
        }
        .forge-subtitle {
          color: rgba(255,200,150,0.7);
          font-size: 14px;
          margin-bottom: 32px;
        }
        .forge-input .ant-form-item-label > label {
          color: rgba(255,160,100,0.8) !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
        }
        .forge-input .ant-input-affix-wrapper,
        .forge-input .ant-input-password {
          background: rgba(255,80,0,0.06) !important;
          border: 1px solid rgba(255,100,0,0.2) !important;
          border-radius: 10px !important;
        }
        .forge-input .ant-input-affix-wrapper:hover,
        .forge-input .ant-input-password:hover,
        .forge-input .ant-input-affix-wrapper:focus,
        .forge-input .ant-input-affix-wrapper-focused {
          border-color: rgba(255,107,26,0.6) !important;
          box-shadow: 0 0 0 2px rgba(255,107,26,0.15) !important;
        }
        .forge-input .ant-input {
          background: transparent !important;
          color: #FFF0E0 !important;
          font-size: 14px !important;
        }
        .forge-input .ant-input::placeholder {
          color: rgba(255,200,150,0.35) !important;
        }
        .forge-input .ant-input-prefix {
          color: #FF8C42 !important;
          margin-right: 8px;
        }
        .forge-input .ant-input-password-icon {
          color: rgba(255,150,80,0.4) !important;
        }
        .forge-input .ant-input-password-icon:hover {
          color: #FF8C42 !important;
        }
        .forge-input .ant-form-item-explain-error {
          color: #FF4757 !important;
          font-size: 12px !important;
        }
        .forge-checkbox .ant-checkbox-wrapper {
          color: rgba(255,200,150,0.65) !important;
          font-size: 13px !important;
        }
        .forge-checkbox .ant-checkbox-inner {
          background: rgba(255,80,0,0.06) !important;
          border-color: rgba(255,100,0,0.3) !important;
          border-radius: 4px !important;
        }
        .forge-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background: #FF6B1A !important;
          border-color: #FF6B1A !important;
        }
        .forge-btn.ant-btn-primary {
          background: linear-gradient(135deg, #FF6B1A 0%, #FF4500 100%) !important;
          box-shadow: 0 8px 24px rgba(255,107,26,0.45) !important;
        }
        .forge-btn.ant-btn-primary:hover {
          background: linear-gradient(135deg, #FF8533 0%, #FF5A1F 100%) !important;
          box-shadow: 0 12px 32px rgba(255,107,26,0.6) !important;
          transform: translateY(-1px);
        }
        .forge-btn.ant-btn-primary:active {
          transform: translateY(0);
        }
        .forge-footer {
          margin-top: 24px;
          text-align: center;
          color: rgba(255,150,80,0.3);
          font-size: 12px;
        }
      `}</style>

      <div className="forge-wrap">
        {/* Ember glow blobs at four corners */}
        <div className="forge-ember" style={{
          width: 480, height: 480,
          background: 'rgba(255,80,0,0.12)',
          top: -140, left: -100,
        }} />
        <div className="forge-ember" style={{
          width: 400, height: 400,
          background: 'rgba(255,140,0,0.08)',
          top: -80, right: -80,
        }} />
        <div className="forge-ember" style={{
          width: 440, height: 440,
          background: 'rgba(200,40,0,0.10)',
          bottom: -120, left: -60,
        }} />
        <div className="forge-ember" style={{
          width: 360, height: 360,
          background: 'rgba(255,100,0,0.06)',
          bottom: -100, right: -80,
        }} />

        <div className="forge-card">
          {/* Logo */}
          <div className="forge-logo">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="white"
              />
            </svg>
          </div>

          <Typography.Title level={3} className="forge-title">Polaris Enterprise</Typography.Title>
          <p className="forge-subtitle">Sistema de facturación DTE · El Salvador</p>

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

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="forge-input">
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
              <Checkbox className="forge-checkbox">Recordar empresa y correo</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} size="large"
              icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end"
              className="forge-btn"
              style={{ height: 52, borderRadius: 14, fontWeight: 700, fontSize: 15, border: 'none', transition: 'all 0.2s' }}
            >
              Iniciar sesión
            </Button>
          </Form>

          <div className="forge-footer">
            Polaris Enterprise &copy; {new Date().getFullYear()} · Speeddan System
          </div>
        </div>
      </div>
    </>
  )
}

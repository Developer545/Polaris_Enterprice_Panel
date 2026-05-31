'use client'
import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

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
          background-color: var(--lp-dk-bg);
          background-image:
            linear-gradient(var(--lp-a10) 1px, transparent 1px),
            linear-gradient(90deg, var(--lp-a10) 1px, transparent 1px);
          background-size: 40px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: var(--font-family, Inter, sans-serif);
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
          background: var(--lp-dk-card);
          border: 1px solid var(--lp-a20);
          border-top: 2px solid var(--lp-1);
          border-radius: 12px;
          padding: 40px 36px 36px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 0 20px var(--lp-a20),
            inset 0 0 40px var(--lp-a10),
            0 32px 80px rgba(0,0,0,0.7);
        }
        .nexus-logo {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: var(--lp-a10);
          border: 1px solid var(--lp-a40);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          box-shadow: 0 0 20px var(--lp-a20), inset 0 0 12px var(--lp-a10);
          flex-shrink: 0;
        }
        .nexus-title {
          color: var(--lp-1) !important;
          font-size: 24px !important;
          font-weight: 800 !important;
          margin-bottom: 4px !important;
          line-height: 1.2 !important;
          text-shadow: 0 0 20px var(--lp-a50) !important;
        }
        .nexus-subtitle {
          color: var(--lp-a50);
          font-size: 13px;
          margin-bottom: 32px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .nexus-input .ant-form-item-label > label {
          color: var(--lp-a60) !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
        }
        .nexus-input .ant-input-affix-wrapper,
        .nexus-input .ant-input-password {
          background: var(--lp-a10) !important;
          border: 1px solid var(--lp-a10) !important;
          border-radius: 8px !important;
        }
        .nexus-input .ant-input-affix-wrapper:hover,
        .nexus-input .ant-input-password:hover,
        .nexus-input .ant-input-affix-wrapper:focus,
        .nexus-input .ant-input-affix-wrapper-focused {
          border-color: var(--lp-a50) !important;
          box-shadow: 0 0 0 2px var(--lp-a10), 0 0 12px var(--lp-a10) !important;
        }
        .nexus-input .ant-input {
          background: transparent !important;
          color: var(--lp-dk-txt-h) !important;
          font-size: 14px !important;
        }
        .nexus-input .ant-input::placeholder {
          color: var(--lp-a20) !important;
        }
        .nexus-input .ant-input-prefix {
          color: var(--lp-1) !important;
          margin-right: 8px;
        }
        .nexus-input .ant-input-password-icon {
          color: var(--lp-a30) !important;
        }
        .nexus-input .ant-input-password-icon:hover {
          color: var(--lp-1) !important;
        }
        .nexus-input .ant-form-item-explain-error {
          color: #FF4757 !important;
          font-size: 12px !important;
        }
        .nexus-checkbox .ant-checkbox-wrapper {
          color: var(--lp-a50) !important;
          font-size: 13px !important;
        }
        .nexus-checkbox .ant-checkbox-inner {
          background: var(--lp-a10) !important;
          border-color: var(--lp-a20) !important;
          border-radius: 4px !important;
        }
        .nexus-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background: var(--lp-a70) !important;
          border-color: var(--lp-1) !important;
        }
        .nexus-checkbox .ant-checkbox-checked .ant-checkbox-inner::after {
          border-color: var(--lp-dk-bg) !important;
        }
        .nexus-btn.ant-btn-primary {
          background: linear-gradient(135deg, var(--lp-a70) 0%, var(--lp-4) 100%) !important;
          color: var(--lp-dk-bg) !important;
          box-shadow: 0 0 20px var(--lp-a40), 0 8px 24px var(--lp-a20) !important;
          font-weight: 800 !important;
        }
        .nexus-btn.ant-btn-primary:hover {
          background: linear-gradient(135deg, var(--lp-1) 0%, var(--lp-3) 100%) !important;
          box-shadow: 0 0 30px var(--lp-a50), 0 12px 32px var(--lp-a30) !important;
          transform: translateY(-1px);
          color: var(--lp-dk-bg) !important;
        }
        .nexus-btn.ant-btn-primary:active {
          transform: translateY(0);
        }
        .nexus-btn .anticon {
          color: var(--lp-dk-bg) !important;
        }
        .nexus-footer {
          margin-top: 24px;
          text-align: center;
          color: var(--lp-a20);
          font-size: 12px;
          letter-spacing: 0.04em;
        }
      `}</style>

      <div className="nexus-wrap">
        {/* Neon glow blobs */}
        <div className="nexus-blob" style={{
          width: 520, height: 520,
          background: 'var(--lp-a10)',
          top: -160, left: -120,
        }} />
        <div className="nexus-blob" style={{
          width: 440, height: 440,
          background: 'var(--lp-a10)',
          bottom: -100, right: -100,
        }} />
        <div className="nexus-blob" style={{
          width: 380, height: 380,
          background: 'var(--lp-a10)',
          top: '35%', right: '5%',
        }} />

        <div className="nexus-card">
          {/* Logo — hexagon-style SVG */}
          <div className="nexus-logo">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z"
                stroke="var(--lp-1)"
                strokeWidth="1.5"
                fill="var(--lp-a10)"
              />
              <path
                d="M12 6L17 8.5V13.5L12 16L7 13.5V8.5L12 6Z"
                fill="var(--lp-a30)"
                stroke="var(--lp-1)"
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
            POLARIS ENTERPRISE &copy; {new Date().getFullYear()} 
          </div>
        </div>
      </div>
    </>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }
const SAVED_KEY = 'pos_saved_credentials'

export default function LoginCommand({ companyId: propCompanyId = '' }: { companyId?: string }) {
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
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }
        html, body { margin: 0; padding: 0; overflow: hidden; }
        .command-wrap {
          min-height: 100vh;
          background: var(--lp-dk-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-family, Inter, sans-serif);
        }
        .command-window {
          width: 100%;
          max-width: 460px;
          background: var(--lp-dk-card);
          border: 1px solid #30363D;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.7);
        }
        .command-titlebar {
          background: var(--lp-dk-input);
          height: 36px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 14px;
          border-bottom: 1px solid #30363D;
          flex-shrink: 0;
        }
        .command-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .command-titlebar-label {
          margin-left: 8px;
          color: var(--lp-dk-txt-b);
          font-size: 12px;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.03em;
        }
        .command-body {
          padding: 28px 32px 32px;
        }
        .command-logo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .command-logo-icon {
          font-size: 22px;
          font-family: 'Courier New', monospace;
          font-weight: 700;
          color: var(--lp-1);
          line-height: 1;
        }
        .command-logo-name {
          font-size: 13px;
          font-family: 'Courier New', monospace;
          color: var(--lp-2);
          letter-spacing: 0.05em;
        }
        .command-prompt-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 6px;
        }
        .command-prompt-sign {
          color: var(--lp-1);
          font-family: 'Courier New', monospace;
          font-size: 16px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .command-title {
          color: var(--lp-dk-txt-h) !important;
          font-size: 22px !important;
          font-weight: 700 !important;
          margin: 0 !important;
          font-family: 'Courier New', monospace !important;
        }
        .command-subtitle {
          color: var(--lp-dk-txt-b);
          font-size: 13px;
          font-family: 'Courier New', monospace;
          margin-bottom: 28px;
          padding-left: 22px;
        }
        .command-input .ant-form-item-label > label {
          color: var(--lp-dk-txt-l) !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          font-family: 'Courier New', monospace !important;
        }
        .command-input .ant-form-item-label > label::before {
          content: '> ' !important;
          color: var(--lp-1) !important;
          font-family: 'Courier New', monospace !important;
          margin-right: 0 !important;
        }
        .command-input .ant-input-affix-wrapper,
        .command-input .ant-input-password {
          background: var(--lp-dk-input) !important;
          border: 1px solid #30363D !important;
          border-radius: 6px !important;
        }
        .command-input .ant-input-affix-wrapper:hover,
        .command-input .ant-input-password:hover,
        .command-input .ant-input-affix-wrapper:focus,
        .command-input .ant-input-affix-wrapper-focused {
          border-color: var(--lp-2) !important;
          box-shadow: 0 0 0 2px var(--lp-a10) !important;
        }
        .command-input .ant-input {
          background: var(--lp-dk-input) !important;
          color: var(--lp-dk-txt-h) !important;
          font-family: 'Courier New', monospace !important;
          font-size: 13px !important;
        }
        .command-input .ant-input::placeholder {
          color: #484F58 !important;
          font-family: 'Courier New', monospace !important;
        }
        .command-input .ant-input-prefix {
          color: var(--lp-1) !important;
          margin-right: 8px;
        }
        .command-input .ant-input-password-icon {
          color: #484F58 !important;
        }
        .command-input .ant-input-password-icon:hover {
          color: var(--lp-1) !important;
        }
        .command-input .ant-form-item-explain-error {
          color: #F85149 !important;
          font-size: 12px !important;
          font-family: 'Courier New', monospace !important;
        }
        .command-checkbox .ant-checkbox-wrapper {
          color: var(--lp-dk-txt-b) !important;
          font-size: 13px !important;
          font-family: 'Courier New', monospace !important;
        }
        .command-checkbox .ant-checkbox-inner {
          background: var(--lp-dk-input) !important;
          border-color: #30363D !important;
          border-radius: 3px !important;
        }
        .command-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background: var(--lp-4) !important;
          border-color: var(--lp-4) !important;
        }
        .command-btn.ant-btn-primary {
          background: var(--lp-4) !important;
          border: none !important;
          border-radius: 6px !important;
          font-family: 'Courier New', monospace !important;
          font-weight: 700 !important;
          letter-spacing: 0.03em !important;
        }
        .command-btn.ant-btn-primary:hover {
          background: var(--lp-1) !important;
          box-shadow: 0 4px 16px var(--lp-a30) !important;
        }
        .command-btn.ant-btn-primary:active {
          background: var(--lp-4) !important;
        }
        .command-footer {
          margin-top: 20px;
          text-align: center;
          color: var(--lp-dk-txt-b);
          font-size: 11px;
          font-family: 'Courier New', monospace;
        }
        .command-footer span { color: var(--lp-1); }
      `}</style>

      <div className="command-wrap">
        <div className="command-window">
          {/* Terminal title bar */}
          <div className="command-titlebar">
            <div className="command-dot" style={{ background: '#FF5F57' }} />
            <div className="command-dot" style={{ background: '#FFBD2E' }} />
            <div className="command-dot" style={{ background: '#28C840' }} />
            <span className="command-titlebar-label">polaris-enterprise — bash — 80x24</span>
          </div>

          <div className="command-body">
            {/* Logo */}
            <div className="command-logo">
              <span className="command-logo-icon">&gt;_</span>
              <span className="command-logo-name">POLARIS/enterprise</span>
            </div>

            {/* Title with $ prompt */}
            <div className="command-prompt-row">
              <span className="command-prompt-sign">$</span>
              <Typography.Title level={4} className="command-title">Polaris Enterprise</Typography.Title>
            </div>
            <p className="command-subtitle">auth --mode=dte-sv --tenant=interactive</p>

            {error && (
              <Alert
                message={`[ERROR] ${error}`}
                type="error"
                showIcon={false}
                style={{
                  marginBottom: 20,
                  background: 'rgba(248,81,73,0.1)',
                  border: '1px solid rgba(248,81,73,0.3)',
                  borderRadius: 6,
                  color: '#F85149',
                  fontFamily: "'Courier New', monospace",
                  fontSize: 13,
                }}
              />
            )}

            <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="command-input">
              <Form.Item name="companyId" hidden><Input /></Form.Item>
              <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email', message: 'Correo inválido' }]} style={{ marginBottom: 16 }}>
                <Input prefix={<UserOutlined />} placeholder="usuario@empresa.com" autoComplete="email" size="large" />
              </Form.Item>
              <Form.Item name="password" label="Contraseña" rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 16 }}>
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" size="large" />
              </Form.Item>
              <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 24 }}>
                <Checkbox className="command-checkbox">Recordar empresa y correo</Checkbox>
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading} size="large"
                icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end"
                className="command-btn"
                style={{ height: 52, borderRadius: 6, fontWeight: 700, fontSize: 14, border: 'none', transition: 'all 0.2s' }}
              >
                ./iniciar-sesion.sh
              </Button>
            </Form>

            <div className="command-footer">
              <span>$</span> Polaris Enterprise &copy; {new Date().getFullYear()} 
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

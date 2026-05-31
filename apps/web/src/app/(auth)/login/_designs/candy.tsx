'use client'
import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }
const SAVED_KEY = 'pos_saved_credentials'

const BUBBLES = [
  { size: 120, top: '5%',  left: '2%',   color: 'var(--lp-a25)', blur: 20 },
  { size: 80,  top: '10%', right: '5%',  color: 'var(--lp-a30)', blur: 16 },
  { size: 160, top: '65%', left: '-3%',  color: 'var(--lp-a20)', blur: 24 },
  { size: 100, top: '75%', right: '2%',  color: 'var(--lp-a30)', blur: 18 },
  { size: 70,  top: '40%', left: '1%',   color: 'var(--lp-a20)', blur: 14 },
  { size: 90,  top: '50%', right: '0%',  color: 'var(--lp-a25)', blur: 16 },
  { size: 50,  top: '85%', left: '40%',  color: 'var(--lp-a30)', blur: 12 },
  { size: 110, top: '20%', left: '45%',  color: 'var(--lp-a15)', blur: 20 },
]

export default function LoginCandy({ companyId: propCompanyId = '' }: { companyId?: string }) {
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
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--lp-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px',
      }}
    >
      <style>{`
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }
        html, body { margin: 0; padding: 0; overflow: hidden; }
        .candy-input .ant-input-affix-wrapper,
        .candy-input .ant-input {
          background: var(--lp-bg-input) !important;
          border-color: var(--lp-2) !important;
          border-radius: 16px !important;
          color: var(--lp-txt-h) !important;
        }
        .candy-input .ant-input-affix-wrapper:focus,
        .candy-input .ant-input-affix-wrapper-focused {
          border-color: var(--lp-4) !important;
          box-shadow: 0 0 0 3px var(--lp-a1a) !important;
        }
        .candy-input .ant-input::placeholder { color: var(--lp-2) !important; }
        .candy-input .ant-input-password-icon { color: var(--lp-2) !important; }
        .candy-input .anticon:not(.ant-input-password-icon) { color: var(--lp-1) !important; }
        .candy-input .ant-form-item-label > label {
          color: var(--lp-4) !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }
        .candy-input .ant-form-item-explain-error { color: #FF4081 !important; }
        .candy-input .ant-input-affix-wrapper .ant-input { background: transparent !important; }
        .candy-checkbox .ant-checkbox-inner {
          background: #FFF0F5 !important;
          border-color: var(--lp-2) !important;
          border-radius: 6px !important;
        }
        .candy-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background: linear-gradient(135deg, var(--lp-1), var(--lp-4)) !important;
          border-color: var(--lp-1) !important;
        }
        .candy-checkbox span:last-child { color: var(--lp-4) !important; font-size: 13px !important; }
        .candy-btn:hover {
          box-shadow: 0 8px 28px var(--lp-a80) !important;
          transform: translateY(-2px) !important;
        }
      `}</style>

      {/* Floating candy bubbles */}
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: b.size,
            height: b.size,
            top: b.top,
            left: (b as any).left,
            right: (b as any).right,
            background: b.color,
            borderRadius: '50%',
            filter: `blur(${b.blur}px)`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--lp-bg-card)',
          borderRadius: 28,
          boxShadow: '0 8px 40px var(--lp-a26), 0 2px 8px var(--lp-a1a)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Rainbow top border */}
        <div
          style={{
            height: 5,
            background: 'linear-gradient(90deg, var(--lp-1) 0%, #85C1FF 50%, #85FFB5 100%)',
          }}
        />

        <div style={{ padding: '36px 40px 32px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, var(--lp-1) 0%, #85C1FF 100%)',
                borderRadius: 18,
                marginBottom: 16,
                boxShadow: '0 4px 16px var(--lp-a66)',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4" fill="white" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <Typography.Title
              level={3}
              style={{ margin: 0, color: 'var(--lp-4)', fontWeight: 800, fontSize: 22 }}
            >
              ¡Hola de nuevo! 🌸
            </Typography.Title>
            <Typography.Text style={{ color: 'var(--lp-txt-b)', fontSize: 14, marginTop: 4, display: 'block' }}>
              Inicia sesión en tu cuenta
            </Typography.Text>
          </div>

          {/* Error */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: 20, borderRadius: 12, borderColor: 'var(--lp-2)' }}
            />
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="candy-input">
            <Form.Item name="companyId" hidden><Input /></Form.Item>
            <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email', message: 'Correo inválido' }]} style={{ marginBottom: 16 }}>
              <Input prefix={<UserOutlined />} placeholder="usuario@empresa.com" autoComplete="email" size="large" />
            </Form.Item>
            <Form.Item name="password" label="Contraseña" rules={[{ required: true, message: 'Requerido' }]} style={{ marginBottom: 16 }}>
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" size="large" />
            </Form.Item>
            <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 24 }}>
              <Checkbox className="candy-checkbox">Recordar empresa y correo</Checkbox>
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size="large"
              icon={!loading ? <ArrowRightOutlined /> : undefined}
              iconPosition="end"
              className="candy-btn"
              style={{
                height: 52,
                borderRadius: 16,
                fontWeight: 700,
                fontSize: 15,
                border: 'none',
                transition: 'all 0.2s',
                background: 'linear-gradient(135deg, var(--lp-1) 0%, var(--lp-4) 100%)',
                boxShadow: '0 4px 16px var(--lp-a66)',
                color: 'var(--lp-text)',
              }}
            >
              Iniciar sesión
            </Button>
          </Form>

          <p style={{ textAlign: 'center', marginTop: 24, marginBottom: 0, color: 'var(--lp-2)', fontSize: 12 }}>
            © {new Date().getFullYear()} Polaris POS · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  )
}

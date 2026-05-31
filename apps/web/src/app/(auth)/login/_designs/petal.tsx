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

export default function LoginPetal() {
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

  const petals = [
    { w: 80, h: 40, top: '8%', left: '5%', rotate: 25, color: 'var(--lp-a40)' },
    { w: 60, h: 30, top: '15%', right: '8%', rotate: -40, color: 'var(--lp-a4d)' },
    { w: 100, h: 50, top: '72%', left: '3%', rotate: 60, color: 'rgba(216,180,220,0.3)' },
    { w: 70, h: 35, top: '80%', right: '6%', rotate: -20, color: 'var(--lp-a66)' },
    { w: 55, h: 28, top: '40%', left: '2%', rotate: 80, color: 'var(--lp-a33)' },
    { w: 90, h: 45, top: '55%', right: '3%', rotate: 15, color: 'var(--lp-a40)' },
  ]

  return (
    <div
      className={inter.className}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #FFF0F5 0%, #FAE8EE 45%, #F0E6F6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px',
      }}
    >
      {/* Floating petal shapes */}
      {petals.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: p.w,
            height: p.h,
            top: p.top,
            left: (p as any).left,
            right: (p as any).right,
            background: p.color,
            borderRadius: '50%',
            transform: `rotate(${p.rotate}deg)`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#FFFFFF',
          borderRadius: 24,
          borderTop: '4px solid var(--lp-1)',
          boxShadow: '0 12px 60px var(--lp-a26), 0 2px 12px var(--lp-a1a)',
          padding: '40px 40px 32px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              background: 'linear-gradient(135deg, var(--lp-1) 0%, var(--lp-4) 100%)',
              borderRadius: 16,
              marginBottom: 16,
              boxShadow: '0 4px 16px var(--lp-a59)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L14.4 8.8H21.6L15.6 13.2L18 20L12 15.6L6 20L8.4 13.2L2.4 8.8H9.6L12 2Z"
                fill="white"
              />
            </svg>
          </div>
          <Typography.Title
            level={3}
            style={{ margin: 0, color: '#7C1D4E', fontWeight: 700, fontSize: 22 }}
          >
            Bienvenida de nuevo
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--lp-4)', fontSize: 14, marginTop: 4, display: 'block' }}>
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
            style={{ marginBottom: 20, borderRadius: 10, borderColor: 'var(--lp-1)' }}
          />
        )}

        <style>{`
          * { scrollbar-width: none; -ms-overflow-style: none; }
          *::-webkit-scrollbar { display: none; }
          html, body { margin: 0; padding: 0; overflow: hidden; }
          .petal-input .ant-input-affix-wrapper,
          .petal-input .ant-input {
            background: #FFF5F8 !important;
            border-color: var(--lp-2) !important;
            border-radius: 12px !important;
            color: #4A1A30 !important;
          }
          .petal-input .ant-input-affix-wrapper:focus,
          .petal-input .ant-input-affix-wrapper-focused {
            border-color: var(--lp-4) !important;
            box-shadow: 0 0 0 3px var(--lp-a26) !important;
          }
          .petal-input .ant-input::placeholder { color: var(--lp-2) !important; }
          .petal-input .anticon { color: var(--lp-4) !important; }
          .petal-input .ant-form-item-label > label { color: var(--lp-4) !important; font-weight: 500 !important; font-size: 13px !important; }
          .petal-input .ant-form-item-explain-error { color: #E8406B !important; }
          .petal-checkbox .ant-checkbox-inner { border-color: var(--lp-2) !important; background: #FFF5F8 !important; }
          .petal-checkbox .ant-checkbox-checked .ant-checkbox-inner { background: var(--lp-4) !important; border-color: var(--lp-4) !important; }
          .petal-checkbox span:last-child { color: var(--lp-4) !important; font-size: 13px !important; }
          .petal-btn:hover { box-shadow: 0 8px 24px var(--lp-a8c) !important; transform: translateY(-1px) !important; }
        `}</style>

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="petal-input">
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
            <Checkbox className="petal-checkbox">Recordar empresa y correo</Checkbox>
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            size="large"
            icon={!loading ? <ArrowRightOutlined /> : undefined}
            iconPosition="end"
            className="petal-btn"
            style={{
              height: 52,
              borderRadius: 14,
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

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 24, marginBottom: 0, color: '#E4B0C8', fontSize: 12 }}>
          © {new Date().getFullYear()} Polaris POS · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}

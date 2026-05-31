'use client'
import { useState, useEffect } from 'react'
import { Inter } from 'next/font/google'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined, ArrowRightOutlined, CheckCircleFilled } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] })

interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }
const SAVED_KEY = 'pos_saved_credentials'

const LEAVES = [
  { w: 90,  h: 55,  top: '6%',  left: '3%',   color: 'var(--lp-a30)',  rotate: 25,  borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%' },
  { w: 70,  h: 45,  top: '12%', right: '4%',   color: 'var(--lp-a25)', rotate: -40, borderRadius: '40% 60% 30% 70% / 60% 40% 50% 50%' },
  { w: 110, h: 65,  top: '70%', left: '2%',    color: 'var(--lp-a30)', rotate: 60,  borderRadius: '70% 30% 60% 40% / 40% 60% 50% 50%' },
  { w: 80,  h: 50,  top: '78%', right: '3%',   color: 'var(--lp-a20)', rotate: -20, borderRadius: '50% 50% 40% 60% / 60% 40% 60% 40%' },
  { w: 60,  h: 38,  top: '42%', left: '1%',    color: 'var(--lp-a25)', rotate: 80,  borderRadius: '40% 60% 50% 50% / 50% 50% 60% 40%' },
]

const FEATURES = [
  'Gestión de ventas y facturación DTE',
  'Control de inventario en tiempo real',
  'Reportes y dashboard inteligente',
]

export default function LoginSpring() {
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
    <div
      className={inter.className}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #E8F8ED 0%, #F0FAFF 50%, #FFF8F0 100%)',
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
        .spring-input .ant-input-affix-wrapper,
        .spring-input .ant-input {
          background: #F0FFF4 !important;
          border-color: var(--lp-3) !important;
          border-radius: 12px !important;
          color: #1B4332 !important;
        }
        .spring-input .ant-input-affix-wrapper:focus,
        .spring-input .ant-input-affix-wrapper-focused {
          border-color: var(--lp-1) !important;
          box-shadow: 0 0 0 3px var(--lp-a15) !important;
        }
        .spring-input .ant-input::placeholder { color: var(--lp-3) !important; }
        .spring-input .ant-input-password-icon { color: var(--lp-3) !important; }
        .spring-input .anticon:not(.ant-input-password-icon) { color: var(--lp-1) !important; }
        .spring-input .ant-form-item-label > label {
          color: #2D6A4F !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }
        .spring-input .ant-form-item-explain-error { color: #E63946 !important; }
        .spring-input .ant-input-affix-wrapper .ant-input { background: transparent !important; }
        .spring-checkbox .ant-checkbox-inner {
          background: #F0FFF4 !important;
          border-color: var(--lp-3) !important;
          border-radius: 5px !important;
        }
        .spring-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background: var(--lp-1) !important;
          border-color: var(--lp-1) !important;
        }
        .spring-checkbox span:last-child { color: #2D6A4F !important; font-size: 13px !important; }
        .spring-btn:hover {
          box-shadow: 0 8px 24px var(--lp-a55) !important;
          transform: translateY(-1px) !important;
        }
      `}</style>

      {/* Floating leaf shapes */}
      {LEAVES.map((l, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: l.w,
            height: l.h,
            top: l.top,
            left: (l as any).left,
            right: (l as any).right,
            background: l.color,
            borderRadius: l.borderRadius,
            transform: `rotate(${l.rotate}deg)`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Split layout card */}
      <div
        style={{
          width: '100%',
          maxWidth: 860,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 16px 64px var(--lp-a15), 0 4px 16px var(--lp-a10)',
          display: 'flex',
          position: 'relative',
          zIndex: 1,
          minHeight: 520,
        }}
      >
        {/* Left panel — branding */}
        <div
          style={{
            flex: '0 0 340px',
            background: 'linear-gradient(150deg, var(--lp-1) 0%, var(--lp-2) 50%, var(--lp-3) 100%)',
            padding: '48px 36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo + brand */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 52,
                height: 52,
                background: 'rgba(255,255,255,0.25)',
                borderRadius: 14,
                marginBottom: 20,
                backdropFilter: 'blur(8px)',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M17 8C8 10 5.9 16.17 3.82 19.5c-.06.09.04.17.12.1C6 18 10.5 15 19 15" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M3 3c0 7 3 10.5 6 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <Typography.Title
              level={2}
              style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 26, margin: '0 0 8px', lineHeight: 1.2 }}
            >
              Polaris POS
            </Typography.Title>
            <Typography.Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.6, display: 'block', marginBottom: 36 }}>
              Sistema de punto de venta y facturación electrónica para El Salvador
            </Typography.Text>

            {/* Feature bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {FEATURES.map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircleFilled style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, marginTop: 1, flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 1.5 }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom tagline */}
          <div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.25)', marginBottom: 16 }} />
            <Typography.Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              © {new Date().getFullYear()} Polaris POS · El Salvador
            </Typography.Text>
          </div>
        </div>

        {/* Right panel — form */}
        <div
          style={{
            flex: 1,
            background: '#FFFFFF',
            padding: '48px 44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ marginBottom: 28 }}>
            <Typography.Title
              level={3}
              style={{ margin: '0 0 6px', color: '#1B4332', fontWeight: 700, fontSize: 22 }}
            >
              Bienvenida de nuevo
            </Typography.Title>
            <Typography.Text style={{ color: 'var(--lp-1)', fontSize: 14 }}>
              Inicia sesión para continuar
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
              style={{ marginBottom: 20, borderRadius: 10, borderColor: '#F9C7CA' }}
            />
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="spring-input">
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
              <Checkbox className="spring-checkbox">Recordar empresa y correo</Checkbox>
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size="large"
              icon={!loading ? <ArrowRightOutlined /> : undefined}
              iconPosition="end"
              className="spring-btn"
              style={{
                height: 52,
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 15,
                border: 'none',
                transition: 'all 0.2s',
                background: 'linear-gradient(135deg, var(--lp-1) 0%, var(--lp-4) 100%)',
                boxShadow: '0 4px 16px var(--lp-a40)',
                color: '#FFFFFF',
              }}
            >
              Iniciar sesión
            </Button>
          </Form>
        </div>
      </div>
    </div>
  )
}

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

const BLOBS = [
  { w: 320, h: 200, top: '-5%', left: '-8%',  color: 'rgba(120,0,180,0.2)',  rotate: -30 },
  { w: 260, h: 180, top: '60%', right: '-5%', color: 'rgba(180,0,120,0.18)', rotate: 20  },
  { w: 200, h: 280, top: '30%', left: '-4%',  color: 'rgba(80,0,120,0.2)',   rotate: 50  },
  { w: 300, h: 160, top: '80%', left: '25%',  color: 'rgba(150,30,100,0.15)',rotate: -10 },
]

export default function LoginVelvet() {
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
        background: 'linear-gradient(145deg, #1A0025 0%, #2D0040 50%, #120018 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px',
      }}
    >
      <style>{`
        .velvet-input .ant-input-affix-wrapper,
        .velvet-input .ant-input {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(212,170,120,0.25) !important;
          border-radius: 12px !important;
          color: #F5E6D0 !important;
        }
        .velvet-input .ant-input-affix-wrapper:focus,
        .velvet-input .ant-input-affix-wrapper-focused {
          border-color: rgba(212,170,120,0.7) !important;
          box-shadow: 0 0 0 3px rgba(212,170,120,0.15) !important;
        }
        .velvet-input .ant-input::placeholder { color: rgba(245,230,208,0.3) !important; }
        .velvet-input .ant-input-password-icon { color: rgba(212,170,120,0.5) !important; }
        .velvet-input .anticon:not(.ant-input-password-icon) { color: #D4AA70 !important; }
        .velvet-input .ant-form-item-label > label {
          color: rgba(212,170,120,0.8) !important;
          font-weight: 500 !important;
          font-size: 13px !important;
        }
        .velvet-input .ant-form-item-explain-error { color: #FF8FAB !important; }
        .velvet-input .ant-input-affix-wrapper .ant-input { background: transparent !important; }
        .velvet-checkbox .ant-checkbox-inner {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(212,170,120,0.35) !important;
        }
        .velvet-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background: linear-gradient(135deg, #D4AA70, #C08090) !important;
          border-color: #D4AA70 !important;
        }
        .velvet-checkbox span:last-child {
          color: rgba(245,230,208,0.6) !important;
          font-size: 13px !important;
        }
        .velvet-btn:hover {
          box-shadow: 0 8px 28px rgba(212,170,120,0.5) !important;
          transform: translateY(-1px) !important;
        }
      `}</style>

      {/* Blurred ellipse blobs */}
      {BLOBS.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: b.w,
            height: b.h,
            top: b.top,
            left: (b as any).left,
            right: (b as any).right,
            background: b.color,
            borderRadius: '50%',
            filter: 'blur(50px)',
            transform: `rotate(${b.rotate}deg)`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(212,170,120,0.25)',
          borderRadius: 20,
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
              background: 'linear-gradient(135deg, #D4AA70 0%, #C08090 100%)',
              borderRadius: 16,
              marginBottom: 16,
              boxShadow: '0 4px 20px rgba(212,170,120,0.4)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="white" />
            </svg>
          </div>
          <Typography.Title
            level={3}
            style={{ margin: 0, color: '#F5E6D0', fontWeight: 700, fontSize: 22, letterSpacing: '0.02em' }}
          >
            Bienvenida de nuevo
          </Typography.Title>
          <Typography.Text style={{ color: 'rgba(245,230,208,0.55)', fontSize: 14, marginTop: 4, display: 'block' }}>
            Accede a tu espacio exclusivo
          </Typography.Text>
        </div>

        {/* Decorative divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(212,170,120,0.2)' }} />
          <span style={{ color: 'rgba(212,170,120,0.5)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Polaris POS</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(212,170,120,0.2)' }} />
        </div>

        {/* Error */}
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 20, borderRadius: 10, background: 'rgba(255,143,171,0.1)', borderColor: 'rgba(255,143,171,0.3)', color: '#FF8FAB' }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="velvet-input">
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
            <Checkbox className="velvet-checkbox">Recordar empresa y correo</Checkbox>
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            size="large"
            icon={!loading ? <ArrowRightOutlined /> : undefined}
            iconPosition="end"
            className="velvet-btn"
            style={{
              height: 52,
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              transition: 'all 0.2s',
              background: 'linear-gradient(135deg, #D4AA70 0%, #C08090 100%)',
              boxShadow: '0 4px 20px rgba(212,170,120,0.35)',
              color: '#1A0025',
            }}
          >
            Iniciar sesión
          </Button>
        </Form>

        <p style={{ textAlign: 'center', marginTop: 24, marginBottom: 0, color: 'rgba(212,170,120,0.35)', fontSize: 12, letterSpacing: '0.03em' }}>
          © {new Date().getFullYear()} Polaris POS · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}

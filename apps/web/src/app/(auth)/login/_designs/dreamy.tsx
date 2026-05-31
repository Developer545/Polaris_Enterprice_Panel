'use client'
import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }
const SAVED_KEY = 'pos_saved_credentials'

const STARS = [
  { top: '5%',  left: '12%',  size: 2 }, { top: '8%',  left: '78%',  size: 1.5 },
  { top: '13%', left: '45%',  size: 1 }, { top: '18%', left: '22%',  size: 2.5 },
  { top: '22%', left: '90%',  size: 1 }, { top: '28%', left: '60%',  size: 2 },
  { top: '33%', left: '7%',   size: 1.5 },{ top: '38%', left: '85%', size: 2 },
  { top: '44%', left: '30%',  size: 1 }, { top: '48%', left: '95%',  size: 1.5 },
  { top: '54%', left: '15%',  size: 2 }, { top: '60%', left: '52%',  size: 1 },
  { top: '65%', left: '73%',  size: 2.5 },{ top: '70%', left: '3%',  size: 1 },
  { top: '75%', left: '38%',  size: 2 }, { top: '80%', left: '88%',  size: 1.5 },
  { top: '85%', left: '20%',  size: 1 }, { top: '90%', left: '65%',  size: 2 },
  { top: '94%', left: '43%',  size: 1.5 },{ top: '97%', left: '8%',  size: 1 },
]

export default function LoginDreamy() {
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
      style={{
        minHeight: '100vh',
        background: 'var(--lp-dk-bg)',
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
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        .dreamy-input .ant-input-affix-wrapper,
        .dreamy-input .ant-input {
          background: rgba(255,255,255,0.07) !important;
          border-color: var(--lp-a4d) !important;
          border-radius: 12px !important;
          color: var(--lp-dk-txt-h) !important;
        }
        .dreamy-input .ant-input-affix-wrapper:focus,
        .dreamy-input .ant-input-affix-wrapper-focused {
          border-color: var(--lp-a8c) !important;
          box-shadow: 0 0 0 3px var(--lp-a33) !important;
        }
        .dreamy-input .ant-input::placeholder { color: rgba(243,232,255,0.35) !important; }
        .dreamy-input .ant-input-password-icon { color: rgba(243,232,255,0.5) !important; }
        .dreamy-input .anticon:not(.ant-input-password-icon) { color: var(--lp-1) !important; }
        .dreamy-input .ant-form-item-label > label {
          color: var(--lp-dk-txt-l) !important;
          font-weight: 500 !important;
          font-size: 13px !important;
        }
        .dreamy-input .ant-form-item-explain-error { color: #F472B6 !important; }
        .dreamy-input .ant-input-affix-wrapper .ant-input {
          background: transparent !important;
        }
        .dreamy-checkbox .ant-checkbox-inner {
          background: rgba(255,255,255,0.07) !important;
          border-color: var(--lp-a66) !important;
        }
        .dreamy-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background: var(--lp-1) !important;
          border-color: var(--lp-1) !important;
        }
        .dreamy-checkbox span:last-child { color: var(--lp-dk-txt-b) !important; font-size: 13px !important; }
        .dreamy-btn:hover {
          box-shadow: 0 8px 28px var(--lp-a80) !important;
          transform: translateY(-1px) !important;
        }
      `}</style>

      {/* Star dots */}
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: '#FFFFFF',
            animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.3) % 2}s`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Blurred blobs */}
      <div style={{ position: 'absolute', top: '10%', left: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, var(--lp-a40), transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, var(--lp-a33), transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '55%', left: '5%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, var(--lp-a26), transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

      {/* Glassmorphism card */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 24,
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
              background: 'linear-gradient(135deg, var(--lp-1) 0%, var(--lp-2) 100%)',
              borderRadius: 16,
              marginBottom: 16,
              boxShadow: '0 4px 20px var(--lp-a59)',
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
            style={{ margin: 0, color: 'var(--lp-dk-txt-h)', fontWeight: 700, fontSize: 22 }}
          >
            Bienvenida de nuevo
          </Typography.Title>
          <Typography.Text style={{ color: 'var(--lp-dk-txt-b)', fontSize: 14, marginTop: 4, display: 'block' }}>
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
            style={{ marginBottom: 20, borderRadius: 10, background: 'rgba(244,114,182,0.15)', borderColor: 'rgba(244,114,182,0.4)', color: '#F472B6' }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="dreamy-input">
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
            <Checkbox className="dreamy-checkbox">Recordar empresa y correo</Checkbox>
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            size="large"
            icon={!loading ? <ArrowRightOutlined /> : undefined}
            iconPosition="end"
            className="dreamy-btn"
            style={{
              height: 52,
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              transition: 'all 0.2s',
              background: 'linear-gradient(135deg, var(--lp-1) 0%, var(--lp-2) 100%)',
              boxShadow: '0 4px 20px var(--lp-a59)',
              color: 'var(--lp-text)',
            }}
          >
            Iniciar sesión
          </Button>
        </Form>

        <p style={{ textAlign: 'center', marginTop: 24, marginBottom: 0, color: 'var(--lp-dk-txt-b)', fontSize: 12 }}>
          © {new Date().getFullYear()} Polaris POS · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect, type ReactNode } from 'react'
import { Form, Input, Button, Checkbox, Alert } from 'antd'
import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }
const SAVED_KEY = 'pos_saved_credentials'

export interface LoginSplitProps {
  companyId?: string
  children: ReactNode  // left panel
}

export function LoginSplitBase({ companyId: propCompanyId = '', children }: LoginSplitProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [form]                = Form.useForm<LoginForm>()
  const [isLocal, setIsLocal] = useState(false)

  useEffect(() => {
    const local = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    setIsLocal(local)
    try {
      const saved = localStorage.getItem(SAVED_KEY)
      if (saved) form.setFieldsValue({ ...JSON.parse(saved), remember: true })
    } catch {}
    const cid = local
      ? 'local'
      : propCompanyId || (()=>{ try { return localStorage.getItem('companyId') ?? '' } catch { return '' } })()
    if (cid) form.setFieldsValue({ companyId: cid })
  }, [form, propCompanyId])

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
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
        @keyframes lp-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-split { display: flex; min-height: 100vh; font-family: var(--font-family, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif); }
        .lp-left  { width: 46%; flex-shrink: 0; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; }
        .lp-right { flex: 1; background: #FFFFFF; display: flex; align-items: center; justify-content: center; padding: 56px 48px; position: relative; }
        .lp-right::before {
          content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.06) 30%, rgba(0,0,0,0.06) 70%, transparent);
        }
        .lp-form-wrap { width: 100%; max-width: 360px; animation: lp-fade-up 0.3s ease; }
        .lp-label { font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: #94A3B8; margin-bottom: 6px; display: block; }
        @media (max-width: 820px) { .lp-left { display: none !important; } .lp-right::before { display: none; } }
      `}</style>

      <div className="lp-split">
        <div className="lp-left">{children}</div>

        <div className="lp-right">
          <div className="lp-form-wrap">

            {/* Header */}
            <div style={{ marginBottom: 36 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8' }}>
                {isLocal ? 'Modo local' : 'Sistema ERP · El Salvador'}
              </p>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.6px', lineHeight: 1.2 }}>
                {isLocal ? 'Entorno de desarrollo' : 'Bienvenido de vuelta'}
              </h1>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
                Ingresa tus credenciales para acceder al sistema.
              </p>
            </div>

            {error && (
              <Alert message={error} type="error" showIcon closable onClose={() => setError(null)}
                style={{ marginBottom: 24, borderRadius: 8, fontSize: 13 }} />
            )}

            <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
              <Form.Item name="companyId" hidden><Input /></Form.Item>

              <Form.Item name="email" style={{ marginBottom: 20 }}
                label={<span className="lp-label">Correo electrónico</span>}
                rules={[{ required: true, type: 'email', message: 'Correo inválido' }]}>
                <Input
                  prefix={<UserOutlined style={{ color: '#CBD5E1', fontSize: 14 }} />}
                  placeholder="usuario@empresa.com" autoComplete="email" size="large"
                  style={{ borderRadius: 10, height: 50, fontSize: 14, background: '#F8FAFC', border: '1.5px solid #E2E8F0' }}
                />
              </Form.Item>

              <Form.Item name="password" style={{ marginBottom: 24 }}
                label={<span className="lp-label">Contraseña</span>}
                rules={[{ required: true, message: 'Requerido' }]}>
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#CBD5E1', fontSize: 14 }} />}
                  placeholder="••••••••" autoComplete="current-password" size="large"
                  style={{ borderRadius: 10, height: 50, fontSize: 14, background: '#F8FAFC', border: '1.5px solid #E2E8F0' }}
                />
              </Form.Item>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <Form.Item name="remember" valuePropName="checked" style={{ margin: 0 }}>
                  <Checkbox style={{ fontSize: 13, color: '#64748B' }}>Recordar sesión</Checkbox>
                </Form.Item>
              </div>

              <Button type="primary" htmlType="submit" block loading={loading} size="large"
                icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end"
                style={{ height: 52, borderRadius: 12, fontWeight: 700, fontSize: 15, border: 'none', letterSpacing: '0.01em' }}>
                Iniciar sesión
              </Button>
            </Form>

            <p style={{ marginTop: 44, fontSize: 11, color: '#CBD5E1', textAlign: 'center', letterSpacing: '0.04em' }}>
              © {new Date().getFullYear()} Polaris Enterprise · ERP El Salvador
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

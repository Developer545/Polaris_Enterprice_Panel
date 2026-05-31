'use client'
import { useState, useEffect, type ReactNode } from 'react'
import { Form, Input, Button, Checkbox, Alert } from 'antd'
import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }
const SAVED_KEY = 'pos_saved_credentials'

export interface LoginFullProps {
  companyId?: string
  children: ReactNode        // full-page background layer (position: fixed behind card)
  formDark?: boolean         // dark card theme (for dark backgrounds)
  cardStyle?: React.CSSProperties
  wrapStyle?: React.CSSProperties
}

export function LoginFullBase({
  companyId: propCompanyId = '',
  children,
  formDark = false,
  cardStyle,
  wrapStyle,
}: LoginFullProps) {
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
      : propCompanyId || (()=>{ try { return localStorage.getItem('companyId')??'' } catch { return '' } })()
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

  const txtH      = formDark ? 'var(--lp-dk-txt-h, #F1F0FF)'     : '#0F172A'
  const txtB      = formDark ? 'var(--lp-dk-txt-b, #94A3B8)'     : '#64748B'
  const txtL      = formDark ? 'var(--lp-dk-txt-l, #64748B)'     : '#94A3B8'
  const inputBg   = formDark ? 'rgba(255,255,255,0.06)'           : '#F8FAFC'
  const inputBdr  = formDark ? '1.5px solid var(--lp-a20, #7C3AED33)' : '1.5px solid #E2E8F0'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
        @keyframes lp-pulse   { 0%,100%{opacity:1}  50%{opacity:0.4} }
        @keyframes lp-fade-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .lpf-wrap {
          position: relative; width: 100%; min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-family,'Inter',-apple-system,BlinkMacSystemFont,sans-serif);
        }
        .lpf-card {
          position: relative; z-index: 10;
          width: 100%; max-width: 420px;
          padding: 48px 44px; border-radius: 20px;
          animation: lp-fade-up 0.35s ease;
        }
        .lpf-label { font-size:11px; font-weight:600; letter-spacing:0.07em; text-transform:uppercase; display:block; margin-bottom:6px; }
      `}</style>

      {/* Background layer */}
      <div style={{ position:'fixed', inset:0, zIndex:0 }}>{children}</div>

      {/* Form card */}
      <div className="lpf-wrap" style={wrapStyle}>
        <div className="lpf-card" style={{
          background:    formDark ? 'rgba(8,8,14,0.82)' : 'rgba(255,255,255,0.93)',
          backdropFilter:'blur(28px) saturate(1.4)',
          border:        formDark
            ? '1px solid var(--lp-a20, #7C3AED33)'
            : '1px solid rgba(226,232,240,0.8)',
          boxShadow:     formDark
            ? '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px var(--lp-a10, #7C3AED1A)'
            : '0 32px 80px rgba(0,0,0,0.14)',
          ...cardStyle,
        }}>

          {/* Logo row */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
            <div style={{
              width:36, height:36, borderRadius:8, flexShrink:0,
              background:'var(--lp-a20, #7C3AED33)',
              border:'1px solid var(--lp-a30, #7C3AED4D)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z"
                  style={{ stroke:'var(--lp-1,#7C3AED)', fill:'var(--lp-a20,#7C3AED33)' }}
                  strokeWidth="1.5" />
                <path d="M12 6L17 8.5V13.5L12 16L7 13.5V8.5L12 6Z"
                  style={{ fill:'var(--lp-a30,#7C3AED4D)', stroke:'var(--lp-2,#A78BFA)' }}
                  strokeWidth="0.75" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:txtH, letterSpacing:'-0.01em', lineHeight:1.2 }}>
                Polaris Enterprise
              </div>
              <div style={{ fontSize:10, color:txtB, letterSpacing:'0.04em' }}>
                Sistema ERP · El Salvador
              </div>
            </div>
          </div>

          <h2 style={{ margin:'0 0 6px', fontSize:26, fontWeight:700, color:txtH, letterSpacing:'-0.5px', lineHeight:1.2 }}>
            {isLocal ? 'Entorno local' : 'Bienvenido de vuelta'}
          </h2>
          <p style={{ margin:'0 0 28px', fontSize:14, color:txtB, lineHeight:1.6 }}>
            Ingresa tus credenciales para acceder al sistema.
          </p>

          {error && (
            <Alert message={error} type="error" showIcon closable onClose={()=>setError(null)}
              style={{ marginBottom:20, borderRadius:8, fontSize:13 }} />
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="companyId" hidden><Input /></Form.Item>

            <Form.Item name="email" style={{ marginBottom:18 }}
              label={<span className="lpf-label" style={{ color:txtL }}>Correo electrónico</span>}
              rules={[{ required:true, type:'email', message:'Correo inválido' }]}>
              <Input
                prefix={<UserOutlined style={{ color:'#94A3B8', fontSize:14 }} />}
                placeholder="usuario@empresa.com" autoComplete="email" size="large"
                style={{ borderRadius:10, height:50, fontSize:14, background:inputBg, border:inputBdr, color: formDark ? '#F1F0FF' : undefined }}
              />
            </Form.Item>

            <Form.Item name="password" style={{ marginBottom:24 }}
              label={<span className="lpf-label" style={{ color:txtL }}>Contraseña</span>}
              rules={[{ required:true, message:'Requerido' }]}>
              <Input.Password
                prefix={<LockOutlined style={{ color:'#94A3B8', fontSize:14 }} />}
                placeholder="••••••••" autoComplete="current-password" size="large"
                style={{ borderRadius:10, height:50, fontSize:14, background:inputBg, border:inputBdr }}
              />
            </Form.Item>

            <div style={{ marginBottom:24 }}>
              <Form.Item name="remember" valuePropName="checked" style={{ margin:0 }}>
                <Checkbox style={{ fontSize:13, color:txtB }}>Recordar sesión</Checkbox>
              </Form.Item>
            </div>

            <Button type="primary" htmlType="submit" block loading={loading} size="large"
              icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end"
              style={{ height:52, borderRadius:12, fontWeight:700, fontSize:15, border:'none' }}>
              Iniciar sesión
            </Button>
          </Form>

          <p style={{ marginTop:36, fontSize:11, color: formDark ? '#334155' : '#CBD5E1', textAlign:'center', letterSpacing:'0.04em' }}>
            © {new Date().getFullYear()} Polaris Enterprise
          </p>
        </div>
      </div>
    </>
  )
}

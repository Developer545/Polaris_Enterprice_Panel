'use client'
import { useState, useEffect, useMemo } from 'react'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }

const SAVED_KEY = 'pos_saved_credentials'

function seededRand(seed: number) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

function buildStars(count: number, seed: number) {
  const rand = seededRand(seed)
  return Array.from({ length: count }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    r: rand() * 1.2 + 0.3,
    o: rand() * 0.5 + 0.15,
    twinkle: rand() > 0.75,
  }))
}

export default function LoginPage() {
  const router    = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [form]                = Form.useForm<LoginForm>()
  const [isLocal, setIsLocal] = useState(false)

  const stars = useMemo(() => buildStars(200, 97), [])

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
    setLoading(true)
    setError(null)
    try {
      const res = await getClient().post('/api/auth/login', values)
      if (res.data?.tenantSlug) setTenantSlug(res.data.tenantSlug)
      if (values.remember) {
        localStorage.setItem(SAVED_KEY, JSON.stringify({ companyId: values.companyId, email: values.email }))
      } else {
        localStorage.removeItem(SAVED_KEY)
      }
      localStorage.setItem('companyId', values.companyId)
      if (res.data?.user) {
        localStorage.setItem('userId',      res.data.user.id)
        localStorage.setItem('userName',    res.data.user.name)
        localStorage.setItem('userEmail',   res.data.user.email)
        localStorage.setItem('roleId',      res.data.user.roleId)
        localStorage.setItem('branchIds',   JSON.stringify(res.data.user.branchIds ?? []))
        localStorage.setItem('permissions', JSON.stringify(res.data.user.permissions ?? {}))
      }
      document.cookie = `pos_session=1; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`
      router.push('/')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }

        @keyframes twinkle {
          0%, 100% { opacity: var(--base-o); }
          50%       { opacity: calc(var(--base-o) * 0.25); }
        }
        @keyframes slowDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(-8px, 12px) scale(1.04); }
          66%       { transform: translate(6px, -8px) scale(0.97); }
        }
        @keyframes starRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
          70%  { box-shadow: 0 0 0 10px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }

        .login-input .ant-input,
        .login-input .ant-input-affix-wrapper {
          background: #0d1017 !important;
          border-color: rgba(255,255,255,0.08) !important;
          color: #e2e8f0 !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          height: 46px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .login-input .ant-input-affix-wrapper:hover,
        .login-input .ant-input-affix-wrapper-focused {
          border-color: rgba(99,102,241,0.5) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
        }
        .login-input .ant-input-affix-wrapper .ant-input {
          background: transparent !important;
          height: auto !important;
        }
        .login-input .ant-input-prefix { color: rgba(255,255,255,0.3) !important; margin-right: 10px; }
        .login-input .ant-input-password-icon { color: rgba(255,255,255,0.3) !important; }
        .login-input .ant-input::placeholder { color: rgba(255,255,255,0.2) !important; }
        .login-input .ant-form-item-label > label { color: rgba(255,255,255,0.5) !important; font-size: 12px !important; font-weight: 500 !important; letter-spacing: 0.04em !important; text-transform: uppercase; }
        .login-input .ant-form-item-explain-error { color: #f87171 !important; font-size: 12px !important; }
        .login-checkbox .ant-checkbox-inner { background: #0d1017 !important; border-color: rgba(255,255,255,0.12) !important; border-radius: 5px !important; }
        .login-checkbox .ant-checkbox-checked .ant-checkbox-inner { background: #6366f1 !important; border-color: #6366f1 !important; }
        .login-checkbox span { color: rgba(255,255,255,0.35) !important; font-size: 13px !important; }
        .login-submit:hover { opacity: 0.92 !important; transform: translateY(-1px) !important; box-shadow: 0 8px 24px rgba(99,102,241,0.45) !important; }
        .login-submit:active { transform: translateY(0) !important; }
      `}</style>

      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: '#060912',
      }}>

        {/* ══ LEFT — Hero panel 48% ══════════════════════════════════════ */}
        <div style={{
          width: '48%', height: '100%', flexShrink: 0, position: 'relative',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '48px 56px',
          background: 'radial-gradient(ellipse at 40% 0%, #0c1a4a 0%, #06091a 55%, #030508 100%)',
        }}>
          {/* Nebula blobs */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            animation: 'slowDrift 14s ease-in-out infinite',
            background: [
              'radial-gradient(ellipse 55% 38% at 25% 55%, rgba(67,56,202,0.22) 0%, transparent 70%)',
              'radial-gradient(ellipse 45% 30% at 78% 28%, rgba(29,78,216,0.14) 0%, transparent 65%)',
              'radial-gradient(ellipse 35% 25% at 55% 85%, rgba(124,58,237,0.10) 0%, transparent 60%)',
            ].join(', '),
          }} />

          {/* Stars */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {stars.map((s, i) => (
              <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r}
                fill="white" opacity={s.o}
                style={s.twinkle ? {
                  animation: `twinkle ${2.5 + (i % 4)}s ease-in-out infinite ${(i * 0.17) % 3.5}s`,
                } : undefined}
              />
            ))}
          </svg>

          {/* Ambient glow top-center */}
          <div style={{
            position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
            width: 400, height: 300, borderRadius: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />

          {/* ── TOP badge ── */}
          <div style={{ position: 'relative', zIndex: 1, animation: 'fadeSlideUp 0.6s ease both' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 24, padding: '5px 14px 5px 10px',
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', background: '#4ade80',
                boxShadow: '0 0 8px #4ade80, 0 0 2px #4ade80',
              }} />
              <span style={{
                color: 'rgba(255,255,255,0.45)', fontSize: 10.5, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Sistema DTE oficial · El Salvador
              </span>
            </div>
          </div>

          {/* ── CENTER brand + copy ── */}
          <div style={{ position: 'relative', zIndex: 1, animation: 'fadeSlideUp 0.7s ease 0.1s both' }}>

            {/* Logo mark */}
            <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 1px rgba(99,102,241,0.3), 0 8px 20px rgba(67,56,202,0.4)',
              }}>
                {/* Clean 4-pointed star */}
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <path d="M13 1 L14.8 10.5 L24 13 L14.8 15.5 L13 25 L11.2 15.5 L2 13 L11.2 10.5 Z"
                    fill="white" fillOpacity="0.95" />
                </svg>
              </div>
              <div>
                <div style={{
                  fontSize: 22, fontWeight: 800, color: '#fff',
                  letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  Polaris
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 3,
                }}>
                  Enterprise
                </div>
              </div>
            </div>

            {/* Headline */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 38, fontWeight: 800, lineHeight: 1.15,
                color: '#fff', letterSpacing: '-0.03em',
              }}>
                Control total<br />
                <span style={{
                  background: 'linear-gradient(90deg, #818cf8, #c7d2fe)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  de tu empresa.
                </span>
              </div>
            </div>

            <p style={{
              color: 'rgba(255,255,255,0.32)', fontSize: 14, lineHeight: 1.7,
              margin: '0 0 36px', maxWidth: 320,
            }}>
              POS, facturación electrónica DTE y ERP<br />
              diseñado para empresas salvadoreñas.
            </p>

            {/* Feature list — clean, minimal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'CF, CCF, Notas de Crédito y Débito', sub: 'Emisión directa ante Hacienda' },
                { label: 'POS táctil + impresión térmica',      sub: 'Facturación rápida en caja' },
                { label: 'Dashboard por sucursal y consolidado', sub: 'Multi-sucursal con control de acceso' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    marginTop: 3, width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: '#6366f1', boxShadow: '0 0 6px rgba(99,102,241,0.6)',
                  }} />
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                      {f.label}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11.5, marginTop: 1 }}>
                      {f.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── BOTTOM footer ── */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 11 }}>
              © {new Date().getFullYear()} Polaris Enterprise · Speeddan System
            </span>
          </div>
        </div>

        {/* ══ RIGHT — Login form 52% ══════════════════════════════════════ */}
        <div style={{
          flex: 1, height: '100%',
          background: '#080d1c',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 60px', overflowY: 'auto', position: 'relative',
        }}>
          {/* Subtle top-right glow */}
          <div style={{
            position: 'absolute', top: -80, right: -80, width: 360, height: 360,
            borderRadius: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }} />

          <div style={{
            width: '100%', maxWidth: 400,
            animation: 'fadeSlideUp 0.5s ease 0.15s both',
          }}>
            {/* Header */}
            <div style={{ marginBottom: 36 }}>
              <Typography.Title level={2} style={{
                margin: '0 0 8px', color: '#f1f5f9',
                fontWeight: 700, fontSize: 28, letterSpacing: '-0.025em',
              }}>
                Iniciar sesión
              </Typography.Title>
              <Typography.Text style={{
                color: 'rgba(255,255,255,0.28)', fontSize: 14, display: 'block',
              }}>
                {isLocal
                  ? 'Ingresa tus credenciales para continuar'
                  : 'Accede a tu panel con tus credenciales'}
              </Typography.Text>
            </div>

            {error && (
              <Alert message={error} type="error" showIcon closable
                onClose={() => setError(null)}
                style={{
                  marginBottom: 24, borderRadius: 10, fontSize: 13,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5',
                }}
              />
            )}

            <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false} className="login-input">
              {isLocal ? (
                <Form.Item name="companyId" hidden><Input /></Form.Item>
              ) : (
                <Form.Item
                  name="companyId"
                  label="ID de empresa"
                  rules={[{ required: true, message: 'Requerido' }]}
                  style={{ marginBottom: 18 }}
                >
                  <Input
                    prefix={<ShopOutlined />}
                    placeholder="company-id-empresa"
                    size="large"
                  />
                </Form.Item>
              )}

              <Form.Item
                name="email"
                label="Correo electrónico"
                rules={[{ required: true, type: 'email', message: 'Correo inválido' }]}
                style={{ marginBottom: 18 }}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="usuario@empresa.com"
                  autoComplete="email"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Contraseña"
                rules={[{ required: true, message: 'Requerido' }]}
                style={{ marginBottom: 18 }}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  size="large"
                />
              </Form.Item>

              <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 28 }}>
                <Checkbox className="login-checkbox">
                  Recordar empresa y correo
                </Checkbox>
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                size="large"
                icon={!loading ? <ArrowRightOutlined /> : undefined}
                iconPosition="end"
                className="login-submit"
                style={{
                  height: 48, borderRadius: 10, fontWeight: 600, fontSize: 15,
                  background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                  letterSpacing: '0.01em',
                  transition: 'all 0.2s',
                }}
              >
                Iniciar sesión
              </Button>
            </Form>

            {/* Divider + security note */}
            <div style={{
              marginTop: 32, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
              <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                CONEXIÓN SEGURA · TLS 1.3
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

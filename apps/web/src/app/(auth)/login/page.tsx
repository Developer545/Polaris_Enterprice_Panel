'use client'
import { useState, useEffect, useMemo } from 'react'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }

const SAVED_KEY = 'pos_saved_credentials'

// Deterministic pseudo-random (no hydration mismatch)
function seededRand(seed: number) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

function buildStars(count: number, seed: number) {
  const rand = seededRand(seed)
  return Array.from({ length: count }, () => ({
    x:    rand() * 100,
    y:    rand() * 100,
    r:    rand() * 1.5 + 0.4,
    o:    rand() * 0.6 + 0.25,
    twinkle: rand() > 0.7,
  }))
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [form]              = Form.useForm<LoginForm>()

  const stars = useMemo(() => buildStars(180, 42), [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_KEY)
      if (saved) {
        const creds = JSON.parse(saved)
        form.setFieldsValue({ ...creds, remember: true })
      }
    } catch {}
  }, [form])

  async function onFinish(values: LoginForm) {
    setLoading(true)
    setError(null)
    try {
      const res = await getClient().post('/api/auth/login', values)
      if (res.data?.tenantSlug) setTenantSlug(res.data.tenantSlug)
      if (values.remember) {
        localStorage.setItem(SAVED_KEY, JSON.stringify({
          companyId: values.companyId,
          email:     values.email,
          password:  values.password,
        }))
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
      router.push('/')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>

      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>

        {/* ══ LEFT — Galaxy panel (45%) ════════════════════════════════ */}
        <div style={{
          width: '45%', height: '100%', flexShrink: 0,
          background: 'radial-gradient(ellipse at 50% 0%, #0a0f2e 0%, #04060f 60%, #000005 100%)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '52px 52px',
        }}>

          {/* Nebula clouds */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: [
              'radial-gradient(ellipse 60% 40% at 30% 60%, rgba(88,28,135,0.28) 0%, transparent 70%)',
              'radial-gradient(ellipse 50% 35% at 75% 30%, rgba(29,78,216,0.22) 0%, transparent 65%)',
              'radial-gradient(ellipse 40% 30% at 60% 80%, rgba(15,118,110,0.15) 0%, transparent 60%)',
            ].join(', '),
            animation: 'nebula 8s ease-in-out infinite',
          }} />

          {/* Stars — single SVG instead of 180 divs (much lighter) */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {stars.map((s, i) => (
              <circle
                key={i}
                cx={`${s.x}%`}
                cy={`${s.y}%`}
                r={s.r}
                fill="white"
                opacity={s.o}
                style={s.twinkle ? {
                  animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite ${(i * 0.15) % 3}s`,
                } : undefined}
              />
            ))}
          </svg>

          {/* Polaris — main star */}
          <div style={{
            position: 'absolute', top: '22%', left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}>
            {/* Cross rays */}
            {[0, 90, 45, 135].map(deg => (
              <div key={deg} style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                width: deg % 90 === 0 ? 80 : 48,
                height: 1.5,
                background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.8), transparent)',
              }} />
            ))}
            {/* Core */}
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: 'radial-gradient(circle, #fff 30%, #93c5fd 70%, transparent 100%)',
              animation: 'polarisGlow 3s ease-in-out infinite',
              willChange: 'filter',
            }} />
          </div>

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}>
              <ShopOutlined style={{ color: '#93c5fd', fontSize: 17 }} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
                Polaris
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Enterprise</div>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(147,197,253,0.1)',
              border: '1px solid rgba(147,197,253,0.2)',
              borderRadius: 20, padding: '4px 14px', marginBottom: 24,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#93c5fd' }} />
              <span style={{ color: '#93c5fd', fontSize: 12, fontWeight: 500 }}>
                ERP · Facturación DTE · El Salvador
              </span>
            </div>

            <Typography.Title style={{
              color: '#fff', fontSize: 34, fontWeight: 800,
              lineHeight: 1.15, letterSpacing: '-0.025em', margin: '0 0 18px',
            }}>
              Gestiona tu negocio<br />desde las estrellas
            </Typography.Title>

            <Typography.Text style={{
              color: 'rgba(255,255,255,0.45)', fontSize: 14,
              lineHeight: 1.7, display: 'block', marginBottom: 32,
            }}>
              POS, facturación electrónica y ERP<br />
              para cualquier giro de empresa.
            </Typography.Text>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'CF, CCF, Notas de Crédito y Débito',
                'POS táctil con impresión térmica',
                'Integración directa con Hacienda',
              ].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#93c5fd', flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}>
              © {new Date().getFullYear()} Polaris Enterprise
            </span>
          </div>
        </div>

        {/* ══ RIGHT — Form panel (55%) ════════════════════════════════ */}
        <div style={{
          flex: 1, height: '100%',
          background: '#ffffff',
          backgroundImage: 'radial-gradient(#d1d5db 1.5px, transparent 1.5px)',
          backgroundSize: '22px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 64px', overflowY: 'auto', position: 'relative',
        }}>
          <div style={{
            width: '100%', maxWidth: 400,
            background: '#ffffff', borderRadius: 14,
            padding: '40px 36px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #f0f0f0',
          }}>
            <Typography.Title level={2} style={{
              margin: '0 0 6px', color: '#0d1117',
              fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em',
            }}>
              Bienvenido
            </Typography.Title>
            <Typography.Text style={{
              color: '#8b949e', fontSize: 14,
              display: 'block', marginBottom: 28,
            }}>
              Ingresa tus credenciales para continuar
            </Typography.Text>

            {error && (
              <Alert message={error} type="error" showIcon closable
                onClose={() => setError(null)}
                style={{ marginBottom: 20, borderRadius: 8, fontSize: 13 }}
              />
            )}

            <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
              <Form.Item
                name="companyId"
                label={<span style={{ color: '#24292f', fontWeight: 500, fontSize: 13 }}>ID de empresa</span>}
                rules={[{ required: true, message: 'Requerido' }]}
                style={{ marginBottom: 14 }}
              >
                <Input
                  prefix={<ShopOutlined style={{ color: '#8b949e' }} />}
                  placeholder="company-demo-001" size="large"
                  style={{ borderRadius: 8, borderColor: '#d0d7de', background: '#f6f8fa', fontSize: 14, height: 42 }}
                />
              </Form.Item>

              <Form.Item
                name="email"
                label={<span style={{ color: '#24292f', fontWeight: 500, fontSize: 13 }}>Correo electrónico</span>}
                rules={[{ required: true, type: 'email', message: 'Correo inválido' }]}
                style={{ marginBottom: 14 }}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#8b949e' }} />}
                  placeholder="usuario@empresa.com" autoComplete="email" size="large"
                  style={{ borderRadius: 8, borderColor: '#d0d7de', background: '#f6f8fa', fontSize: 14, height: 42 }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ color: '#24292f', fontWeight: 500, fontSize: 13 }}>Contraseña</span>}
                rules={[{ required: true, message: 'Requerido' }]}
                style={{ marginBottom: 14 }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#8b949e' }} />}
                  placeholder="••••••••" autoComplete="current-password" size="large"
                  style={{ borderRadius: 8, borderColor: '#d0d7de', background: '#f6f8fa', fontSize: 14, height: 42 }}
                />
              </Form.Item>

              <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 22 }}>
                <Checkbox style={{ color: '#8b949e', fontSize: 13 }}>
                  Recordar mis credenciales
                </Checkbox>
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={loading} size="large"
                style={{
                  height: 44, borderRadius: 8, fontWeight: 600, fontSize: 15,
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                  borderColor: '#1d4ed8',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
                }}
              >
                Iniciar sesión
              </Button>
            </Form>
          </div>
        </div>
      </div>
    </>
  )
}

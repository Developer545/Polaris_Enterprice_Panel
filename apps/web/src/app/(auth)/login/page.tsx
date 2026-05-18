'use client'
import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, Alert, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined, CheckCircleFilled } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

interface LoginForm { companyId: string; email: string; password: string; remember?: boolean }

const SAVED_KEY = 'pos_saved_credentials'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form] = Form.useForm<LoginForm>()

  // Pre-fill saved credentials on mount
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
      // Save or clear credentials
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
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      {/* ── LEFT — branding (45%) ──────────────────────────────────── */}
      <div style={{
        width: '45%',
        height: '100%',
        background: 'linear-gradient(150deg, #0d1117 0%, #161b22 40%, #0d1b2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '52px 56px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Grid pattern — bottom half */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%',
          pointerEvents: 'none',
          backgroundImage: [
            'linear-gradient(rgba(35,131,226,0.08) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(35,131,226,0.08) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.6) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.6) 100%)',
        }} />

        {/* Glow effects */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: [
            'radial-gradient(600px circle at 70% 10%, rgba(35,131,226,0.12) 0%, transparent 60%)',
            'radial-gradient(400px circle at 20% 85%, rgba(35,131,226,0.10) 0%, transparent 50%)',
          ].join(', '),
        }} />

        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: '#2383e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShopOutlined style={{ color: '#fff', fontSize: 19 }} />
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>
            POS DTE
          </span>
        </div>

        {/* Hero text */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(35,131,226,0.15)',
            border: '1px solid rgba(35,131,226,0.25)',
            borderRadius: 20,
            padding: '4px 12px',
            marginBottom: 20,
          }}>
            <span style={{ color: '#2383e2', fontSize: 12, fontWeight: 500 }}>
              Facturación Electrónica · El Salvador
            </span>
          </div>

          <Typography.Title style={{
            color: '#ffffff',
            fontSize: 36,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 20px',
          }}>
            Gestiona tu negocio<br />con facturación DTE
          </Typography.Title>

          <Typography.Text style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 15,
            lineHeight: 1.7,
            display: 'block',
            marginBottom: 36,
          }}>
            Para peluquerías, veterinarias,<br />
            comercios, almacenes y más.
          </Typography.Text>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'CF, CCF, Notas de Crédito y Débito',
              'POS táctil con impresión térmica',
              'Integración directa con Hacienda',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircleFilled style={{ color: '#2383e2', fontSize: 13, flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom text */}
        <div style={{ position: 'relative' }}>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
            © {new Date().getFullYear()} POS DTE El Salvador
          </span>
        </div>
      </div>

      {/* ── RIGHT — form (55%) ─────────────────────────────────────── */}
      <div style={{
        flex: 1,
        height: '100%',
        background: '#ffffff',
        backgroundImage: 'radial-gradient(#e4e4e4 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 64px',
        overflowY: 'auto',
        position: 'relative',
      }}>
        <div style={{
          width: '100%', maxWidth: 400,
          background: '#ffffff',
          borderRadius: 12,
          padding: '40px 36px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid #f0f0f0',
        }}>

          <Typography.Title level={2} style={{
            margin: '0 0 8px',
            color: '#0d1117',
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: '-0.02em',
          }}>
            Bienvenido
          </Typography.Title>
          <Typography.Text style={{
            color: '#8b949e',
            fontSize: 15,
            display: 'block',
            marginBottom: 32,
          }}>
            Ingresa tus credenciales para continuar
          </Typography.Text>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: 24, borderRadius: 8, fontSize: 13 }}
            />
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="companyId"
              label={<span style={{ color: '#24292f', fontWeight: 500, fontSize: 13 }}>ID de empresa</span>}
              rules={[{ required: true, message: 'Requerido' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<ShopOutlined style={{ color: '#8b949e' }} />}
                placeholder="company-demo-001"
                size="large"
                style={{
                  borderRadius: 8,
                  borderColor: '#d0d7de',
                  background: '#f6f8fa',
                  fontSize: 14,
                  height: 42,
                }}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label={<span style={{ color: '#24292f', fontWeight: 500, fontSize: 13 }}>Correo electrónico</span>}
              rules={[{ required: true, type: 'email', message: 'Correo inválido' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#8b949e' }} />}
                placeholder="usuario@empresa.com"
                autoComplete="email"
                size="large"
                style={{
                  borderRadius: 8,
                  borderColor: '#d0d7de',
                  background: '#f6f8fa',
                  fontSize: 14,
                  height: 42,
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ color: '#24292f', fontWeight: 500, fontSize: 13 }}>Contraseña</span>}
              rules={[{ required: true, message: 'Requerido' }]}
              style={{ marginBottom: 28 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#8b949e' }} />}
                placeholder="••••••••"
                autoComplete="current-password"
                size="large"
                style={{
                  borderRadius: 8,
                  borderColor: '#d0d7de',
                  background: '#f6f8fa',
                  fontSize: 14,
                  height: 42,
                }}
              />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 20 }}>
              <Checkbox style={{ color: '#8b949e', fontSize: 13 }}>
                Recordar mis credenciales
              </Checkbox>
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size="large"
              style={{
                height: 44,
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
                background: '#2383e2',
                borderColor: '#2383e2',
                letterSpacing: '-0.01em',
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

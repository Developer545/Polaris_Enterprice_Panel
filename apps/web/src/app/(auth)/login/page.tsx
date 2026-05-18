'use client'
import { useState } from 'react'
import { Form, Input, Button, Typography, Alert } from 'antd'
import {
  UserOutlined, LockOutlined, ShopOutlined,
  CheckCircleFilled, ThunderboltFilled, SafetyCertificateFilled,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

interface LoginForm { companyId: string; email: string; password: string }

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFinish(values: LoginForm) {
    setLoading(true)
    setError(null)
    try {
      const res = await getClient().post('/api/auth/login', values)
      if (res.data?.tenantSlug) setTenantSlug(res.data.tenantSlug)
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
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      {/* ── LEFT PANEL — branding ─────────────────────────────────────── */}
      <div style={{
        width: 480,
        flexShrink: 0,
        background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 48px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 80% 20%, rgba(35,131,226,0.15) 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, rgba(35,131,226,0.08) 0%, transparent 50%)',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#2383e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(35,131,226,0.4)',
          }}>
            <ShopOutlined style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>POS DTE SV</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Speeddan System</div>
          </div>
        </div>

        {/* Main copy */}
        <div style={{ position: 'relative' }}>
          <Typography.Title level={2} style={{
            color: '#fff', margin: '0 0 16px',
            fontWeight: 800, lineHeight: 1.2, fontSize: 32,
          }}>
            Facturación DTE<br />para cualquier<br />negocio
          </Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.7, display: 'block', marginBottom: 32 }}>
            Peluquerías, veterinarias, comercios,<br />almacenes y más — todo en un solo sistema.
          </Typography.Text>

          {/* Feature list */}
          {[
            'Emisión de CF, CCF, NC y ND',
            'Integración con Ministerio de Hacienda',
            'POS táctil + impresión térmica',
          ].map(feat => (
            <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <CheckCircleFilled style={{ color: '#2383e2', fontSize: 14, flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{feat}</span>
            </div>
          ))}
        </div>

        {/* Footer badges */}
        <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
          {[
            { icon: <ThunderboltFilled />, label: 'Multi-giro' },
            { icon: <SafetyCertificateFilled />, label: 'MH Certificado' },
          ].map(b => (
            <div key={b.label} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20, padding: '6px 12px',
            }}>
              <span style={{ color: '#2383e2', fontSize: 12 }}>{b.icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL — form ────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          <Typography.Title level={3} style={{
            margin: '0 0 6px', color: '#37352f', fontWeight: 700,
          }}>
            Bienvenido
          </Typography.Title>
          <Typography.Text style={{ color: '#787774', fontSize: 14, display: 'block', marginBottom: 28 }}>
            Ingresa con tus credenciales de acceso
          </Typography.Text>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: 20, borderRadius: 8, fontSize: 13 }}
            />
          )}

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>

            <Form.Item
              name="companyId"
              label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>ID de empresa</span>}
              rules={[{ required: true, message: 'Requerido' }]}
              style={{ marginBottom: 14 }}
            >
              <Input
                prefix={<ShopOutlined style={{ color: '#b8b8b6' }} />}
                placeholder="company-demo-001"
                size="large"
                style={{ borderRadius: 8, borderColor: '#e9e9e7', background: '#fff', fontSize: 14 }}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Correo electrónico</span>}
              rules={[{ required: true, type: 'email', message: 'Correo inválido' }]}
              style={{ marginBottom: 14 }}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#b8b8b6' }} />}
                placeholder="usuario@empresa.com"
                autoComplete="email"
                size="large"
                style={{ borderRadius: 8, borderColor: '#e9e9e7', background: '#fff', fontSize: 14 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Contraseña</span>}
              rules={[{ required: true, message: 'Requerido' }]}
              style={{ marginBottom: 24 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#b8b8b6' }} />}
                placeholder="••••••••"
                autoComplete="current-password"
                size="large"
                style={{ borderRadius: 8, borderColor: '#e9e9e7', background: '#fff', fontSize: 14 }}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size="large"
              style={{
                borderRadius: 8,
                height: 44,
                fontWeight: 600,
                fontSize: 15,
                background: '#37352f',
                borderColor: '#37352f',
                boxShadow: '0 2px 8px rgba(55,53,47,0.2)',
              }}
            >
              Iniciar sesión
            </Button>

          </Form>

          <Typography.Text style={{
            display: 'block', textAlign: 'center',
            marginTop: 32, color: '#c7c7c5', fontSize: 11,
          }}>
            © {new Date().getFullYear()} Speeddan System · v{process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'}
          </Typography.Text>
        </div>
      </div>
    </div>
  )
}

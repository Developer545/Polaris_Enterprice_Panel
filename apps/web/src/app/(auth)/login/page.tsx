'use client'
import { useState } from 'react'
import { Form, Input, Button, Typography, Alert, Divider } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

interface LoginForm { companyId: string; email: string; password: string }

const N = {
  bg:        '#ffffff',
  bgHover:   '#f7f6f3',
  text:      '#37352f',
  muted:     '#787774',
  hint:      '#9b9b99',
  border:    '#e9e9e7',
  blue:      '#2383e2',
  blueHover: '#1a6dbf',
}

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
      background: N.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: '24px 16px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: N.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShopOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        <Typography.Text style={{ color: N.text, fontWeight: 700, fontSize: 18 }}>
          POS DTE SV
        </Typography.Text>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: N.bg,
        border: `1px solid ${N.border}`,
        borderRadius: 8,
        padding: '32px 28px',
        boxShadow: '0 2px 8px rgba(55,53,47,0.06)',
      }}>
        <Typography.Title level={4} style={{ margin: '0 0 4px', color: N.text, fontWeight: 700, textAlign: 'center' }}>
          Iniciar sesión
        </Typography.Title>
        <Typography.Text style={{ color: N.muted, fontSize: 13, display: 'block', textAlign: 'center', marginBottom: 24 }}>
          Sistema de facturación DTE · El Salvador
        </Typography.Text>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16, borderRadius: 6, fontSize: 13 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="middle">
          <Form.Item
            name="companyId"
            label={<span style={{ color: N.text, fontWeight: 500, fontSize: 13 }}>ID de empresa</span>}
            rules={[{ required: true, message: '' }]}
            style={{ marginBottom: 12 }}
          >
            <Input
              prefix={<ShopOutlined style={{ color: N.hint }} />}
              placeholder="company-demo-001"
              style={{ borderRadius: 6, borderColor: N.border, color: N.text, background: N.bg }}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={<span style={{ color: N.text, fontWeight: 500, fontSize: 13 }}>Correo electrónico</span>}
            rules={[{ required: true, type: 'email', message: '' }]}
            style={{ marginBottom: 12 }}
          >
            <Input
              prefix={<UserOutlined style={{ color: N.hint }} />}
              placeholder="usuario@empresa.com"
              autoComplete="email"
              style={{ borderRadius: 6, borderColor: N.border, color: N.text, background: N.bg }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ color: N.text, fontWeight: 500, fontSize: 13 }}>Contraseña</span>}
            rules={[{ required: true, message: '' }]}
            style={{ marginBottom: 20 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: N.hint }} />}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ borderRadius: 6, borderColor: N.border, color: N.text, background: N.bg }}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            style={{
              borderRadius: 6,
              height: 36,
              fontWeight: 500,
              fontSize: 14,
              background: N.blue,
              borderColor: N.blue,
            }}
          >
            Continuar →
          </Button>
        </Form>

        <Divider style={{ margin: '20px 0', borderColor: N.border }} />

        <Typography.Text style={{ display: 'block', textAlign: 'center', color: N.hint, fontSize: 11 }}>
          Speeddan System · v{process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'}
        </Typography.Text>
      </div>
    </div>
  )
}

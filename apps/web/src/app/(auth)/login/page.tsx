'use client'
import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getClient, setTenantSlug } from '@pos-dte/shared-api'

interface LoginForm {
  companyId: string
  email: string
  password: string
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
      // Store companyId and user data for use across all modules
      localStorage.setItem('companyId', values.companyId)
      if (res.data?.user) {
        localStorage.setItem('userId', res.data.user.id)
        localStorage.setItem('userName', res.data.user.name)
        localStorage.setItem('userEmail', res.data.user.email)
        localStorage.setItem('roleId', res.data.user.roleId)
        localStorage.setItem('branchIds', JSON.stringify(res.data.user.branchIds ?? []))
        localStorage.setItem('permissions', JSON.stringify(res.data.user.permissions ?? {}))
      }
      router.push('/')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      style={{ width: 420, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
      styles={{ body: { padding: 40 } }}
    >
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: '#f47920',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <ShopOutlined style={{ fontSize: 28, color: '#fff' }} />
        </div>
        <Typography.Title level={3} style={{ margin: 0, color: '#001529' }}>
          POS DTE
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Speeddan System · El Salvador
        </Typography.Text>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} closable onClose={() => setError(null)} />
      )}

      <Form layout="vertical" onFinish={onFinish} size="large" requiredMark={false}>
        <Form.Item
          name="companyId"
          label="ID de empresa"
          rules={[{ required: true, message: 'Ingresa el ID de empresa' }]}
        >
          <Input prefix={<ShopOutlined style={{ color: '#bbb' }} />} placeholder="cuid de la empresa" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Correo electrónico"
          rules={[{ required: true, type: 'email', message: 'Correo inválido' }]}
        >
          <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} placeholder="usuario@empresa.com" autoComplete="email" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Contraseña"
          rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
        >
          <Input.Password prefix={<LockOutlined style={{ color: '#bbb' }} />} placeholder="••••••••" autoComplete="current-password" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
          <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 44 }}>
            Iniciar sesión
          </Button>
        </Form.Item>
      </Form>

      <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 20, fontSize: 12 }}>
        v{process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'}
      </Typography.Text>
    </Card>
  )
}

'use client'
import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Alert, App } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { api } from '../../../lib/api'

function LoginContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFinish(values: { email: string; password: string }) {
    setLoading(true)
    setError(null)
    try {
      await api.post('/api/control-plane/admin-auth/login', values)
      router.push('/')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f7f6f3',
    }}>
      {/* Subtle background pattern */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, #e9e9e7 1px, transparent 0)',
        backgroundSize: '28px 28px',
        opacity: 0.6,
      }} />

      <Card
        style={{
          width: 400,
          borderRadius: 12,
          border: '1px solid #e9e9e7',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
          position: 'relative',
          zIndex: 1,
        }}
        styles={{ body: { padding: 36 } }}
      >
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #722ed1, #9254de)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
            boxShadow: '0 4px 12px rgba(114,46,209,0.3)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M12 2v20M3 7l9 5 9-5" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </div>
          <Typography.Title level={4} style={{ margin: 0, color: '#37352f', fontWeight: 700 }}>
            Polaris Enterprise
          </Typography.Title>
          <Typography.Text style={{ color: '#9b9b99', fontSize: 13 }}>
            Polaris Enterprise · Acceso restringido
          </Typography.Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} size="middle" requiredMark={false}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email inválido' }]}>
            <Input
              prefix={<UserOutlined style={{ color: '#c7c7c5' }} />}
              placeholder="admin@polarisenterprisesv.com"
              style={{ height: 40 }}
            />
          </Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true, message: 'Contraseña requerida' }]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: '#c7c7c5' }} />}
              placeholder="••••••••"
              style={{ height: 40 }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 4 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ height: 40, fontWeight: 600 }}
            >
              Ingresar al panel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <App>
      <LoginContent />
    </App>
  )
}

'use client'
import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Alert } from 'antd'
import { UserOutlined, LockOutlined, ControlOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { api } from '../../../lib/api'

export default function AdminLoginPage() {
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
      setError(err?.response?.data?.message ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)' }}>
      <Card style={{ width: 400, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }} styles={{ body: { padding: 40 } }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#722ed1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <ControlOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Typography.Title level={3} style={{ margin: 0 }}>Panel Administrativo</Typography.Title>
          <Typography.Text type="secondary">Speeddan System · Acceso restringido</Typography.Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} closable onClose={() => setError(null)} />}

        <Form layout="vertical" onFinish={onFinish} size="large" requiredMark={false}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} placeholder="admin@speeddan.com" />
          </Form.Item>
          <Form.Item name="password" label="Contraseña" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#bbb' }} />} placeholder="••••••••" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 44 }}>
              Ingresar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

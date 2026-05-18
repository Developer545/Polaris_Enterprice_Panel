'use client'
import { useState } from 'react'
import { Form, Input, Select, Button, Card, Typography, App, Row, Col } from 'antd'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

export default function NewTenantPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [dbStrategy, setDbStrategy] = useState<string>('NEON_SHARED')

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/api/control-plane/plans').then((r) => r.data),
  })

  async function onFinish(values: any) {
    setLoading(true)
    try {
      await api.post('/api/control-plane/tenants', values)
      message.success('Tenant creado correctamente')
      router.push('/tenants')
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Error al crear tenant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>Nuevo Tenant</Typography.Title>
      <Card style={{ borderRadius: 10 }}>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                <Input placeholder="Empresa ABC" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="slug" label="Slug (único)" rules={[{ required: true, pattern: /^[a-z0-9-]+$/, message: 'Solo minúsculas, números y guiones' }]}>
                <Input placeholder="empresa-abc" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="contacto@empresa.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Teléfono">
                <Input placeholder="7777-7777" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="planId" label="Plan" rules={[{ required: true }]}>
                <Select placeholder="Seleccionar plan">
                  {plans.map((p: any) => (
                    <Select.Option key={p.id} value={p.id}>
                      {p.name} — ${p.price}/mes
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dbStrategy" label="Estrategia de BD" initialValue="NEON_SHARED" rules={[{ required: true }]}>
                <Select onChange={setDbStrategy}>
                  <Select.Option value="NEON_SHARED">Neon Compartida</Select.Option>
                  <Select.Option value="NEON_DEDICATED">Neon Dedicada</Select.Option>
                  <Select.Option value="LOCAL_DEDICATED">PostgreSQL Local</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {dbStrategy !== 'NEON_SHARED' && (
            <Form.Item name="dbUrl" label="URL de base de datos" rules={[{ required: true }]}
              help="Se cifrará antes de almacenarse">
              <Input.Password placeholder="postgresql://user:pass@host:5432/db?sslmode=require" />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              Crear tenant
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => router.back()}>
              Cancelar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

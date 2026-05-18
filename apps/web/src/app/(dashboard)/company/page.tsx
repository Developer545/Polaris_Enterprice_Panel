'use client'
import { useEffect } from 'react'
import { Form, Input, Select, Button, Card, Typography, Divider, App, Row, Col, Upload } from 'antd'
import { UploadOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'

const { Title, Text } = Typography

export default function CompanyPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm()

  const { companyId } = useAppContext()

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => api.get(`/api/companies/${companyId}`).then(r => r.data),
    enabled: !!companyId,
  })

  useEffect(() => {
    if (company) {
      form.setFieldsValue({
        ...company,
        haciendaUser: '',
        haciendaPassword: '',
        certPassword: '',
      })
    }
  }, [company, form])

  const mutation = useMutation({
    mutationFn: (values: any) => api.put(`/api/companies/${companyId}`, values),
    onSuccess: () => {
      message.success('Empresa actualizada')
      qc.invalidateQueries({ queryKey: ['company', companyId] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  return (
    <div style={{ maxWidth: 900 }}>
      <Title level={4}>Configuración de Empresa</Title>

      <Form form={form} layout="vertical" onFinish={mutation.mutate} requiredMark={false}>
        <Card title="Datos generales" size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Razón social" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="comercialName" label="Nombre comercial">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nit" label="NIT">
                <Input placeholder="0000-000000-000-0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nrc" label="NRC">
                <Input placeholder="000000-0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phone" label="Teléfono">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Correo electrónico">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label="Dirección">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="actividadEconomica" label="Actividad económica">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="actividadEconomicaCodigo" label="Código actividad (MH)">
                <Input placeholder="00000" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Facturación DTE (Hacienda)" size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
            Las credenciales se cifran antes de almacenarse. Dejar en blanco para no modificar.
          </Text>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="dteAmbiente" label="Ambiente DTE">
                <Select>
                  <Select.Option value="TEST">Pruebas</Select.Option>
                  <Select.Option value="PROD">Producción</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="haciendaUser" label="Usuario Hacienda">
                <Input placeholder="Dejar vacío para no cambiar" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="haciendaPassword" label="Contraseña Hacienda">
                <Input.Password placeholder="Dejar vacío para no cambiar" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="certData" label="Certificado .p12 (base64)">
                <Input.TextArea rows={3} placeholder="Pegar contenido base64 del archivo .p12" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="certPassword" label="Contraseña del certificado">
                <Input.Password placeholder="Dejar vacío para no cambiar" />
              </Form.Item>
            </Col>
          </Row>
          {company?.haciendaConfigured && (
            <Text type="success" style={{ fontSize: 12 }}>✓ Credenciales Hacienda configuradas</Text>
          )}
        </Card>

        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={mutation.isPending}>
          Guardar cambios
        </Button>
      </Form>
    </div>
  )
}

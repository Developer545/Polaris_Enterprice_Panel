'use client'
import { useEffect, useState } from 'react'
import { Form, Input, Select, Button, Card, Typography, App, Row, Col, Upload, Avatar, Switch, Spin } from 'antd'
import { UploadOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'

const { Title, Text } = Typography

export default function CompanyPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm()

  const { companyId } = useAppContext()
  const [logoLoading, setLogoLoading] = useState(false)

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

  // ── Logo upload ───────────────────────────────────────────────────────────────
  async function uploadLogo(file: File) {
    setLogoLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          const base64 = (ev.target?.result as string).split(',')[1]
          const mime = file.type
          const res = await api.post('/api/upload/image', { base64, mime, folder: 'polaris/empresa' })
          const logoUrl = res.data.url
          await api.put(`/api/companies/${companyId}`, { logoUrl })
          qc.invalidateQueries({ queryKey: ['company', companyId] })
          message.success('Logo actualizado')
        } catch {
          message.error('Error al subir el logo')
        } finally {
          setLogoLoading(false)
        }
      }
      reader.readAsDataURL(file)
    } catch {
      message.error('Error al leer el archivo')
      setLogoLoading(false)
    }
    return false // prevent antd default upload
  }

  async function deleteLogo() {
    try {
      await api.put(`/api/companies/${companyId}`, { logoUrl: null })
      qc.invalidateQueries({ queryKey: ['company', companyId] })
      message.success('Logo eliminado')
    } catch {
      message.error('Error al eliminar el logo')
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <Title level={4}>Configuración de Empresa</Title>

      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <Card title="Logo de empresa" size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Spin spinning={logoLoading}>
            {company?.logoUrl ? (
              <img
                src={company.logoUrl}
                alt="Logo empresa"
                style={{ maxHeight: 120, maxWidth: 240, objectFit: 'contain', borderRadius: 8, border: '1px solid #f0f0f0' }}
              />
            ) : (
              <Avatar size={120} style={{ background: '#f5f5f5', color: '#bfbfbf', fontSize: 36, fontWeight: 700 }}>
                {company?.name?.[0]?.toUpperCase() ?? 'E'}
              </Avatar>
            )}
          </Spin>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={uploadLogo}
              disabled={logoLoading}
            >
              <Button icon={<UploadOutlined />} loading={logoLoading}>
                {company?.logoUrl ? 'Cambiar logo' : 'Subir logo'}
              </Button>
            </Upload>
            {company?.logoUrl && (
              <Button danger size="small" icon={<DeleteOutlined />} onClick={deleteLogo}>
                Eliminar logo
              </Button>
            )}
            <Text type="secondary" style={{ fontSize: 11, maxWidth: 260 }}>
              Formatos: JPG, PNG, WebP. Máximo 10 MB. El logo aparece en documentos y facturas.
            </Text>
          </div>
        </div>
      </Card>

      <Form form={form} layout="vertical" onFinish={mutation.mutate} requiredMark={false}>
        {/* ── Datos generales ─────────────────────────────────────────────────── */}
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

        {/* ── Facturación DTE ─────────────────────────────────────────────────── */}
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

        {/* ── Configuración del negocio ────────────────────────────────────────── */}
        <Card title="Configuración del negocio" size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="enableCommissions" label="Sistema de comisiones" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: -16, marginBottom: 16 }}>
                Activa tipos de precio, comisiones y vendedores en el POS
              </Text>
            </Col>
            <Col span={12}>
              <Form.Item name="enableSalesGoals" label="Metas de ventas" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: -16, marginBottom: 16 }}>
                Activa el módulo de metas y comisiones tipo B por grupo
              </Text>
            </Col>
          </Row>
        </Card>

        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={mutation.isPending}>
          Guardar cambios
        </Button>
      </Form>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import {
  Form, Input, Select, Button, Row, Col, Divider,
  Typography, App, Spin, Tag, Alert, Card, Switch, theme,
} from 'antd'
import { SaveOutlined, LockOutlined, BankOutlined, EnvironmentOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography

const LBL = (text: string) => (
  <span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>{text}</span>
)
const INP = { borderRadius: 8, borderColor: '#e9e9e7' } as const
const MB = { marginBottom: 16 } as const

interface Props { companyId: string }

export default function EmpresaTab({ companyId }: Props) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const departamentoCod = Form.useWatch('departamentoCod', form)
  const municipioCod = Form.useWatch('municipioCod', form)

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => api.get(`/api/companies/${companyId}`).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: actividades = [] } = useQuery({
    queryKey: ['actividades'],
    queryFn: () => api.get('/api/catalogs/actividades').then(r => r.data),
    staleTime: 60 * 60_000,
  })

  const { data: departamentos = [] } = useQuery({
    queryKey: ['catalogs-departamentos'],
    queryFn: () => api.get('/api/catalogs/departamentos').then(r => r.data),
    staleTime: 60 * 60_000,
  })

  const { data: municipios = [] } = useQuery({
    queryKey: ['catalogs-municipios', departamentoCod],
    queryFn: () => api.get(`/api/catalogs/departamentos/${departamentoCod}/municipios`).then(r => r.data),
    enabled: !!departamentoCod,
    staleTime: 60 * 60_000,
  })

  const { data: distritos = [] } = useQuery({
    queryKey: ['catalogs-distritos', departamentoCod, municipioCod],
    queryFn: () => api.get(`/api/catalogs/departamentos/${departamentoCod}/distritos`, { params: { municipioCod } }).then(r => r.data),
    enabled: !!departamentoCod,
    staleTime: 60 * 60_000,
  })

  useEffect(() => {
    if (company) {
      form.setFieldsValue({
        name: company.name,
        comercialName: company.comercialName,
        nit: company.nit,
        nrc: company.nrc,
        tipoDocumento: company.tipoDocumento,
        actividadEconomicaCodigo: company.actividadEconomicaCodigo,
        giro: company.giro,
        departamentoCod: company.departamentoCod,
        municipioCod: company.municipioCod,
        distritoCod: company.distritoCod,
        address: company.address,
        phone: company.phone,
        email: company.email,
        esGranContribuyente: company.esGranContribuyente ?? false,
        sujetoRetencionIva1: company.sujetoRetencionIva1 ?? true,
        dteAmbiente: company.dteAmbiente ?? 'TEST',
        haciendaUser: company.haciendaUser,
      })
    }
  }, [company, form])

  const mutation = useMutation({
    mutationFn: (dto: any) => api.put(`/api/companies/${companyId}`, dto),
    onSuccess: () => {
      message.success('Configuración guardada')
      qc.invalidateQueries({ queryKey: ['company', companyId] })
    },
    onError: () => message.error('Error al guardar'),
  })

  function onFinish(values: any) {
    const actividadNombre = (actividades as any[]).find((a: any) => a.codigo === values.actividadEconomicaCodigo)?.nombre
    mutation.mutate({ ...values, actividadEconomica: actividadNombre })
  }

  if (isLoading) return <div style={{ padding: 60, textAlign: 'center' }}><Spin /></div>

  return (
    <div style={{ padding: '24px 28px', maxWidth: 820 }}>
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>

        {/* ── Información general ─────────────────────────────── */}
        <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Información general
        </Text>
        <Divider style={{ margin: '4px 0 20px', borderColor: '#e9e9e7' }} />

        <Row gutter={24}>
          <Col xs={24} md={14}>
            <Form.Item label={LBL('Razón Social')} name="name" rules={[{ required: true, message: 'Requerido' }]} style={MB}>
              <Input prefix={<BankOutlined style={{ color: '#ccc' }} />} placeholder="Empresa S.A. de C.V." style={INP} />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item label={LBL('Nombre Comercial')} name="comercialName" style={MB}>
              <Input placeholder="Nombre comercial (opcional)" style={INP} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label={LBL('Tipo Documento')} name="tipoDocumento" style={MB}>
              <Select
                placeholder="NIT / DUI"
                allowClear
                style={{ borderRadius: 8 }}
                options={[
                  { value: '36', label: '36 — NIT' },
                  { value: '13', label: '13 — DUI' },
                  { value: '03', label: '03 — Pasaporte' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label={LBL('NIT')} name="nit" style={MB}>
              <Input placeholder="0614-010101-001-1" style={INP} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label={LBL('NRC')} name="nrc" style={MB}>
              <Input placeholder="123456-7" style={INP} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label={LBL('Actividad Económica')} name="actividadEconomicaCodigo" style={MB}>
              <Select
                showSearch
                placeholder="Seleccione actividad"
                optionFilterProp="label"
                style={{ borderRadius: 8 }}
                options={(actividades as any[]).map((a: any) => ({
                  value: a.codigo,
                  label: `${a.codigo} — ${a.nombre}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item label={LBL('Giro comercial (DTE)')} name="giro" style={MB}
              extra={<Text type="secondary" style={{ fontSize: 11 }}>Descripción del giro — aparece en el JSON DTE cuando difiere de la actividad</Text>}>
              <Input placeholder="Venta de ropa y accesorios" style={INP} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label={LBL('Departamento DTE')} name="departamentoCod" style={MB}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={(departamentos as any[]).map((d: any) => ({ value: d.codigo, label: d.codigo + ' - ' + d.nombre }))}
                    onChange={() => form.setFieldsValue({ municipioCod: undefined, distritoCod: undefined })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label={LBL('Municipio DTE')} name="municipioCod" style={MB}>
                  <Select
                    showSearch
                    disabled={!departamentoCod}
                    optionFilterProp="label"
                    options={(municipios as any[]).map((m: any) => ({ value: m.codigo, label: m.codigo + ' - ' + m.nombre }))}
                    onChange={() => form.setFieldValue('distritoCod', undefined)}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label={LBL('Distrito DTE')} name="distritoCod" style={MB}>
                  <Select
                    showSearch
                    disabled={!departamentoCod}
                    optionFilterProp="label"
                    options={(distritos as any[]).map((d: any) => ({ value: d.codigo, label: d.codigo + ' - ' + d.nombre }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label={LBL('Dirección fiscal')} name="address" style={MB}>
              <Input.TextArea rows={2} placeholder="Dirección fiscal de la empresa" style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label={LBL('Teléfono')} name="phone" style={MB}>
              <Input prefix={<PhoneOutlined style={{ color: '#ccc' }} />} placeholder="2222-3333" style={INP} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label={LBL('Correo electrónico')} name="email" rules={[{ type: 'email', message: 'Email inválido' }]} style={MB}>
              <Input prefix={<MailOutlined style={{ color: '#ccc' }} />} placeholder="info@empresa.com.sv" style={INP} />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Facturación DTE ─────────────────────────────────── */}
        <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Facturación Electrónica (DTE)
        </Text>
        <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />

        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item label={LBL('Empresa gran contribuyente')} name="esGranContribuyente" valuePropName="checked" style={MB}>
              <Switch checkedChildren="Si" unCheckedChildren="No" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={LBL('Sujeta a retencion IVA 1%')}
              name="sujetoRetencionIva1"
              valuePropName="checked"
              style={MB}
              tooltip="Si esta activo, clientes retenedores pueden aplicar retencion IVA 1% en CCF desde el umbral fiscal."
            >
              <Switch checkedChildren="Si" unCheckedChildren="No" />
            </Form.Item>
          </Col>
        </Row>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8, fontSize: 13 }}
          message="El certificado digital .p12 y las credenciales de Hacienda se gestionan desde el panel de administración."
        />

        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item label={LBL('Usuario Hacienda (MH)')} name="haciendaUser" style={MB}>
              <Input prefix={<LockOutlined style={{ color: '#ccc' }} />} placeholder="Usuario portal MH" style={INP} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label={LBL('Contraseña Hacienda')} name="haciendaPassword" style={MB}>
              <Input.Password prefix={<LockOutlined style={{ color: '#ccc' }} />} placeholder="Dejar vacío para no cambiar" style={INP} />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item label={LBL('Ambiente DTE')} name="dteAmbiente" style={MB}>
              <Select
                style={{ borderRadius: 8 }}
                options={[
                  { value: 'TEST', label: <Tag color="orange">PRUEBAS</Tag> },
                  { value: 'PROD', label: <Tag color="green">PRODUCCIÓN</Tag> },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Botón guardar ─────────────────────────────────────── */}
        <Divider style={{ margin: '8px 0 20px', borderColor: '#e9e9e7' }} />
        <Row justify="end">
          <Button
            type="primary"
            htmlType="submit"
            loading={mutation.isPending}
            icon={<SaveOutlined />}
            style={{
              background: token.colorPrimary, borderColor: token.colorPrimary,
              borderRadius: 8, fontWeight: 600, height: 38,
            }}
          >
            Guardar cambios
          </Button>
        </Row>

      </Form>
    </div>
  )
}

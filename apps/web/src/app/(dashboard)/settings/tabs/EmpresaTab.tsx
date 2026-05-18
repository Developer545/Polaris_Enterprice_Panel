'use client'

import { useEffect, useState } from 'react'
import {
  Form, Input, Select, Button, Row, Col, Divider,
  Typography, App, Spin, Tag, Alert,
} from 'antd'
import { SaveOutlined, LockOutlined, CloudOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Title, Text } = Typography

interface Props { companyId: string }

export default function EmpresaTab({ companyId }: Props) {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm()

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => api.get(`/api/company?companyId=${companyId}`).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: actividades = [] } = useQuery({
    queryKey: ['actividades'],
    queryFn: () => api.get('/api/catalogs/actividades').then(r => r.data),
    staleTime: 60 * 60_000,
  })

  useEffect(() => {
    if (company) {
      form.setFieldsValue({
        name: company.name,
        comercialName: company.comercialName,
        nit: company.nit,
        nrc: company.nrc,
        actividadEconomicaCodigo: company.actividadEconomicaCodigo,
        address: company.address,
        phone: company.phone,
        email: company.email,
        dteAmbiente: company.dteAmbiente ?? 'TEST',
        haciendaUser: company.haciendaUser,
      })
    }
  }, [company, form])

  const mutation = useMutation({
    mutationFn: (dto: any) => api.put(`/api/company?companyId=${companyId}`, dto),
    onSuccess: () => {
      message.success('Configuración guardada')
      qc.invalidateQueries({ queryKey: ['company', companyId] })
    },
    onError: () => message.error('Error al guardar'),
  })

  function onFinish(values: any) {
    const actividadNombre = actividades.find((a: any) => a.codigo === values.actividadEconomicaCodigo)?.nombre
    mutation.mutate({
      ...values,
      actividadEconomica: actividadNombre,
    })
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>

  return (
    <div style={{ padding: '24px 32px' }}>
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>

        <Title level={5} style={{ marginTop: 0 }}>Información General</Title>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item label="Razón Social" name="name" rules={[{ required: true }]}>
              <Input placeholder="Empresa S.A. de C.V." />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Nombre Comercial" name="comercialName">
              <Input placeholder="Nombre comercial (opcional)" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="NIT" name="nit">
              <Input placeholder="0614-010101-001-1" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="NRC" name="nrc">
              <Input placeholder="123456-7" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Actividad Económica" name="actividadEconomicaCodigo">
              <Select
                showSearch
                placeholder="Seleccione actividad"
                optionFilterProp="label"
                options={actividades.map((a: any) => ({
                  value: a.codigo,
                  label: `${a.codigo} — ${a.nombre}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Dirección" name="address">
              <Input.TextArea rows={2} placeholder="Dirección fiscal de la empresa" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Teléfono" name="phone">
              <Input placeholder="2222-3333" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Correo electrónico" name="email">
              <Input placeholder="info@empresa.com.sv" />
            </Form.Item>
          </Col>
        </Row>

        <Divider />
        <Title level={5}>Facturación Electrónica (DTE)</Title>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="El certificado digital .p12 y las credenciales de Hacienda se gestionan desde el panel de administración."
        />

        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item label="Usuario Hacienda (MH)" name="haciendaUser">
              <Input prefix={<LockOutlined />} placeholder="Usuario portal MH" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Contraseña Hacienda" name="haciendaPassword">
              <Input.Password prefix={<LockOutlined />} placeholder="Dejar vacío para no cambiar" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Ambiente DTE" name="dteAmbiente">
              <Select
                options={[
                  { value: 'TEST', label: <Tag color="orange">PRUEBAS</Tag> },
                  { value: 'PROD', label: <Tag color="green">PRODUCCIÓN</Tag> },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row justify="end">
          <Button
            type="primary"
            htmlType="submit"
            loading={mutation.isPending}
            icon={<SaveOutlined />}
            style={{ background: '#f47920', borderColor: '#f47920' }}
          >
            Guardar Cambios
          </Button>
        </Row>

      </Form>
    </div>
  )
}

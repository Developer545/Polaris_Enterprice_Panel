'use client'
import { useState } from 'react'
import { Table, Button, Tag, Typography, Modal, Form, Select, InputNumber, Input, App, Row, Col, Divider, Card, Space, Tooltip, theme } from 'antd'
import { PlusOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const AFP_OPTIONS = [
  { value: 'CONFIA', label: 'CONFIA' },
  { value: 'CRECER', label: 'CRECER' },
]

const SALARY_TYPE_OPTIONS = [
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'BIWEEKLY', label: 'Quincenal' },
  { value: 'HOURLY', label: 'Por hora' },
]

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:   'green',
  INACTIVE: 'default',
  ON_LEAVE: 'orange',
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:   'Activo',
  INACTIVE: 'Inactivo',
  ON_LEAVE: 'Permiso',
}

export default function EmployeesPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const [edit, setEdit] = useState<any>(null)
  const [form] = Form.useForm()
  const { companyId } = useAppContext()

  const { data = [], isLoading } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => api.get('/api/employees', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        ...values,
        hireDate: values.hireDate ? dayjs(values.hireDate).format('YYYY-MM-DD') : undefined,
      }
      return edit?.id
        ? api.put(`/api/employees/${edit.id}`, payload)
        : api.post('/api/employees', { ...payload, companyId })
    },
    onSuccess: () => {
      message.success('Empleado guardado')
      qc.invalidateQueries({ queryKey: ['employees'] })
      setEdit(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const columns = [
    {
      title: 'Nombre completo', key: 'fullName',
      render: (r: any) => `${r.firstName} ${r.lastName}`,
    },
    { title: 'Cargo', dataIndex: 'position', key: 'position', render: (v: string) => v ?? '—' },
    { title: 'Departamento', dataIndex: 'department', key: 'department', render: (v: string) => v ?? '—' },
    {
      title: 'Salario', key: 'salary',
      render: (r: any) => `$${Number(r.salary ?? 0).toFixed(2)}`,
    },
    {
      title: 'AFP', dataIndex: 'afpInstitution', key: 'afpInstitution',
      render: (v: string) => v ? <Tag color="blue">{v}</Tag> : '—',
    },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{STATUS_LABEL[v] ?? v ?? 'Activo'}</Tag>,
    },
    {
      title: 'Acciones', key: 'actions',
      render: (r: any) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => {
            setEdit(r)
            form.setFieldsValue({
              ...r,
              hireDate: r.hireDate ? r.hireDate.substring(0, 10) : undefined,
            })
          }}
        >
          Editar
        </Button>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>Empleados</Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>Gestión de personal, contratos y datos laborales</Typography.Text>
      </div>

      {/* Toolbar */}
      <Card
        size="small"
        style={{ borderRadius: 12, marginBottom: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Tooltip title="Recargar">
            <Button icon={<ReloadOutlined />} onClick={() => qc.invalidateQueries({ queryKey: ['employees'] })} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEdit({}); form.resetFields() }}>
            Nuevo empleado
          </Button>
        </div>
      </Card>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `${t} empleados`, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }} />
      </Card>

      <Modal
        open={edit !== null}
        title={edit?.id ? 'Editar empleado' : 'Nuevo empleado'}
        onCancel={() => setEdit(null)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="Guardar"
        okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        width={720}
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false}
          initialValues={{ afpInstitution: 'CONFIA', salaryType: 'MONTHLY', status: 'ACTIVE' }}>

          <Typography.Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos personales</Typography.Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="firstName" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Nombres</span>} rules={[{ required: true }]} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Apellidos</span>} rules={[{ required: true }]} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dui" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>DUI</span>} style={{ marginBottom: 16 }}>
                <Input placeholder="00000000-0" style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nit" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>NIT</span>} style={{ marginBottom: 16 }}>
                <Input placeholder="0000-000000-000-0" style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nssIsss" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>NSS / ISSS</span>} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Email</span>} rules={[{ type: 'email' }]} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phone" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Teléfono</span>} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
          </Row>

          <Typography.Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cargo y planilla</Typography.Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="position" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Cargo</span>} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Departamento</span>} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="salary" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Salario</span>} rules={[{ required: true }]} style={{ marginBottom: 16 }}>
                <InputNumber min={0} step={0.01} prefix="$" style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="salaryType" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Tipo de salario</span>} style={{ marginBottom: 16 }}>
                <Select options={SALARY_TYPE_OPTIONS} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="afpInstitution" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>AFP</span>} style={{ marginBottom: 16 }}>
                <Select options={AFP_OPTIONS} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nup" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>NUP (AFP)</span>} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="hireDate" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Fecha de ingreso</span>} style={{ marginBottom: 16 }}>
                <Input type="date" style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Estado</span>} style={{ marginBottom: 16 }}>
                <Select options={[
                  { value: 'ACTIVE', label: 'Activo' },
                  { value: 'INACTIVE', label: 'Inactivo' },
                  { value: 'ON_LEAVE', label: 'Con permiso' },
                ]} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

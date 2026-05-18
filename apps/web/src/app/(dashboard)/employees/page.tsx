'use client'
import { useState } from 'react'
import { Table, Button, Tag, Typography, Modal, Form, Select, InputNumber, Input, App, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Empleados</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEdit({}); form.resetFields() }}>
          Nuevo empleado
        </Button>
      </div>

      <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading}
        style={{ borderRadius: 10, overflow: 'hidden' }} pagination={{ pageSize: 20 }} />

      <Modal
        open={edit !== null}
        title={edit?.id ? 'Editar empleado' : 'Nuevo empleado'}
        onCancel={() => setEdit(null)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="Guardar"
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false}
          initialValues={{ afpInstitution: 'CONFIA', salaryType: 'MONTHLY', status: 'ACTIVE' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="firstName" label="Nombres" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Apellidos" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dui" label="DUI">
                <Input placeholder="00000000-0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nit" label="NIT">
                <Input placeholder="0000-000000-000-0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nssIsss" label="NSS / ISSS">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nup" label="NUP (AFP)">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phone" label="Teléfono">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="position" label="Cargo">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="Departamento">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="salary" label="Salario" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.01} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="salaryType" label="Tipo de salario">
                <Select options={SALARY_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="afpInstitution" label="AFP">
                <Select options={AFP_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="hireDate" label="Fecha de ingreso">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Estado">
                <Select options={[
                  { value: 'ACTIVE', label: 'Activo' },
                  { value: 'INACTIVE', label: 'Inactivo' },
                  { value: 'ON_LEAVE', label: 'Con permiso' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { Table, Button, Tag, Typography, Modal, Form, Select, Input, App, Row, Col, Divider } from 'antd'
import { PlusOutlined, PlayCircleOutlined, CheckOutlined, EyeOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  DRAFT:    { color: 'default', label: 'Borrador' },
  APPROVED: { color: 'blue',   label: 'Aprobada' },
  PAID:     { color: 'green',  label: 'Pagada' },
}

const PERIOD_TYPE_OPTIONS = [
  { value: 'MONTHLY',   label: 'Mensual' },
  { value: 'BIWEEKLY',  label: 'Quincenal' },
]

export default function PayrollPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [newModal, setNewModal] = useState(false)
  const [detailRecord, setDetailRecord] = useState<any>(null)
  const [newForm] = Form.useForm()
  const { companyId } = useAppContext()

  const { data = [], isLoading } = useQuery({
    queryKey: ['payroll', companyId],
    queryFn: () => api.get('/api/payroll', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: detail } = useQuery({
    queryKey: ['payroll-detail', detailRecord?.id],
    queryFn: () => api.get(`/api/payroll/${detailRecord.id}`).then(r => r.data),
    enabled: !!detailRecord?.id,
  })

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/payroll', { ...values, companyId }),
    onSuccess: () => {
      message.success('Período de planilla creado')
      qc.invalidateQueries({ queryKey: ['payroll'] })
      setNewModal(false)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const generateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/payroll/${id}/generate`),
    onSuccess: () => {
      message.success('Planilla generada')
      qc.invalidateQueries({ queryKey: ['payroll'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/payroll/${id}/approve`),
    onSuccess: () => {
      message.success('Planilla aprobada')
      qc.invalidateQueries({ queryKey: ['payroll'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const columns = [
    { title: 'Período', dataIndex: 'name', key: 'name' },
    {
      title: 'Inicio', dataIndex: 'startDate', key: 'startDate',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Fin', dataIndex: 'endDate', key: 'endDate',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        const s = STATUS_MAP[v] ?? { color: 'default', label: v }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
    {
      title: 'Total bruto', dataIndex: 'totalGross', key: 'totalGross',
      render: (v: number) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
    {
      title: 'Total neto', dataIndex: 'totalNet', key: 'totalNet',
      render: (v: number) => v != null ? `$${Number(v).toFixed(2)}` : '—',
    },
    {
      title: 'Empleados', dataIndex: 'employeeCount', key: 'employeeCount',
      render: (v: number) => v ?? '—',
    },
    {
      title: 'Acciones', key: 'actions',
      render: (r: any) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailRecord(r)}>
            Ver
          </Button>
          {r.status === 'DRAFT' && (
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              loading={generateMutation.isPending}
              onClick={() => generateMutation.mutate(r.id)}
            >
              Generar
            </Button>
          )}
          {r.status === 'DRAFT' && r.employeeCount > 0 && (
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              loading={approveMutation.isPending}
              onClick={() => approveMutation.mutate(r.id)}
            >
              Aprobar
            </Button>
          )}
        </div>
      ),
    },
  ]

  const detailColumns = [
    {
      title: 'Empleado', key: 'employee',
      render: (r: any) => r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '—',
    },
    {
      title: 'Salario base', dataIndex: 'baseSalary', key: 'baseSalary',
      render: (v: number) => `$${Number(v ?? 0).toFixed(2)}`,
    },
    {
      title: 'ISSS (empleado)', dataIndex: 'isssEmployee', key: 'isssEmployee',
      render: (v: number) => `$${Number(v ?? 0).toFixed(2)}`,
    },
    {
      title: 'AFP (empleado)', dataIndex: 'afpEmployee', key: 'afpEmployee',
      render: (v: number) => `$${Number(v ?? 0).toFixed(2)}`,
    },
    {
      title: 'ISR', dataIndex: 'isr', key: 'isr',
      render: (v: number) => `$${Number(v ?? 0).toFixed(2)}`,
    },
    {
      title: 'Neto a recibir', dataIndex: 'netSalary', key: 'netSalary',
      render: (v: number) => <Typography.Text strong>${Number(v ?? 0).toFixed(2)}</Typography.Text>,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Planilla</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setNewModal(true); newForm.resetFields() }}>
          Nuevo período
        </Button>
      </div>

      <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading}
        style={{ borderRadius: 10, overflow: 'hidden' }} pagination={{ pageSize: 20 }} />

      {/* Modal nuevo período */}
      <Modal
        open={newModal}
        title="Nuevo período de planilla"
        onCancel={() => setNewModal(false)}
        onOk={() => newForm.submit()}
        confirmLoading={createMutation.isPending}
        okText="Crear"
        width={520}
      >
        <Form form={newForm} layout="vertical" onFinish={createMutation.mutate} requiredMark={false}
          initialValues={{ type: 'MONTHLY' }}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="name" label="Nombre del período" rules={[{ required: true }]}>
                <Input placeholder="Ej. Planilla Mayo 2025" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="type" label="Tipo">
                <Select options={PERIOD_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startDate" label="Fecha inicio" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="Fecha fin" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentDate" label="Fecha de pago" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal detalle planilla */}
      <Modal
        open={detailRecord !== null}
        title={`Detalle planilla — ${detailRecord?.name ?? ''}`}
        onCancel={() => setDetailRecord(null)}
        footer={null}
        width={900}
      >
        {detail?.lines?.length > 0 ? (
          <>
            <Table
              size="small"
              columns={detailColumns}
              dataSource={detail.lines}
              rowKey="id"
              pagination={false}
              style={{ borderRadius: 10, overflow: 'hidden' }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={16} justify="end">
              <Col>
                <Typography.Text type="secondary">Total bruto: </Typography.Text>
                <Typography.Text strong>${Number(detail.totalGross ?? 0).toFixed(2)}</Typography.Text>
              </Col>
              <Col>
                <Typography.Text type="secondary">Total neto: </Typography.Text>
                <Typography.Text strong>${Number(detail.totalNet ?? 0).toFixed(2)}</Typography.Text>
              </Col>
            </Row>
          </>
        ) : (
          <Typography.Text type="secondary">
            No hay líneas generadas. Usa el botón "Generar" para calcular la planilla.
          </Typography.Text>
        )}
      </Modal>
    </div>
  )
}

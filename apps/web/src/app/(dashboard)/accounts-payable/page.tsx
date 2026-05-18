'use client'
import { useState } from 'react'
import { Table, Button, Tag, Typography, Modal, Form, InputNumber, Select, App, Row, Col } from 'antd'
import { DollarOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'PARTIAL', label: 'Parcial' },
  { value: 'PAID', label: 'Pagada' },
  { value: 'OVERDUE', label: 'Vencida' },
]

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'orange',
  PARTIAL: 'blue',
  PAID:    'green',
  OVERDUE: 'red',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL:  'Parcial',
  PAID:     'Pagada',
  OVERDUE:  'Vencida',
}

export default function AccountsPayablePage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [payModal, setPayModal] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [form] = Form.useForm()
  const { companyId } = useAppContext()

  const { data = [], isLoading } = useQuery({
    queryKey: ['accounts-payable', companyId, statusFilter],
    queryFn: () =>
      api.get('/api/accounts-payable', { params: { companyId, status: statusFilter || undefined } }).then(r => r.data),
    enabled: !!companyId,
  })

  const payMutation = useMutation({
    mutationFn: ({ id, amount }: any) => api.post(`/api/accounts-payable/${id}/pay`, { amount }),
    onSuccess: () => {
      message.success('Pago registrado')
      qc.invalidateQueries({ queryKey: ['accounts-payable'] })
      setPayModal(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const isOverdue = (row: any) =>
    row.status !== 'PAID' && row.dueDate && dayjs(row.dueDate).isBefore(dayjs(), 'day')

  const columns = [
    { title: 'Proveedor', key: 'supplier', render: (r: any) => r.supplier?.name ?? r.supplierName ?? '—' },
    { title: 'Descripción', dataIndex: 'description', key: 'description', render: (v: string) => v ?? '—' },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (v: number) => `$${Number(v ?? 0).toFixed(2)}` },
    { title: 'Pagado', dataIndex: 'paid', key: 'paid', render: (v: number) => `$${Number(v ?? 0).toFixed(2)}` },
    {
      title: 'Pendiente', key: 'pending',
      render: (r: any) => {
        const pending = Number(r.total ?? 0) - Number(r.paid ?? 0)
        return <Typography.Text type={pending > 0 ? 'danger' : undefined}>${pending.toFixed(2)}</Typography.Text>
      },
    },
    {
      title: 'Vencimiento', dataIndex: 'dueDate', key: 'dueDate',
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: 'Acciones', key: 'actions',
      render: (r: any) => r.status !== 'PAID' && (
        <Button
          size="small"
          icon={<DollarOutlined />}
          onClick={() => {
            setPayModal(r)
            const pending = Number(r.total ?? 0) - Number(r.paid ?? 0)
            form.setFieldsValue({ amount: pending })
          }}
        >
          Registrar pago
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Cuentas por Pagar</Typography.Title>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          style={{ width: 200 }}
        />
      </div>

      <Table
        size="small"
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={isLoading}
        style={{ borderRadius: 10, overflow: 'hidden' }}
        pagination={{ pageSize: 20 }}
        rowClassName={(r) => isOverdue(r) ? 'row-overdue' : ''}
        onRow={(r) => ({
          style: isOverdue(r) ? { background: '#fff1f0' } : {},
        })}
      />

      <Modal
        open={payModal !== null}
        title="Registrar pago"
        onCancel={() => setPayModal(null)}
        onOk={() => form.submit()}
        confirmLoading={payMutation.isPending}
        okText="Registrar"
        width={400}
      >
        {payModal && (
          <div style={{ marginBottom: 12 }}>
            <Typography.Text type="secondary">
              Proveedor: <strong>{payModal.supplier?.name ?? payModal.supplierName}</strong>
              {' · '}Pendiente: <strong>${(Number(payModal.total ?? 0) - Number(payModal.paid ?? 0)).toFixed(2)}</strong>
            </Typography.Text>
          </div>
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => payMutation.mutate({ id: payModal?.id, amount: values.amount })}
          requiredMark={false}
        >
          <Form.Item name="amount" label="Monto a pagar" rules={[{ required: true }]}>
            <InputNumber
              min={0.01}
              max={payModal ? Number(payModal.total ?? 0) - Number(payModal.paid ?? 0) : undefined}
              step={0.01}
              prefix="$"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

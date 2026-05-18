'use client'
import { useState } from 'react'
import { Table, Button, Tag, Typography, Modal, Form, Select, InputNumber, Input, App, Row, Col, DatePicker, Statistic, Card } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const TAG_COLORS = ['blue', 'green', 'orange', 'purple', 'cyan', 'magenta', 'gold', 'volcano']

export default function ExpensesPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [newModal, setNewModal] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [form] = Form.useForm()
  const { companyId } = useAppContext()

  const params: Record<string, string> = { companyId }
  if (dateRange) {
    params.from = dateRange[0].format('YYYY-MM-DD')
    params.to = dateRange[1].format('YYYY-MM-DD')
  }

  const { data = [], isLoading } = useQuery({
    queryKey: ['expenses', companyId, dateRange?.[0]?.toString(), dateRange?.[1]?.toString()],
    queryFn: () => api.get('/api/expenses', { params }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories', companyId],
    queryFn: () => api.get('/api/expense-categories', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/expenses', { ...values, companyId }),
    onSuccess: () => {
      message.success('Gasto registrado')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      setNewModal(false)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const total = (data as any[]).reduce((sum, r) => sum + Number(r.amount ?? 0), 0)

  const getCategoryColor = (name: string) => {
    const idx = Math.abs(name?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0) % TAG_COLORS.length
    return TAG_COLORS[idx]
  }

  const columns = [
    {
      title: 'Fecha', dataIndex: 'date', key: 'date',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    { title: 'Descripción', dataIndex: 'description', key: 'description' },
    {
      title: 'Categoría', key: 'category',
      render: (r: any) => {
        const name = r.category?.name ?? r.categoryName ?? '—'
        return name !== '—' ? <Tag color={getCategoryColor(name)}>{name}</Tag> : '—'
      },
    },
    {
      title: 'Monto', dataIndex: 'amount', key: 'amount',
      render: (v: number) => <Typography.Text strong>${Number(v ?? 0).toFixed(2)}</Typography.Text>,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Gastos</Typography.Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <DatePicker.RangePicker
            value={dateRange as any}
            onChange={(v) => setDateRange(v as any)}
            format="DD/MM/YYYY"
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setNewModal(true); form.resetFields() }}>
            Nuevo gasto
          </Button>
        </div>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8} lg={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic
              title={dateRange ? `Total del período` : 'Total general'}
              value={total}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#f47920' }}
            />
          </Card>
        </Col>
      </Row>

      <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading}
        style={{ borderRadius: 10, overflow: 'hidden' }} pagination={{ pageSize: 20 }} />

      <Modal
        open={newModal}
        title="Nuevo gasto"
        onCancel={() => setNewModal(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Guardar"
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => createMutation.mutate({
            ...values,
            date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          })}
          requiredMark={false}
          initialValues={{ date: dayjs() }}
        >
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="description" label="Descripción" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="date" label="Fecha" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="categoryId" label="Categoría">
                <Select
                  showSearch
                  allowClear
                  placeholder="Sin categoría"
                  options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                  filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="amount" label="Monto" rules={[{ required: true }]}>
                <InputNumber min={0.01} step={0.01} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notas">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

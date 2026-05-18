'use client'
import { useState } from 'react'
import { Table, Button, Tag, Typography, Modal, Form, Select, InputNumber, Input, App, Row, Col, DatePicker, Statistic, Card, theme } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const TAG_COLORS = ['blue', 'green', 'orange', 'purple', 'cyan', 'magenta', 'gold', 'volcano']

export default function ExpensesPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
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
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Title level={4} style={{ margin: 0, fontWeight: 700 }}>Gastos</Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>Registro y seguimiento de gastos operativos</Typography.Text>
      </div>

      {/* KPI */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8} lg={6}>
          <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: '#888' }}>{dateRange ? 'Total del período' : 'Total general'}</span>}
              value={total}
              precision={2}
              prefix="$"
              valueStyle={{ color: token.colorPrimary, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Toolbar */}
      <Card
        size="small"
        style={{ borderRadius: 12, marginBottom: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
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
      </Card>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `${t} gastos`, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }} />
      </Card>

      <Modal
        open={newModal}
        title="Nuevo gasto"
        onCancel={() => setNewModal(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Guardar"
        okButtonProps={{ style: { borderRadius: 8, fontWeight: 600 } }}
        width={520}
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
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
              <Form.Item name="description" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Descripción</span>} rules={[{ required: true }]} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="date" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Fecha</span>} rules={[{ required: true }]} style={{ marginBottom: 16 }}>
                <DatePicker style={{ width: '100%', borderRadius: 8, borderColor: '#e9e9e7' } as any} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="categoryId" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Categoría</span>} style={{ marginBottom: 16 }}>
                <Select
                  showSearch
                  allowClear
                  placeholder="Sin categoría"
                  options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                  filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="amount" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Monto</span>} rules={[{ required: true }]} style={{ marginBottom: 16 }}>
                <InputNumber min={0.01} step={0.01} prefix="$" style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Notas</span>} style={{ marginBottom: 16 }}>
                <Input.TextArea rows={2} style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

'use client'
import { useState } from 'react'
import {
  Table, Button, Tag, Typography, Modal, Form, Input, App,
  Row, Col, Card, Space, Statistic, Progress, Select, DatePicker,
  InputNumber, Switch, Tooltip, theme, Divider,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, TrophyOutlined,
  BarChartOutlined, DollarCircleOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const COMMISSION_BASIS_OPTIONS = [
  { value: 'SOLD', label: '% del monto vendido' },
  { value: 'GOAL', label: '% del monto meta' },
]

function fmt(n: number) { return `$${(n ?? 0).toFixed(2)}` }

export default function SalesGoalsPage() {
  const { message, modal } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const { companyId } = useAppContext()
  const PRIMARY = token.colorPrimary

  const [editGoal, setEditGoal] = useState<any>(null) // null=closed, {}=new, {id}=edit
  const [form] = Form.useForm()

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['sales-goals', companyId],
    queryFn: () => api.get('/api/sales-goals', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['employee-groups', companyId],
    queryFn: () => api.get('/api/employees/groups', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const mutation = useMutation({
    mutationFn: (values: any) =>
      editGoal?.id
        ? api.put(`/api/sales-goals/${editGoal.id}`, values)
        : api.post('/api/sales-goals', { ...values, companyId }),
    onSuccess: () => {
      message.success('Meta guardada')
      qc.invalidateQueries({ queryKey: ['sales-goals'] })
      setEditGoal(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/sales-goals/${id}`),
    onSuccess: () => {
      message.success('Meta eliminada')
      qc.invalidateQueries({ queryKey: ['sales-goals'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  // KPIs
  const totalGoals = goals.length
  const activeGoals = goals.filter((g: any) => g.isActive).length
  const totalTarget = goals.reduce((s: number, g: any) => s + Number(g.targetAmount), 0)
  const totalSold = goals.reduce((s: number, g: any) => s + (g.actualSold ?? 0), 0)

  const columns = [
    {
      title: 'Meta', key: 'name',
      render: (r: any) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
          <div style={{ fontSize: 11, color: token.colorTextSecondary }}>
            {r.group
              ? <Tag color="purple" style={{ fontSize: 10 }}>{r.group.name}</Tag>
              : <Tag color="default" style={{ fontSize: 10 }}>Global</Tag>}
            {' '}
            {dayjs(r.startDate).format('DD/MM/YY')} → {dayjs(r.endDate).format('DD/MM/YY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Progreso', key: 'progress', width: 220,
      render: (r: any) => {
        const pct = r.progressPct ?? 0
        const color = pct >= 100 ? '#52c41a' : pct >= 70 ? '#faad14' : PRIMARY
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 11 }}>{fmt(r.actualSold ?? 0)} / {fmt(Number(r.targetAmount))}</Text>
              <Text strong style={{ fontSize: 11, color }}>{pct}%</Text>
            </div>
            <Progress percent={pct} size="small" strokeColor={color} showInfo={false} />
          </div>
        )
      },
    },
    {
      title: 'Comisión B', key: 'commission',
      render: (r: any) => (
        <div>
          <div style={{ fontWeight: 600, color: PRIMARY }}>{fmt(r.commissionBType ?? 0)}</div>
          <div style={{ fontSize: 10, color: token.colorTextSecondary }}>
            {Number(r.commissionPct)}% {r.commissionBasis === 'SOLD' ? 'del vendido' : 'del meta'}
          </div>
        </div>
      ),
    },
    {
      title: 'Estado', dataIndex: 'isActive', key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activa' : 'Inactiva'}</Tag>,
    },
    {
      title: '', key: 'actions', width: 90,
      render: (r: any) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => {
              setEditGoal(r)
              form.setFieldsValue({
                ...r,
                groupId: r.groupId ?? undefined,
                startDate: dayjs(r.startDate),
                endDate: dayjs(r.endDate),
                targetAmount: Number(r.targetAmount),
                commissionPct: Number(r.commissionPct),
              })
            }}
          />
          <Button size="small" danger icon={<DeleteOutlined />}
            onClick={() => modal.confirm({
              title: 'Eliminar meta',
              content: `¿Eliminar "${r.name}"?`,
              okText: 'Eliminar',
              okButtonProps: { danger: true },
              onOk: () => deleteMutation.mutate(r.id),
            })}
          />
        </Space>
      ),
    },
  ]

  function handleFinish(values: any) {
    mutation.mutate({
      ...values,
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
      groupId: values.groupId ?? null,
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Metas de ventas</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Objetivos por grupo o globales con comisión tipo B</Text>
        </div>
        <Space>
          <Tooltip title="Recargar">
            <Button icon={<ReloadOutlined />} onClick={() => qc.invalidateQueries({ queryKey: ['sales-goals'] })} />
          </Tooltip>
          <Button
            type="primary" icon={<PlusOutlined />}
            onClick={() => {
              setEditGoal({})
              form.resetFields()
              form.setFieldsValue({ commissionBasis: 'SOLD', commissionPct: 0, isActive: true })
            }}
            style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}
          >
            Nueva meta
          </Button>
        </Space>
      </div>

      {/* KPIs */}
      <Row gutter={[14, 14]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: `1px solid ${PRIMARY}20`, background: `${PRIMARY}06` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="Total metas" value={totalGoals} prefix={<TrophyOutlined style={{ color: PRIMARY }} />} valueStyle={{ color: PRIMARY, fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: `1px solid ${token.colorSuccess}20`, background: `${token.colorSuccess}06` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="Activas" value={activeGoals} prefix={<BarChartOutlined style={{ color: token.colorSuccess }} />} valueStyle={{ color: token.colorSuccess, fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: `1px solid ${token.colorWarning}20`, background: `${token.colorWarning}06` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="Meta total" value={totalTarget} prefix="$" precision={2} valueStyle={{ color: token.colorWarning, fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #6366f120', background: '#6366f106' }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="Total vendido" value={totalSold} prefix={<DollarCircleOutlined style={{ color: '#6366f1' }} />} precision={2} valueStyle={{ color: '#6366f1', fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} styles={{ body: { padding: 0 } }}>
        <Table
          size="small" columns={columns} dataSource={goals} rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `${t} metas`, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
          locale={{ emptyText: 'No hay metas de ventas. Crea la primera.' }}
        />
      </Card>

      <Modal
        open={editGoal !== null}
        title={editGoal?.id ? 'Editar meta' : 'Nueva meta de ventas'}
        onCancel={() => setEditGoal(null)}
        onOk={() => form.submit()}
        confirmLoading={mutation.isPending}
        okText="Guardar"
        okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY, borderRadius: 8, fontWeight: 600 } }}
        width={540}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nombre de la meta" rules={[{ required: true }]}>
            <Input placeholder="Ej: Meta mayo 2026 — Vendedores" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="Fecha inicio" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%', borderRadius: 8 }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="Fecha fin" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%', borderRadius: 8 }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="targetAmount" label="Monto meta ($)" rules={[{ required: true }]}>
                <InputNumber min={0.01} step={0.01} prefix="$" style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="groupId" label="Grupo (vacío = global)">
                <Select
                  allowClear placeholder="Todos los grupos"
                  style={{ borderRadius: 8 }}
                  options={groups.map((g: any) => ({ value: g.id, label: g.name }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ margin: '4px 0 12px' }}>Comisión tipo B</Divider>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="commissionBasis" label="Base de cálculo">
                <Select options={COMMISSION_BASIS_OPTIONS} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="commissionPct" label="Porcentaje (%)">
                <InputNumber min={0} max={100} step={0.5} suffix="%" style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isActive" label="Activa" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

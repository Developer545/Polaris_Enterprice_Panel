'use client'
import { useState } from 'react'
import { Table, Button, Tag, Typography, Modal, Form, Input, InputNumber, Switch, App } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export default function PlansPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [editPlan, setEditPlan] = useState<any>(null)
  const [form] = Form.useForm()

  const { data = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/api/control-plane/plans').then((r) => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editPlan?.id
        ? api.put(`/api/control-plane/plans/${editPlan.id}`, values)
        : api.post('/api/control-plane/plans', values),
    onSuccess: () => {
      message.success('Plan guardado')
      qc.invalidateQueries({ queryKey: ['plans'] })
      setEditPlan(null)
    },
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Error'),
  })

  function openEdit(plan: any) {
    setEditPlan(plan)
    form.setFieldsValue(plan)
  }

  function openNew() {
    setEditPlan({})
    form.resetFields()
  }

  const columns = [
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Precio / mes', dataIndex: 'price', key: 'price', render: (v: number) => `$${Number(v).toFixed(2)}` },
    { title: 'Max Empresas', dataIndex: 'maxCompanies', key: 'maxCompanies', render: (v: number) => v === -1 ? '∞' : v },
    { title: 'Max Sucursales', dataIndex: 'maxBranches', key: 'maxBranches', render: (v: number) => v === -1 ? '∞' : v },
    { title: 'Max Usuarios', dataIndex: 'maxUsers', key: 'maxUsers', render: (v: number) => v === -1 ? '∞' : v },
    { title: 'Activo', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Sí' : 'No'}</Tag> },
    { title: 'Acciones', key: 'actions', render: (r: any) => <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Editar</Button> },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Planes</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Nuevo plan</Button>
      </div>
      <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading} style={{ borderRadius: 10, overflow: 'hidden' }} />

      <Modal
        open={editPlan !== null}
        title={editPlan?.id ? 'Editar plan' : 'Nuevo plan'}
        onCancel={() => setEditPlan(null)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="Guardar"
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="price" label="Precio / mes" rules={[{ required: true }]}><InputNumber min={0} step={0.01} prefix="$" style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="maxCompanies" label="Max Empresas (−1 = ilimitado)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="maxBranches" label="Max Sucursales (−1 = ilimitado)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="maxUsers" label="Max Usuarios (−1 = ilimitado)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="isActive" label="Activo" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

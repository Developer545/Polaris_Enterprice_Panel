'use client'
import { useState } from 'react'
import { Table, Button, Tag, Typography, Modal, Form, Input, App, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'

const PRESET_COLORS = ['#f5222d','#fa8c16','#fadb14','#52c41a','#13c2c2','#1677ff','#722ed1','#eb2f96']

export default function CategoriesPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [edit, setEdit] = useState<any>(null)
  const [form] = Form.useForm()
  const { companyId } = useAppContext()

  const { data = [], isLoading } = useQuery({
    queryKey: ['categories', companyId],
    queryFn: () => api.get('/api/categories', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      edit?.id
        ? api.put(`/api/categories/${edit.id}`, values)
        : api.post('/api/categories', { ...values, companyId }),
    onSuccess: () => {
      message.success('Categoría guardada')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setEdit(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const columns = [
    {
      title: 'Color', dataIndex: 'color', key: 'color', width: 60,
      render: (v: string) => <div style={{ width: 20, height: 20, borderRadius: 4, background: v ?? '#ccc' }} />,
    },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Descripción', dataIndex: 'description', key: 'description', render: (v: string) => v ?? '—' },
    { title: 'Productos', key: 'count', render: (r: any) => r._count?.services ?? 0 },
    {
      title: 'Acciones', key: 'actions',
      render: (r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEdit(r); form.setFieldsValue(r) }}>
          Editar
        </Button>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Categorías</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEdit({}); form.resetFields() }}>
          Nueva categoría
        </Button>
      </div>

      <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading}
        style={{ borderRadius: 10, overflow: 'hidden' }} pagination={false} />

      <Modal
        open={edit !== null}
        title={edit?.id ? 'Editar categoría' : 'Nueva categoría'}
        onCancel={() => setEdit(null)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="Guardar"
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Descripción"><Input /></Form.Item>
          <Form.Item name="color" label="Color">
            <Input placeholder="#f47920" maxLength={7} />
          </Form.Item>
          <Row gutter={8}>
            {PRESET_COLORS.map(c => (
              <Col key={c}>
                <div
                  style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: '2px solid transparent' }}
                  onClick={() => form.setFieldValue('color', c)}
                />
              </Col>
            ))}
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

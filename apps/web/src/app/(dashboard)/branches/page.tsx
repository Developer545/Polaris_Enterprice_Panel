'use client'
import { useState } from 'react'
import { Table, Button, Tag, Space, Typography, Modal, Form, Input, App, Select } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'

export default function BranchesPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [edit, setEdit] = useState<any>(null)
  const [form] = Form.useForm()
  const { companyId } = useAppContext()

  const { data = [], isLoading } = useQuery({
    queryKey: ['branches', companyId],
    queryFn: () => api.get('/api/branches', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      edit?.id
        ? api.put(`/api/branches/${edit.id}`, values)
        : api.post('/api/branches', { ...values, companyId }),
    onSuccess: () => {
      message.success('Sucursal guardada')
      qc.invalidateQueries({ queryKey: ['branches'] })
      setEdit(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const columns = [
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Dirección', dataIndex: 'address', key: 'address', render: (v: string) => v ?? '—' },
    { title: 'Cód. Estab. MH', dataIndex: 'codEstableMH', key: 'codEstableMH', render: (v: string) => v ? <code>{v}</code> : '—' },
    { title: 'Cód. PV MH', dataIndex: 'codPuntoVentaMH', key: 'codPuntoVentaMH', render: (v: string) => v ? <code>{v}</code> : '—' },
    { title: 'Estado', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Sucursales</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEdit({}); form.resetFields() }}>
          Nueva sucursal
        </Button>
      </div>

      <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading}
        style={{ borderRadius: 10, overflow: 'hidden' }} />

      <Modal
        open={edit !== null}
        title={edit?.id ? 'Editar sucursal' : 'Nueva sucursal'}
        onCancel={() => setEdit(null)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="Guardar"
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="address" label="Dirección"><Input /></Form.Item>
          <Form.Item name="phone" label="Teléfono"><Input /></Form.Item>
          <Form.Item name="codEstableMH" label="Código establecimiento MH (4 chars)"
            rules={[{ len: 4, message: 'Exactamente 4 caracteres' }]}>
            <Input maxLength={4} placeholder="M001" />
          </Form.Item>
          <Form.Item name="codPuntoVentaMH" label="Código punto de venta MH (4 chars)"
            rules={[{ len: 4, message: 'Exactamente 4 caracteres' }]}>
            <Input maxLength={4} placeholder="P001" />
          </Form.Item>
          {edit?.id && (
            <Form.Item name="isActive" label="Estado" initialValue={true}>
              <Select>
                <Select.Option value={true}>Activo</Select.Option>
                <Select.Option value={false}>Inactivo</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

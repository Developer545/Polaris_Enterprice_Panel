'use client'

import { useState } from 'react'
import {
  Table, Button, Modal, Form, Input, App,
  Space, Popconfirm, Typography, theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography
interface Props { companyId: string }

export default function CategoriasTab({ companyId }: Props) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', companyId],
    queryFn: () => api.get(`/api/categories?companyId=${companyId}`).then(r => r.data),
    enabled: !!companyId,
  })

  const createMut = useMutation({
    mutationFn: (dto: any) => api.post('/api/categories', dto),
    onSuccess: () => { message.success('Categoría creada'); qc.invalidateQueries({ queryKey: ['categories'] }); closeModal() },
    onError: () => message.error('Error al crear categoría'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: any) => api.put(`/api/categories/${id}`, dto),
    onSuccess: () => { message.success('Categoría actualizada'); qc.invalidateQueries({ queryKey: ['categories'] }); closeModal() },
    onError: () => message.error('Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess: () => { message.success('Categoría eliminada'); qc.invalidateQueries({ queryKey: ['categories'] }) },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Error al eliminar'),
  })

  function openCreate() { setEditing(null); form.resetFields(); setOpen(true) }
  function openEdit(r: any) {
    setEditing(r)
    form.setFieldsValue({ name: r.name, description: r.description, color: r.color })
    setOpen(true)
  }
  function closeModal() { setOpen(false); setEditing(null); form.resetFields() }

  function onFinish(values: any) {
    if (editing) {
      updateMut.mutate({ id: editing.id, dto: values })
    } else {
      createMut.mutate({ ...values, companyId })
    }
  }

  const columns: ColumnsType<any> = [
    {
      title: 'Categoría',
      render: (_: any, r: any) => (
        <Space>
          <div style={{
            width: 12, height: 12, borderRadius: 3,
            background: r.color ?? token.colorPrimary, flexShrink: 0,
          }} />
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            {r.description && <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>}
          </div>
        </Space>
      ),
    },
    {
      title: 'Acciones',
      width: 100,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="¿Eliminar categoría?" onConfirm={() => deleteMut.mutate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '16px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong>Categorías ({categories.length})</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: token.colorPrimary, borderColor: token.colorPrimary }}>
          Nueva Categoría
        </Button>
      </div>

      <Table
        dataSource={categories}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 15, size: 'small' }}
      />

      <Modal
        open={open}
        onCancel={closeModal}
        title={editing ? 'Editar Categoría' : 'Nueva Categoría'}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item label="Nombre" name="name" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="Nombre de la categoría" />
          </Form.Item>
          <Form.Item label="Descripción" name="description">
            <Input.TextArea rows={2} placeholder="Descripción opcional" />
          </Form.Item>
          <Form.Item label="Color" name="color">
            <Input type="color" style={{ width: 60, padding: 2 }} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeModal}>Cancelar</Button>
            <Button type="primary" htmlType="submit"
              loading={createMut.isPending || updateMut.isPending}
              style={{ background: token.colorPrimary, borderColor: token.colorPrimary }}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

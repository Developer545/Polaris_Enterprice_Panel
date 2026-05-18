'use client'

import { useState } from 'react'
import {
  Table, Button, Modal, Form, Input, App,
  Space, Popconfirm, Typography, Card, Divider, Tooltip, theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography

const LBL = (text: string) => <span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>{text}</span>
const INP = { borderRadius: 8, borderColor: '#e9e9e7' } as const
const MB = { marginBottom: 16 } as const

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
    editing
      ? updateMut.mutate({ id: editing.id, dto: values })
      : createMut.mutate({ ...values, companyId })
  }

  const columns: ColumnsType<any> = [
    {
      title: 'Categoría',
      render: (r: any) => (
        <Space>
          <div style={{
            width: 14, height: 14, borderRadius: 4, flexShrink: 0,
            background: r.color ?? token.colorPrimary,
            border: '1px solid rgba(0,0,0,0.08)',
          }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
            {r.description && <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>}
          </div>
        </Space>
      ),
    },
    {
      title: 'Acciones', width: 90, fixed: 'right' as const,
      render: (r: any) => (
        <Space>
          <Tooltip title="Editar">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Eliminar categoría?"
              description="Los productos con esta categoría quedarán sin categoría."
              onConfirm={() => deleteMut.mutate(r.id)}
              okText="Sí, eliminar" okButtonProps={{ danger: true }} cancelText="Cancelar"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deleteMut.isPending} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Text style={{ fontWeight: 600, fontSize: 14, color: '#37352f' }}>Categorías</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>({(categories as any[]).length} registradas)</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 }}>
          Nueva Categoría
        </Button>
      </div>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: '1px solid #e9e9e7', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={categories as any[]}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 15, size: 'small', showTotal: (t) => `${t} categorías`, style: { padding: '8px 16px' } }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      {/* Modal */}
      <Modal
        open={open}
        title={<Space>{editing ? <EditOutlined /> : <PlusOutlined />}{editing ? 'Editar Categoría' : 'Nueva Categoría'}</Space>}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        okText={editing ? 'Actualizar' : 'Crear categoría'}
        okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        width={480}
        destroyOnClose
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>

          <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos de la categoría</Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />

          <Form.Item label={LBL('Nombre')} name="name" rules={[{ required: true, min: 2, message: 'Mínimo 2 caracteres' }]} style={MB}>
            <Input prefix={<AppstoreOutlined style={{ color: '#ccc' }} />} placeholder="Nombre de la categoría" style={INP} />
          </Form.Item>
          <Form.Item label={LBL('Descripción')} name="description" style={MB}>
            <Input.TextArea rows={2} placeholder="Descripción opcional" style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
          </Form.Item>
          <Form.Item label={LBL('Color identificador')} name="color" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                defaultValue={editing?.color ?? token.colorPrimary}
                onChange={e => form.setFieldValue('color', e.target.value)}
                style={{ width: 42, height: 34, padding: 2, border: '1px solid #e9e9e7', borderRadius: 8, cursor: 'pointer' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>Se muestra como indicador visual en listas y reportes</Text>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

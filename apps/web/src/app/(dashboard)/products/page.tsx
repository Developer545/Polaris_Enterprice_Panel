'use client'
import { useState } from 'react'
import { Table, Button, Tag, Input, Typography, Modal, Form, Select, InputNumber, App, Row, Col, Switch, Avatar, Divider } from 'antd'
import { PlusOutlined, EditOutlined, PictureOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'

const TIPO_ITEM = [
  { value: '1', label: 'Bien' },
  { value: '2', label: 'Servicio' },
  { value: '3', label: 'Bien y servicio' },
  { value: '4', label: 'Otro' },
]

export default function ProductsPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [edit, setEdit] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [form] = Form.useForm()
  const { companyId } = useAppContext()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', companyId],
    queryFn: () => api.get('/api/categories', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data = [], isLoading } = useQuery({
    queryKey: ['products', companyId, search],
    queryFn: () => api.get('/api/products', { params: { companyId, search: search || undefined } }).then(r => r.data),
    enabled: !!companyId,
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      edit?.id
        ? api.put(`/api/products/${edit.id}`, values)
        : api.post('/api/products', { ...values, companyId }),
    onSuccess: () => {
      message.success('Producto guardado')
      qc.invalidateQueries({ queryKey: ['products'] })
      setEdit(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const columns = [
    {
      title: '', key: 'img', width: 48,
      render: (r: any) => r.imageUrl
        ? <Avatar src={r.imageUrl} shape="square" size={36} />
        : <Avatar shape="square" size={36} icon={<PictureOutlined />} />,
    },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (v: string) => v ? <code style={{ fontSize: 11 }}>{v}</code> : '—' },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Categoría', key: 'cat', render: (r: any) => r.category?.name ?? '—' },
    { title: 'Precio', dataIndex: 'price', key: 'price', render: (v: number) => `$${Number(v).toFixed(2)}` },
    {
      title: 'Tipo', dataIndex: 'tipoItem', key: 'tipoItem',
      render: (v: string) => <Tag color="blue">{TIPO_ITEM.find(t => t.value === v)?.label ?? v}</Tag>,
    },
    {
      title: 'Stock', key: 'stock',
      render: (r: any) => r.trackStock
        ? <Tag color={(r.stock ?? 0) <= (r.minStock ?? 0) ? 'red' : 'green'}>{r.stock ?? 0}</Tag>
        : <Tag>N/A</Tag>,
    },
    {
      title: 'Acciones', key: 'actions',
      render: (r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEdit(r); form.setFieldsValue({ ...r, tipoItem: r.tipoItem?.toString(), price: Number(r.price), cost: Number(r.cost) }) }}>
          Editar
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Productos / Servicios</Typography.Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input.Search
            placeholder="Buscar nombre, SKU, código de barras..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEdit({}); form.resetFields() }}>
            Nuevo
          </Button>
        </div>
      </div>

      <Table size="small" columns={columns} dataSource={data} rowKey="id" loading={isLoading}
        style={{ borderRadius: 10, overflow: 'hidden' }} pagination={{ pageSize: 20 }} />

      <Modal
        open={edit !== null}
        title={edit?.id ? 'Editar producto' : 'Nuevo producto'}
        onCancel={() => setEdit(null)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="Guardar"
        okButtonProps={{ style: { borderRadius: 8, fontWeight: 600 } }}
        width={700}
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false} initialValues={{ tipoItem: '2', uniMedida: 59, trackStock: false, cost: 0 }}>
          <Typography.Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Identificación</Typography.Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="name" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Nombre</span>} rules={[{ required: true }]} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="categoryId" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Categoría</span>} style={{ marginBottom: 16 }}>
                <Select allowClear placeholder="Sin categoría"
                  options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                  style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sku" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>SKU</span>} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="barcode" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Código de barras</span>} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tipoItem" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Tipo de ítem</span>} rules={[{ required: true }]} style={{ marginBottom: 16 }}>
                <Select options={TIPO_ITEM} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>

          <Typography.Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Precios e inventario</Typography.Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="price" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Precio de venta</span>} rules={[{ required: true }]} style={{ marginBottom: 16 }}>
                <InputNumber min={0} step={0.01} prefix="$" style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="cost" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Costo</span>} style={{ marginBottom: 16 }}>
                <InputNumber min={0} step={0.01} prefix="$" style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="uniMedida" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Unidad de medida (código MH)</span>} style={{ marginBottom: 16 }}>
                <InputNumber style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Descripción</span>} style={{ marginBottom: 16 }}>
                <Input.TextArea rows={2} style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="trackStock" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Control de inventario</span>} valuePropName="checked" style={{ marginBottom: 16 }}>
                <Switch />
              </Form.Item>
            </Col>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.trackStock !== cur.trackStock}>
              {({ getFieldValue }) => getFieldValue('trackStock') && (
                <Row gutter={16} style={{ width: '100%', padding: '0 8px' }}>
                  <Col span={12}>
                    <Form.Item name="stock" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Stock inicial</span>} style={{ marginBottom: 16 }}>
                      <InputNumber min={0} style={{ width: '100%', borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="minStock" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Stock mínimo</span>} style={{ marginBottom: 16 }}>
                      <InputNumber min={0} style={{ width: '100%', borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </Form.Item>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { Table, Button, Input, Tag, Space, Typography, Avatar } from 'antd'
import { PlusOutlined, SearchOutlined, PictureOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export default function ServicesPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/api/services').then((r) => r.data),
  })

  const columns = [
    {
      title: '', key: 'image', width: 48,
      render: (r: any) => r.image
        ? <Avatar src={r.image} shape="square" size={36} />
        : <Avatar shape="square" size={36} icon={<PictureOutlined />} />,
    },
    { title: 'Código', dataIndex: 'code', key: 'code', width: 100, render: (v: string) => v ?? '—' },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Categoría', key: 'category', render: (r: any) => r.category?.name ?? '—' },
    {
      title: 'Precio', dataIndex: 'price', key: 'price', width: 110,
      render: (v: number) => `$${Number(v).toFixed(2)}`,
    },
    {
      title: 'Tipo', dataIndex: 'tipoItem', key: 'tipoItem', width: 90,
      render: (v: number) => <Tag color="blue">{v === 1 ? 'Bien' : v === 2 ? 'Servicio' : 'Otro'}</Tag>,
    },
    {
      title: 'Stock', key: 'stock', width: 90,
      render: (r: any) => r.trackStock ? String(r.stock ?? 0) : <Tag>N/A</Tag>,
    },
    {
      title: 'Estado', dataIndex: 'isActive', key: 'isActive', width: 90,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: 'Acciones', key: 'actions', width: 120,
      render: () => <Button size="small" type="link">Editar</Button>,
    },
  ]

  const filtered = (data ?? []).filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Servicios / Productos</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />}>Nuevo servicio</Button>
      </div>
      <Input
        placeholder="Buscar por nombre o código..."
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 360 }}
        allowClear
      />
      <Table
        size="small"
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (t) => `${t} servicios` }}
        style={{ borderRadius: 10, overflow: 'hidden' }}
      />
    </div>
  )
}

'use client'
import { useState } from 'react'
import { Table, Button, Input, Tag, Space, Typography, Avatar, theme } from 'antd'
import { PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export default function UsersPage() {
  const { token } = theme.useToken()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then((r) => r.data),
  })

  const columns = [
    {
      title: '', key: 'avatar', width: 48,
      render: (r: any) => (
        <Avatar src={r.avatar} icon={<UserOutlined />} style={{ background: token.colorPrimary }}>
          {!r.avatar ? r.name?.[0] : undefined}
        </Avatar>
      ),
    },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Rol', key: 'role', render: (r: any) => (
        <Tag color="geekblue">{r.role?.name ?? '—'}</Tag>
      ),
    },
    {
      title: 'Sucursales', key: 'branches', render: (r: any) =>
        r.branches?.map((b: any) => (
          <Tag key={b.branch.id} color="cyan">{b.branch.name}</Tag>
        )) ?? '—',
    },
    {
      title: 'Último acceso', dataIndex: 'lastLoginAt', key: 'lastLoginAt',
      render: (v: string) => v ? new Date(v).toLocaleString('es-SV') : 'Nunca',
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

  const filtered = (data ?? []).filter((u: any) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Usuarios</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />}>Nuevo usuario</Button>
      </div>
      <Input
        placeholder="Buscar por nombre o email..."
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
        pagination={{ pageSize: 20, showTotal: (t) => `${t} usuarios` }}
        style={{ borderRadius: 10, overflow: 'hidden' }}
      />
    </div>
  )
}

'use client'
import { useState } from 'react'
import {
  Table, Button, Typography, Modal, Form, Input, InputNumber, App,
  Row, Col, Card, Statistic, Space, Tooltip, Popconfirm, Avatar, Divider, Badge, theme, Select,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  BankOutlined, SearchOutlined, PhoneOutlined, MailOutlined,
  UserOutlined, CalendarOutlined, EnvironmentOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'

const TIPO_DOC_OPTIONS = [
  { value: '36', label: '36 — NIT' },
  { value: '13', label: '13 — DUI' },
  { value: '03', label: '03 — Pasaporte' },
  { value: '02', label: '02 — Carnet de Residente' },
  { value: '37', label: '37 — Otro' },
]

const { Title, Text } = Typography

// ── Helpers ───────────────────────────────────────────────────────────────────

const LBL = (text: string) => (
  <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>{text}</span>
)

const INP_STYLE = { borderRadius: 8, borderColor: 'var(--sidebar-border)' } as const
const MB = { marginBottom: 16 } as const

// ── Componente ────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [form] = Form.useForm()
  const { companyId } = useAppContext()

  // Cascading geo selects
  const selectedDept = Form.useWatch('departamentoCod', form)
  const selectedMuni = Form.useWatch('municipioCod', form)

  const { data: departamentos = [] } = useQuery({
    queryKey: ['catalogs', 'departamentos'],
    queryFn: () => api.get('/api/catalogs/departamentos').then(r => r.data),
    staleTime: 5 * 60_000,
  })
  const { data: municipios = [] } = useQuery({
    queryKey: ['catalogs', 'municipios', selectedDept],
    queryFn: () => api.get(`/api/catalogs/departamentos/${selectedDept}/municipios`).then(r => r.data),
    enabled: !!selectedDept,
    staleTime: 5 * 60_000,
  })
  const { data: distritos = [] } = useQuery({
    queryKey: ['catalogs', 'distritos', selectedDept, selectedMuni],
    queryFn: () => api.get(`/api/catalogs/departamentos/${selectedDept}/distritos`, {
      params: selectedMuni ? { municipioCod: selectedMuni } : {},
    }).then(r => r.data),
    enabled: !!selectedDept,
    staleTime: 5 * 60_000,
  })
  const { data: actividades = [] } = useQuery({
    queryKey: ['catalogs', 'actividades'],
    queryFn: () => api.get('/api/catalogs/actividades').then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['suppliers', companyId],
    queryFn: () => api.get('/api/suppliers', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editing?.id
        ? api.put(`/api/suppliers/${editing.id}`, values)
        : api.post('/api/suppliers', { ...values, companyId }),
    onSuccess: () => {
      message.success(editing?.id ? 'Proveedor actualizado' : 'Proveedor creado')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      closeModal()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al guardar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/suppliers/${id}`),
    onSuccess: () => {
      message.success('Proveedor eliminado')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al eliminar'),
  })

  function openCreate() {
    setEditing(null)
    form.resetFields()
    setEditOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    form.setFieldsValue({ ...record })
    setEditOpen(true)
  }

  function closeModal() {
    setEditOpen(false)
    setEditing(null)
    form.resetFields()
  }

  // KPIs
  const total = (data as any[]).length
  const withCredit = (data as any[]).filter((s: any) => (s.paymentTermDays ?? 0) > 0).length

  const filtered = (data as any[]).filter((s: any) =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.nit?.includes(search) ||
    s.nrc?.includes(search) ||
    s.email?.toLowerCase().includes(search.toLowerCase()),
  )

  const columns = [
    {
      title: 'Proveedor',
      key: 'name',
      render: (r: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={36} style={{ background: token.colorPrimary, flexShrink: 0, fontWeight: 700 }}>
            {r.name?.[0]?.toUpperCase() ?? 'P'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{r.name}</div>
            {r.contactName && (
              <div style={{ fontSize: 11, color: token.colorTextSecondary }}>
                <UserOutlined style={{ fontSize: 10 }} /> {r.contactName}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'NIT / NRC',
      key: 'docs',
      width: 160,
      render: (r: any) => (
        <Space direction="vertical" size={0}>
          {r.nit && <Text style={{ fontSize: 12 }}><Text type="secondary" style={{ fontSize: 11 }}>NIT: </Text>{r.nit}</Text>}
          {r.nrc && <Text style={{ fontSize: 12 }}><Text type="secondary" style={{ fontSize: 11 }}>NRC: </Text>{r.nrc}</Text>}
          {!r.nit && !r.nrc && <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
        </Space>
      ),
    },
    {
      title: 'Contacto',
      key: 'contact',
      width: 200,
      render: (r: any) => (
        <Space direction="vertical" size={0}>
          {r.email && (
            <div style={{ fontSize: 11, color: token.colorTextSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MailOutlined style={{ fontSize: 10, color: token.colorTextSecondary }} /> {r.email}
            </div>
          )}
          {r.phone && (
            <div style={{ fontSize: 11, color: token.colorTextSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
              <PhoneOutlined style={{ fontSize: 10, color: token.colorTextSecondary }} /> {r.phone}
            </div>
          )}
          {!r.email && !r.phone && <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
        </Space>
      ),
    },
    {
      title: 'Días crédito',
      key: 'paymentTerm',
      width: 110,
      render: (r: any) =>
        (r.paymentTermDays ?? 0) > 0 ? (
          <Badge
            count={`${r.paymentTermDays}d`}
            style={{ background: token.colorPrimary, fontSize: 11, fontWeight: 600 }}
          />
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>Contado</Text>
        ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 90,
      fixed: 'right' as const,
      render: (r: any) => (
        <Space>
          <Tooltip title="Editar">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Eliminar proveedor?"
              description="Esta acción no se puede deshacer."
              onConfirm={() => deleteMutation.mutate(r.id)}
              okText="Sí, eliminar"
              okButtonProps={{ danger: true }}
              cancelText="Cancelar"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Proveedores</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Gestión de proveedores y condiciones de compra</Text>
      </div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { title: 'Total proveedores', value: total,      icon: <BankOutlined />,    color: token.colorPrimary },
          { title: 'Con crédito',       value: withCredit, icon: <CalendarOutlined />, color: token.colorSuccess },
          { title: 'Contado',           value: total - withCredit, icon: <BankOutlined />, color: token.colorTextSecondary },
        ].map(kpi => (
          <Col xs={12} sm={8} key={kpi.title}>
            <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Statistic
                title={<span style={{ fontSize: 12, color: token.colorTextSecondary }}>{kpi.title}</span>}
                value={kpi.value}
                valueStyle={{ color: kpi.color, fontWeight: 700, fontSize: 24 }}
                prefix={<span style={{ color: kpi.color, marginRight: 4 }}>{kpi.icon}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Toolbar */}
      <Card
        size="small"
        style={{ borderRadius: 12, marginBottom: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Input
            prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
            placeholder="Buscar por nombre, NIT, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Space>
            <Tooltip title="Recargar">
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Nuevo proveedor
            </Button>
          </Space>
        </div>
      </Card>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 700 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: false,
            showTotal: (t) => `${t} proveedores`,
            style: { padding: '8px 16px' },
          }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      {/* Modal */}
      <Modal
        open={editOpen}
        title={
          <Space>
            {editing?.id ? <EditOutlined /> : <PlusOutlined />}
            {editing?.id ? 'Editar proveedor' : 'Nuevo proveedor'}
          </Space>
        }
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText={editing?.id ? 'Actualizar' : 'Crear proveedor'}
        okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        width={680}
        style={{ top: 40 }}
        styles={{ header: { borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false}>

          {/* ── Identificación fiscal ───────────────────────────────────── */}
          <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Identificación fiscal</Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: token.colorBorderSecondary }} />
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label={LBL('Nombre / Razón social')} rules={[{ required: true, message: 'Campo requerido' }]} style={MB}>
                <Input prefix={<BankOutlined style={{ color: token.colorTextQuaternary }} />} style={INP_STYLE} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="paymentTermDays" label={LBL('Días de crédito')} initialValue={0} style={MB}>
                <Space.Compact style={{ width: '100%' }}>
                  <InputNumber min={0} style={{ width: '100%', borderRadius: 8 }} />
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 11px', background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, borderLeft: 0, borderRadius: '0 8px 8px 0', color: token.colorTextSecondary, fontSize: 13 }}>días</span>
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tipoDocumento" label={LBL('Tipo documento')} style={MB}>
                <Select placeholder="NIT / DUI..." options={TIPO_DOC_OPTIONS} allowClear style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nit" label={LBL('NIT')} style={MB}>
                <Input placeholder="0000-000000-000-0" style={INP_STYLE} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nrc" label={LBL('NRC')} style={MB}>
                <Input placeholder="000000-0" style={INP_STYLE} />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="actividadEconomicaCodigo" label={LBL('Actividad económica')} style={MB}>
                <Select
                  showSearch
                  placeholder="Seleccionar actividad..."
                  optionFilterProp="label"
                  allowClear
                  style={{ borderRadius: 8 }}
                  options={actividades.map((a: any) => ({ value: a.codigo, label: `${a.codigo} — ${a.nombre}` }))}
                  onChange={(_val, opt: any) => {
                    const label = opt?.label?.split(' — ')[1] ?? ''
                    form.setFieldValue('actividadEconomica', label)
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="actividadEconomica" label={LBL('Descripción actividad')} style={MB}>
                <Input style={INP_STYLE} placeholder="Se llena automático" />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Ubicación fiscal (DTE) ──────────────────────────────────── */}
          <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <EnvironmentOutlined style={{ marginRight: 4 }} />Ubicación fiscal (DTE)
          </Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: token.colorBorderSecondary }} />
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="departamentoCod" label={LBL('Departamento')} style={MB}>
                <Select
                  showSearch
                  placeholder="Departamento"
                  optionFilterProp="label"
                  allowClear
                  style={{ borderRadius: 8 }}
                  options={departamentos.map((d: any) => ({ value: d.codigo, label: d.nombre }))}
                  onChange={() => { form.setFieldValue('municipioCod', undefined); form.setFieldValue('distritoCod', undefined) }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="municipioCod" label={LBL('Municipio')} style={MB}>
                <Select
                  showSearch
                  placeholder="Municipio"
                  optionFilterProp="label"
                  allowClear
                  disabled={!selectedDept}
                  style={{ borderRadius: 8 }}
                  options={municipios.map((m: any) => ({ value: m.codigo, label: m.nombre }))}
                  onChange={() => form.setFieldValue('distritoCod', undefined)}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="distritoCod" label={LBL('Distrito')} style={MB}>
                <Select
                  showSearch
                  placeholder="Distrito"
                  optionFilterProp="label"
                  allowClear
                  disabled={!selectedDept}
                  style={{ borderRadius: 8 }}
                  options={distritos.map((d: any) => ({ value: d.codigo, label: d.nombre }))}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="address" label={LBL('Dirección')} style={MB}>
                <Input style={INP_STYLE} placeholder="Calle, colonia, número..." />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Contacto ────────────────────────────────────────────────── */}
          <Text style={{ fontSize: 11, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contacto</Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: token.colorBorderSecondary }} />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contactName" label={LBL('Nombre de contacto')} style={MB}>
                <Input prefix={<UserOutlined style={{ color: token.colorTextQuaternary }} />} style={INP_STYLE} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label={LBL('Teléfono')} style={MB}>
                <Input prefix={<PhoneOutlined style={{ color: token.colorTextQuaternary }} />} style={INP_STYLE} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label={LBL('Correo electrónico')} rules={[{ type: 'email', message: 'Email inválido' }]} style={MB}>
                <Input prefix={<MailOutlined style={{ color: token.colorTextQuaternary }} />} style={INP_STYLE} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label={LBL('Notas')} style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} style={{ borderRadius: 8, borderColor: token.colorBorderSecondary }} placeholder="Observaciones adicionales..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

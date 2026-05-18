'use client'

import { useState, useEffect } from 'react'
import {
  Table, Button, Tag, Input, Typography, Modal, Form, Select, App,
  Row, Col, Switch, Divider, Card, Statistic, Space, Tooltip, Popconfirm, Avatar,
  Radio, Badge, theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, TeamOutlined, BankOutlined, UserOutlined,
  IdcardOutlined, EnvironmentOutlined, PhoneOutlined, MailOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
// sv-geo usado solo como fallback inicial — datos reales vienen de la API

const { Title, Text } = Typography

// ── Tipos documento por persona ──────────────────────────────────────────────

const TIPO_DOC_NATURAL = [
  { value: '13', label: 'DUI' },
  { value: '02', label: 'Carnet de Residente' },
  { value: '03', label: 'Pasaporte' },
]

const TIPO_DOC_JURIDICA = [
  { value: '36', label: 'NIT' },
  { value: '37', label: 'NRC' },
]

// ── Helper ───────────────────────────────────────────────────────────────────

function getDocLabel(tipo: string | null) {
  const all = [...TIPO_DOC_NATURAL, ...TIPO_DOC_JURIDICA]
  return all.find(t => t.value === tipo)?.label ?? tipo ?? '—'
}

// Labels se resuelven desde los datos de API (ver departamentosOpts en el componente)

// ── Componente principal ─────────────────────────────────────────────────────

export default function ClientsPage() {
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterCCF, setFilterCCF] = useState<boolean | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()

  // Tipo persona (Natural / Jurídica)
  const [tipoPersona, setTipoPersona] = useState<'NATURAL' | 'JURIDICA'>('NATURAL')
  const [departamentoCod, setDepartamentoCod] = useState<string | undefined>()
  const [municipios, setMunicipios] = useState<{ value: string; label: string }[]>([])

  const { companyId } = useAppContext()

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ['clients', companyId, search],
    queryFn: () => api.get('/api/clients', { params: { companyId, search: search || undefined } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: departamentosApi = [] } = useQuery({
    queryKey: ['catalogs-departamentos'],
    queryFn: () => api.get('/api/catalogs/departamentos').then(r => r.data),
    staleTime: 10 * 60_000,
  })

  const { data: actividadesApi = [] } = useQuery({
    queryKey: ['catalogs-actividades'],
    queryFn: () => api.get('/api/catalogs/actividades').then(r => r.data),
    staleTime: 10 * 60_000,
  })

  const departamentosOpts = (departamentosApi as any[]).map((d: any) => ({
    value: d.codigo,
    label: d.nombre,
  }))

  const actividadesOpts = (actividadesApi as any[]).map((a: any) => ({
    value: a.codigo,
    label: `${a.codigo} — ${a.nombre}`,
  }))

  // ── KPIs ────────────────────────────────────────────────────────────────────

  const totalClients = clients.length
  const ccfClients = clients.filter((c: any) => c.esCreditoFiscal).length
  const cfClients = clients.filter((c: any) => !c.esCreditoFiscal).length
  const activeClients = clients.filter((c: any) => c.isActive !== false).length

  // ── Municipios según departamento ────────────────────────────────────────────

  useEffect(() => {
    if (!departamentoCod) { setMunicipios([]); return }
    form.setFieldValue('municipioCod', undefined)
    api.get('/api/catalogs/departamentos/' + departamentoCod + '/municipios')
      .then(r => setMunicipios((r.data as any[]).map((m: any) => ({ value: m.codigo, label: m.nombre }))))
      .catch(() => setMunicipios([]))
  }, [departamentoCod, form])

  // ── Mutations ────────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editing?.id
        ? api.put(`/api/clients/${editing.id}`, values)
        : api.post('/api/clients', { ...values, companyId }),
    onSuccess: () => {
      message.success(editing?.id ? 'Cliente actualizado' : 'Cliente creado')
      qc.invalidateQueries({ queryKey: ['clients'] })
      closeModal()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al guardar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/clients/${id}`),
    onSuccess: () => {
      message.success('Cliente eliminado')
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al eliminar'),
  })

  // ── Modal helpers ────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null)
    form.resetFields()
    setTipoPersona('NATURAL')
    setDepartamentoCod(undefined)
    setMunicipios([])
    form.setFieldsValue({ esCreditoFiscal: false, tipoPersona: 'NATURAL', isActive: true })
    setEditOpen(true)
  }

  function openEdit(record: any) {
    setEditing(record)
    const esJuridica = record.tipoDocumento === '36' || !!record.nrc
    const tipo = esJuridica ? 'JURIDICA' : 'NATURAL'
    setTipoPersona(tipo)
    if (record.departamentoCod) {
      setDepartamentoCod(record.departamentoCod)
      // municipios se cargarán via useEffect cuando departamentoCod cambie
    }
    form.setFieldsValue({
      ...record,
      tipoPersona: tipo,
      departamentoCod: record.departamentoCod ?? undefined,
      municipioCod: record.municipioCod ?? undefined,
      actividadEconomicaCodigo: record.actividadEconomicaCodigo ?? undefined,
    })
    setEditOpen(true)
  }

  function closeModal() {
    setEditOpen(false)
    setEditing(null)
    setDepartamentoCod(undefined)
    setMunicipios([])
  }

  function onTipoPersonaChange(val: 'NATURAL' | 'JURIDICA') {
    setTipoPersona(val)
    form.setFieldsValue({
      tipoDocumento: val === 'JURIDICA' ? '36' : undefined,
      esCreditoFiscal: val === 'JURIDICA',
      nrc: undefined,
    })
  }

  function onDeptChange(cod: string) {
    setDepartamentoCod(cod)
    form.setFieldValue('departamentoCod', cod)
  }

  function onFinish(values: any) {
    const payload = { ...values }
    delete payload.tipoPersona
    // Set actividadEconomica label from código
    if (payload.actividadEconomicaCodigo) {
      const act = (actividadesApi as any[]).find((a: any) => a.codigo === payload.actividadEconomicaCodigo)
      if (act) payload.actividadEconomica = act.nombre
    }
    saveMutation.mutate(payload)
  }

  // ── Filtro client-side ───────────────────────────────────────────────────────

  const filtered = clients.filter((c: any) => {
    if (filterCCF === true && !c.esCreditoFiscal) return false
    if (filterCCF === false && c.esCreditoFiscal) return false
    return true
  })

  // ── Columnas ─────────────────────────────────────────────────────────────────

  const columns: ColumnsType<any> = [
    {
      title: 'Cliente',
      key: 'name',
      render: (r: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={36}
            style={{ background: r.esCreditoFiscal ? token.colorInfo : token.colorPrimary, flexShrink: 0, fontWeight: 700 }}
          >
            {r.name?.[0]?.toUpperCase() ?? 'C'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{r.name}</div>
            {r.email && (
              <div style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 3 }}>
                <MailOutlined style={{ fontSize: 10 }} /> {r.email}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Tipo',
      key: 'tipo',
      width: 110,
      render: (r: any) => (
        <Tag
          color={r.esCreditoFiscal ? 'blue' : 'orange'}
          style={{ fontWeight: 600, borderRadius: 4 }}
        >
          {r.esCreditoFiscal ? '🏢 CCF' : '👤 CF'}
        </Tag>
      ),
    },
    {
      title: 'Documento',
      key: 'doc',
      width: 160,
      render: (r: any) =>
        r.numDocumento ? (
          <Space size={4}>
            <IdcardOutlined style={{ color: '#999' }} />
            <Text style={{ fontSize: 12 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>{getDocLabel(r.tipoDocumento)}: </Text>
              {r.numDocumento}
            </Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        ),
    },
    {
      title: 'NRC',
      dataIndex: 'nrc',
      key: 'nrc',
      width: 100,
      render: (v: string) => v ? <Text style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Teléfono',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (v: string) =>
        v ? (
          <Space size={4}>
            <PhoneOutlined style={{ color: token.colorSuccess, fontSize: 12 }} />
            <Text style={{ fontSize: 12 }}>{v}</Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        ),
    },
    {
      title: 'Ubicación',
      key: 'ubicacion',
      width: 140,
      render: (r: any) =>
        r.departamentoCod ? (
          <Space size={4}>
            <EnvironmentOutlined style={{ color: '#722ed1', fontSize: 12 }} />
            <Text style={{ fontSize: 11 }}>
              {(departamentosApi as any[]).find((d: any) => d.codigo === r.departamentoCod)?.nombre ?? r.departamentoCod}
            </Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        ),
    },
    {
      title: 'Estado',
      key: 'status',
      width: 80,
      render: (r: any) => (
        <Badge status={r.isActive !== false ? 'success' : 'default'} text={r.isActive !== false ? 'Activo' : 'Inactivo'} />
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (r: any) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(r)}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Eliminar cliente?"
              description="Esta acción no se puede deshacer."
              onConfirm={() => deleteMutation.mutate(r.id)}
              okText="Sí, eliminar"
              okButtonProps={{ danger: true }}
              cancelText="Cancelar"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Clientes</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Gestión de clientes y datos fiscales DTE</Text>
      </div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { title: 'Total clientes', value: totalClients, icon: <TeamOutlined />, color: token.colorPrimary },
          { title: 'Activos', value: activeClients, icon: <UserOutlined />, color: token.colorSuccess },
          { title: 'Crédito Fiscal (CCF)', value: ccfClients, icon: <BankOutlined />, color: token.colorInfo },
          { title: 'Consumidor Final (CF)', value: cfClients, icon: <UserOutlined />, color: '#722ed1' },
        ].map((kpi) => (
          <Col xs={12} sm={6} key={kpi.title}>
            <Card
              size="small"
              style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              <Statistic
                title={<span style={{ fontSize: 12, color: '#888' }}>{kpi.title}</span>}
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
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Space wrap>
            <Input
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder="Buscar por nombre, documento, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Radio.Group
              value={filterCCF}
              onChange={e => setFilterCCF(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="middle"
            >
              <Radio.Button value={null}>Todos</Radio.Button>
              <Radio.Button value={false}>CF</Radio.Button>
              <Radio.Button value={true}>CCF</Radio.Button>
            </Radio.Group>
          </Space>
          <Space>
            <Tooltip title="Recargar">
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
              style={{ background: token.colorPrimary, borderColor: token.colorPrimary }}
            >
              Nuevo cliente
            </Button>
          </Space>
        </div>
      </Card>

      {/* Tabla */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: false,
            showTotal: (total) => `${total} clientes`,
            style: { padding: '8px 16px' },
          }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        />
      </Card>

      {/* Modal crear/editar */}
      <Modal
        open={editOpen}
        title={
          <Space>
            {editing?.id ? <EditOutlined /> : <PlusOutlined />}
            {editing?.id ? 'Editar cliente' : 'Nuevo cliente'}
          </Space>
        }
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText={editing?.id ? 'Actualizar' : 'Crear cliente'}
        okButtonProps={{ style: { background: token.colorPrimary, borderColor: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        width={680}
        destroyOnClose
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          style={{ marginTop: 8 }}
        >
          {/* Tipo persona */}
          <Form.Item name="tipoPersona" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Tipo de persona</span>} style={{ marginBottom: 16 }}>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              onChange={e => onTipoPersonaChange(e.target.value)}
            >
              <Radio.Button value="NATURAL"><UserOutlined /> Persona Natural</Radio.Button>
              <Radio.Button value="JURIDICA"><BankOutlined /> Empresa / Jurídica</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Divider style={{ margin: '0 0 16px', borderColor: '#e9e9e7' }} />

          {/* Datos básicos */}
          <Typography.Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos básicos</Typography.Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />
          <Row gutter={16}>
            <Col span={tipoPersona === 'JURIDICA' ? 12 : 16}>
              <Form.Item
                name="name"
                label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>{tipoPersona === 'JURIDICA' ? 'Razón social' : 'Nombre completo'}</span>}
                rules={[{ required: true, message: 'Campo requerido' }]}
                style={{ marginBottom: 16 }}
              >
                <Input prefix={<UserOutlined style={{ color: '#ccc' }} />} style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            {tipoPersona === 'JURIDICA' && (
              <Col span={12}>
                <Form.Item name="comercialName" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Nombre comercial</span>} style={{ marginBottom: 16 }}>
                  <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
                </Form.Item>
              </Col>
            )}
            <Col span={8}>
              <Form.Item name="esCreditoFiscal" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Tipo factura</span>} valuePropName="checked" style={{ marginBottom: 16 }}>
                <Switch
                  checkedChildren="CCF"
                  unCheckedChildren="CF"
                  style={{ backgroundColor: form.getFieldValue('esCreditoFiscal') ? token.colorInfo : undefined }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Documento */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="tipoDocumento" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Tipo documento</span>} style={{ marginBottom: 16 }}>
                <Select
                  options={tipoPersona === 'JURIDICA' ? TIPO_DOC_JURIDICA : TIPO_DOC_NATURAL}
                  placeholder="Seleccionar"
                  allowClear
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="numDocumento" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Número documento</span>} style={{ marginBottom: 16 }}>
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="nrc"
                label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>NRC</span>}
                tooltip={tipoPersona === 'JURIDICA' ? 'Número de Registro de Contribuyente' : undefined}
                style={{ marginBottom: 16 }}
              >
                <Input style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Actividad económica (jurídica) */}
          {tipoPersona === 'JURIDICA' && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="actividadEconomicaCodigo" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Actividad económica</span>} style={{ marginBottom: 16 }}>
                  <Select
                    showSearch
                    placeholder="Buscar actividad..."
                    filterOption={(input, opt) =>
                      (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={actividadesOpts}
                    allowClear
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Typography.Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contacto y ubicación</Typography.Text>
          <Divider style={{ margin: '4px 0 16px', borderColor: '#e9e9e7' }} />

          {/* Contacto */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Teléfono</span>} style={{ marginBottom: 16 }}>
                <Input prefix={<PhoneOutlined style={{ color: '#ccc' }} />} style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Correo electrónico</span>} rules={[{ type: 'email', message: 'Email inválido' }]} style={{ marginBottom: 16 }}>
                <Input prefix={<MailOutlined style={{ color: '#ccc' }} />} style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Departamento / Municipio */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="departamentoCod" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Departamento</span>} style={{ marginBottom: 16 }}>
                <Select
                  showSearch
                  placeholder="Seleccionar departamento"
                  filterOption={(input, opt) =>
                    (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={departamentosOpts}
                  onChange={onDeptChange}
                  allowClear
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="municipioCod" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Municipio</span>} style={{ marginBottom: 16 }}>
                <Select
                  showSearch
                  placeholder={departamentoCod ? 'Seleccionar municipio' : 'Primero elige departamento'}
                  disabled={!departamentoCod}
                  options={municipios}
                  filterOption={(input, opt) =>
                    (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  allowClear
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Dirección */}
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="address" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Dirección</span>} style={{ marginBottom: 16 }}>
                <Input prefix={<EnvironmentOutlined style={{ color: '#ccc' }} />} placeholder="Calle, colonia, referencia..." style={{ borderRadius: 8, borderColor: '#e9e9e7' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Estado */}
          <Form.Item name="isActive" label={<span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>Estado</span>} valuePropName="checked" initialValue={true} style={{ marginBottom: 0 }}>
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

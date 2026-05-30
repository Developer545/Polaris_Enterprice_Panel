'use client'
import { useState, useRef } from 'react'
import {
  Table, Button, Tag, Typography, Modal, Form, Select, InputNumber, Input, App,
  Row, Col, Divider, Card, Space, Tooltip, theme, Tabs, Drawer, Avatar, Upload,
  Spin, Progress, Statistic, Switch, Empty,
} from 'antd'
import {
  PlusOutlined, EditOutlined, ReloadOutlined, UserOutlined, TeamOutlined,
  DollarOutlined, CheckCircleOutlined, CameraOutlined, DeleteOutlined,
  ExclamationCircleOutlined, TrophyOutlined, BarChartOutlined, FallOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'
import type { UploadFile } from 'antd'

const { Text, Title } = Typography

const AFP_OPTIONS    = [{ value: 'CONFIA', label: 'CONFIA' }, { value: 'CRECER', label: 'CRECER' }]
const SALARY_OPTIONS = [{ value: 'MONTHLY', label: 'Mensual' }, { value: 'DAILY', label: 'Diario' }, { value: 'HOURLY', label: 'Por hora' }]
const STATUS_OPTIONS = [{ value: 'ACTIVE', label: 'Activo' }, { value: 'INACTIVE', label: 'Inactivo' }, { value: 'ON_LEAVE', label: 'Con permiso' }]

const STATUS_COLOR: Record<string, string>  = { ACTIVE: 'green', INACTIVE: 'default', ON_LEAVE: 'orange' }
const STATUS_LABEL: Record<string, string>  = { ACTIVE: 'Activo', INACTIVE: 'Inactivo', ON_LEAVE: 'Permiso' }
const PAYROLL_COLOR: Record<string, string> = { PAID: 'success', APPROVED: 'blue', DRAFT: 'default' }
const PAYROLL_LABEL: Record<string, string> = { PAID: 'Pagada', APPROVED: 'Aprobada', DRAFT: 'Borrador' }

const money = (v: number) => `$${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function getInitials(emp: any) {
  return `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase()
}

function avatarColor(id: string) {
  const palette = ['#f47920', '#1677ff', '#52c41a', '#faad14', '#6366f1', '#eb5757', '#0891b2', '#a855f7']
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return palette[Math.abs(h) % palette.length]
}

// ── Label helper ──────────────────────────────────────────────────────────────
function FL({ text }: { text: string }) {
  return <span style={{ color: '#37352f', fontWeight: 500, fontSize: 13 }}>{text}</span>
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const { message, modal } = App.useApp()
  const { token } = theme.useToken()
  const qc = useQueryClient()
  const { companyId } = useAppContext()

  const [pageTab,   setPageTab]   = useState('empleados')
  const [drawerEmp, setDrawerEmp] = useState<any>(null)  // selected employee for drawer
  const [drawerTab, setDrawerTab] = useState('datos')
  const [newEmpOpen, setNewEmpOpen] = useState(false)
  const [editCargo, setEditCargo] = useState<any>(null)  // null=closed, {}=new, {id}=edit

  const [form]      = Form.useForm()
  const [cargoForm] = Form.useForm()
  const PRIMARY = token.colorPrimary

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: () => api.get('/api/employees', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: cargos = [] } = useQuery({
    queryKey: ['employee-cargos', companyId],
    queryFn: () => api.get('/api/employees/cargos', { params: { companyId } }).then(r => r.data),
    enabled: !!companyId,
  })

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['employee-analytics', drawerEmp?.id],
    queryFn: () => api.get(`/api/employees/${drawerEmp.id}/analytics`).then(r => r.data),
    enabled: !!drawerEmp?.id && drawerTab === 'analiticas',
  })

  // ── Mutations ────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = { ...values, hireDate: values.hireDate ? dayjs(values.hireDate).format('YYYY-MM-DD') : undefined }
      return drawerEmp?.id
        ? api.put(`/api/employees/${drawerEmp.id}`, payload)
        : api.post('/api/employees', { ...payload, companyId })
    },
    onSuccess: () => {
      message.success('Empleado guardado')
      qc.invalidateQueries({ queryKey: ['employees'] })
      setDrawerEmp(null)
      setNewEmpOpen(false)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al guardar'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/employees/${id}`),
    onSuccess: () => {
      message.success('Empleado desactivado')
      qc.invalidateQueries({ queryKey: ['employees'] })
      setDrawerEmp(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const cargoMutation = useMutation({
    mutationFn: (values: any) =>
      editCargo?.id
        ? api.put(`/api/employees/cargos/${editCargo.id}`, values)
        : api.post('/api/employees/cargos', { ...values, companyId }),
    onSuccess: () => {
      message.success('Cargo guardado')
      qc.invalidateQueries({ queryKey: ['employee-cargos'] })
      setEditCargo(null)
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const deleteCargoMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/employees/cargos/${id}`),
    onSuccess: () => {
      message.success('Cargo eliminado')
      qc.invalidateQueries({ queryKey: ['employee-cargos'] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  // ── Photo upload ──────────────────────────────────────────────────────────────
  const [photoLoading, setPhotoLoading] = useState(false)

  async function uploadPhoto(file: File) {
    setPhotoLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1]
        const mime = file.type
        const res = await api.post('/api/upload/image', { base64, mime, folder: 'polaris/empleados' })
        const photoUrl = res.data.url
        // Guardar inmediatamente en el empleado
        if (drawerEmp?.id) {
          await api.put(`/api/employees/${drawerEmp.id}`, { photoUrl })
          setDrawerEmp((prev: any) => ({ ...prev, photoUrl }))
          qc.invalidateQueries({ queryKey: ['employees'] })
          message.success('Foto actualizada')
        }
        setPhotoLoading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      message.error('Error al subir imagen')
      setPhotoLoading(false)
    }
    return false // prevent antd default upload
  }

  function openEmployee(emp: any) {
    setDrawerEmp(emp)
    setDrawerTab('datos')
    form.setFieldsValue({
      ...emp,
      hireDate: emp.hireDate ? emp.hireDate.substring(0, 10) : undefined,
      cargoId: emp.cargoId ?? undefined,
    })
  }

  function openNewEmployee() {
    setDrawerEmp({})
    setNewEmpOpen(true)
    setDrawerTab('datos')
    form.resetFields()
    form.setFieldsValue({ afpInstitution: 'CONFIA', salaryType: 'MONTHLY', status: 'ACTIVE' })
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const totalEmp    = employees.length
  const activeEmp   = employees.filter((e: any) => e.status === 'ACTIVE').length
  const onLeaveEmp  = employees.filter((e: any) => e.status === 'ON_LEAVE').length
  const totalCargos = cargos.length

  // ── Employee table columns ────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Empleado', key: 'name',
      render: (r: any) => (
        <Space>
          <Avatar size={34} src={r.photoUrl || undefined}
            style={{ background: avatarColor(r.id), fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {!r.photoUrl && getInitials(r)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.firstName} {r.lastName}</div>
            <div style={{ fontSize: 11, color: token.colorTextSecondary }}>{r.cargo?.nombre ?? r.position ?? '—'}</div>
          </div>
        </Space>
      ),
    },
    { title: 'Departamento', dataIndex: 'department', key: 'department', render: (v: string) => v ?? '—' },
    {
      title: 'Salario', key: 'salary',
      render: (r: any) => <Text strong style={{ color: PRIMARY }}>{money(Number(r.salary))}</Text>,
    },
    {
      title: 'AFP', dataIndex: 'afpInstitution', key: 'afpInstitution',
      render: (v: string) => v ? <Tag color="blue">{v}</Tag> : '—',
    },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{STATUS_LABEL[v] ?? v ?? 'Activo'}</Tag>,
    },
    {
      title: '', key: 'actions', width: 60,
      render: (r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEmployee(r)} />
      ),
    },
  ]

  // ── Cargos table ─────────────────────────────────────────────────────────────
  const cargoCols = [
    { title: 'Cargo', dataIndex: 'nombre', key: 'nombre', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', render: (v: string) => v ?? '—' },
    { title: 'Empleados', key: 'totalEmpleados', dataIndex: 'totalEmpleados', align: 'center' as const,
      render: (v: number) => <Tag color="blue">{v}</Tag> },
    {
      title: 'Activo', dataIndex: 'activo', key: 'activo', align: 'center' as const,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Sí' : 'No'}</Tag>,
    },
    {
      title: 'Acciones', key: 'actions', width: 110,
      render: (r: any) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditCargo(r); cargoForm.setFieldsValue(r) }} />
          <Button size="small" danger icon={<DeleteOutlined />}
            onClick={() => {
              if (r.totalEmpleados > 0) { message.warning('Tiene empleados asignados'); return }
              modal.confirm({
                title: 'Eliminar cargo', content: `¿Eliminar "${r.nombre}"?`, okText: 'Eliminar', okButtonProps: { danger: true },
                onOk: () => deleteCargoMutation.mutate(r.id),
              })
            }}
          />
        </Space>
      ),
    },
  ]

  // ── Drawer - Datos form ───────────────────────────────────────────────────────
  const DatosForm = () => (
    <Form form={form} layout="vertical" onFinish={saveMutation.mutate} requiredMark={false}
      initialValues={{ afpInstitution: 'CONFIA', salaryType: 'MONTHLY', status: 'ACTIVE' }}>
      <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Datos personales</Text>
      <Divider style={{ margin: '4px 0 16px' }} />
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="firstName" label={<FL text="Nombres" />} rules={[{ required: true }]} style={{ marginBottom: 14 }}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="lastName" label={<FL text="Apellidos" />} rules={[{ required: true }]} style={{ marginBottom: 14 }}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="dui" label={<FL text="DUI" />} style={{ marginBottom: 14 }}>
            <Input placeholder="00000000-0" style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="nit" label={<FL text="NIT" />} style={{ marginBottom: 14 }}>
            <Input placeholder="0000-000000-000-0" style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="nssIsss" label={<FL text="NSS / ISSS" />} style={{ marginBottom: 14 }}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="email" label={<FL text="Email" />} rules={[{ type: 'email' }]} style={{ marginBottom: 14 }}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="phone" label={<FL text="Teléfono" />} style={{ marginBottom: 14 }}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item name="address" label={<FL text="Dirección" />} style={{ marginBottom: 14 }}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="status" label={<FL text="Estado" />} style={{ marginBottom: 14 }}>
            <Select options={STATUS_OPTIONS} style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
      </Row>

      <Text style={{ fontSize: 11, color: '#787774', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cargo y planilla</Text>
      <Divider style={{ margin: '4px 0 16px' }} />
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="cargoId" label={<FL text="Cargo" />} style={{ marginBottom: 14 }}>
            <Select
              placeholder="Seleccionar cargo"
              allowClear
              showSearch
              optionFilterProp="label"
              options={cargos.map((c: any) => ({ value: c.id, label: c.nombre }))}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="position" label={<FL text="Puesto (texto libre)" />} style={{ marginBottom: 14 }}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="department" label={<FL text="Departamento" />} style={{ marginBottom: 14 }}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="salary" label={<FL text="Salario base" />} rules={[{ required: true }]} style={{ marginBottom: 14 }}>
            <InputNumber min={0} step={0.01} prefix="$" style={{ width: '100%', borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="salaryType" label={<FL text="Tipo de salario" />} style={{ marginBottom: 14 }}>
            <Select options={SALARY_OPTIONS} style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="afpInstitution" label={<FL text="AFP" />} style={{ marginBottom: 14 }}>
            <Select options={AFP_OPTIONS} style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="nup" label={<FL text="NUP (AFP)" />} style={{ marginBottom: 14 }}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="hireDate" label={<FL text="Fecha de ingreso" />} style={{ marginBottom: 14 }}>
            <Input type="date" style={{ borderRadius: 8 }} />
          </Form.Item>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <Button onClick={() => { setDrawerEmp(null); setNewEmpOpen(false) }}>Cancelar</Button>
        {drawerEmp?.id && drawerEmp?.status === 'ACTIVE' && (
          <Button danger
            onClick={() => modal.confirm({
              title: 'Desactivar empleado', content: '¿Desactivar este empleado? Se registrará fecha de baja.',
              okText: 'Desactivar', okButtonProps: { danger: true },
              onOk: () => deactivateMutation.mutate(drawerEmp.id),
            })}>
            Desactivar
          </Button>
        )}
        <Button type="primary" htmlType="submit" loading={saveMutation.isPending}
          style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 8, fontWeight: 600 }}>
          Guardar
        </Button>
      </div>
    </Form>
  )

  // ── Drawer - Foto tab ────────────────────────────────────────────────────────
  const FotoTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24, gap: 20 }}>
      <Spin spinning={photoLoading}>
        <Avatar
          size={120}
          src={drawerEmp?.photoUrl || undefined}
          style={{ background: drawerEmp?.id ? avatarColor(drawerEmp.id) : '#ccc', fontSize: 40, fontWeight: 700 }}>
          {drawerEmp && !drawerEmp.photoUrl && getInitials(drawerEmp)}
        </Avatar>
      </Spin>
      {!drawerEmp?.id ? (
        <Text type="secondary">Guarda el empleado primero para subir foto.</Text>
      ) : (
        <>
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={uploadPhoto}
          >
            <Button icon={<CameraOutlined />} loading={photoLoading}>
              {drawerEmp?.photoUrl ? 'Cambiar foto' : 'Subir foto'}
            </Button>
          </Upload>
          {drawerEmp?.photoUrl && (
            <Button danger size="small"
              onClick={async () => {
                await api.put(`/api/employees/${drawerEmp.id}`, { photoUrl: null })
                setDrawerEmp((prev: any) => ({ ...prev, photoUrl: null }))
                qc.invalidateQueries({ queryKey: ['employees'] })
                message.success('Foto eliminada')
              }}>
              Eliminar foto
            </Button>
          )}
          <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', maxWidth: 280 }}>
            Formatos: JPG, PNG, WebP. Máximo 10 MB. La foto se guarda en Cloudinary.
          </Text>
        </>
      )}
    </div>
  )

  // ── Drawer - Analíticas tab ───────────────────────────────────────────────────
  const AnalisisTab = () => {
    if (analyticsLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
    if (!analytics) return <Empty description="Sin datos de analíticas" style={{ padding: 40 }} />
    const a = analytics
    return (
      <div>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card size="small" style={{ borderRadius: 10, border: `1px solid ${PRIMARY}20`, background: `${PRIMARY}06` }} styles={{ body: { padding: '12px 14px' } }}>
              <Statistic title={<span style={{ fontSize: 11 }}>Salario base</span>} value={a.employee.salary}
                prefix="$" precision={2} valueStyle={{ fontSize: 18, fontWeight: 700, color: PRIMARY }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ borderRadius: 10, border: `1px solid ${token.colorSuccess}20`, background: `${token.colorSuccess}06` }} styles={{ body: { padding: '12px 14px' } }}>
              <Statistic title={<span style={{ fontSize: 11 }}>Antigüedad</span>} value={a.employee.tenureMeses}
                suffix="meses" valueStyle={{ fontSize: 18, fontWeight: 700, color: token.colorSuccess }} />
            </Card>
          </Col>
        </Row>

        {a.planillaEvolucion.length > 0 && (
          <>
            <Text style={{ fontSize: 12, fontWeight: 600, color: token.colorTextSecondary }}>HISTORIAL DE PLANILLAS</Text>
            <Divider style={{ margin: '6px 0 12px' }} />
            <Table
              size="small" rowKey="periodo" pagination={false}
              scroll={{ y: 220 }}
              dataSource={a.planillaEvolucion}
              columns={[
                { title: 'Período', dataIndex: 'periodo', key: 'periodo', width: 120 },
                { title: 'Bruto', dataIndex: 'totalBruto', key: 'totalBruto', align: 'right' as const, render: (v: number) => money(v) },
                { title: 'Neto', dataIndex: 'salarioNeto', key: 'salarioNeto', align: 'right' as const,
                  render: (v: number) => <Text style={{ color: token.colorSuccess, fontWeight: 600 }}>{money(v)}</Text> },
                { title: 'Estado', dataIndex: 'estado', key: 'estado', width: 90,
                  render: (v: string) => <Tag color={PAYROLL_COLOR[v] ?? 'default'} style={{ fontSize: 10 }}>{PAYROLL_LABEL[v] ?? v}</Tag> },
              ]}
            />
            <div style={{ marginTop: 12, padding: '10px 14px', background: `${PRIMARY}06`, borderRadius: 10, border: `1px solid ${PRIMARY}20` }}>
              <Row gutter={8}>
                <Col span={8}><div style={{ fontSize: 10, color: token.colorTextSecondary }}>Total bruto</div><div style={{ fontWeight: 700, color: PRIMARY }}>{money(a.planillaTotals.totalBruto)}</div></Col>
                <Col span={8}><div style={{ fontSize: 10, color: token.colorTextSecondary }}>Total neto</div><div style={{ fontWeight: 700, color: token.colorSuccess }}>{money(a.planillaTotals.totalNeto)}</div></Col>
                <Col span={8}><div style={{ fontSize: 10, color: token.colorTextSecondary }}>Deducciones</div><div style={{ fontWeight: 700, color: token.colorError }}>{money(a.planillaTotals.totalDeducciones)}</div></Col>
              </Row>
            </div>
          </>
        )}

        {a.planillaEvolucion.length === 0 && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin planillas procesadas" style={{ padding: 32 }} />
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Empleados</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Gestión de personal, cargos y datos laborales</Text>
      </div>

      {/* KPI cards */}
      <Row gutter={[14, 14]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: `1px solid ${PRIMARY}20`, background: `${PRIMARY}06` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="Total empleados" value={totalEmp}
              prefix={<TeamOutlined style={{ color: PRIMARY }} />}
              valueStyle={{ color: PRIMARY, fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: `1px solid ${token.colorSuccess}20`, background: `${token.colorSuccess}06` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="Activos" value={activeEmp}
              prefix={<CheckCircleOutlined style={{ color: token.colorSuccess }} />}
              valueStyle={{ color: token.colorSuccess, fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: `1px solid ${token.colorWarning}20`, background: `${token.colorWarning}06` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="Con permiso" value={onLeaveEmp}
              prefix={<UserOutlined style={{ color: token.colorWarning }} />}
              valueStyle={{ color: token.colorWarning, fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: `1px solid ${'#6366f1'}20`, background: `${'#6366f1'}06` }} styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="Cargos definidos" value={totalCargos}
              prefix={<TrophyOutlined style={{ color: '#6366f1' }} />}
              valueStyle={{ color: '#6366f1', fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      {/* Page tabs */}
      <Tabs
        activeKey={pageTab}
        onChange={setPageTab}
        size="small"
        tabBarExtraContent={
          pageTab === 'empleados'
            ? (
              <Space>
                <Tooltip title="Recargar">
                  <Button icon={<ReloadOutlined />} onClick={() => qc.invalidateQueries({ queryKey: ['employees'] })} />
                </Tooltip>
                <Button type="primary" icon={<PlusOutlined />} onClick={openNewEmployee}
                  style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}>
                  Nuevo empleado
                </Button>
              </Space>
            )
            : (
              <Button type="primary" icon={<PlusOutlined />}
                onClick={() => { setEditCargo({}); cargoForm.resetFields() }}
                style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}>
                Nuevo cargo
              </Button>
            )
        }
        items={[
          {
            key: 'empleados',
            label: `Empleados (${totalEmp})`,
            children: (
              <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} styles={{ body: { padding: 0 } }}>
                <Table
                  size="small" columns={columns} dataSource={employees} rowKey="id"
                  loading={empLoading}
                  pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `${t} empleados`, style: { padding: '8px 16px' } }}
                  style={{ borderRadius: 12, overflow: 'hidden' }}
                />
              </Card>
            ),
          },
          {
            key: 'cargos',
            label: `Cargos (${totalCargos})`,
            children: (
              <Card size="small" style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} styles={{ body: { padding: 0 } }}>
                <Table
                  size="small" columns={cargoCols} dataSource={cargos} rowKey="id"
                  pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `${t} cargos`, style: { padding: '8px 16px' } }}
                  style={{ borderRadius: 12, overflow: 'hidden' }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* ── Drawer: perfil empleado ─────────────────────────────────────────── */}
      <Drawer
        open={!!drawerEmp}
        onClose={() => { setDrawerEmp(null); setNewEmpOpen(false) }}
        width={600}
        title={
          drawerEmp?.id
            ? (
              <Space>
                <Avatar size={32} src={drawerEmp.photoUrl || undefined}
                  style={{ background: avatarColor(drawerEmp.id ?? 'x'), fontWeight: 700, fontSize: 13 }}>
                  {!drawerEmp.photoUrl && getInitials(drawerEmp)}
                </Avatar>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                    {drawerEmp.firstName} {drawerEmp.lastName}
                  </div>
                  <div style={{ fontSize: 11, color: token.colorTextSecondary }}>{drawerEmp.cargo?.nombre ?? drawerEmp.position ?? 'Sin cargo'}</div>
                </div>
              </Space>
            )
            : 'Nuevo empleado'
        }
        styles={{ body: { padding: '16px 24px' } }}
      >
        {drawerEmp?.id
          ? (
            <Tabs
              activeKey={drawerTab}
              onChange={setDrawerTab}
              size="small"
              items={[
                { key: 'datos',      label: 'Datos y cargo',  children: <DatosForm /> },
                { key: 'foto',       label: 'Foto',           children: <FotoTab /> },
                { key: 'analiticas', label: 'Analíticas',     children: <AnalisisTab /> },
              ]}
            />
          )
          : <DatosForm />
        }
      </Drawer>

      {/* ── Modal: nuevo cargo ──────────────────────────────────────────────── */}
      <Modal
        open={editCargo !== null}
        title={editCargo?.id ? 'Editar cargo' : 'Nuevo cargo'}
        onCancel={() => setEditCargo(null)}
        onOk={() => cargoForm.submit()}
        confirmLoading={cargoMutation.isPending}
        okText="Guardar"
        okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY, borderRadius: 8, fontWeight: 600 } }}
        width={440}
      >
        <Form form={cargoForm} layout="vertical" onFinish={cargoMutation.mutate} requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label={<FL text="Nombre del cargo" />} rules={[{ required: true }]}>
            <Input style={{ borderRadius: 8 }} placeholder="Ej: Cajero, Vendedor, Supervisor" />
          </Form.Item>
          <Form.Item name="descripcion" label={<FL text="Descripción" />}>
            <Input.TextArea rows={2} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="activo" label={<FL text="Activo" />} valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

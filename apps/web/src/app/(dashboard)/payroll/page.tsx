'use client'
import { useState, useCallback } from 'react'
import {
  Table, Button, Tag, Typography, Modal, Form, Input, App, Row, Col,
  Statistic, Card, Space, Tabs, Alert, Drawer, Divider, Switch,
  InputNumber, Select, DatePicker, Tooltip, theme,
} from 'antd'
import {
  PlusOutlined, EyeOutlined, CheckCircleOutlined, ReloadOutlined,
  TeamOutlined, CalendarOutlined, DollarCircleOutlined, GiftOutlined,
  SunOutlined, BankOutlined, SettingOutlined, SafetyOutlined,
  PercentageOutlined, CheckOutlined, PlayCircleOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAppContext } from '../../../hooks/use-app-context'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

// ── Constantes SV ─────────────────────────────────────────────────────────────

const ISSS_RATE_EMP    = 3.00     // %
const ISSS_RATE_PAT    = 7.50     // %
const ISSS_TOPE        = 1000.00
const AFP_RATE_EMP     = 7.25     // %
const AFP_RATE_PAT     = 7.75     // %
const INSAFORP_RATE    = 1.00     // %
const INSAFORP_TOPE    = 1000.00

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  DRAFT:    { color: 'default', label: 'Borrador'  },
  APPROVED: { color: 'blue',   label: 'Aprobada'  },
  PAID:     { color: 'green',  label: 'Pagada'    },
}

const PERIOD_TYPE_OPTIONS = [
  { value: 'MONTHLY',  label: 'Mensual'    },
  { value: 'BIWEEKLY', label: 'Quincenal' },
]

function fmt(n: number) { return `$${(n ?? 0).toFixed(2)}` }
function r2(n: number)  { return Math.round(n * 100) / 100 }

// ── Cálculos SV ───────────────────────────────────────────────────────────────

function calcAguinaldoDias(aniosStr: number): number {
  if (aniosStr < 1)  return 0
  if (aniosStr < 3)  return 15
  if (aniosStr < 10) return 19
  return 21
}

function calcPrestaciones(employees: any[], year: number, forzarCompleto = false) {
  const corte = new Date(year, 11, 20) // 20 de diciembre del año
  return employees.map(emp => {
    const hireDate  = emp.hireDate ? new Date(emp.hireDate) : null
    const salario   = Number(emp.salary ?? 0)
    const nombre    = `${emp.firstName} ${emp.lastName}`

    if (!hireDate || salario <= 0) {
      return { empId: emp.id, nombre, salario, hireDate: emp.hireDate, cargo: emp.position,
        mesesTrabajados: 0, anios: 0, diasAguinaldo: 0, montoAguinaldo: 0,
        diasVacaciones: 15, montoVacaciones: 0, esProporcional: true,
        quincenaAplica: salario <= 1500 && salario > 0, montoQuincena: 0 }
    }

    const msTotal     = corte.getTime() - hireDate.getTime()
    const diasTotal   = msTotal / (1000 * 60 * 60 * 24)
    const meses       = Math.floor(diasTotal / 30.44)
    const anios       = Math.floor(diasTotal / 365.25)

    // Aguinaldo
    const diasCompletos = calcAguinaldoDias(anios)
    const esProporcional = !forzarCompleto && anios < 1 && meses >= 1
    let diasAguinaldo = 0
    if (forzarCompleto || anios >= 1) {
      diasAguinaldo = diasCompletos
    } else if (esProporcional && meses >= 1) {
      diasAguinaldo = r2((meses / 12) * 15)
    }
    const salarioDiario  = r2(salario / 30)
    const montoAguinaldo = r2(salarioDiario * diasAguinaldo)

    // Vacaciones (Art. 177 CT — 15 días + 30%)
    const diasVac  = 15
    const montoVac = anios >= 1 ? r2((salario / 30) * diasVac * 1.30) : 0

    // Quincena 25 (Decreto 499, desde 2027)
    const quincenaAplica = salario <= 1500 && salario > 0
    const montoQuincena  = quincenaAplica ? r2(salario * 0.5) : 0

    return {
      empId: emp.id, nombre, salario, hireDate: emp.hireDate, cargo: emp.position,
      mesesTrabajados: meses, anios,
      diasAguinaldo, montoAguinaldo, esProporcional,
      diasVacaciones: diasVac, montoVacaciones: montoVac,
      quincenaAplica, montoQuincena,
    }
  })
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const { message } = App.useApp()
  const { token }   = theme.useToken()
  const qc          = useQueryClient()
  const { companyId } = useAppContext()

  const [activeTab,    setActiveTab]    = useState('planillas')
  const [newModal,     setNewModal]     = useState(false)
  const [detailDrawer, setDetailDrawer] = useState<any>(null)
  const [newForm]   = Form.useForm()

  // Aguinaldo / Vacaciones / Quincena 25
  const [anioAguinaldo,   setAnioAguinaldo]   = useState(new Date().getFullYear())
  const [anioQuincena,    setAnioQuincena]     = useState(Math.max(new Date().getFullYear(), 2027))
  const [forzarCompleto,  setForzarCompleto]   = useState(false)
  const [prestaciones,    setPrestaciones]     = useState<ReturnType<typeof calcPrestaciones> | null>(null)
  const [loadingPrest,    setLoadingPrest]     = useState(false)

  // ── Queries ────────────────────────────────────────────────────────────────

  const periodsQ = useQuery({
    queryKey: ['payroll-periods', companyId],
    queryFn:  () => api.get('/api/payroll/periods', { params: { companyId } }).then(r => r.data),
    enabled:  !!companyId,
  })

  const detailQ = useQuery({
    queryKey: ['payroll-period', detailDrawer?.id],
    queryFn:  () => api.get(`/api/payroll/periods/${detailDrawer.id}`).then(r => r.data),
    enabled:  !!detailDrawer?.id,
  })

  const employeesQ = useQuery({
    queryKey: ['employees-payroll', companyId],
    queryFn:  () => api.get('/api/employees', { params: { companyId } }).then(r => r.data),
    enabled:  !!companyId && activeTab !== 'planillas' && activeTab !== 'config',
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/api/payroll/periods', { ...values, companyId }),
    onSuccess: () => {
      message.success('Período creado')
      qc.invalidateQueries({ queryKey: ['payroll-periods'] })
      setNewModal(false)
      newForm.resetFields()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const generateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/payroll/periods/${id}/generate`),
    onSuccess: () => { message.success('Planilla generada'); qc.invalidateQueries({ queryKey: ['payroll-periods'] }) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/payroll/periods/${id}/approve`),
    onSuccess: () => { message.success('Planilla aprobada'); qc.invalidateQueries({ queryKey: ['payroll-periods'] }) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  const payMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/payroll/periods/${id}/pay`),
    onSuccess: () => { message.success('Planilla marcada como pagada'); qc.invalidateQueries({ queryKey: ['payroll-periods'] }) },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error'),
  })

  // ── Prestaciones ───────────────────────────────────────────────────────────

  const calcularPrestaciones = useCallback(async () => {
    setLoadingPrest(true)
    try {
      const emps = employeesQ.data ?? []
      if (!emps.length) {
        const r = await api.get('/api/employees', { params: { companyId } })
        const result = calcPrestaciones(r.data, anioAguinaldo, forzarCompleto)
        setPrestaciones(result)
      } else {
        setPrestaciones(calcPrestaciones(emps, anioAguinaldo, forzarCompleto))
      }
    } finally { setLoadingPrest(false) }
  }, [employeesQ.data, anioAguinaldo, forzarCompleto, companyId])

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const periods      = (periodsQ.data ?? []) as any[]
  const lastPeriod   = periods[0]
  const employees    = (employeesQ.data ?? []) as any[]
  const empActivos   = employees.filter(e => e.status === 'ACTIVE').length

  const colsDetail: ColumnsType<any> = [
    { title: 'Empleado', render: (r: any) => r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '—' },
    { title: 'Cargo',    render: (r: any) => r.employee?.position ?? '—', width: 130 },
    { title: 'Bruto',       dataIndex: 'totalBruto',      render: (v: any) => fmt(Number(v ?? 0)) },
    { title: 'ISSS',        dataIndex: 'isssEmpleado',    render: (v: any) => <Text type="danger">{fmt(Number(v ?? 0))}</Text> },
    { title: 'AFP',         dataIndex: 'afpEmpleado',     render: (v: any) => <Text type="danger">{fmt(Number(v ?? 0))}</Text> },
    { title: 'Renta',       dataIndex: 'rentaRetenida',   render: (v: any) => <Text type="danger">{fmt(Number(v ?? 0))}</Text> },
    { title: 'Deducciones', dataIndex: 'totalDeducciones',render: (v: any) => <Text type="danger">{fmt(Number(v ?? 0))}</Text> },
    {
      title: 'Neto', dataIndex: 'salarioNeto',
      render: (v: any) => <Text strong style={{ color: token.colorSuccess }}>{fmt(Number(v ?? 0))}</Text>,
    },
    { title: 'ISSS Pat.', dataIndex: 'isssPatronal', render: (v: any) => <Text type="secondary">{fmt(Number(v ?? 0))}</Text> },
    { title: 'AFP Pat.',  dataIndex: 'afpPatronal',  render: (v: any) => <Text type="secondary">{fmt(Number(v ?? 0))}</Text> },
    { title: 'INSAFORP',  dataIndex: 'insaforp',     render: (v: any) => <Text type="secondary">{fmt(Number(v ?? 0))}</Text> },
  ]

  const colsAguinaldo: ColumnsType<any> = [
    { title: 'Empleado',   dataIndex: 'nombre',    render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Cargo',      dataIndex: 'cargo',     width: 130 },
    { title: 'Salario',    dataIndex: 'salario',   render: (v: number) => fmt(v) },
    { title: 'Antigüedad', dataIndex: 'anios',     render: (v: number, r: any) => `${v} años (${r.mesesTrabajados} meses)` },
    { title: 'Días',       dataIndex: 'diasAguinaldo', render: (v: number) => v.toFixed(2) },
    { title: 'Tipo',       dataIndex: 'esProporcional', render: (v: boolean) => <Tag color={v ? 'orange' : 'green'}>{v ? 'Proporcional' : 'Completo'}</Tag> },
    { title: 'Monto',      dataIndex: 'montoAguinaldo', render: (v: number) => <Text strong style={{ color: token.colorSuccess }}>{fmt(v)}</Text> },
  ]

  const colsVacaciones: ColumnsType<any> = [
    { title: 'Empleado',   dataIndex: 'nombre',   render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Cargo',      dataIndex: 'cargo',    width: 130 },
    { title: 'Salario',    dataIndex: 'salario',  render: (v: number) => fmt(v) },
    { title: 'Meses',      dataIndex: 'mesesTrabajados', render: (v: number) => `${v} meses` },
    { title: 'Días',       dataIndex: 'diasVacaciones', render: (v: number) => `${v} días` },
    { title: 'Tipo',       dataIndex: 'esProporcional', render: (_: any, r: any) => r.anios >= 1 ? <Tag color="green">Completo</Tag> : <Tag color="orange">No aplica aún</Tag> },
    { title: 'Monto (+30%)', dataIndex: 'montoVacaciones', render: (v: number) => <Text strong style={{ color: token.colorSuccess }}>{fmt(v)}</Text> },
  ]

  const colsQuincena: ColumnsType<any> = [
    { title: 'Empleado',   dataIndex: 'nombre',  render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Cargo',      dataIndex: 'cargo',   width: 130 },
    { title: 'Salario',    dataIndex: 'salario', render: (v: number) => fmt(v) },
    { title: 'Aplica',     dataIndex: 'quincenaAplica', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Sí (≤$1,500)' : 'No (>$1,500)'}</Tag> },
    {
      title: 'Monto (50%)', dataIndex: 'montoQuincena',
      render: (v: number, r: any) => r.quincenaAplica
        ? <Text strong style={{ color: token.colorSuccess }}>{fmt(v)}</Text>
        : <Text type="secondary">—</Text>,
    },
  ]

  const planillaColumns: ColumnsType<any> = [
    { title: 'Período', dataIndex: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Tipo', dataIndex: 'periodType', render: (v: string) => <Tag>{PERIOD_TYPE_OPTIONS.find(o => o.value === v)?.label ?? v}</Tag>, width: 100 },
    { title: 'Inicio', dataIndex: 'startDate', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Fin',    dataIndex: 'endDate',   width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Estado', dataIndex: 'status', width: 100, render: (v: string) => { const s = STATUS_MAP[v] ?? { color: 'default', label: v }; return <Tag color={s.color}>{s.label}</Tag> } },
    { title: 'Empleados', render: (r: any) => r._count?.items ?? '—', width: 90, align: 'center' as const },
    { title: 'Total bruto', dataIndex: 'totalBruto', render: (v: any) => v != null ? fmt(Number(v)) : '—' },
    { title: 'Total neto',  dataIndex: 'totalNeto',  render: (v: any) => v != null ? <Text strong style={{ color: token.colorSuccess }}>{fmt(Number(v))}</Text> : '—' },
    {
      title: 'Acciones', width: 220,
      render: (r: any) => (
        <Space size={4}>
          <Tooltip title="Ver detalle">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailDrawer(r)}>Ver</Button>
          </Tooltip>
          {r.status === 'DRAFT' && (
            <Tooltip title="Calcular deducciones">
              <Button size="small" icon={<PlayCircleOutlined />} loading={generateMutation.isPending}
                onClick={() => Modal.confirm({
                  title: '¿Generar planilla?',
                  content: 'Se calcularán las deducciones para todos los empleados activos.',
                  okText: 'Generar', cancelText: 'Cancelar',
                  onOk: () => generateMutation.mutate(r.id),
                })}>
                Generar
              </Button>
            </Tooltip>
          )}
          {r.status === 'DRAFT' && (r._count?.items ?? 0) > 0 && (
            <Tooltip title="Aprobar planilla">
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} loading={approveMutation.isPending}
                onClick={() => Modal.confirm({
                  title: '¿Aprobar planilla?',
                  content: 'Una vez aprobada no podrá ser eliminada.',
                  okText: 'Aprobar', cancelText: 'Cancelar', okType: 'primary',
                  onOk: () => approveMutation.mutate(r.id),
                })}>
                Aprobar
              </Button>
            </Tooltip>
          )}
          {r.status === 'APPROVED' && (
            <Tooltip title="Marcar como pagada">
              <Button size="small" icon={<CheckOutlined />}
                style={{ background: token.colorSuccess, borderColor: token.colorSuccess, color: '#fff' }}
                loading={payMutation.isPending}
                onClick={() => Modal.confirm({
                  title: '¿Marcar planilla como Pagada?',
                  content: 'Confirma que se realizaron todos los pagos. Esta acción no se puede revertir.',
                  okText: 'Confirmar pago', cancelText: 'Cancelar',
                  onOk: () => payMutation.mutate(r.id),
                })}>
                Pagar
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  // ── Tab: Configuración ─────────────────────────────────────────────────────

  const TabConfig = () => (
    <div>
      <Alert type="info" showIcon style={{ marginBottom: 20 }}
        message="Tasas según legislación El Salvador 2024. Para modificarlas, edita el archivo apps/api/src/modules/tenant/payroll/payroll-calculator.ts." />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title={<span><SafetyOutlined style={{ color: '#1677ff', marginRight: 8 }} />ISSS — Seguro Social</span>} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {[
                { label: 'Tasa empleado', value: `${ISSS_RATE_EMP}%` },
                { label: 'Tasa patronal', value: `${ISSS_RATE_PAT}%` },
                { label: 'Tope salarial', value: `$${ISSS_TOPE.toFixed(2)}` },
              ].map(i => (
                <div key={i.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{i.label}</Text>
                  <Text strong style={{ fontSize: 13 }}>{i.value}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={<span><BankOutlined style={{ color: '#52c41a', marginRight: 8 }} />AFP — Fondo de Pensiones</span>} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {[
                { label: 'Tasa empleado', value: `${AFP_RATE_EMP}%` },
                { label: 'Tasa patronal', value: `${AFP_RATE_PAT}%` },
                { label: 'Tope salarial', value: 'Sin tope' },
              ].map(i => (
                <div key={i.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{i.label}</Text>
                  <Text strong style={{ fontSize: 13 }}>{i.value}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={<span><PercentageOutlined style={{ color: '#f5222d', marginRight: 8 }} />INSAFORP</span>} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {[
                { label: 'Tasa patronal', value: `${INSAFORP_RATE}%` },
                { label: 'Tope salarial', value: `$${INSAFORP_TOPE.toFixed(2)}` },
              ].map(i => (
                <div key={i.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{i.label}</Text>
                  <Text strong style={{ fontSize: 13 }}>{i.value}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col span={24}>
          <Card title={<span><PercentageOutlined style={{ color: '#f5222d', marginRight: 8 }} />Renta — ISR mensual 2024</span>} size="small">
            <Alert type="info" showIcon style={{ marginBottom: 12 }}
              message="Base imponible = Salario Bruto − ISSS − AFP. Se aplica la tabla progresiva mensual." />
            <Table size="small" pagination={false} scroll={{ x: true }}
              dataSource={[
                { key: 't1', tramo: 'Tramo 1 (Exento)',   desde: '$0.00',       hasta: '$487.50',    cuota: '$0.00',   pct: '0%',   formula: 'Sin retención' },
                { key: 't2', tramo: 'Tramo 2',            desde: '$487.51',     hasta: '$915.00',    cuota: '$0.00',   pct: '10%',  formula: '(base − $487.50) × 10%' },
                { key: 't3', tramo: 'Tramo 3',            desde: '$915.01',     hasta: '$1,395.83',  cuota: '$42.75',  pct: '20%',  formula: '(base − $915.00) × 20% + $42.75' },
                { key: 't4', tramo: 'Tramo 4',            desde: '$1,395.84',   hasta: '$4,064.58',  cuota: '$138.92', pct: '25%',  formula: '(base − $1,395.83) × 25% + $138.92' },
                { key: 't5', tramo: 'Tramo 5',            desde: '$4,064.59',   hasta: 'En adelante',cuota: '$808.06', pct: '30%',  formula: '(base − $4,064.58) × 30% + $808.06' },
              ]}
              columns={[
                { title: 'Tramo', dataIndex: 'tramo', render: (v: string) => <Text strong>{v}</Text>, width: 160 },
                { title: 'Desde',    dataIndex: 'desde' },
                { title: 'Hasta',    dataIndex: 'hasta' },
                { title: 'Cuota fija', dataIndex: 'cuota' },
                { title: '% sobre exceso', dataIndex: 'pct' },
                { title: 'Fórmula', dataIndex: 'formula', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Planilla</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Gestión de salarios, deducciones y prestaciones de ley El Salvador</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => qc.invalidateQueries({ queryKey: ['payroll-periods'] })} loading={periodsQ.isLoading} />
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => { setNewModal(true); newForm.resetFields() }}
            style={{ background: token.colorPrimary, borderRadius: 8, fontWeight: 600 }}>
            Nuevo período
          </Button>
        </Space>
      </div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: `4px solid ${token.colorPrimary}` }}>
            <Statistic title="Total períodos" value={periods.length}
              prefix={<CalendarOutlined />} valueStyle={{ color: token.colorPrimary }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: `4px solid ${token.colorSuccess}` }}>
            <Statistic title="Último período" value={lastPeriod?.name ?? '—'}
              valueStyle={{ fontSize: 16, color: token.colorSuccess }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: `4px solid ${token.colorSuccess}` }}>
            <Statistic title="Total neto (último)" value={lastPeriod?.totalNeto != null ? fmt(Number(lastPeriod.totalNeto)) : '—'}
              valueStyle={{ fontSize: 18, color: token.colorSuccess }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #f59e0b' }}>
            <Statistic title="Costo patronal (último)"
              value={lastPeriod ? fmt(Number(lastPeriod.totalIsss ?? 0) * (ISSS_RATE_PAT / ISSS_RATE_EMP)) : '—'}
              valueStyle={{ fontSize: 18, color: '#f59e0b' }} />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Card style={{ borderRadius: 10, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[

          /* ── 1. Planillas ── */
          {
            key: 'planillas',
            label: <span><CalendarOutlined /> Planillas</span>,
            children: (
              <div style={{ overflowX: 'auto' }}>
                <Table
                  dataSource={periods} columns={planillaColumns} rowKey="id"
                  loading={periodsQ.isLoading} size="small" scroll={{ x: 'max-content' }}
                  pagination={{ pageSize: 10, showTotal: t => `${t} períodos` }}
                  locale={{ emptyText: 'No hay períodos de planilla. Crea el primero.' }}
                />
              </div>
            ),
          },

          /* ── 2. Aguinaldo ── */
          {
            key: 'aguinaldo',
            label: <span><GiftOutlined /> Aguinaldo</span>,
            children: (
              <div>
                <Alert type="info" showIcon style={{ marginBottom: 16 }}
                  message="Art. 196-202 Código de Trabajo — 1 a 3 años: 15 días | 3 a 10 años: 19 días | 10+ años: 21 días. Pago antes del 20 de diciembre." />
                <Space style={{ marginBottom: 16 }} wrap>
                  <div>
                    <Text strong style={{ marginRight: 8 }}>Año:</Text>
                    <InputNumber value={anioAguinaldo} min={2020} max={2100}
                      onChange={v => setAnioAguinaldo(v ?? new Date().getFullYear())} style={{ width: 100 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text strong>Otorgar completo a todos:</Text>
                    <Switch checked={forzarCompleto} onChange={setForzarCompleto} checkedChildren="Sí" unCheckedChildren="No" />
                  </div>
                  <Button type="primary" icon={<GiftOutlined />} onClick={calcularPrestaciones}
                    loading={loadingPrest} style={{ background: token.colorPrimary, borderRadius: 8, fontWeight: 600 }}>
                    Calcular Aguinaldo
                  </Button>
                </Space>
                {prestaciones && (
                  <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={8}>
                        <Card size="small" style={{ borderRadius: 8 }}>
                          <Statistic title="Total Aguinaldo" prefix="$" precision={2}
                            value={prestaciones.reduce((s, p) => s + p.montoAguinaldo, 0)}
                            valueStyle={{ color: token.colorSuccess }} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small" style={{ borderRadius: 8 }}>
                          <Statistic title="Total empleados" value={prestaciones.length} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small" style={{ borderRadius: 8 }}>
                          <Statistic title="Promedio por empleado" prefix="$" precision={2}
                            value={prestaciones.length ? prestaciones.reduce((s, p) => s + p.montoAguinaldo, 0) / prestaciones.length : 0} />
                        </Card>
                      </Col>
                    </Row>
                    <Table dataSource={prestaciones} columns={colsAguinaldo} rowKey="empId"
                      size="small" pagination={false} scroll={{ x: 'max-content' }} />
                  </>
                )}
              </div>
            ),
          },

          /* ── 3. Vacaciones ── */
          {
            key: 'vacaciones',
            label: <span><SunOutlined /> Vacaciones</span>,
            children: (
              <div>
                <Alert type="info" showIcon style={{ marginBottom: 16 }}
                  message="Art. 177 Código de Trabajo — 15 días de vacaciones con 30% de recargo adicional sobre el salario ordinario." />
                <Space style={{ marginBottom: 16 }}>
                  <Button type="primary" icon={<SunOutlined />} onClick={calcularPrestaciones}
                    loading={loadingPrest} style={{ background: token.colorPrimary, borderRadius: 8, fontWeight: 600 }}>
                    Calcular Vacaciones
                  </Button>
                </Space>
                {prestaciones && (
                  <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={8}>
                        <Card size="small" style={{ borderRadius: 8 }}>
                          <Statistic title="Total Vacaciones (inc. 30%)" prefix="$" precision={2}
                            value={prestaciones.reduce((s, p) => s + p.montoVacaciones, 0)}
                            valueStyle={{ color: token.colorSuccess }} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small" style={{ borderRadius: 8 }}>
                          <Statistic title="Empleados con derecho" value={prestaciones.filter(p => p.anios >= 1).length} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small" style={{ borderRadius: 8 }}>
                          <Statistic title="Pendientes (menos de 1 año)" value={prestaciones.filter(p => p.anios < 1).length} />
                        </Card>
                      </Col>
                    </Row>
                    <Table dataSource={prestaciones} columns={colsVacaciones} rowKey="empId"
                      size="small" pagination={false} scroll={{ x: 'max-content' }} />
                  </>
                )}
              </div>
            ),
          },

          /* ── 4. Quincena 25 ── */
          {
            key: 'quincena25',
            label: <span><BankOutlined /> Quincena 25</span>,
            children: (
              <div>
                <Alert type="warning" showIcon style={{ marginBottom: 16 }}
                  message="Decreto Legislativo 499 — vigente desde enero 2027. 50% del salario mensual para empleados con salario ≤ $1,500. Se paga el 25 de enero de cada año." />
                <Space style={{ marginBottom: 16 }} wrap>
                  <div>
                    <Text strong style={{ marginRight: 8 }}>Año de pago:</Text>
                    <InputNumber value={anioQuincena} min={2027} max={2100}
                      onChange={v => setAnioQuincena(v ?? 2027)} style={{ width: 100 }} />
                  </div>
                  <Button type="primary" icon={<DollarCircleOutlined />} onClick={calcularPrestaciones}
                    loading={loadingPrest} style={{ background: token.colorPrimary, borderRadius: 8, fontWeight: 600 }}>
                    Calcular Quincena 25
                  </Button>
                </Space>
                {prestaciones && (
                  <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col xs={12} sm={6}>
                        <Card size="small" style={{ borderRadius: 8 }}>
                          <Statistic title="Total Quincena 25" prefix="$" precision={2}
                            value={prestaciones.reduce((s, p) => s + p.montoQuincena, 0)}
                            valueStyle={{ color: token.colorSuccess }} />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small" style={{ borderRadius: 8 }}>
                          <Statistic title="Aplican (≤$1,500)" value={prestaciones.filter(p => p.quincenaAplica).length}
                            valueStyle={{ color: token.colorSuccess }} />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small" style={{ borderRadius: 8 }}>
                          <Statistic title="No aplican (>$1,500)" value={prestaciones.filter(p => !p.quincenaAplica).length}
                            valueStyle={{ color: token.colorError }} />
                        </Card>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Card size="small" style={{ borderRadius: 8 }}>
                          <Statistic title="Total empleados" value={prestaciones.length} />
                        </Card>
                      </Col>
                    </Row>
                    <Table dataSource={prestaciones} columns={colsQuincena} rowKey="empId"
                      size="small" pagination={false} scroll={{ x: 'max-content' }} />
                  </>
                )}
              </div>
            ),
          },

          /* ── 5. Configuración ── */
          {
            key: 'config',
            label: <span><SettingOutlined /> Configuración</span>,
            children: <TabConfig />,
          },
        ]} />
      </Card>

      {/* Modal nuevo período */}
      <Modal
        open={newModal}
        title={<Space><CalendarOutlined />Nuevo período de planilla</Space>}
        onCancel={() => { setNewModal(false); newForm.resetFields() }}
        onOk={() => newForm.submit()}
        confirmLoading={createMutation.isPending}
        okText="Crear período"
        okButtonProps={{ style: { background: token.colorPrimary, borderRadius: 8, fontWeight: 600 } }}
        width={520}
        style={{ top: 40 }}
        styles={{ header: { borderBottom: '1px solid #e9e9e7', paddingBottom: 16 }, body: { paddingTop: 16 } }}
      >
        <Form form={newForm} layout="vertical" requiredMark={false}
          onFinish={(values) => createMutation.mutate({
            ...values,
            startDate:  values.startDate  ? values.startDate.toISOString()  : undefined,
            endDate:    values.endDate    ? values.endDate.toISOString()    : undefined,
            payDate:    values.payDate    ? values.payDate.toISOString()    : undefined,
          })}
          initialValues={{ periodType: 'MONTHLY' }}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="name" label="Nombre del período" rules={[{ required: true }]}>
                <Input placeholder="Ej: Planilla Mayo 2025" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="periodType" label="Tipo">
                <Select options={PERIOD_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startDate" label="Fecha inicio" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="Fecha fin" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payDate" label="Fecha de pago" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Drawer detalle planilla */}
      <Drawer
        open={!!detailDrawer}
        onClose={() => setDetailDrawer(null)}
        title={<span>Planilla — <Text strong>{detailDrawer?.name}</Text></span>}
        width={typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : '90%'}
        extra={detailDrawer && <Tag color={STATUS_MAP[detailDrawer.status]?.color ?? 'default'}>{STATUS_MAP[detailDrawer.status]?.label ?? detailDrawer.status}</Tag>}
      >
        {detailDrawer && (() => {
          const d = detailQ.data
          return (
            <>
              {d && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  {[
                    { label: 'Total Bruto',       value: Number(d.totalBruto ?? 0) },
                    { label: 'ISSS Empleados',    value: Number(d.totalIsss ?? 0) },
                    { label: 'AFP Empleados',     value: Number(d.totalAfp ?? 0) },
                    { label: 'Renta (ISR)',        value: Number(d.totalRenta ?? 0) },
                    { label: 'Total Neto',        value: Number(d.totalNeto ?? 0) },
                  ].map(item => (
                    <Col key={item.label} xs={12} sm={8} md={6}>
                      <Statistic title={item.label} value={item.value} prefix="$" precision={2}
                        valueStyle={{ fontSize: 16, color: item.label === 'Total Neto' ? token.colorSuccess : undefined }} />
                    </Col>
                  ))}
                </Row>
              )}
              <Divider>Detalle por empleado</Divider>
              <Table
                dataSource={d?.items ?? []}
                columns={colsDetail}
                rowKey="id"
                size="small"
                scroll={{ x: 'max-content' }}
                pagination={false}
                loading={detailQ.isLoading}
                locale={{ emptyText: 'Sin líneas. Usa "Generar" para calcular la planilla.' }}
              />
            </>
          )
        })()}
      </Drawer>
    </div>
  )
}

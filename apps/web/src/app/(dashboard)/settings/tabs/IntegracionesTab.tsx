'use client'
import { useState, useRef, useEffect } from 'react'
import {
  Form, Input, Button, Select, Alert, Space, Typography,
  Divider, Tag, Tooltip, App, Table, Switch,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SafetyOutlined, CloudServerOutlined, DatabaseOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, UploadOutlined,
  LockOutlined, EyeInvisibleOutlined, EyeOutlined,
  InfoCircleOutlined, SyncOutlined, ShopOutlined, WarningOutlined,
  FileTextOutlined, MailOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text, Paragraph } = Typography

// ─── DTE types catalog ────────────────────────────────────────────────────────

const DTE_CATALOG = [
  {
    code: '01',
    abbr: 'CF',
    name: 'Factura (Consumidor Final)',
    desc: 'Para ventas a personas naturales sin NIT/NRC. El más común en comercio.',
    required: true,   // always enabled, cannot disable
    color: '#1677ff',
    requiresCCF: false,
  },
  {
    code: '03',
    abbr: 'CCF',
    name: 'Comprobante de Crédito Fiscal',
    desc: 'Para ventas a empresas contribuyentes con NRC. Genera IVA deducible.',
    required: false,
    color: '#52c41a',
    requiresCCF: false,
  },
  {
    code: '05',
    abbr: 'NC',
    name: 'Nota de Crédito',
    desc: 'Corrige o anula parcialmente un CCF emitido. Requiere CCF activo.',
    required: false,
    color: '#fa8c16',
    requiresCCF: true,
  },
  {
    code: '06',
    abbr: 'ND',
    name: 'Nota de Débito',
    desc: 'Carga adicional sobre un CCF emitido (intereses, ajustes). Requiere CCF activo.',
    required: false,
    color: '#eb2f96',
    requiresCCF: true,
  },
  {
    code: '11',
    abbr: 'FEX',
    name: 'Factura de Exportación',
    desc: 'Para ventas al exterior. Requiere datos del receptor en el extranjero.',
    required: false,
    color: '#722ed1',
    requiresCCF: false,
  },
  {
    code: '16',
    abbr: 'VS',
    name: 'Venta Simplificada (provisional)',
    desc: 'Ventas anónimas sin datos de receptor. Código provisional — sujeto a cambio cuando MH formalice CAT-003.',
    required: false,
    color: 'var(--text-secondary)',
    requiresCCF: false,
  },
] as const

type DteCode = '01' | '03' | '05' | '06' | '11' | '16'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyData {
  id: string
  name: string
  haciendaConfigured: boolean
  certConfigured:     boolean
  smtpConfigured:     boolean
  smtpHost:           string | null
  smtpPort:           number | null
  smtpUser:           string | null
  smtpFrom:           string | null
  smtpSecure:         boolean
  dteAmbiente:        'TEST' | 'PROD'
  dteEnabledTypes:    string[]
}

interface BranchData {
  id:              string
  name:            string
  address:         string | null
  codEstableMH:    string | null
  codPuntoVentaMH: string | null
  isActive:        boolean
}

interface TenantInfo {
  slug:       string
  dbStrategy: 'NEON_SHARED' | 'NEON_DEDICATED' | 'LOCAL_DEDICATED'
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon, title, subtitle, children }: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: 'var(--sidebar-item-hover-bg)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 16, color: 'var(--text-primary)',
        }}>
          {icon}
        </div>
        <div>
          <Text strong style={{ fontSize: 14, color: 'var(--text-primary)', display: 'block' }}>{title}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{subtitle}</Text>
        </div>
      </div>
      <div style={{ paddingLeft: 48 }}>{children}</div>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <Tag icon={<CheckCircleOutlined />} color="success">{label}</Tag>
  ) : (
    <Tag icon={<ExclamationCircleOutlined />} color="warning">{label}</Tag>
  )
}

// ─── DB Strategy label ────────────────────────────────────────────────────────

const DB_STRATEGY_INFO: Record<string, { label: string; color: string; description: string }> = {
  NEON_SHARED:     { label: 'Neon Compartida',   color: 'blue',   description: 'Base de datos en cloud compartida, aislada por tenant. Administrada por Polaris Enterprise.' },
  NEON_DEDICATED:  { label: 'Neon Dedicada',     color: 'purple', description: 'Base de datos Neon exclusiva para este tenant. Administrada por Polaris Enterprise.' },
  LOCAL_DEDICATED: { label: 'PostgreSQL Propio',  color: 'orange', description: 'Base de datos PostgreSQL en servidor del cliente. Administrada por el cliente.' },
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IntegracionesTab({ companyId }: { companyId: string }) {
  const { message } = App.useApp()
  const qc = useQueryClient()

  const [haciendaForm] = Form.useForm()
  const [certForm]     = Form.useForm()
  const [smtpForm]     = Form.useForm()
  const [testingMH,    setTestingMH]    = useState(false)
  const [certFileName, setCertFileName] = useState<string | null>(null)
  const [certBase64,   setCertBase64]   = useState<string | null>(null)
  const [localDteTypes, setLocalDteTypes] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: company, isLoading: loadingCompany } = useQuery<CompanyData>({
    queryKey: ['company', companyId],
    queryFn: () => api.get(`/api/companies/${companyId}`).then(r => r.data),
    enabled: !!companyId,
    staleTime: 60_000,
  })

  const { data: tenantInfo } = useQuery<TenantInfo>({
    queryKey: ['tenant-info'],
    queryFn: () => api.get('/api/auth/tenant-info').then(r => r.data),
    staleTime: Infinity,
  })

  const { data: branches = [] } = useQuery<BranchData[]>({
    queryKey: ['branches', companyId],
    queryFn: () => api.get(`/api/branches?companyId=${companyId}`).then(r => r.data),
    enabled: !!companyId,
    staleTime: 60_000,
  })

  // Set form defaults when company loads
  useEffect(() => {
    if (company) {
      haciendaForm.setFieldsValue({ dteAmbiente: company.dteAmbiente ?? 'TEST' })
      setLocalDteTypes(company.dteEnabledTypes ?? ['01', '03'])
      smtpForm.setFieldsValue({
        smtpHost: company.smtpHost ?? '',
        smtpPort: company.smtpPort ?? 587,
        smtpUser: company.smtpUser ?? '',
        smtpFrom: company.smtpFrom ?? '',
        smtpSecure: company.smtpSecure ?? false,
      })
    }
  }, [company, haciendaForm, smtpForm])

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const updateMH = useMutation({
    mutationFn: (values: { haciendaUser: string; haciendaPassword: string; dteAmbiente: 'TEST' | 'PROD' }) =>
      api.put(`/api/companies/${companyId}`, values).then(r => r.data),
    onSuccess: () => {
      message.success('Credenciales Hacienda guardadas correctamente')
      qc.invalidateQueries({ queryKey: ['company', companyId] })
      haciendaForm.resetFields(['haciendaUser', 'haciendaPassword'])
    },
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Error al guardar credenciales'),
  })

  const updateCert = useMutation({
    mutationFn: (values: { certData: string; certPassword: string }) =>
      api.put(`/api/companies/${companyId}`, values).then(r => r.data),
    onSuccess: () => {
      message.success('Certificado guardado correctamente')
      qc.invalidateQueries({ queryKey: ['company', companyId] })
      certForm.resetFields()
      setCertFileName(null)
      setCertBase64(null)
    },
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Error al guardar certificado'),
  })

  const updateDteTypes = useMutation({
    mutationFn: (types: string[]) =>
      api.put(`/api/companies/${companyId}`, { dteEnabledTypes: types }).then(r => r.data),
    onSuccess: () => {
      message.success('Tipos de documento actualizados')
      qc.invalidateQueries({ queryKey: ['company', companyId] })
    },
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Error al guardar'),
  })

  const updateSmtp = useMutation({
    mutationFn: (values: any) =>
      api.put(`/api/companies/${companyId}`, values).then(r => r.data),
    onSuccess: () => {
      message.success('Configuración SMTP guardada')
      qc.invalidateQueries({ queryKey: ['company', companyId] })
      smtpForm.resetFields(['smtpPassword'])
    },
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Error al guardar SMTP'),
  })

  async function handleSaveSmtp() {
    try {
      const values = await smtpForm.validateFields()
      await updateSmtp.mutateAsync({
        smtpHost: values.smtpHost || null,
        smtpPort: values.smtpPort ? Number(values.smtpPort) : null,
        smtpUser: values.smtpUser || null,
        smtpPassword: values.smtpPassword || undefined,
        smtpFrom: values.smtpFrom || null,
        smtpSecure: values.smtpSecure ?? false,
      })
    } catch {}
  }

  function toggleDteType(code: string, enabled: boolean) {
    // CF (01) is always required — cannot disable
    if (code === '01') return
    const next = enabled
      ? [...localDteTypes, code]
      : localDteTypes.filter(t => t !== code)

    // If disabling CCF, also disable NC and ND (they require CCF)
    const finalTypes = !enabled && code === '03'
      ? next.filter(t => t !== '05' && t !== '06')
      : next

    setLocalDteTypes(finalTypes)
  }

  // ── Handlers ──────────────────────────────────────────────────────────────────

  async function handleTestMH() {
    setTestingMH(true)
    try {
      const values = haciendaForm.getFieldsValue()
      const payload: Record<string, string> = { ambiente: values.dteAmbiente ?? company?.dteAmbiente ?? 'TEST' }
      if (values.haciendaUser)     payload.user     = values.haciendaUser
      if (values.haciendaPassword) payload.password = values.haciendaPassword

      const res = await api.post(`/api/companies/${companyId}/test-hacienda`, payload)
      message.success(res.data?.message ?? 'Conexión exitosa')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error de conexión'
      message.error(`Fallo: ${msg}`)
    } finally {
      setTestingMH(false)
    }
  }

  function handleP12Select(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.p12') && !file.name.endsWith('.pfx')) {
      message.error('Solo se aceptan archivos .p12 o .pfx')
      return
    }
    setCertFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1] // strip data:...;base64,
      setCertBase64(b64)
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveCert() {
    try {
      const values = await certForm.validateFields()
      if (!certBase64) { message.error('Selecciona el archivo .p12'); return }
      await updateCert.mutateAsync({ certData: certBase64, certPassword: values.certPassword })
    } catch {}
  }

  async function handleSaveMH() {
    try {
      const values = await haciendaForm.validateFields(['dteAmbiente'])
      const fields = haciendaForm.getFieldsValue()
      if (!fields.haciendaUser && !fields.haciendaPassword) {
        // Only updating ambiente
        await updateMH.mutateAsync({ ...fields, ...values })
        return
      }
      await haciendaForm.validateFields()
      await updateMH.mutateAsync(fields)
    } catch {}
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!companyId) {
    return (
      <Alert
        type="info"
        showIcon
        message="Sin empresa seleccionada"
        description="Inicia sesión con un ID de empresa válido para configurar integraciones."
        style={{ margin: 24 }}
      />
    )
  }

  const dbInfo = tenantInfo ? DB_STRATEGY_INFO[tenantInfo.dbStrategy] : null

  return (
    <div style={{ padding: '24px 28px', maxWidth: 720 }}>

      {/* ══ 0. Tipos de documento habilitados ════════════════════════════════════ */}
      <Section
        icon={<FileTextOutlined />}
        title="Tipos de documento fiscal habilitados"
        subtitle="Activa solo los que usa esta empresa · NC y ND requieren CCF activo · CF siempre activo"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {DTE_CATALOG.map(dt => {
            const isEnabled = localDteTypes.includes(dt.code)
            const ccfActive = localDteTypes.includes('03')
            const blocked   = dt.requiresCCF && !ccfActive

            return (
              <div key={dt.code} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 8,
                border: `1px solid var(--sidebar-border)`,
                background: isEnabled && !blocked ? 'var(--bg-surface)' : 'var(--sidebar-item-hover-bg)',
                opacity: blocked ? 0.5 : 1,
                transition: 'all 0.15s',
              }}>
                <Switch
                  size="small"
                  checked={isEnabled && !blocked}
                  disabled={dt.required || blocked}
                  onChange={(val) => toggleDteType(dt.code, val)}
                />
                <Tag
                  color={isEnabled && !blocked ? dt.color : 'default'}
                  style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, minWidth: 40, textAlign: 'center' }}
                >
                  {dt.abbr}
                </Tag>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {dt.name}
                    {dt.required && <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>Siempre activo</Tag>}
                    {blocked && <Tag color="orange" style={{ marginLeft: 8, fontSize: 10 }}>Requiere CCF</Tag>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{dt.desc}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            type="primary"
            loading={updateDteTypes.isPending}
            onClick={() => updateDteTypes.mutate(localDteTypes)}
          >
            Guardar tipos habilitados
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Los cambios aplican inmediatamente en el POS
          </Text>
        </div>
      </Section>

      <Divider style={{ margin: '8px 0 24px' }} />

      {/* ══ 1. Ministerio de Hacienda ══════════════════════════════════════════ */}
      <Section
        icon={<SafetyOutlined />}
        title="Ministerio de Hacienda (MH)"
        subtitle="Credenciales para enviar y firmar documentos DTE al MH · Cada empresa tiene las suyas propias"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <StatusBadge ok={!!company?.haciendaConfigured} label={company?.haciendaConfigured ? 'Credenciales configuradas' : 'Sin credenciales'} />
          {company?.dteAmbiente && (
            <Tag color={company.dteAmbiente === 'PROD' ? 'red' : 'blue'}>
              {company.dteAmbiente === 'PROD' ? 'Producción' : 'Pruebas (TEST)'}
            </Tag>
          )}
        </div>

        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message={
            <span style={{ fontSize: 12 }}>
              Cada empresa configura sus propias credenciales. Si tienes múltiples empresas en el sistema,
              cada una usa su propio NIT y contraseña del portal del MH.
            </span>
          }
          style={{ marginBottom: 16, borderRadius: 8 }}
        />

        <Form form={haciendaForm} layout="vertical" size="middle">
          <Form.Item
            name="dteAmbiente"
            label="Ambiente DTE"
            initialValue="TEST"
            extra={
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Use <b>Pruebas</b> hasta tener todo configurado correctamente. Cambie a <b>Producción</b>
                solo cuando Hacienda habilite su NIT para facturación en vivo.
              </span>
            }
          >
            <Select style={{ maxWidth: 260 }}>
              <Select.Option value="TEST">
                <Space><Tag color="blue">TEST</Tag>Ambiente de pruebas</Space>
              </Select.Option>
              <Select.Option value="PROD">
                <Space><Tag color="red">PROD</Tag>Producción (facturas reales)</Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              name="haciendaUser"
              label="Usuario Hacienda (NIT)"
              extra={<span style={{ fontSize: 11 }}>Dejar vacío para mantener el actual</span>}
            >
              <Input
                prefix={<LockOutlined style={{ color: 'var(--sidebar-muted)' }} />}
                placeholder={company?.haciendaConfigured ? '••••••• (guardado)' : 'NIT de la empresa'}
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              name="haciendaPassword"
              label="Contraseña Hacienda"
              extra={<span style={{ fontSize: 11 }}>Dejar vacío para mantener la actual</span>}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--sidebar-muted)' }} />}
                placeholder={company?.haciendaConfigured ? '••••••• (guardado)' : 'Contraseña MH'}
                autoComplete="new-password"
                iconRender={v => v ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              />
            </Form.Item>
          </div>

          <Space style={{ marginTop: 4 }}>
            <Button
              type="primary"
              loading={updateMH.isPending}
              onClick={handleSaveMH}
            >
              Guardar credenciales
            </Button>
            <Button
              icon={<SyncOutlined spin={testingMH} />}
              loading={testingMH}
              disabled={!company?.haciendaConfigured && !haciendaForm.getFieldValue('haciendaUser')}
              onClick={handleTestMH}
            >
              Probar conexión
            </Button>
          </Space>
        </Form>
      </Section>

      <Divider style={{ margin: '8px 0 24px' }} />

      {/* ══ 2. Estado DTE por sucursal ══════════════════════════════════════════ */}
      <Section
        icon={<ShopOutlined />}
        title="Estado DTE por sucursal"
        subtitle="Cada sucursal necesita sus propios códigos MH para emitir DTE · Sin ellos usa defaults incorrectos"
      >
        {(() => {
          const branchColumns: ColumnsType<BranchData> = [
            {
              title: 'Sucursal',
              render: (r: BranchData) => (
                <Space>
                  <ShopOutlined style={{ color: 'var(--text-secondary)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{r.name}</div>
                    {r.address && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.address}</div>}
                  </div>
                </Space>
              ),
            },
            {
              title: 'Cód. Establecimiento MH',
              width: 200,
              render: (r: BranchData) => r.codEstableMH
                ? <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.codEstableMH}</Tag>
                : (
                  <Tooltip title="Sin codigo: configure este valor en Sucursales antes de emitir DTE.">
                    <Tag icon={<WarningOutlined />} color="warning" style={{ fontSize: 12 }}>Sin configurar</Tag>
                  </Tooltip>
                ),
            },
            {
              title: 'Cód. Punto de Venta MH',
              width: 200,
              render: (r: BranchData) => r.codPuntoVentaMH
                ? <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.codPuntoVentaMH}</Tag>
                : (
                  <Tooltip title="Sin codigo: configure este valor en Sucursales antes de emitir DTE.">
                    <Tag icon={<WarningOutlined />} color="warning" style={{ fontSize: 12 }}>Sin configurar</Tag>
                  </Tooltip>
                ),
            },
            {
              title: 'Lista para DTE',
              width: 130,
              align: 'center' as const,
              render: (r: BranchData) => {
                const ready = !!r.codEstableMH && !!r.codPuntoVentaMH
                return ready
                  ? <Tag icon={<CheckCircleOutlined />} color="success">Lista</Tag>
                  : <Tag icon={<ExclamationCircleOutlined />} color="warning">Incompleta</Tag>
              },
            },
          ]

          const notReady = (branches as BranchData[]).filter(b => !b.codEstableMH || !b.codPuntoVentaMH)

          return (
            <>
              {notReady.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message={
                    <span style={{ fontSize: 12 }}>
                      <b>{notReady.length} sucursal{notReady.length > 1 ? 'es' : ''}</b> sin códigos MH.
                      {' '}Ve a la pestaña <b>Sucursales</b> y configura{' '}
                      <b>Código Establecimiento MH</b> y <b>Código Punto de Venta MH</b> para cada una.
                      Hacienda te asigna estos códigos al registrarte como emisor DTE.
                    </span>
                  }
                  style={{ marginBottom: 16, borderRadius: 8 }}
                />
              )}

              <Table<BranchData>
                dataSource={branches as BranchData[]}
                columns={branchColumns}
                rowKey="id"
                size="small"
                pagination={false}
                style={{ borderRadius: 8, border: '1px solid var(--sidebar-border)' }}
                rowClassName={(r) => (!r.codEstableMH || !r.codPuntoVentaMH) ? '' : ''}
              />

              <div style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <InfoCircleOutlined style={{ marginRight: 4 }} />
                  Formato esperado: Establecimiento = <code style={{ background: 'var(--sidebar-item-hover-bg)', padding: '1px 5px', borderRadius: 4 }}>M001</code>
                  {' · '}Punto de venta = <code style={{ background: 'var(--sidebar-item-hover-bg)', padding: '1px 5px', borderRadius: 4 }}>P001</code>
                  {' '}(4 caracteres, asignados por Hacienda por sucursal)
                </Text>
              </div>
            </>
          )
        })()}
      </Section>

      <Divider style={{ margin: '8px 0 24px' }} />

      {/* ══ 4. Certificado de Firma Electrónica (BCR) ══════════════════════════ */}
      <Section
        icon={<CloudServerOutlined />}
        title="Firma Electrónica — Certificado BCR"
        subtitle="Archivo .p12 emitido por el Banco Central de Reserva de El Salvador · Requerido para firmar DTE"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <StatusBadge
            ok={!!company?.certConfigured}
            label={company?.certConfigured ? 'Certificado cargado' : 'Sin certificado'}
          />
        </div>

        <Alert
          type="warning"
          showIcon
          message={
            <span style={{ fontSize: 12 }}>
              El archivo <b>.p12</b> contiene su clave privada de firma. Se almacena cifrado con AES-256.
              Nunca se expone en texto plano. Cada empresa sube el suyo propio.
            </span>
          }
          style={{ marginBottom: 16, borderRadius: 8 }}
        />

        <Form form={certForm} layout="vertical" size="middle">
          <Form.Item label="Archivo de certificado (.p12 / .pfx)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".p12,.pfx"
                style={{ display: 'none' }}
                onChange={handleP12Select}
              />
              <Button
                icon={<UploadOutlined />}
                onClick={() => fileInputRef.current?.click()}
              >
                Seleccionar archivo
              </Button>
              {certFileName ? (
                <Tag color="blue" style={{ fontSize: 12 }}>{certFileName}</Tag>
              ) : company?.certConfigured ? (
                <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: 12 }}>
                  Certificado guardado
                </Tag>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>Sin archivo seleccionado</Text>
              )}
            </div>
          </Form.Item>

          <Form.Item
            name="certPassword"
            label="Contraseña del certificado"
            rules={certBase64 ? [{ required: true, message: 'Ingresa la contraseña del .p12' }] : []}
            style={{ maxWidth: 340 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--sidebar-muted)' }} />}
              placeholder={company?.certConfigured ? '••••••• (guardado)' : 'Contraseña del archivo .p12'}
              autoComplete="new-password"
              iconRender={v => v ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            />
          </Form.Item>

          <Button
            type="primary"
            loading={updateCert.isPending}
            disabled={!certBase64}
            onClick={handleSaveCert}
          >
            Guardar certificado
          </Button>
        </Form>
      </Section>

      <Divider style={{ margin: '8px 0 24px' }} />

      {/* ══ 4b. SMTP por empresa ══════════════════════════════════════════════ */}
      <Section
        icon={<MailOutlined />}
        title="Correo SMTP — Envío de DTE"
        subtitle="Configura el servidor de correo para enviar la representación gráfica del DTE al cliente tras su aceptación"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <StatusBadge ok={!!company?.smtpConfigured} label={company?.smtpConfigured ? 'SMTP configurado' : 'Sin SMTP (usa servidor global)'} />
        </div>

        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message={
            <span style={{ fontSize: 12 }}>
              Si no configuras SMTP propio, el sistema usará el servidor global de Polaris Enterprise
              (si está disponible). Se recomienda configurar uno propio para que el correo salga
              desde tu dominio empresarial.
            </span>
          }
          style={{ marginBottom: 16, borderRadius: 8 }}
        />

        <Form form={smtpForm} layout="vertical" size="middle">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
            <Form.Item name="smtpHost" label="Servidor SMTP (Host)">
              <Input placeholder="mail.tudominio.com" autoComplete="off" />
            </Form.Item>
            <Form.Item name="smtpPort" label="Puerto">
              <Input placeholder="587" type="number" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="smtpUser" label="Usuario SMTP">
              <Input placeholder="noreply@tudominio.com" autoComplete="off" />
            </Form.Item>
            <Form.Item name="smtpPassword" label="Contraseña SMTP"
              extra={<span style={{ fontSize: 11 }}>Dejar vacío para mantener la actual</span>}
            >
              <Input.Password
                placeholder={company?.smtpConfigured ? '••••••• (guardado)' : 'Contraseña del servidor'}
                autoComplete="new-password"
                iconRender={v => v ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              />
            </Form.Item>
          </div>

          <Form.Item name="smtpFrom" label='Remitente ("De")'>
            <Input placeholder='"Mi Empresa" <noreply@tudominio.com>' />
          </Form.Item>

          <Form.Item name="smtpSecure" valuePropName="checked" label="Conexión segura (TLS/SSL)">
            <Switch size="small" />
          </Form.Item>

          <Space>
            <Button type="primary" loading={updateSmtp.isPending} onClick={handleSaveSmtp}>
              Guardar configuración SMTP
            </Button>
            {company?.smtpConfigured && (
              <Button
                icon={<SyncOutlined />}
                onClick={async () => {
                  try {
                    await api.post(`/api/companies/${companyId}/test-smtp`)
                    message.success('Conexión SMTP exitosa')
                  } catch (e: any) {
                    message.error(e?.response?.data?.message ?? 'Error al probar SMTP')
                  }
                }}
              >
                Probar conexión
              </Button>
            )}
          </Space>
        </Form>
      </Section>

      <Divider style={{ margin: '8px 0 24px' }} />

      {/* ══ 5. Base de Datos ═══════════════════════════════════════════════════ */}
      <Section
        icon={<DatabaseOutlined />}
        title="Base de Datos"
        subtitle="Estrategia de almacenamiento de datos para este tenant · Cambios requieren contactar soporte"
      >
        {dbInfo ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Tag color={dbInfo.color} style={{ fontSize: 13, padding: '2px 10px' }}>
                {dbInfo.label}
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Tenant: <code style={{ background: 'var(--sidebar-item-hover-bg)', padding: '1px 6px', borderRadius: 4 }}>
                  {tenantInfo?.slug}
                </code>
              </Text>
            </div>

            <Paragraph style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              {dbInfo.description}
            </Paragraph>

            {tenantInfo?.dbStrategy === 'LOCAL_DEDICATED' && (
              <>
                <Alert
                  type="info"
                  showIcon
                  message={
                    <span style={{ fontSize: 12 }}>
                      Para cambiar la URL de conexión PostgreSQL, contacta a soporte de Polaris Enterprise.
                      La URL se almacena cifrada y nunca se expone al frontend.
                    </span>
                  }
                  style={{ marginBottom: 16, borderRadius: 8 }}
                />
                <div style={{
                  background: 'var(--sidebar-item-hover-bg)',
                  border: '1px solid var(--sidebar-border)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}>
                  <Text strong style={{ fontSize: 12, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                    Formato de URL esperado:
                  </Text>
                  <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    postgresql://usuario:contraseña@servidor:5432/nombre_bd
                  </code>
                </div>
              </>
            )}

            {(tenantInfo?.dbStrategy === 'NEON_SHARED' || tenantInfo?.dbStrategy === 'NEON_DEDICATED') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, padding: '10px 14px',
              }}>
                <CheckCircleOutlined style={{ color: '#16a34a' }} />
                <Text style={{ fontSize: 13, color: '#15803d' }}>
                  Base de datos administrada por Polaris Enterprise — sin configuración requerida
                </Text>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Para cambiar la estrategia de base de datos (ej. migrar a base de datos propia),
                contacta a{' '}
                <Text strong style={{ fontSize: 12 }}>soporte@polarisenterprisesv.com</Text>
                {' '}con el ID de tenant: <code style={{ background: 'var(--sidebar-item-hover-bg)', padding: '1px 6px', borderRadius: 4 }}>{tenantInfo?.slug}</code>
              </Text>
            </div>
          </>
        ) : (
          <Text type="secondary" style={{ fontSize: 13 }}>Cargando información de base de datos...</Text>
        )}
      </Section>
    </div>
  )
}

'use client'
import { useState } from 'react'
import {
  Card, Table, Tag, Button, Space, Drawer, Form, Input,
  DatePicker, Select, Typography, App, Popconfirm, Modal, Tooltip,
  Checkbox, Divider,
} from 'antd'
import {
  PlusOutlined, CopyOutlined, StopOutlined,
  CheckCircleOutlined, KeyOutlined, DeleteOutlined,
  AppstoreOutlined, ReloadOutlined, CloudDownloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { api } from '../../../lib/api'
import {
  ADDON_MODULE_IDS,
  BASE_MODULES as BASE_LICENSE_MODULES,
  MODULE_REGISTRY,
  type ModuleId,
} from '@pos-dte/shared-types'

const { Text } = Typography

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  PENDING:   'blue',
  ACTIVE:    'green',
  SUSPENDED: 'red',
  EXPIRED:   'default',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING:   'Pendiente',
  ACTIVE:    'Activa',
  SUSPENDED: 'Suspendida',
  EXPIRED:   'Vencida',
}

const MODULE_GROUPS = [
  {
    label: 'Base (siempre incluidos)',
    modules: [
      { value: 'pos',        label: 'POS — Punto de venta' },
      { value: 'ventas',     label: 'Ventas / DTE' },
      { value: 'clientes',   label: 'Clientes' },
      { value: 'inventario', label: 'Inventario' },
      { value: 'servicios',  label: 'Servicios / Productos' },
      { value: 'dte',        label: 'DTE' },
    ],
    base: true,
  },
  {
    label: 'Compras',
    modules: [
      { value: 'compras',     label: 'Órdenes de compra' },
      { value: 'proveedores', label: 'Proveedores' },
      { value: 'cxp',         label: 'Cuentas por pagar' },
    ],
    base: false,
  },
  {
    label: 'Gastos',
    modules: [
      { value: 'gastos', label: 'Gastos y categorías' },
    ],
    base: false,
  },
  {
    label: 'RRHH',
    modules: [
      { value: 'empleados', label: 'Empleados' },
      { value: 'planilla',  label: 'Planilla / Nómina' },
    ],
    base: false,
  },
  {
    label: 'Finanzas',
    modules: [
      { value: 'cxc',       label: 'Cuentas por cobrar' },
      { value: 'sucursales', label: 'Sucursales adicionales' },
    ],
    base: false,
  },
  {
    label: 'Reportes',
    modules: [
      { value: 'reportes_avanzados', label: 'Reportes avanzados' },
    ],
    base: false,
  },
]

const GROUP_LABEL: Record<string, string> = {
  base:       'Base (siempre incluidos)',
  ventas:     'Ventas',
  inventario: 'Inventario',
  compras:    'Compras',
  finanzas:   'Finanzas',
  rrhh:       'RRHH',
  proyectos:  'Proyectos',
  reportes:   'Reportes',
}

const moduleOption = (id: ModuleId) => ({
  value: id,
  label: MODULE_REGISTRY[id].name,
})

const BASE_MODULES = [...BASE_LICENSE_MODULES]

const REGISTRY_MODULE_GROUPS = [
  {
    label: GROUP_LABEL.base,
    modules: BASE_LICENSE_MODULES.map(moduleOption),
    base: true,
  },
  ...(['ventas', 'inventario', 'compras', 'finanzas', 'rrhh', 'proyectos', 'reportes'] as const)
    .map((category) => ({
      label: GROUP_LABEL[category],
      modules: ADDON_MODULE_IDS
        .filter((id) => MODULE_REGISTRY[id].category === category)
        .map(moduleOption),
      base: false,
    }))
    .filter((group) => group.modules.length > 0),
]

// ─── Tipos ────────────────────────────────────────────────────────────────────

type License = {
  id:             string
  keyPreview:     string
  label:          string | null
  status:         string
  plan:           string
  enabledModules: string[]
  hwid:           string | null
  expiresAt:      string | null
  activatedAt:    string | null
  lastSeenAt:     string | null
  tenant:         { id: string; slug: string; name: string } | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LicensesPage() {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()

  // State drawers / modals
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [modulesOpen, setModulesOpen] = useState(false)
  const [selected,    setSelected]    = useState<License | null>(null)
  const [checkedMods, setCheckedMods] = useState<string[]>(BASE_MODULES)

  const [form] = Form.useForm()

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: licenses = [], isLoading } = useQuery<License[]>({
    queryKey: ['admin', 'licenses'],
    queryFn: () => api.get('/api/control-plane/licenses').then((r) => r.data),
  })

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (dto: any) =>
      api.post('/api/control-plane/licenses', dto).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'licenses'] })
      setDrawerOpen(false)
      form.resetFields()
      modal.info({
        title: '🔑 Licencia creada — guarde la clave ahora',
        width: 520,
        content: (
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Esta clave <strong>no se puede recuperar</strong> después de cerrar este diálogo.
              Cópiela y entréguela al cliente.
            </Text>
            <div style={{
              background: '#f6f6f6', borderRadius: 8, padding: '14px 18px',
              margin: '16px 0', fontFamily: 'monospace', fontSize: 18,
              letterSpacing: 2, textAlign: 'center', fontWeight: 700,
            }}>
              {data.rawKey}
            </div>
            <Button
              icon={<CopyOutlined />}
              block
              onClick={() => {
                navigator.clipboard.writeText(data.rawKey)
                message.success('Clave copiada')
              }}
            >
              Copiar clave
            </Button>
          </div>
        ),
        okText: 'Entendido, ya la guardé',
      })
    },
    onError: () => message.error('Error al crear licencia'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/control-plane/licenses/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'licenses'] })
      message.success('Estado actualizado')
    },
    onError: () => message.error('Error al actualizar estado'),
  })

  const modulesMutation = useMutation({
    mutationFn: ({ id, enabledModules }: { id: string; enabledModules: string[] }) =>
      api.patch(`/api/control-plane/licenses/${id}/modules`, { enabledModules }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'licenses'] })
      setModulesOpen(false)
      setSelected(null)
      message.success('Módulos actualizados — el cliente recibirá el cambio en el próximo arranque')
    },
    onError: () => message.error('Error al actualizar módulos'),
  })

  const hwidMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/control-plane/licenses/${id}/hwid/reset`, {}).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'licenses'] })
      message.success('HWID desvinculado — el cliente puede activar en nueva PC')
    },
    onError: () => message.error('Error al resetear HWID'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/control-plane/licenses/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'licenses'] })
      message.success('Licencia archivada. Puedes reactivarla si fue un error.')
    },
    onError: () => message.error('Error al archivar'),
  })

  const backupMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/control-plane/licenses/${id}/commands/backup`, {
        reason: 'Solicitud manual desde panel',
      }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'licenses'] })
      message.success('Backup solicitado. La PC local lo ejecutara en el proximo sync.')
    },
    onError: () => message.error('Error al solicitar backup'),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function openModules(lic: License) {
    setSelected(lic)
    setCheckedMods(lic.enabledModules ?? BASE_MODULES)
    setModulesOpen(true)
  }

  function toggleModule(mod: string, checked: boolean) {
    setCheckedMods((prev) =>
      checked ? [...prev, mod] : prev.filter((m) => m !== mod),
    )
  }

  // ── Columns ───────────────────────────────────────────────────────────────────

  const columns = [
    {
      title: 'Clave',
      dataIndex: 'keyPreview',
      key: 'keyPreview',
      render: (v: string) => (
        <code style={{ fontSize: 12, fontFamily: 'monospace', letterSpacing: 1 }}>{v}</code>
      ),
    },
    {
      title: 'Etiqueta',
      dataIndex: 'label',
      key: 'label',
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      width: 90,
      render: (v: string) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: 'Módulos',
      dataIndex: 'enabledModules',
      key: 'enabledModules',
      width: 80,
      render: (mods: string[]) => (
        <Tag color="geekblue">{mods?.length ?? 0} mód.</Tag>
      ),
    },
    {
      title: 'PC vinculada',
      dataIndex: 'hwid',
      key: 'hwid',
      width: 110,
      render: (v: string | null) =>
        v
          ? <Tag color="green">Vinculada</Tag>
          : <Tag color="default">Sin vincular</Tag>,
    },
    {
      title: 'Vence',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 110,
      render: (v: string | null) =>
        v ? dayjs(v).format('DD/MM/YYYY') : <Text type="secondary">Sin límite</Text>,
    },
    {
      title: 'Última conexión',
      dataIndex: 'lastSeenAt',
      key: 'lastSeenAt',
      width: 130,
      render: (v: string | null) =>
        v ? dayjs(v).format('DD/MM/YY HH:mm') : <Text type="secondary">Nunca</Text>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 140,
      render: (_: any, r: License) => (
        <Space size={2}>
          {/* Activar / Suspender */}
          {r.status === 'SUSPENDED' ? (
            <Tooltip title="Activar">
              <Button
                size="small" type="text"
                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                onClick={() => statusMutation.mutate({ id: r.id, status: 'ACTIVE' })}
              />
            </Tooltip>
          ) : r.status === 'ACTIVE' || r.status === 'PENDING' ? (
            <Tooltip title="Suspender">
              <Button
                size="small" type="text"
                icon={<StopOutlined style={{ color: '#ff4d4f' }} />}
                onClick={() => statusMutation.mutate({ id: r.id, status: 'SUSPENDED' })}
              />
            </Tooltip>
          ) : null}

          {/* Configurar módulos */}
          <Tooltip title="Configurar módulos">
            <Button
              size="small" type="text"
              icon={<AppstoreOutlined style={{ color: '#722ed1' }} />}
              onClick={() => openModules(r)}
            />
          </Tooltip>

          {/* Reset HWID */}
          {r.hwid && (
            <Popconfirm
              title="¿Desvincular PC?"
              description="El cliente podrá activar la licencia en una nueva máquina."
              okText="Desvincular" cancelText="Cancelar"
              onConfirm={() => hwidMutation.mutate(r.id)}
            >
              <Tooltip title="Desvincular PC">
                <Button
                  size="small" type="text"
                  icon={<ReloadOutlined style={{ color: '#fa8c16' }} />}
                />
              </Tooltip>
            </Popconfirm>
          )}

          {r.hwid && (
            <Popconfirm
              title="Solicitar backup local"
              description="La orden se enviara a la instalacion local en su proximo sync o arranque."
              okText="Solicitar" cancelText="Cancelar"
              onConfirm={() => backupMutation.mutate(r.id)}
            >
              <Tooltip title="Solicitar backup">
                <Button
                  size="small" type="text"
                  icon={<CloudDownloadOutlined style={{ color: '#1677ff' }} />}
                />
              </Tooltip>
            </Popconfirm>
          )}

          {/* Archivar: baja reversible, no borra el registro */}
          <Popconfirm
            title="¿Archivar esta licencia?"
            description="No se borrará: quedará suspendida y podrás reactivarla si fue un error."
            okText="Archivar" cancelText="Cancelar" okButtonProps={{ danger: true }}
            onConfirm={() => deleteMutation.mutate(r.id)}
          >
            <Tooltip title="Archivar licencia">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <App>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              <KeyOutlined style={{ marginRight: 8, color: '#722ed1' }} />
              Licencias
            </Typography.Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Genera y gestiona licencias para instalaciones locales de Polaris
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
            onClick={() => setDrawerOpen(true)}
          >
            Nueva licencia
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <Card size="small" style={{ borderRadius: 10 }}>
        <Table
          size="small"
          rowKey="id"
          loading={isLoading}
          dataSource={licenses}
          columns={columns}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{ emptyText: 'No hay licencias. Crea la primera.' }}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* ── Drawer: crear licencia ─────────────────────────────────────────── */}
      <Drawer
        title="Nueva licencia"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.resetFields() }}
        width={440}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button style={{ marginRight: 8 }} onClick={() => { setDrawerOpen(false); form.resetFields() }}>
              Cancelar
            </Button>
            <Button
              type="primary"
              loading={createMutation.isPending}
              style={{ background: '#722ed1', borderColor: '#722ed1' }}
              onClick={() => form.validateFields().then((vals) => {
                createMutation.mutate({
                  label:     vals.label || undefined,
                  plan:      vals.plan,
                  expiresAt: vals.expiresAt ? vals.expiresAt.toISOString() : null,
                  notes:     vals.notes || undefined,
                })
              })}
            >
              Generar licencia
            </Button>
          </div>
        }
      >
        <div style={{
          background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8,
          padding: '10px 14px', marginBottom: 20, fontSize: 13,
        }}>
          ⚠️ La clave completa se mostrará <strong>una sola vez</strong> al crear.
          Guárdela y entréguela al cliente — no se puede recuperar después.
        </div>

        <Form form={form} layout="vertical">
          <Form.Item label="Etiqueta (opcional)" name="label">
            <Input placeholder="Ej: Ferretería García — San Salvador" maxLength={120} />
          </Form.Item>
          <Form.Item label="Plan" name="plan" initialValue="LOCAL">
            <Select options={[
              { value: 'LOCAL',      label: 'LOCAL — Instalación de escritorio' },
              { value: 'CLOUD',      label: 'CLOUD — Versión web' },
              { value: 'ENTERPRISE', label: 'ENTERPRISE' },
            ]} />
          </Form.Item>
          <Form.Item label="Fecha de vencimiento (opcional)" name="expiresAt">
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Sin vencimiento"
              disabledDate={(d) => d && d < dayjs().startOf('day')}
            />
          </Form.Item>
          <Form.Item label="Notas internas (opcional)" name="notes">
            <Input.TextArea rows={3} maxLength={500} placeholder="Notas para uso interno..." />
          </Form.Item>
        </Form>
      </Drawer>

      {/* ── Modal: configurar módulos ──────────────────────────────────────── */}
      <Modal
        title={
          <div>
            <AppstoreOutlined style={{ color: '#722ed1', marginRight: 8 }} />
            Módulos habilitados
            {selected && (
              <code style={{ marginLeft: 10, fontSize: 12, color: '#9b9b99' }}>
                {selected.keyPreview}
              </code>
            )}
          </div>
        }
        open={modulesOpen}
        onCancel={() => { setModulesOpen(false); setSelected(null) }}
        width={520}
        footer={[
          <Button key="cancel" onClick={() => { setModulesOpen(false); setSelected(null) }}>
            Cancelar
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={modulesMutation.isPending}
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
            onClick={() => {
              if (!selected) return
              // Siempre incluir módulos base
              const final = [...new Set([...BASE_MODULES, ...checkedMods])]
              modulesMutation.mutate({ id: selected.id, enabledModules: final })
            }}
          >
            Guardar módulos
          </Button>,
        ]}
      >
        <div style={{ fontSize: 13, color: '#787774', marginBottom: 16 }}>
          Los módulos base siempre están incluidos. Habilita los módulos premium según el plan del cliente.
          El cliente recibirá el cambio en el próximo arranque de la aplicación.
        </div>

        {REGISTRY_MODULE_GROUPS.map((group) => (
          <div key={group.label}>
            <Divider orientation="left" style={{ fontSize: 12, color: '#9b9b99', margin: '12px 0 8px' }}>
              {group.label}
            </Divider>
            <div style={{ paddingLeft: 8 }}>
              {group.modules.map((mod) => (
                <div key={mod.value} style={{ marginBottom: 6 }}>
                  <Checkbox
                    checked={checkedMods.includes(mod.value)}
                    disabled={group.base}
                    onChange={(e) => toggleModule(mod.value, e.target.checked)}
                  >
                    <span style={{ fontSize: 13 }}>{mod.label}</span>
                    {group.base && (
                      <Tag style={{ marginLeft: 8, fontSize: 11 }} color="blue">incluido</Tag>
                    )}
                  </Checkbox>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Modal>
    </App>
  )
}

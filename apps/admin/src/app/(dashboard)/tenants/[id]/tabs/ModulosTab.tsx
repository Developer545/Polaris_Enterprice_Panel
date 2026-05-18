'use client'
import { Switch, Card, Typography, Row, Col, Button, App } from 'antd'
import {
  ShoppingCartOutlined, FileTextOutlined, InboxOutlined,
  ShoppingOutlined, DollarOutlined, BarChartOutlined, SaveOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../../lib/api'

const MODULE_DEFS = [
  {
    key: 'pos',
    label: 'Punto de Venta (POS)',
    description: 'Ventas en caja, cobros y tickets',
    icon: <ShoppingCartOutlined style={{ fontSize: 20 }} />,
    color: '#1677ff',
    required: true,
  },
  {
    key: 'dte',
    label: 'Facturación Electrónica DTE',
    description: 'CF, CCF, NC, ND — Ministerio de Hacienda',
    icon: <FileTextOutlined style={{ fontSize: 20 }} />,
    color: '#52c41a',
  },
  {
    key: 'inventario',
    label: 'Inventario / Kardex',
    description: 'Control de existencias y movimientos',
    icon: <InboxOutlined style={{ fontSize: 20 }} />,
    color: '#fa8c16',
  },
  {
    key: 'compras',
    label: 'Compras',
    description: 'Órdenes de compra y proveedores',
    icon: <ShoppingOutlined style={{ fontSize: 20 }} />,
    color: '#9254de',
  },
  {
    key: 'gastos',
    label: 'Gastos',
    description: 'Registro y categorización de gastos',
    icon: <DollarOutlined style={{ fontSize: 20 }} />,
    color: '#ff4d4f',
  },
  {
    key: 'reportes',
    label: 'Reportes',
    description: 'Dashboard, KPIs y exportaciones',
    icon: <BarChartOutlined style={{ fontSize: 20 }} />,
    color: '#13c2c2',
  },
]

interface Props {
  tenantId: string
  modules: Record<string, boolean>
}

export default function ModulosTab({ tenantId, modules: initialModules }: Props) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [modules, setModules] = useState<Record<string, boolean>>(initialModules)

  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/control-plane/tenants/${tenantId}/modules`, { modules }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId] })
      message.success('Módulos actualizados')
    },
    onError: () => message.error('Error al guardar módulos'),
  })

  const toggle = (key: string, value: boolean) => {
    setModules((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Typography.Text strong style={{ fontSize: 15 }}>Módulos habilitados</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Controla qué funcionalidades tiene disponible este cliente
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Guardar cambios
        </Button>
      </div>

      <Row gutter={[12, 12]}>
        {MODULE_DEFS.map((mod) => {
          const enabled = modules[mod.key] ?? false
          return (
            <Col key={mod.key} xs={24} sm={12} lg={8}>
              <Card
                size="small"
                style={{
                  borderRadius: 10,
                  border: enabled ? `1.5px solid ${mod.color}` : '1.5px solid #e8e8e8',
                  background: enabled ? `${mod.color}08` : '#fafafa',
                  transition: 'all 0.2s',
                }}
                styles={{ body: { padding: '14px 16px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: enabled ? `${mod.color}20` : '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: enabled ? mod.color : '#bbb',
                      flexShrink: 0,
                    }}>
                      {mod.icon}
                    </div>
                    <div>
                      <Typography.Text strong style={{ fontSize: 13, display: 'block' }}>
                        {mod.label}
                        {mod.required && (
                          <Typography.Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                            (requerido)
                          </Typography.Text>
                        )}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {mod.description}
                      </Typography.Text>
                    </div>
                  </div>
                  <Switch
                    size="small"
                    checked={enabled}
                    disabled={mod.required}
                    onChange={(v) => toggle(mod.key, v)}
                    style={{ flexShrink: 0, marginLeft: 8 }}
                  />
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

'use client'
import { Checkbox, Card, Typography, Button, App, Tag } from 'antd'
import { SaveOutlined, WarningOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../../../lib/api'

const DTE_TYPES = [
  {
    code: '01',
    name: 'Factura de Consumidor Final (CF)',
    description: 'Ventas a consumidores finales — no recuperan IVA',
    color: '#1677ff',
    required: true,
  },
  {
    code: '03',
    name: 'Comprobante de Crédito Fiscal (CCF)',
    description: 'Ventas a contribuyentes — recuperan crédito fiscal',
    color: '#52c41a',
  },
  {
    code: '05',
    name: 'Nota de Crédito',
    description: 'Corrección o devolución que disminuye el valor',
    color: '#fa8c16',
    dependsOn: '03',
  },
  {
    code: '06',
    name: 'Nota de Débito',
    description: 'Corrección que aumenta el valor de un CCF',
    color: '#9254de',
    dependsOn: '03',
  },
  {
    code: '11',
    name: 'Factura de Exportación (FEX)',
    description: 'Ventas al exterior / exportaciones',
    color: '#13c2c2',
  },
  {
    code: '16',
    name: 'Venta Simplificada (VS) — provisional',
    description: 'Ventas anónimas sin datos del receptor · Código provisional pendiente de CAT-003 oficial MH',
    color: '#8c8c8c',
    provisional: true,
  },
]

interface Props {
  tenantId: string
  dteAllowedTypes: string[]
}

export default function DocumentosFiscalesTab({ tenantId, dteAllowedTypes: initial }: Props) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string[]>(initial)

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/api/control-plane/tenants/${tenantId}/dte-types`, { dteAllowedTypes: selected }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId] })
      message.success('Tipos de DTE actualizados')
    },
    onError: () => message.error('Error al guardar tipos DTE'),
  })

  const toggle = (code: string, checked: boolean) => {
    setSelected((prev) => {
      let next = checked ? [...prev, code] : prev.filter((c) => c !== code)
      // Auto-disable NC/ND if CCF is removed
      if (!checked && code === '03') next = next.filter((c) => c !== '05' && c !== '06')
      return next
    })
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Typography.Text strong style={{ fontSize: 15 }}>Tipos de documento fiscal permitidos</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            El cliente solo podrá emitir los tipos marcados desde su configuración
          </Typography.Text>
        </div>
        <Button type="primary" icon={<SaveOutlined />} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          Guardar cambios
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DTE_TYPES.map((dt) => {
          const enabled = selected.includes(dt.code)
          const parentDisabled = dt.dependsOn ? !selected.includes(dt.dependsOn) : false

          return (
            <Card
              key={dt.code}
              size="small"
              style={{
                borderRadius: 10,
                border: enabled && !parentDisabled ? `1.5px solid ${dt.color}` : '1.5px solid #e8e8e8',
                background: enabled && !parentDisabled ? `${dt.color}08` : '#fafafa',
                opacity: parentDisabled ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Checkbox
                  checked={enabled}
                  disabled={dt.required || parentDisabled}
                  onChange={(e) => toggle(dt.code, e.target.checked)}
                />
                <Tag
                  color={dt.color}
                  style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, minWidth: 30, textAlign: 'center' }}
                >
                  {dt.code}
                </Tag>
                <div style={{ flex: 1 }}>
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {dt.name}
                    {dt.required && (
                      <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 6, fontWeight: 400 }}>
                        (siempre activo)
                      </Typography.Text>
                    )}
                    {(dt as any).provisional && (
                      <Tag color="orange" style={{ fontSize: 10, marginLeft: 6 }}>PROVISIONAL</Tag>
                    )}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {dt.description}
                    {dt.dependsOn && (
                      <span style={{ color: '#fa8c16', marginLeft: 6 }}>
                        <WarningOutlined /> Requiere CCF (03)
                      </span>
                    )}
                  </Typography.Text>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

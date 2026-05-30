'use client'
import { useEffect, useMemo, useState } from 'react'
import { Button, Tag, App, Modal, Form, Select, Input } from 'antd'
import { WarningOutlined, SendOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

type StatusBranch = {
  branchId: string
  branchName: string
  pendientes: number
  masAntiguo: string
  fechaLimiteEvento: string
  fechaLimiteLote: string
  eventoVencido: boolean
  loteVencido: boolean
}

type StatusResp = {
  now: string
  totalPendientes: number
  sucursales: StatusBranch[]
}

const POLL_MS = 5 * 60_000

const TIPO_CONTINGENCIA_OPTIONS = [
  { value: 1, label: '1 — No disponibilidad del sistema MH' },
  { value: 2, label: '2 — No disponibilidad del sistema del emisor' },
  { value: 3, label: '3 — Falla de internet del emisor' },
  { value: 4, label: '4 — Falla de energía eléctrica del emisor' },
  { value: 5, label: '5 — Otro' },
]

function countdown(toIso: string): string {
  const diff = new Date(toIso).getTime() - Date.now()
  if (diff <= 0) return 'vencido'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

export default function ContingencyBanner() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [, setTick] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const { data } = useQuery<StatusResp>({
    queryKey: ['dte-contingencia-status'],
    queryFn: () => api.get('/api/dte/contingencia/status').then(r => r.data),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  })

  // refrescar countdown cada minuto
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const transmit = useMutation({
    mutationFn: (values: any) => api.post('/api/dte/contingencia', values).then(r => r.data),
    onSuccess: (res: { eventoTransmitido: boolean; reemitidos: number }[]) => {
      const eventos = res.filter(r => r.eventoTransmitido).length
      const reemitidos = res.reduce((a, r) => a + (r.reemitidos ?? 0), 0)
      if (eventos > 0) message.success(`Contingencia transmitida — ${reemitidos} documento(s) reemitido(s)`)
      else message.warning('No se pudo transmitir la contingencia. El MH podría seguir caído.')
      qc.invalidateQueries({ queryKey: ['dte-contingencia-status'] })
      setModalOpen(false)
      form.resetFields()
    },
    onError: () => message.error('Error al transmitir contingencia'),
  })

  const soonest = useMemo(() => {
    if (!data?.sucursales?.length) return null
    return data.sucursales.reduce((min, s) =>
      new Date(s.fechaLimiteEvento) < new Date(min.fechaLimiteEvento) ? s : min,
    )
  }, [data])

  if (!data || data.totalPendientes === 0 || !soonest) return null

  const vencido = soonest.eventoVencido

  function openModal() {
    form.setFieldsValue({ tipoContingencia: 1, motivoContingencia: 'No disponibilidad del sistema del Ministerio de Hacienda' })
    setModalOpen(true)
  }

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9997,
        background: vencido ? '#5c1a1a' : '#5c3a00',
        borderBottom: `1px solid ${vencido ? '#8b2c2c' : '#8b6b00'}`,
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}>
        <WarningOutlined style={{ color: vencido ? '#ff7875' : '#ffd666', fontSize: 18, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, color: '#fff', fontSize: 13 }}>
          <strong>{data.totalPendientes}</strong> documento(s) DTE en contingencia.{' '}
          {vencido
            ? <Tag color="error">Plazo de evento (24h) vencido</Tag>
            : <span>Transmitir evento de contingencia antes de <Tag color="warning">{countdown(soonest.fechaLimiteEvento)}</Tag></span>}
          {data.sucursales.length > 1 && (
            <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>
              ({data.sucursales.length} sucursal{data.sucursales.length > 1 ? 'es' : ''})
            </span>
          )}
        </div>
        <Button
          size="small"
          type="primary"
          icon={<SendOutlined />}
          loading={transmit.isPending}
          onClick={openModal}
          style={{ flexShrink: 0 }}
        >
          Transmitir ahora
        </Button>
      </div>

      <Modal
        open={modalOpen}
        title={<span style={{ color: '#faad14' }}><WarningOutlined /> Transmitir Evento de Contingencia</span>}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        confirmLoading={transmit.isPending}
        okText="Transmitir evento"
        okButtonProps={{ style: { borderRadius: 8, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={520}
        destroyOnClose
        style={{ top: 80 }}
      >
        <div style={{ marginBottom: 14, fontSize: 13, color: '#666' }}>
          Se transmitirá el evento de contingencia para{' '}
          <strong>{data.totalPendientes} documento(s)</strong>{' '}
          en {data.sucursales.length} sucursal(es).
          Tras la transmisión, los DTEs serán re-emitidos con <code>tipoModelo=2</code>.
        </div>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => transmit.mutate(values)}
        >
          <Form.Item
            name="tipoContingencia"
            label="Tipo de contingencia (CAT-005)"
            rules={[{ required: true, message: 'Seleccione el tipo' }]}
          >
            <Select options={TIPO_CONTINGENCIA_OPTIONS} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item
            name="motivoContingencia"
            label="Descripción del motivo"
            rules={[{ required: true, min: 5, message: 'Describa el motivo' }]}
          >
            <Input.TextArea rows={3} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item
            name="nombreResponsable"
            label="Nombre del responsable"
          >
            <Input placeholder="(opcional — usa nombre de empresa si se omite)" style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

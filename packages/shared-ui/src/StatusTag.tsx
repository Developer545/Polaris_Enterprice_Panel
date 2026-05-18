'use client'
import { Tag } from 'antd'
import type { DteEstado } from '@pos-dte/shared-types'

const DTE_STATUS_CONFIG: Record<DteEstado, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: 'Borrador' },
  GENERATED: { color: 'blue', label: 'Generado' },
  SCHEMA_VALIDATED: { color: 'cyan', label: 'Validado' },
  SIGNED: { color: 'geekblue', label: 'Firmado' },
  SENDING: { color: 'processing', label: 'Enviando' },
  PROCESSED: { color: 'green', label: 'Procesado' },
  PROCESSED_WITH_OBSERVATIONS: { color: 'gold', label: 'Con observaciones' },
  REJECTED: { color: 'red', label: 'Rechazado' },
  CONNECTION_ERROR: { color: 'orange', label: 'Error conexión' },
  CONTINGENCY: { color: 'volcano', label: 'Contingencia' },
  ANNULLED: { color: 'magenta', label: 'Anulado' },
}

interface DteStatusTagProps {
  status: DteEstado
}

export function DteStatusTag({ status }: DteStatusTagProps) {
  const config = DTE_STATUS_CONFIG[status] ?? { color: 'default', label: status }
  return <Tag color={config.color}>{config.label}</Tag>
}

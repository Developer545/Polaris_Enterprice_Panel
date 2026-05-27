'use client'

import { Button, Card, Typography, App, Alert } from 'antd'
import { CloudDownloadOutlined, SafetyOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../../../lib/api'

const { Text } = Typography

export default function RespaldosTab() {
  const { message } = App.useApp()

  const backupMutation = useMutation({
    mutationFn: () =>
      api.post('/api/local-backups', { reason: 'Backup manual desde la app local' })
        .then((r) => r.data),
    onSuccess: (data) => {
      message.success('Backup creado correctamente')
      if (data?.backupDir) {
        message.info(`Ubicacion: ${data.backupDir}`)
      }
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? 'No se pudo crear el backup')
    },
  })

  return (
    <div style={{ padding: '24px 28px', maxWidth: 760 }}>
      <Card
        size="small"
        style={{ borderRadius: 10 }}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyOutlined />
            Respaldos locales
          </span>
        }
        extra={
          <Button
            type="primary"
            icon={<CloudDownloadOutlined />}
            loading={backupMutation.isPending}
            onClick={() => backupMutation.mutate()}
          >
            Crear backup
          </Button>
        }
      >
        <Text type="secondary">
          El respaldo se genera en la computadora local usando PostgreSQL. Guarda las bases del sistema
          y un manifest con hash SHA-256 para verificar integridad.
        </Text>
        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message="Recomendacion"
          description="Mantener al menos una copia fuera de la computadora, por ejemplo USB o nube privada del cliente."
        />
      </Card>
    </div>
  )
}

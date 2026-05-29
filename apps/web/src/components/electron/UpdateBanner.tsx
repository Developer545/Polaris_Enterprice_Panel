'use client'
import { useEffect, useState } from 'react'
import { Progress, Button } from 'antd'
import { CloudDownloadOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons'
import { isElectron } from '@/lib/is-electron'

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'available'; version: string }
  | { phase: 'downloading'; percent: number; transferred: number; total: number }
  | { phase: 'ready'; version: string }

export default function UpdateBanner() {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isElectron) return

    window.electron!.app.onUpdateAvailable(({ version }) => {
      setState({ phase: 'available', version })
      setDismissed(false)
    })

    window.electron!.app.onUpdateProgress(({ percent, transferred, total }) => {
      setState({ phase: 'downloading', percent, transferred, total })
      setDismissed(false)
    })

    window.electron!.app.onUpdateDownloaded(({ version }) => {
      setState({ phase: 'ready', version })
      setDismissed(false)
    })
  }, [])

  if (!isElectron || state.phase === 'idle' || dismissed) return null

  const startDownload = () => {
    setState({ phase: 'downloading', percent: 0, transferred: 0, total: 0 })
    window.electron!.app.downloadUpdate()
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9998,
      background: '#1a1a2e',
      borderTop: '1px solid #2e2e4a',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 -2px 12px rgba(0,0,0,0.2)',
    }}>
      {/* Icon */}
      <span style={{ fontSize: 18, flexShrink: 0 }}>
        {state.phase === 'available'    && <CloudDownloadOutlined style={{ color: '#4dabf7' }} />}
        {state.phase === 'downloading'  && <SyncOutlined spin style={{ color: '#74c0fc' }} />}
        {state.phase === 'ready'        && <CheckCircleOutlined style={{ color: '#69db7c' }} />}
      </span>

      {/* Text + progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {state.phase === 'available' && (
          <span style={{ color: '#c9d1d9', fontSize: 13 }}>
            Actualización <strong style={{ color: '#fff' }}>v{state.version}</strong> disponible — presiona <strong style={{ color: '#fff' }}>Actualizar</strong> para descargarla.
          </span>
        )}

        {state.phase === 'downloading' && (
          <div>
            <div style={{ color: '#c9d1d9', fontSize: 12, marginBottom: 4 }}>
              Descargando actualización... {formatBytes(state.transferred)} / {formatBytes(state.total)}
            </div>
            <Progress
              percent={Math.round(state.percent)}
              size="small"
              strokeColor={{ from: '#4dabf7', to: '#69db7c' }}
              trailColor='#2e2e4a'
              showInfo={false}
              style={{ marginBottom: 0 }}
            />
          </div>
        )}

        {state.phase === 'ready' && (
          <span style={{ color: '#c9d1d9', fontSize: 13 }}>
            Versión <strong style={{ color: '#69db7c' }}>v{state.version}</strong> lista — reinicia para aplicar la actualización.
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {state.phase === 'available' && (
          <Button
            size="small"
            type="primary"
            icon={<CloudDownloadOutlined />}
            onClick={startDownload}
          >
            Actualizar
          </Button>
        )}
        {state.phase === 'ready' && (
          <Button
            size="small"
            type="primary"
            style={{ background: '#69db7c', borderColor: '#69db7c', color: '#1a1a2e', fontWeight: 600 }}
            onClick={() => window.electron!.app.installUpdate()}
          >
            Reiniciar ahora
          </Button>
        )}
        {state.phase !== 'downloading' && (
          <Button
            size="small"
            type="text"
            style={{ color: '#6e7681' }}
            onClick={() => setDismissed(true)}
          >
            Descartar
          </Button>
        )}
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

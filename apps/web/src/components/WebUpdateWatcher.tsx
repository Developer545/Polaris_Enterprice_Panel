'use client'
import { useEffect, useRef } from 'react'
import { notification, Button } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { isElectron } from '@/lib/is-electron'

const LOADED_SHA = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'dev'
const POLL_MS = 5 * 60_000

// Web-only: detects a new deploy by comparing the running bundle's commit SHA
// against the live runtime SHA. Electron uses its own updater (UpdateBanner).
export default function WebUpdateWatcher() {
  const notifiedRef = useRef(false)

  useEffect(() => {
    if (isElectron || LOADED_SHA === 'dev') return

    let cancelled = false

    const check = async () => {
      if (notifiedRef.current) return
      try {
        const res = await fetch('/version', { cache: 'no-store' })
        if (!res.ok) return
        const { sha } = await res.json()
        if (cancelled || !sha || sha === 'dev' || sha === LOADED_SHA) return

        notifiedRef.current = true
        notification.info({
          message: 'Nueva versión disponible',
          description: 'Recarga la página para aplicar la última actualización.',
          duration: 0,
          key: 'web-update',
          btn: (
            <Button type="primary" size="small" icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
              Recargar
            </Button>
          ),
        })
      } catch {
        /* sin conexión — reintenta luego */
      }
    }

    const onFocus = () => check()
    const interval = setInterval(check, POLL_MS)
    window.addEventListener('focus', onFocus)
    check()

    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return null
}

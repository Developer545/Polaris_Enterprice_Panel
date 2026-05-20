'use client'
import { useEffect, useState } from 'react'
import { isElectron } from '@/lib/is-electron'

const H = 36 // titlebar height in px

const btn = (hover: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 46,
  height: H,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 12,
  color: '#9b9b99',
  WebkitAppRegion: 'no-drag',
  transition: 'background 0.15s, color 0.15s',
  flexShrink: 0,
})

export const TITLEBAR_HEIGHT = H

interface TitleBarProps {
  sidebarWidth: number
}

export default function TitleBar({ sidebarWidth }: TitleBarProps) {
  const [maximized, setMaximized] = useState(false)
  const [hovered, setHovered] = useState<'min' | 'max' | 'close' | null>(null)

  useEffect(() => {
    if (!isElectron) return
    window.electron!.window.isMaximized().then(setMaximized)
    window.electron!.window.onStateChange(({ maximized }) => setMaximized(maximized))
  }, [])

  if (!isElectron) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: H,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fbfbfa',
        borderBottom: '1px solid #e9e9e7',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
      }}
    >
      {/* Left spacer — tracks sidebar width (expanded 240 / collapsed 64) */}
      <div style={{ width: sidebarWidth, flexShrink: 0, transition: 'width 0.2s' }} />

      {/* App name — center drag area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: '#c7c7c5',
        letterSpacing: '0.04em',
        fontWeight: 500,
      }}>
        POS DTE El Salvador
      </div>

      {/* Window controls */}
      <div style={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
        {/* Minimize */}
        <button
          style={{
            ...btn('min'),
            background: hovered === 'min' ? '#ebebea' : 'transparent',
            color: hovered === 'min' ? '#37352f' : '#9b9b99',
          }}
          onMouseEnter={() => setHovered('min')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => window.electron!.window.minimize()}
          title="Minimizar"
        >
          ─
        </button>

        {/* Maximize / Restore */}
        <button
          style={{
            ...btn('max'),
            background: hovered === 'max' ? '#ebebea' : 'transparent',
            color: hovered === 'max' ? '#37352f' : '#9b9b99',
          }}
          onMouseEnter={() => setHovered('max')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => window.electron!.window.maximizeToggle()}
          title={maximized ? 'Restaurar' : 'Maximizar'}
        >
          {maximized ? '❐' : '□'}
        </button>

        {/* Close */}
        <button
          style={{
            ...btn('close'),
            background: hovered === 'close' ? '#e81123' : 'transparent',
            color: hovered === 'close' ? '#fff' : '#9b9b99',
          }}
          onMouseEnter={() => setHovered('close')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => window.electron!.window.quit()}
          title="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

'use client'
import '@ant-design/v5-patch-for-react-19'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp, theme as antTheme } from 'antd'
import { StyleProvider, createCache, extractStyle } from '@ant-design/cssinjs'
import { useServerInsertedHTML } from 'next/navigation'
import esES from 'antd/locale/es_ES'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { isElectron } from '../lib/is-electron'

const baseTokens = {
  colorPrimary:         '#2383e2',
  colorLink:            '#2383e2',
  borderRadius:         6,
  borderRadiusLG:       8,
  fontFamily:           "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize:             14,
  controlHeight:        34,
}

const lightTheme = {
  algorithm: antTheme.defaultAlgorithm,
  token: {
    ...baseTokens,
    colorBgLayout:        '#f7f6f3',
    colorBgContainer:     '#ffffff',
    colorText:            '#37352f',
    colorTextSecondary:   '#787774',
    colorBorder:          '#e9e9e7',
    colorBorderSecondary: '#edece9',
    colorFillAlter:       '#f1f1ef',
  },
  components: {
    Table: { headerBg: '#f7f6f3', rowHoverBg: '#f1f1ef' },
    Card:  { colorBorderSecondary: '#e9e9e7' },
    Button: { borderRadius: 6 },
    Input:  { borderRadius: 6 },
  },
}

const darkTheme = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    ...baseTokens,
    colorBgLayout:        '#1a1a1a',
    colorBgContainer:     '#252525',
    colorText:            '#e8e8e7',
    colorTextSecondary:   '#9b9b99',
    colorBorder:          '#333333',
    colorBorderSecondary: '#2e2e2e',
    colorFillAlter:       '#2a2a2a',
  },
  components: {
    Table: { headerBg: '#2a2a2a', rowHoverBg: '#2e2e2e' },
    Card:  { colorBorderSecondary: '#333333' },
    Button: { borderRadius: 6 },
    Input:  { borderRadius: 6 },
  },
}

/** Read initial OS dark preference injected synchronously by Electron preload.
 *  Falls back to CSS media query on web. */
function getInitialDark(): boolean {
  if (typeof window === 'undefined') return false
  if ((window as any).__PREFERS_DARK__ !== undefined) return !!(window as any).__PREFERS_DARK__
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

// SSR style extractor — eliminates FOUC by injecting Ant Design styles into the HTML
// before client hydration. Works without @ant-design/nextjs-registry.
function AntdStyleInjector({ children }: { children: ReactNode }) {
  const cache = useRef(createCache())
  const inserted = useRef(false)

  useServerInsertedHTML(() => {
    if (inserted.current) return null
    inserted.current = true
    const styleText = extractStyle(cache.current, true)
    // eslint-disable-next-line react/no-danger
    return <style data-antd-ssr="true" dangerouslySetInnerHTML={{ __html: styleText }} />
  })

  return (
    <StyleProvider cache={cache.current} hashPriority="high">
      {children}
    </StyleProvider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
          mutations: { retry: 0 },
        },
      }),
  )

  const [dark, setDark] = useState(getInitialDark)

  useEffect(() => {
    // Electron: subscribe to nativeTheme changes pushed from main process
    if (isElectron) {
      window.electron.theme.onThemeChange(setDark)
      return
    }
    // Web: subscribe to OS media query
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const activeTheme = dark ? darkTheme : lightTheme

  return (
    <AntdStyleInjector>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={activeTheme} locale={esES} warning={{ strict: false }}>
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </AntdStyleInjector>
  )
}

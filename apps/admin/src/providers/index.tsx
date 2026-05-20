'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import { StyleProvider, createCache, extractStyle } from '@ant-design/cssinjs'
import { useServerInsertedHTML } from 'next/navigation'
import esES from 'antd/locale/es_ES'
import { useState, useRef, type ReactNode } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

// Notion-style theme — purple primary for admin identity
const theme = {
  token: {
    colorPrimary:         '#722ed1',
    colorLink:            '#722ed1',
    colorBgLayout:        '#f7f6f3',
    colorBgContainer:     '#ffffff',
    colorText:            '#37352f',
    colorTextSecondary:   '#787774',
    colorBorder:          '#e9e9e7',
    colorBorderSecondary: '#edece9',
    colorFillAlter:       '#f1f1ef',
    borderRadius:         6,
    borderRadiusLG:       8,
    fontFamily:           "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize:             14,
    controlHeight:        34,
  },
  components: {
    Table: {
      headerBg:   '#f7f6f3',
      rowHoverBg: '#f1f1ef',
    },
    Card: {
      colorBorderSecondary: '#e9e9e7',
    },
    Button: { borderRadius: 6 },
    Input:  { borderRadius: 6 },
  },
}

// Eliminates FOUC — same pattern as POS web
function AntdStyleInjector({ children }: { children: ReactNode }) {
  const cache   = useRef(createCache())
  const inserted = useRef(false)

  useServerInsertedHTML(() => {
    if (inserted.current) return null
    inserted.current = true
    const styleText = extractStyle(cache.current, true)
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
    () => new QueryClient({
      defaultOptions: {
        queries:   {
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

  return (
    <AntdStyleInjector>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={theme} locale={esES}>
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </AntdStyleInjector>
  )
}

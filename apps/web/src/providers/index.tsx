'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import esES from 'antd/locale/es_ES'
import { useState, type ReactNode } from 'react'

const theme = {
  token: {
    // Notion palette
    colorPrimary:          '#2383e2', // Notion blue (links, buttons, active)
    colorLink:             '#2383e2',
    colorBgLayout:         '#f7f6f3', // Notion off-white page background
    colorBgContainer:      '#ffffff',
    colorText:             '#37352f', // Notion primary text
    colorTextSecondary:    '#787774', // Notion muted text
    colorBorder:           '#e9e9e7',
    colorBorderSecondary:  '#edece9',
    colorFillAlter:        '#f1f1ef', // Notion hover fill
    borderRadius:          6,
    borderRadiusLG:        8,
    fontFamily:            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize:              14,
    controlHeight:         34,
  },
  components: {
    Table: {
      headerBg:            '#f7f6f3',
      rowHoverBg:          '#f1f1ef',
    },
    Card: {
      colorBorderSecondary: '#e9e9e7',
    },
    Button: {
      borderRadius:        6,
    },
    Input: {
      borderRadius:        6,
    },
  },
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  )

  return (
    <StyleProvider hashPriority="high">
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={theme} locale={esES}>
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </StyleProvider>
  )
}

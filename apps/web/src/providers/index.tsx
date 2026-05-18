'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import esES from 'antd/locale/es_ES'
import { useState, type ReactNode } from 'react'

const theme = {
  token: {
    colorPrimary: '#f47920',
    colorLink: '#f47920',
    borderRadius: 8,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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

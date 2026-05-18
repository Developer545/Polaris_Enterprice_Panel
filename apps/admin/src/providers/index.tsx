'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import esES from 'antd/locale/es_ES'
import { useState, type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }))
  return (
    <StyleProvider hashPriority="high">
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{ token: { colorPrimary: '#722ed1', borderRadius: 8 } }}
          locale={esES}
        >
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </StyleProvider>
  )
}

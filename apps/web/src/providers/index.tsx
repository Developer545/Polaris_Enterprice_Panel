'use client'
import '@ant-design/v5-patch-for-react-19'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp, theme as antTheme } from 'antd'
import { StyleProvider, createCache, extractStyle } from '@ant-design/cssinjs'
import { useServerInsertedHTML } from 'next/navigation'
import esES from 'antd/locale/es_ES'
import { useState, useRef, type ReactNode } from 'react'
import { ThemeProvider, usePolarisTheme } from '../context/ThemeContext'
import { AppearanceProvider, useAppearance } from '../context/AppearanceContext'
import { getAntTokens } from '../config/appearance'

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

/** Inner component: reads the active Polaris theme + appearance and configures Ant Design. */
function AntConfigProvider({ children }: { children: ReactNode }) {
  const { theme }      = usePolarisTheme()
  const { appearance } = useAppearance()

  const aptTokens    = getAntTokens(appearance)
  const colorPrimary = appearance.customPrimary ?? theme.colorPrimary

  const activeTheme = {
    algorithm: theme.isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      colorLink:            colorPrimary,
      ...aptTokens,
      colorPrimary,
      colorBgLayout:        theme.vars['--bg-page'],
      colorBgContainer:     theme.vars['--bg-surface'],
      colorText:            theme.vars['--text-primary'],
      colorTextSecondary:   theme.vars['--text-secondary'],
      colorBorder:          theme.vars['--sidebar-border'],
      colorBorderSecondary: theme.vars['--sidebar-border'],
      colorFillAlter:       theme.vars['--sidebar-item-hover-bg'],
    },
    components: {
      Table: {
        headerBg:   theme.vars['--bg-page'],
        rowHoverBg: theme.vars['--sidebar-item-hover-bg'],
      },
      Card: { colorBorderSecondary: theme.vars['--sidebar-border'] },
    },
  }

  return (
    <ConfigProvider theme={activeTheme} locale={esES} warning={{ strict: false }}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,
            gcTime: 15 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
          mutations: { retry: 0 },
        },
      }),
  )

  // AppearanceProvider is outer so its useEffect fires AFTER ThemeProvider's,
  // letting customPrimary override theme colors correctly.
  return (
    <AppearanceProvider>
      <ThemeProvider>
        <AntdStyleInjector>
          <QueryClientProvider client={queryClient}>
            <AntConfigProvider>
              {children}
            </AntConfigProvider>
          </QueryClientProvider>
        </AntdStyleInjector>
      </ThemeProvider>
    </AppearanceProvider>
  )
}

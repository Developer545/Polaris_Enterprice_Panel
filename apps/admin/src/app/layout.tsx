import type { Metadata } from 'next'
import { Providers } from '../providers'

export const metadata: Metadata = {
  title: 'POS DTE — Panel Administrativo',
  description: 'Speeddan System — Control Panel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

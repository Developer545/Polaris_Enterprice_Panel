import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '../providers'

export const metadata: Metadata = {
  title: 'POS DTE El Salvador',
  description: 'Sistema POS con facturación electrónica DTE — Speeddan System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011'
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__API_URL__ = ${JSON.stringify(apiUrl)};`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

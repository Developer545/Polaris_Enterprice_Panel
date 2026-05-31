import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '../providers'

export const metadata: Metadata = {
  title: 'Polaris Enterprise — Admin',
  description: 'Polaris Enterprise · Panel Administrativo · Polaris Enterprise',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

import type { NextConfig } from 'next'
import { resolve } from 'node:path'

const config: NextConfig = {
  transpilePackages: ['@pos-dte/shared-types'],
  turbopack: {
    root: resolve(__dirname, '../..'),
  },
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', '@ant-design/cssinjs'],
  },
}

export default config

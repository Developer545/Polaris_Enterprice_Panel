import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@pos-dte/shared-types'],
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', '@ant-design/cssinjs'],
  },
}

export default config

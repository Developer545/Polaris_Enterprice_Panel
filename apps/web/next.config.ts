import type { NextConfig } from 'next'
import { resolve } from 'node:path'

const config: NextConfig = {
  ...(process.env.NEXT_OUTPUT_STANDALONE === 'true' ? { output: 'standalone' as const } : {}),
  transpilePackages: ['@pos-dte/shared-ui', '@pos-dte/shared-api', '@pos-dte/shared-types'],
  turbopack: {
    root: resolve(__dirname, '../..'),
  },
  images: {
    remotePatterns: [{ hostname: 'res.cloudinary.com' }],
  },
  // Tree-shake antd/icons/recharts — eliminates massive unused JS from bundle
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', '@ant-design/cssinjs', 'recharts'],
  },
  // Remove X-Powered-By header
  poweredByHeader: false,
  // Compress responses
  compress: true,
}

export default config

import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@pos-dte/shared-ui', '@pos-dte/shared-api', '@pos-dte/shared-types'],
  images: {
    remotePatterns: [{ hostname: 'res.cloudinary.com' }],
  },
}

export default config

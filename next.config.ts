import type { NextConfig } from 'next'

// ── Validate required env vars at build time ─────────────────────────────────
const requiredEnvVars = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_GATEWAY_URL',
  'NEXT_PUBLIC_SSO_URL',
  'NEXT_PUBLIC_OAUTH_CLIENT_ID',
] as const

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`[BUILD] Missing required environment variable: ${envVar}`)
  }
}

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.BASEPATH,
  redirects: async () => {
    return [{
      source: '/',
      destination: '/dashboards',
      permanent: true
    }]
  }
}

export default nextConfig

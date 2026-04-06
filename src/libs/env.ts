/**
 * Environment variable validation — fail fast at build/startup instead of silently using wrong defaults.
 *
 * CRITICAL: NEXT_PUBLIC_* vars MUST use static dot-notation (process.env.NEXT_PUBLIC_X)
 * so Next.js can inline the values into the client-side bundle at build time.
 * Bracket notation (process.env[name]) bypasses static analysis → undefined in browser.
 */

// ─── Helper (validates after static inlining) ────────────────────────────────

function assertEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[ENV] Missing required environment variable: ${name}\n` +
        `  → Check your .env file or docker-compose environment section.`
    )
  }

  return value
}

// ─── Public (build-time, inlined into client bundle) ─────────────────────────
// Each line must explicitly reference process.env.NEXT_PUBLIC_* so the bundler
// can statically replace it with the actual value.

/** Application base URL (e.g. https://core.example.com) */
export const NEXT_PUBLIC_APP_URL = assertEnv('NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL)

/** Gateway base URL (e.g. https://gateway.example.com) */
export const NEXT_PUBLIC_GATEWAY_URL = assertEnv('NEXT_PUBLIC_GATEWAY_URL', process.env.NEXT_PUBLIC_GATEWAY_URL)

/** SSO portal URL (e.g. https://sso.example.com) */
export const NEXT_PUBLIC_SSO_URL = assertEnv('NEXT_PUBLIC_SSO_URL', process.env.NEXT_PUBLIC_SSO_URL)

/** OAuth2 client ID for this frontend app */
export const NEXT_PUBLIC_OAUTH_CLIENT_ID = assertEnv(
  'NEXT_PUBLIC_OAUTH_CLIENT_ID',
  process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID
)

// Third-party Imports
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'

// No generated API imports needed here — token refresh is handled by the BFF proxy.

// Disable SSL verification for self-signed certificates in development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

// Helper to decode JWT without external library validation (we trust our backend)
function parseJwt(token: string) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
  } catch (_e) {
    return null
  }
}

// NOTE: Token refresh is handled exclusively by the BFF proxy (route.ts).
// getServerSession() is read-only — it processes callbacks but never writes
// the updated JWT back to the cookie. Refreshing here would consume the RT
// without persisting the new tokens, causing the proxy to fail on the next
// 401 (the RT is already spent). The proxy calls doRefreshAccessToken() on
// every 401, retries the request, and re-encodes the cookie — this is the
// only safe place to refresh.

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'alfred-identity',
      name: 'Alfred Identity',
      type: 'oauth',

      // Use public URL for authorization (browser redirect)
      authorization: {
        url: `${process.env.NEXT_PUBLIC_GATEWAY_URL}/connect/authorize`,
        params: { scope: 'openid profile email offline_access' }
      },

      // Use internal URL for server-side token exchange
      token: `${process.env.INTERNAL_GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL}/connect/token`,
      userinfo: `${process.env.INTERNAL_GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL}/connect/userinfo`,
      jwks_endpoint: `${process.env.INTERNAL_GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL}/.well-known/jwks.json`,
      issuer: process.env.NEXT_PUBLIC_GATEWAY_URL,
      idToken: true,
      checks: ['pkce', 'state'],
      clientId: process.env.OIDC_CLIENT_ID!,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      client: {
        token_endpoint_auth_method: 'client_secret_post'
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture
        }
      }
    },

    // Credentials provider for SSO session-based silent authentication
    CredentialsProvider({
      id: 'sso-session',
      name: 'SSO Session',
      credentials: {
        userId: { label: 'User ID', type: 'text' },
        email: { label: 'Email', type: 'text' },
        name: { label: 'Name', type: 'text' }
      },
      async authorize(credentials) {
        // This is called when we have a valid SSO session from Gateway
        // We trust the session data since it was validated server-side
        if (!credentials?.userId || !credentials?.email) {
          return null
        }

        return {
          id: credentials.userId,
          email: credentials.email,
          name: credentials.name || credentials.email
        }
      }
    })
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },

  // Use custom login page that auto-redirects to SSO
  pages: {
    signIn: '/login',
    signOut: '/signout'
  },

  // Use secure cookies for HTTPS
  useSecureCookies: true,

  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        // Calculate expiresAt ourselves using expires_in (more reliable than expires_at)
        let expiresAt =
          Math.floor(Date.now() / 1000) + (typeof account.expires_in === 'number' ? account.expires_in : 900)

        // Try to get exact exp from token
        const decoded = parseJwt(account.access_token!)

        if (decoded && decoded.exp) {
          expiresAt = decoded.exp
        }

        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: expiresAt,
          error: undefined // Clear any stale error from previous broken session
        }
      }

      // Return token as-is — the BFF proxy (route.ts) handles refresh on 401.
      // getServerSession() is read-only and must never consume the refresh token.
      return token
    },
    async session({ session, token }) {
      // BFF pattern: accessToken stays in the JWT cookie (HttpOnly, server-side only).
      // The proxy route reads it via getToken() — never exposed to client JS.
      session.error = token.error as string | undefined

      if (token.sub && session.user) {
        session.user.id = token.sub
      }

      return session
    }
  },

  debug: false
}

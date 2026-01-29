// Third-party Imports
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

// Disable SSL verification for self-signed certificates in development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

// Helper to decode JWT without external library validation (we trust our backend)
function parseJwt(token: string) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
  } catch (e) {
    return null
  }
}

/**
 * Refresh access token using refresh_token grant
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.OIDC_CLIENT_ID!,
        client_secret: process.env.OIDC_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    // Calculate new expiresAt
    let expiresAt = Date.now() / 1000 + refreshedTokens.expires_in
    if (refreshedTokens.access_token) {
      const decoded = parseJwt(refreshedTokens.access_token)
      if (decoded && decoded.exp) {
        expiresAt = decoded.exp
      }
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      expiresAt: expiresAt,
      error: undefined,
    }
  } catch (error) {
    console.error('Error refreshing access token', error)
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'alfred-identity',
      name: 'Alfred Identity',
      type: 'oauth',
      wellKnown: `${process.env.NEXT_PUBLIC_GATEWAY_URL}/.well-known/openid-configuration`,
      authorization: { params: { scope: 'openid profile email offline_access' } },
      idToken: true,
      checks: ['pkce', 'state'],
      clientId: process.env.OIDC_CLIENT_ID!,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      client: {
        token_endpoint_auth_method: 'client_secret_post',
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    },
    // Credentials provider for SSO session-based silent authentication
    CredentialsProvider({
      id: 'sso-session',
      name: 'SSO Session',
      credentials: {
        userId: { label: 'User ID', type: 'text' },
        email: { label: 'Email', type: 'text' },
        name: { label: 'Name', type: 'text' },
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
          name: credentials.name || credentials.email,
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Use custom login page that auto-redirects to SSO
  pages: {
    signIn: '/login',
    signOut: '/signout',
  },

  // Use secure cookies for HTTPS
  useSecureCookies: true,

  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        // Calculate expiresAt ourselves using expires_in (more reliable than expires_at)
        let expiresAt = Math.floor(Date.now() / 1000) + (typeof account.expires_in === 'number' ? account.expires_in : 900)

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
        }
      }

      // Return previous token if not expired (with 10s buffer)
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = token.expiresAt as number

      if (token.expiresAt && now < expiresAt - 10) {
        return token
      }

      // Token expired - only try to refresh if we have a refresh token
      // (sso-session provider doesn't provide refresh tokens)
      if (token.refreshToken) {
        return await refreshAccessToken(token)
      }

      // No refresh token available (e.g., sso-session), just return token as-is
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.error = token.error as string | undefined
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
  },

  debug: false,
}

import NextAuth, { NextAuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt";

// Disable SSL verification for self-signed certificates in development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_GATEWAY_URL',
  'OIDC_CLIENT_ID',
  'OIDC_CLIENT_SECRET',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "alfred-identity",
      name: "Alfred Identity",
      type: "oauth",
      wellKnown: `${process.env.NEXT_PUBLIC_GATEWAY_URL}/.well-known/openid-configuration`,
      authorization: { params: { scope: "openid profile email offline_access" } },
      idToken: true,
      checks: ["pkce", "state"],
      clientId: process.env.OIDC_CLIENT_ID!,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      client: {
        token_endpoint_auth_method: "client_secret_post",
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
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        }
      }

      // Return previous token if the access token has not expired yet
      // Add buffer time (e.g., 10 seconds) to avoid edge cases
      if (token.expiresAt && Date.now() / 1000 < token.expiresAt - 10) {
        return token
      }

      // Access token has expired, try to update it
      return await refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.error = token.error // Allow client to handle refresh error (e.g., force logout)
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
  },

  // Debug mode - disabled for cleaner logs
  debug: false,
}

/**
 * Helper function to refresh the access token
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/connect/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.OIDC_CLIENT_ID!,
        client_secret: process.env.OIDC_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fallback to old refresh token if new one not provided
      expiresAt: Date.now() / 1000 + refreshedTokens.expires_in,
      error: undefined, // Clear error if successful
    }
  } catch (error) {
    console.error("Error refreshing access token", error)

    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}


const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

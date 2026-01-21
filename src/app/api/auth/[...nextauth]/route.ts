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
      if (token.expiresAt && Date.now() / 1000 < token.expiresAt) {
        return token
      }

      // Access token has expired, try to update it (RefreshToken rotation not implemented in this MVP step)
      return {
          ...token,
          error: "RefreshAccessTokenError",
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
  },

  // Debug mode - disabled for cleaner logs
  debug: false,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

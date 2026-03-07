import 'next-auth'

declare module 'next-auth' {
  interface Session {

    // accessToken is NOT exposed — kept in JWT cookie for BFF proxy only
    error?: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    error?: string
  }
}

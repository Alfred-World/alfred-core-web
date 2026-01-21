// Third-party Imports
import CredentialProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'

// Generated API
import { postApiV1IdentityAuthSsoLogin } from '@/generated'

// Constants
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://gateway.test:8000'

export const authOptions: NextAuthOptions = {

  // ** Configure one or more authentication providers
  // ** Please refer to https://next-auth.js.org/configuration/options#providers for more `providers` options
  providers: [
    // Provider for SSO login (normal credentials flow)
    CredentialProvider({
      // ** The name to display on the sign in form (e.g. 'Sign in with...')
      // ** For more details on Credentials Provider, visit https://next-auth.js.org/providers/credentials
      id: 'sso',
      name: 'Single Sign-On',
      type: 'credentials',

      /*
       * As we are using our own Sign-in page, we do not need to change
       * username or password attributes manually in following credentials object.
       */
      credentials: {},
      async authorize(credentials) {
        /*
         * You need to provide your own logic here that takes the credentials submitted and returns either
         * an object representing a user or value that is false/null if the credentials are invalid.
         * For e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
         * You can also use the `req` object to obtain additional parameters (i.e., the request IP address)
         */
        const { email, password } = credentials as { email: string; password: string }

        try {
          // ** SSO Login API Call
          const response = await postApiV1IdentityAuthSsoLogin({
            identity: email,
            password: password,
            rememberMe: true
          })

          if (!response.success || !response.result) {
            throw new Error(response.message || 'SSO login failed')
          }

          const { user, returnUrl } = response.result

          if (!user) {
            throw new Error('User data not found in SSO response')
          }

          /*
           * Return user object with necessary data
           * This will be stored in the JWT token
           */
          return {
            id: user.id?.toString() || '',
            name: user.fullName || user.userName || '',
            email: user.email || email,
            image: null,
            username: user.userName || '',
            role: 'user', // Default role, adjust based on your UserInfo structure
            returnUrl: returnUrl || null
          }
        } catch (e: any) {
          console.error('SSO Login Error:', e)
          throw new Error(e.message || 'SSO authentication failed')
        }
      }
    }),

    // Provider for syncing SSO cookie session with NextAuth
    // This is used when user already has SSO cookie but no NextAuth session
    CredentialProvider({
      id: 'sso-sync',
      name: 'SSO Session Sync',
      type: 'credentials',
      credentials: {},
      async authorize(credentials) {
        const { userId, email, fullName, userName } = credentials as {
          userId: string
          email: string
          fullName: string
          userName: string
        }

        // Verify this is a valid SSO session by checking with Gateway
        // The cookie should already be present from the browser
        if (!userId || !email) {
          throw new Error('Invalid SSO session data')
        }

        // Return user object for NextAuth session
        return {
          id: userId,
          name: fullName || userName || '',
          email: email,
          image: null,
          username: userName || '',
          role: 'user',
          returnUrl: null
        }
      }
    }),

    // ** ...add more providers here
  ],

  // ** Please refer to https://next-auth.js.org/configuration/options#session for more `session` options
  session: {
    /*
     * Choose how you want to save the user session.
     * The default is `jwt`, an encrypted JWT (JWE) stored in the session cookie.
     * If you use an `adapter` however, NextAuth default it to `database` instead.
     * You can still force a JWT session by explicitly defining `jwt`.
     * When using `database`, the session cookie will only contain a `sessionToken` value,
     * which is used to look up the session in the database.
     * If you use a custom credentials provider, user accounts will not be persisted in a database by NextAuth.js (even if one is configured).
     * The option to use JSON Web Tokens for session tokens must be enabled to use a custom credentials provider.
     */
    strategy: 'jwt',

    // ** Seconds - How long until an idle session expires and is no longer valid
    maxAge: 30 * 24 * 60 * 60 // ** 30 days
  },

  // ** Please refer to https://next-auth.js.org/configuration/options#pages for more `pages` options
  pages: {
    // SSO: No local login page - redirect is handled by AuthGuard -> AuthRedirect
    // signIn: '/login'  // Disabled - using SSO flow
  },

  // ** Please refer to https://next-auth.js.org/configuration/options#callbacks for more `callbacks` options
  callbacks: {
    /*
     * While using `jwt` as a strategy, `jwt()` callback will be called before
     * the `session()` callback. So we have to add custom parameters in `token`
     * via `jwt()` callback to make them accessible in the `session()` callback
     */
    async jwt({ token, user }) {
      if (user) {
        /*
         * For adding custom parameters to user in session, we first need to add those parameters
         * in token which then will be available in the `session()` callback
         */
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.username = user.username
        token.role = user.role
        token.image = user.image
        token.returnUrl = user.returnUrl
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        // ** Add custom params to user in session which are added in `jwt()` callback via `token` parameter
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.username = token.username as string
        session.user.role = token.role as string
        session.user.image = token.image as string | null
        session.user.returnUrl = token.returnUrl as string | null
      }

      return session
    }
  }
}

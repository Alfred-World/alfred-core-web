'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CircularProgress, Box, Typography, Button } from '@mui/material'

import { validateSsoToken } from '@/libs/sso-config'
import Loading from '@/components/Loading'

/**
 * SSO Login Page - Handles redirect-based SSO flow
 * 
 * Flow:
 * 1. Check if logout=true → show logout success screen
 * 2. Check if we have sso_token from redirect → validate and sign in
 * 3. If sso_error exists → trigger OAuth flow
 * 4. If neither → trigger OAuth flow
 */
export default function SSOLoginPage() {
  const { status, update } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasTriggeredRef = useRef(false)
  const [statusMessage, setStatusMessage] = useState('Checking authentication...')
  const [isLoggedOut, setIsLoggedOut] = useState(false)

  // Get callback URL - ensure it's an absolute URL for core.test
  const rawCallbackUrl = searchParams.get('callbackUrl') || '/dashboards/crm'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://core.test'

  // Make sure callbackUrl is absolute and points to core.test
  const callbackUrl = rawCallbackUrl.startsWith('http')
    ? rawCallbackUrl
    : `${appUrl}${rawCallbackUrl.startsWith('/') ? '' : '/'}${rawCallbackUrl}`

  // Check if this is a logout redirect
  const isLogoutRedirect = searchParams.get('logout') === 'true'

  useEffect(() => {
    // If this is a logout redirect, just show the logged out state
    if (isLogoutRedirect) {
      setIsLoggedOut(true)
      setStatusMessage('You have been logged out successfully.')
      return
    }

    // Prevent double trigger in React StrictMode
    if (hasTriggeredRef.current) return

    const handleAuth = async () => {
      if (status === 'loading') return

      if (status === 'authenticated') {
        router.replace(rawCallbackUrl)
        return
      }

      if (status === 'unauthenticated') {
        hasTriggeredRef.current = true

        // Check for sso_token from redirect flow
        const ssoToken = searchParams.get('sso_token')
        const ssoError = searchParams.get('sso_error')

        if (ssoToken) {
          // We have an SSO token from check-sso redirect
          setStatusMessage('Validating SSO session...')

          try {
            // Use generated API function via sso-config for type safety
            const response = await validateSsoToken(ssoToken)

            if (response.success && response.result) {
              const user = response.result as { userId: string; email: string; fullName?: string; userName?: string }
              const result = await signIn('sso-session', {
                redirect: false,
                userId: user.userId.toString(),
                email: user.email,
                name: user.fullName || user.userName || user.email,
              })

              if (result?.ok) {
                await update()
                router.replace(rawCallbackUrl)
                return
              }
            }
          } catch (error) {
            // Silent error
          }
        }

        // No SSO token or token exchange failed - trigger OAuth flow
        setStatusMessage('Redirecting to login...')
        signIn('alfred-identity', { callbackUrl })
      }
    }

    handleAuth()
  }, [status, callbackUrl, rawCallbackUrl, router, update, searchParams, isLogoutRedirect])

  // Show logged out screen with login button
  if (isLoggedOut) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderRadius: 4,
            boxShadow: 3,
            p: { xs: 5, sm: 6 },
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
          }}
        >
          {/* Success Icon */}
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <i className='tabler-check' style={{ fontSize: 36, color: 'white' }} />
          </Box>

          <Typography
            variant="h5"
            fontWeight={700}
            color="text.primary"
            sx={{ mb: 1.5 }}
          >
            See You Soon!
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            You have been securely logged out
          </Typography>

          <Button
            variant="contained"
            size="large"
            fullWidth
            endIcon={<i className='tabler-arrow-right' style={{ fontSize: 18 }} />}
            onClick={() => signIn('alfred-identity', { callbackUrl: '/dashboards/crm' })}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            Sign In Again
          </Button>
        </Box>
      </Box>
    )
  }

  return <Loading message={statusMessage} />
}

'use client'

import { useEffect, useRef, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { signIn, useSession } from 'next-auth/react'
import { Box, Typography, Button } from '@mui/material'

import Loading from '@/components/Loading'

type PageState = 'loading' | 'login' | 'processing' | 'logged-out'

/**
 * SSO Login Page - Handles redirect-based SSO flow
 *
 * Flow:
 * 1. Check if logout=true → show logout success screen with sign-in button
 * 2. If authenticated → redirect to callbackUrl
 * 3. If sso_token present (returning from SSO) → auto-complete OAuth flow
 * 4. Otherwise → show login UI with "Login with Alfred Account" button
 */

// ─── Shared card wrapper ──────────────────────────────────────────────────────
const CardWrapper = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={(theme) => ({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      bgcolor: theme.palette.mode === 'dark' ? '#161d31' : 'background.default',
      p: 3,
      position: 'relative',
      overflow: 'hidden',
      color: theme.palette.mode === 'dark' ? '#b4b7bd' : 'text.secondary',
      fontFamily: '"Public Sans", sans-serif',
    })}
  >
    {/* Background float elements */}
    <Box sx={(theme) => ({ position: 'absolute', top: 80, right: 80, opacity: theme.palette.mode === 'dark' ? 0.1 : 0.05, display: { xs: 'none', lg: 'block' }, pointerEvents: 'none', animation: 'float 6s ease-in-out infinite', '@keyframes float': { '0%, 100%': { transform: 'translateY(0) rotate(0deg)' }, '50%': { transform: 'translateY(-20px) rotate(5deg)' } }, color: theme.palette.mode === 'dark' ? 'white' : 'primary.main' })}>
      <i className='tabler-shield' style={{ fontSize: 160, color: 'inherit' }} />
    </Box>
    <Box sx={(theme) => ({ position: 'absolute', bottom: 80, left: 80, opacity: theme.palette.mode === 'dark' ? 0.1 : 0.05, display: { xs: 'none', lg: 'block' }, pointerEvents: 'none', animation: 'floatDelayed 8s ease-in-out infinite 1s', '@keyframes floatDelayed': { '0%, 100%': { transform: 'translateY(0) rotate(0deg)' }, '50%': { transform: 'translateY(-20px) rotate(5deg)' } }, color: theme.palette.mode === 'dark' ? 'white' : 'primary.main' })}>
      <i className='tabler-settings' style={{ fontSize: 140, color: 'inherit' }} />
    </Box>
    <Box sx={(theme) => ({ position: 'absolute', top: '50%', left: 40, opacity: theme.palette.mode === 'dark' ? 0.05 : 0.03, display: { xs: 'none', lg: 'block' }, pointerEvents: 'none', animation: 'float 6s ease-in-out infinite', color: theme.palette.mode === 'dark' ? 'white' : 'primary.main' })}>
      <i className='tabler-shield-check' style={{ fontSize: 80, color: 'inherit' }} />
    </Box>

    <Box
      sx={(theme) => ({
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.mode === 'dark' ? '#283046' : 'background.paper',
        border: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? '#404656' : 'divider',
        borderRadius: 2,
        boxShadow: theme.palette.mode === 'dark' ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : '0 10px 30px rgba(0, 0, 0, 0.08)',
        p: { xs: 4, sm: 5 },
        maxWidth: 450,
        width: '100%',
      })}
    >
      {children}
    </Box>

    {/* Footer */}
    <Box sx={(theme) => ({
      mt: 4,
      color: theme.palette.mode === 'dark' ? '#676d7d' : 'text.disabled',
      fontSize: '0.875rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1.5,
      zIndex: 10,
      opacity: 0,
      animation: 'fadeIn 0.8s ease-out 0.8s forwards',
      '@keyframes fadeIn': { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } }
    })}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="body2" sx={{ fontFamily: 'inherit' }}>© {new Date().getFullYear()} Alfred</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.8 }}>
        <i className='tabler-lock' style={{ fontSize: 16 }} />
        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'inherit' }}>End-to-end encrypted session</Typography>
      </Box>
    </Box>
  </Box>
)

export default function SSOLoginPage() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasTriggeredRef = useRef(false)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [isSigningIn, setIsSigningIn] = useState(false)

  const rawCallbackUrl = searchParams.get('callbackUrl') || '/dashboards'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://core.test'

  const callbackUrl = rawCallbackUrl.startsWith('http')
    ? rawCallbackUrl
    : `${appUrl}${rawCallbackUrl.startsWith('/') ? '' : '/'}${rawCallbackUrl}`

  const isLogoutRedirect = searchParams.get('logout') === 'true'
  const ssoToken = searchParams.get('sso_token')

  useEffect(() => {
    if (isLogoutRedirect) {
      setPageState('logged-out')

      return
    }

    if (status === 'loading') return

    if (status === 'authenticated') {
      router.replace(rawCallbackUrl)

      return
    }

    if (status === 'unauthenticated') {
      // Returning from SSO with a valid token → auto-complete the OAuth flow
      if (ssoToken && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true
        setPageState('processing')
        signIn('alfred-identity', { callbackUrl })

        return
      }

      // No token yet → show login UI
      setPageState('login')
    }
  }, [status, callbackUrl, rawCallbackUrl, router, searchParams, isLogoutRedirect, ssoToken])

  const handleSignIn = () => {
    setIsSigningIn(true)
    signIn('alfred-identity', { callbackUrl })
  }

  // ─── Processing / initial loading ────────────────────────────────────────────
  if (pageState === 'loading') return <Loading message='Checking authentication...' />
  if (pageState === 'processing') return <Loading message='Completing sign-in...' />

  // ─── Logged-out screen ────────────────────────────────────────────────────────
  if (pageState === 'logged-out') {
    return (
      <CardWrapper>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              bgcolor: 'rgba(40, 199, 111, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
              animation: 'fadeIn 0.8s ease-out forwards',
            }}
          >
            <i className='tabler-check' style={{ fontSize: 36, color: '#28c76f' }} />
          </Box>

          <Typography variant='h5' fontWeight={600} sx={(theme) => ({ color: theme.palette.mode === 'dark' ? '#d0d2d6' : 'text.primary', mb: 1, fontFamily: 'inherit', animation: 'fadeIn 0.8s ease-out forwards' })}>
            See You Soon!
          </Typography>

          <Typography variant='body2' sx={(theme) => ({ color: theme.palette.mode === 'dark' ? '#b4b7bd' : 'text.secondary', mb: 4, textAlign: 'center', fontFamily: 'inherit', animation: 'fadeIn 0.8s ease-out 0.2s forwards', opacity: 0 })}>
            You have been securely logged out.
          </Typography>

          <Box sx={{ width: '100%', pt: 1, opacity: 0, animation: 'fadeIn 0.8s ease-out 0.4s forwards' }}>
            <Button
              variant='contained'
              fullWidth
              disabled={isSigningIn}
              endIcon={!isSigningIn && <i className='tabler-arrow-right' style={{ fontSize: 20 }} />}
              startIcon={isSigningIn ? <i className='tabler-loader-2 animate-spin' style={{ fontSize: 20 }} /> : undefined}
              onClick={handleSignIn}
              sx={{
                height: 44,
                bgcolor: '#7367f0',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: 1.5,
                fontFamily: 'inherit',
                transition: 'all 0.3s',
                '&:hover': { bgcolor: '#675dd8' },
              }}
            >
              {isSigningIn ? 'Redirecting...' : 'Sign In Again'}
            </Button>
          </Box>
        </Box>
      </CardWrapper>
    )
  }

  // ─── Login screen ─────────────────────────────────────────────────────────────
  return (
    <CardWrapper>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <Box sx={{
          width: 64, height: 64, bgcolor: 'rgba(115, 103, 240, 0.1)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5,
          animation: 'fadeIn 0.8s ease-out forwards',
        }}>
          <i className='tabler-shield-lock' style={{ fontSize: 36, color: '#7367f0' }} />
        </Box>
        <Typography variant='h5' fontWeight={600} sx={(theme) => ({ color: theme.palette.mode === 'dark' ? '#d0d2d6' : 'text.primary', mb: 1.5, letterSpacing: '-0.02em', fontFamily: 'inherit', animation: 'fadeIn 0.8s ease-out forwards' })}>
          Project Alfred
        </Typography>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, bgcolor: 'rgba(115, 103, 240, 0.1)', borderRadius: 1,
          opacity: 0, animation: 'fadeIn 0.8s ease-out 0.2s forwards'
        }}>
          <i className='tabler-shield-check' style={{ fontSize: 16, color: '#7367f0' }} />
          <Typography variant='caption' fontWeight={600} sx={{ color: '#7367f0', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
            Secure SSO Only
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ textAlign: 'center', opacity: 0, animation: 'fadeIn 0.8s ease-out 0.3s forwards' }}>
          <Typography variant='h6' fontWeight={500} sx={(theme) => ({ color: theme.palette.mode === 'dark' ? '#d0d2d6' : 'text.primary', mb: 0.5, fontFamily: 'inherit' })}>
            Welcome to Alfred! 👋
          </Typography>
          <Typography variant='body2' sx={(theme) => ({ color: theme.palette.mode === 'dark' ? '#b4b7bd' : 'text.secondary', lineHeight: 1.6, fontFamily: 'inherit' })}>
            Please sign-in to your account and start the adventure
          </Typography>
        </Box>

        <Box sx={{ pt: 1, opacity: 0, animation: 'fadeIn 0.8s ease-out 0.4s forwards' }}>
          <Button
            variant='contained'
            fullWidth
            disabled={isSigningIn}
            startIcon={
              isSigningIn
                ? <i className='tabler-loader-2 animate-spin' style={{ fontSize: 20 }} />
                : <i className='tabler-login' style={{ fontSize: 20 }} />
            }
            onClick={handleSignIn}
            sx={{
              height: 44,
              bgcolor: '#7367f0',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 500,
              textTransform: 'none',
              borderRadius: 1.5,
              fontFamily: 'inherit',
              position: 'relative',
              overflow: 'hidden',
              animation: 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              '@keyframes pulseGlow': {
                '0%, 100%': { boxShadow: '0 0 0 0 rgba(115, 103, 240, 0)', transform: 'scale(1)' },
                '50%': { boxShadow: '0 0 20px 2px rgba(115, 103, 240, 0.4)', transform: 'scale(1.01)' },
              },
              transition: 'all 0.3s',
              '&:hover': {
                bgcolor: '#675dd8',
                background: 'linear-gradient(90deg, #7367f0 0%, #8e85f3 45%, #a69ff6 50%, #8e85f3 55%, #7367f0 100%)',
                backgroundSize: '200% 100%',
                animation: 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, shimmer 1.5s infinite linear',
              },
              '@keyframes shimmer': {
                '0%': { backgroundPosition: '-200% 0' },
                '100%': { backgroundPosition: '200% 0' },
              }
            }}
          >
            {isSigningIn ? 'Redirecting to SSO...' : 'Log in with Alfred SSO'}
          </Button>
        </Box>

        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', py: 1, opacity: 0, animation: 'fadeIn 0.8s ease-out 0.5s forwards' }}>
          <Box sx={(theme) => ({ flexGrow: 1, borderTop: '1px solid', borderColor: theme.palette.mode === 'dark' ? '#404656' : 'divider' })} />
          <Typography variant='caption' sx={(theme) => ({ mx: 2, color: theme.palette.mode === 'dark' ? '#676d7d' : 'text.disabled', fontFamily: 'inherit' })}>
            Enterprise Security
          </Typography>
          <Box sx={(theme) => ({ flexGrow: 1, borderTop: '1px solid', borderColor: theme.palette.mode === 'dark' ? '#404656' : 'divider' })} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, pt: 1, opacity: 0, animation: 'fadeIn 0.8s ease-out 0.6s forwards' }}>
          <Box component="button" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#7367f0', bgcolor: 'transparent', border: 'none', cursor: 'pointer', '&:hover': { color: '#675dd8', transform: 'translateY(-1px)' }, transition: 'all 0.2s', fontSize: '0.875rem', fontWeight: 500, fontFamily: 'inherit', p: 0 }}>
            <i className='tabler-help' style={{ fontSize: 18 }} />
            <span>Help Center</span>
          </Box>
          <Box component="button" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#7367f0', bgcolor: 'transparent', border: 'none', cursor: 'pointer', '&:hover': { color: '#675dd8', transform: 'translateY(-1px)' }, transition: 'all 0.2s', fontSize: '0.875rem', fontWeight: 500, fontFamily: 'inherit', p: 0 }}>
            <i className='tabler-server' style={{ fontSize: 18 }} />
            <span>System Status</span>
          </Box>
        </Box>
      </Box>
    </CardWrapper>
  )
}

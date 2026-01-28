'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

import { APP_URL, getSsoCheckUrl } from '@/libs/sso-config'

/**
 * AuthRedirect - Redirects to Gateway SSO check instead of login
 * 
 * When user lands on a protected page without local NextAuth session:
 * 1. Redirect to Gateway check-sso endpoint
 * 2. Gateway checks AlfredSession cookie
 * 3. If authenticated: redirects back with sso_token param
 * 4. If not: redirects back with sso_error param
 * 
 * The callback is handled by the login page
 */
const AuthRedirect = () => {
  const pathname = usePathname()
  const hasRedirectedRef = useRef(false)

  useEffect(() => {
    if (hasRedirectedRef.current) return
    hasRedirectedRef.current = true

    // Build the callback URL - we'll redirect to login page which handles SSO token
    const callbackUrl = `${APP_URL}/login?callbackUrl=${encodeURIComponent(pathname)}`

    // Redirect to Gateway SSO check
    const ssoCheckUrl = getSsoCheckUrl(callbackUrl)

    window.location.href = ssoCheckUrl
  }, [pathname])

  return (
    <div className='flex items-center justify-center min-h-screen'>
      <div className='flex flex-col items-center gap-4'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary' />
        <p className='text-gray-500'>Checking authentication...</p>
      </div>
    </div>
  )
}

export default AuthRedirect

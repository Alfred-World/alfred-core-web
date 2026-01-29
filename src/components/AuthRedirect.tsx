'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

import { APP_URL, getSsoCheckUrl } from '@/libs/sso-config'

import Loading from './Loading'

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

  return <Loading />
}

export default AuthRedirect

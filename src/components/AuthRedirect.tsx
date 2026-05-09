'use client'

import { useEffect, useRef } from 'react'

import { usePathname } from 'next/navigation'

import { APP_URL } from '@/libs/sso-config'

import Loading from './Loading'

/**
 * AuthRedirect - sends protected-route visitors to the local login entry point.
 * The login page immediately starts the standard OIDC authorization-code flow.
 */
const AuthRedirect = () => {
  const pathname = usePathname()
  const hasRedirectedRef = useRef(false)

  useEffect(() => {
    if (hasRedirectedRef.current) return
    hasRedirectedRef.current = true

    window.location.href = `${APP_URL}/login?callbackUrl=${encodeURIComponent(pathname)}`
  }, [pathname])

  return <Loading />
}

export default AuthRedirect

'use client'

// React Imports
import { useEffect } from 'react'

// Next Imports
import { usePathname } from 'next/navigation'

// Constants
const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL || 'http://sso.test:7100'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://core.test:7200'

/**
 * Component để redirect user chưa login đến SSO login page
 * User sẽ được redirect về trang này sau khi login thành công
 */
const AuthRedirect = () => {
  const pathname = usePathname()

  useEffect(() => {
    // Build return URL để sau khi login sẽ redirect về đây
    const returnUrl = `${APP_URL}${pathname}`
    const ssoLoginUrl = `${SSO_URL}/login?returnUrl=${encodeURIComponent(returnUrl)}`

    // Redirect to SSO login page
    window.location.href = ssoLoginUrl
  }, [pathname])

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Redirecting to login...</p>
      </div>
    </div>
  )
}

export default AuthRedirect

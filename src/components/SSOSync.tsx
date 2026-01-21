'use client'

import { useEffect, useState } from 'react'

import { signIn, useSession } from 'next-auth/react'

// Types
interface SSOUser {
  id: string
  email: string
  fullName?: string
  userName?: string
}

// Constants
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://gateway.test:8000'
const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL || 'http://sso.test:7100'

/**
 * Component để sync SSO session từ Gateway với NextAuth local session
 * Đặt component này ở layout để tự động sync session
 */
export default function SSOSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [ssoChecked, setSsoChecked] = useState(false)

  useEffect(() => {
    const syncSSOSession = async () => {
      // Chỉ check khi NextAuth đã load xong và chưa có session
      if (status === 'loading') return

      if (session) {
        setSsoChecked(true)

        return
      }

      try {
        // Check SSO session từ Gateway
        const response = await fetch(`${GATEWAY_URL}/api/v1/identity/auth/session`, {
          method: 'GET',
          credentials: 'include', // Quan trọng: gửi cookie
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          setSsoChecked(true)

          return
        }

        const result = await response.json()

        if (result.success && result.result?.isAuthenticated) {
          const user: SSOUser = result.result.user

          // Có SSO session -> sync với NextAuth bằng cách sign in với sso-sync provider
          // Chú ý: Cần tạo một provider riêng để handle việc này
          await signIn('sso-sync', {
            redirect: false,
            userId: user.id,
            email: user.email,
            fullName: user.fullName || '',
            userName: user.userName || ''
          })
        }
      } catch (error) {
        console.error('Error syncing SSO session:', error)
      } finally {
        setSsoChecked(true)
      }
    }

    syncSSOSession()
  }, [session, status])

  // Show loading while checking SSO
  if (!ssoChecked || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Checking session...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Hook để redirect đến SSO login
 */
export function useSSORedirect() {
  const redirectToLogin = (returnUrl?: string) => {
    const currentUrl = returnUrl || (typeof window !== 'undefined' ? window.location.href : '/')
    const loginUrl = `${SSO_URL}/login?returnUrl=${encodeURIComponent(currentUrl)}`

    if (typeof window !== 'undefined') {
      window.location.href = loginUrl
    }
  }

  const logout = async () => {
    try {
      // Logout từ Gateway (xóa SSO cookie)
      await fetch(`${GATEWAY_URL}/api/v1/identity/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
    } catch (error) {
      console.error('Error during logout:', error)
    }

    // Redirect to login
    redirectToLogin()
  }

  return { redirectToLogin, logout }
}

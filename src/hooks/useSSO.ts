'use client'

import { useState, useEffect, useCallback } from 'react'

// Constants
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://gateway.test:8000'
const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL || 'http://sso.test:7100'

export interface SSOUser {
  id: string
  email: string
  fullName?: string
  userName?: string
}

export interface SSOSessionState {
  isAuthenticated: boolean
  isLoading: boolean
  user: SSOUser | null
  error: string | null
}

/**
 * Hook để quản lý SSO session
 * Check session từ Gateway API (cookie-based authentication)
 */
export function useSSO() {
  const [state, setState] = useState<SSOSessionState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null
  })

  /**
   * Check SSO session từ Gateway
   */
  const checkSession = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(`${GATEWAY_URL}/api/v1/identity/auth/session`, {
        method: 'GET',
        credentials: 'include', // Quan trọng: gửi cookie kèm request
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null // Không có session không phải là error
        })

        return false
      }

      const result = await response.json()

      if (result.success && result.result?.isAuthenticated) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: result.result.user.id,
            email: result.result.user.email,
            fullName: result.result.user.fullName,
            userName: result.result.user.userName
          },
          error: null
        })

        return true
      }

      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null
      })

      return false
    } catch (error: any) {
      console.error('Error checking SSO session:', error)
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error.message || 'Failed to check session'
      })

      return false
    }
  }, [])

  /**
   * Redirect đến SSO login page
   * @param returnUrl - URL để redirect sau khi login (mặc định là current URL)
   */
  const redirectToLogin = useCallback((returnUrl?: string) => {
    const currentUrl = returnUrl || (typeof window !== 'undefined' ? window.location.href : '/')
    const loginUrl = `${SSO_URL}/login?returnUrl=${encodeURIComponent(currentUrl)}`
    
    if (typeof window !== 'undefined') {
      window.location.href = loginUrl
    }
  }, [])

  /**
   * Logout - xóa session cookie
   */
  const logout = useCallback(async () => {
    try {
      await fetch(`${GATEWAY_URL}/api/v1/identity/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null
      })

      // Redirect to SSO login
      redirectToLogin()
    } catch (error: any) {
      console.error('Error during logout:', error)
      setState(prev => ({
        ...prev,
        error: error.message || 'Logout failed'
      }))
    }
  }, [redirectToLogin])

  // Check session on mount
  useEffect(() => {
    checkSession()
  }, [checkSession])

  return {
    ...state,
    checkSession,
    redirectToLogin,
    logout
  }
}

export default useSSO

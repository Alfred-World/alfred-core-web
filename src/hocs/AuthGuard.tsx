'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { isAuthenticated, login } from '@/libs/oidc-config'

interface AuthGuardProps {
  children: ReactNode
}

/**
 * Client-side AuthGuard using OIDC
 * Protects routes by checking for valid OIDC session
 * 
 * Note: SSO session validation is disabled to prevent login loops.
 * Cross-domain logout will be handled separately after cookie domain is fixed.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have local OIDC tokens
        const hasLocalTokens = await isAuthenticated()
        
        if (hasLocalTokens) {
          // Trust local tokens - SSO validation disabled to prevent login loops
          setAuthState('authenticated')
          return
        }
        
        // No local tokens - redirect to login
        setAuthState('unauthenticated')
        await login(window.location.pathname + window.location.search)
        
      } catch (error) {
        console.error('[AuthGuard] Auth check error:', error)
        setAuthState('unauthenticated')
        await login(window.location.pathname + window.location.search)
      }
    }

    checkAuth()
  }, [])

  // Loading state
  if (authState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-textSecondary">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Unauthenticated - will redirect, show loading
  if (authState === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-textSecondary">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Authenticated - render children
  return <>{children}</>
}

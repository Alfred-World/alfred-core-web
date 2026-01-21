'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * OIDC Callback Page
 * Handles the authorization code exchange after redirect from Identity Provider
 * Uses oidc-client-ts for PKCE flow
 */
export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const processCallback = async () => {
      try {
        const errorParam = searchParams.get('error')
        
        if (errorParam) {
          throw new Error(searchParams.get('error_description') || errorParam)
        }
        
        // Use PKCE flow with oidc-client-ts
        const { handleCallback } = await import('@/libs/oidc-config')
        const user = await handleCallback()
        
        // Get return URL from state
        const state = user.state as { returnUrl?: string } | undefined
        const returnUrl = state?.returnUrl || '/dashboards/crm'
        
        router.replace(returnUrl)
        
      } catch (err: unknown) {
        console.error('[Callback] OIDC Callback Error:', err)
        
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Authentication failed. Please try again.'
        
        setError(errorMessage)
        setIsProcessing(false)
      }
    }

    processCallback()
  }, [router, searchParams])

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-backgroundPaper">
        <div className="text-center max-w-md p-8">
          <div className="mb-6">
            <i className="tabler-alert-circle text-6xl text-error" />
          </div>
          <h1 className="text-2xl font-bold text-error mb-4">
            Authentication Error
          </h1>
          <p className="text-textSecondary mb-6">
            {error}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  return (
    <div className="flex items-center justify-center min-h-screen bg-backgroundPaper">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-lg font-medium text-textPrimary">
          {isProcessing ? 'Completing authentication...' : 'Redirecting...'}
        </p>
        <p className="text-sm text-textSecondary mt-2">
          Please wait while we verify your credentials
        </p>
      </div>
    </div>
  )
}

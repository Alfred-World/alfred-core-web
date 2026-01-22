'use client'

import { useEffect, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'

// Component Imports
import FullPageLoader from '@/components/FullPageLoader'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Client-side AuthGuard using NextAuth
 * Protects routes by checking for valid session
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { status } = useSession()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasTriggeredSignIn = useRef(false)

  useEffect(() => {
    if (status === 'unauthenticated' && !hasTriggeredSignIn.current) {
      hasTriggeredSignIn.current = true
      const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
      signIn('alfred-identity', { callbackUrl: url })
    }
  }, [status, pathname, searchParams])

  // Show loader during auth check or OAuth redirect
  if (status === 'loading' || status === 'unauthenticated') {
    return <FullPageLoader />
  }

  return <>{children}</>
}

'use client'

import { useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'

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

  useEffect(() => {
    if (status === 'unauthenticated') {
      const url = pathname + searchParams.toString()
      signIn('alfred-identity', { callbackUrl: url })
    }
  }, [status, pathname, searchParams])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-textSecondary">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
      return (
      <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-textSecondary">Redirecting to login...</p>
          </div>
      </div>
      )
  }

  return <>{children}</>
}

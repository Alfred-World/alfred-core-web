// Third-party Imports
import { getServerSession } from 'next-auth'

// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import AuthRedirect from '@/components/AuthRedirect'

// Lib Imports
import { authOptions } from '@/libs/auth'

export default async function AuthGuard({ children }: ChildrenType) {
  const session = await getServerSession(authOptions)

  // Treat session with RefreshAccessTokenError as invalid —
  // the user needs to re-authenticate
  const hasValidSession = session && !session.error

  return <>{hasValidSession ? children : <AuthRedirect />}</>
}

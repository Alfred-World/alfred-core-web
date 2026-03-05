// Next Imports
import { redirect } from 'next/navigation'

// Third-party Imports
import { getServerSession } from 'next-auth'

// Type Imports
import type { ChildrenType } from '@core/types'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Lib Imports
import { authOptions } from '@/libs/auth'

const GuestOnlyRoute = async ({ children }: ChildrenType) => {
  const session = await getServerSession(authOptions)

  // Only redirect to home if session is valid AND has no error.
  // When refresh token is invalid, session.error = 'RefreshAccessTokenError'
  // — in that case, allow the user to see the login page.
  if (session && !session.error) {
    redirect(themeConfig.homePageUrl)
  }

  return <>{children}</>
}

export default GuestOnlyRoute

'use client'

import { useEffect } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { useSession } from 'next-auth/react'

import type { ChildrenType } from '@core/types'

import themeConfig from '@configs/themeConfig'

function isAuthorizeReturnUrl(value: string | null): value is string {
  return Boolean(value?.includes('/connect/authorize'))
}

function toFirstPartySsoUrl(value: string): string {
  try {
    const parsed = new URL(value, window.location.origin)

    if (parsed.pathname === '/connect/authorize') {
      return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // Keep the original value if it is not a URL.
  }

  return value
}

const GuestOnlyRoute = ({ children }: ChildrenType) => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (status === 'loading') return

    const returnUrl =
      searchParams.get('returnUrl') || searchParams.get('callbackUrl') || searchParams.get('redirectTo')

    const hasAuthError = Boolean(
      searchParams.get('error') ||
        searchParams.get('error_description') ||
        searchParams.get('sso_error') ||
        searchParams.get('sso_error_description')
    )

    const hasSsoFlowParam = Boolean(returnUrl || searchParams.get('sso_token') || searchParams.get('start_oauth'))

    // Keep user on login/guest pages while OAuth/SSO flow params are being handled.
    if (session && !session.error && !hasAuthError) {
      if (isAuthorizeReturnUrl(returnUrl)) {
        window.location.href = toFirstPartySsoUrl(returnUrl)

        return
      }

      if (hasSsoFlowParam) {
        return
      }

      router.replace(themeConfig.homePageUrl)
    }
  }, [status, session, router, searchParams])

  return <>{children}</>
}

export default GuestOnlyRoute

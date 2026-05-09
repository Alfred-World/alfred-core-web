import { redirect } from 'next/navigation'

import { NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SSO_URL } from '@/libs/env'

type AuthErrorForwardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getFirstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function normalizeErrorCode(error: string): string {
  if (error === 'AccessDenied' || error === 'access_denied') {
    return 'access_denied'
  }

  return error
}

function toAbsoluteAppUrl(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  return `${NEXT_PUBLIC_APP_URL}${value.startsWith('/') ? '' : '/'}${value}`
}

export default async function AuthErrorForwardPage({ searchParams }: AuthErrorForwardPageProps) {
  const params = await searchParams
  const rawError = getFirstValue(params.error) || getFirstValue(params.sso_error) || 'invalid_request'
  const rawDescription = getFirstValue(params.error_description) || getFirstValue(params.sso_error_description)
  const rawReturnUrl = getFirstValue(params.returnUrl) || getFirstValue(params.callbackUrl) || '/dashboards'
  const errorUrl = new URL('/auth/error', NEXT_PUBLIC_SSO_URL)

  errorUrl.searchParams.set('error', normalizeErrorCode(rawError))

  if (rawDescription) {
    errorUrl.searchParams.set('error_description', rawDescription)
  }

  errorUrl.searchParams.set('returnUrl', toAbsoluteAppUrl(rawReturnUrl))

  redirect(errorUrl.toString())
}

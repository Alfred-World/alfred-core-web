import { signOut } from 'next-auth/react'

import { NEXT_PUBLIC_GATEWAY_URL } from './env'
import type { ApiErrorResponse } from '@/generated/core-api'

const INVALID_RESPONSE_MESSAGE = 'The server returned an invalid response. Please try again.'

type ApiFailureEnvelope = ApiErrorResponse & { message?: string }

const isApiEnvelopeFailure = (payload: unknown): payload is ApiErrorResponse => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as ApiErrorResponse

  return candidate.success === false && Array.isArray(candidate.errors)
}

function buildFallbackApiFailure(status: number): ApiFailureEnvelope {
  if (status === 401) {
    const message = 'Your session has expired. Please sign in again.'

    return { success: false, message, errors: [{ message, code: 'UNAUTHORIZED' }] }
  }

  if (status === 403) {
    const message = 'You do not have permission to perform this action.'

    return { success: false, message, errors: [{ message, code: 'FORBIDDEN' }] }
  }

  if (status === 404) {
    const message = 'The requested resource could not be found.'

    return { success: false, message, errors: [{ message, code: 'NOT_FOUND' }] }
  }

  if (status === 502 || status === 503 || status === 504) {
    const message = 'The server is temporarily unavailable. Please try again.'

    return { success: false, message, errors: [{ message, code: 'BAD_GATEWAY' }] }
  }

  const message = 'The request could not be completed. Please try again.'

  return { success: false, message, errors: [{ message, code: 'REQUEST_FAILED' }] }
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 205) {
    return undefined as T
  }

  const rawBody = await response.text()
  const trimmedBody = rawBody.trim()

  if (trimmedBody.length === 0) {
    if (!response.ok) {
      return buildFallbackApiFailure(response.status) as T
    }

    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  const looksLikeJson =
    contentType.includes('application/json') ||
    contentType.includes('+json') ||
    trimmedBody.startsWith('{') ||
    trimmedBody.startsWith('[')

  if (!looksLikeJson) {
    if (!response.ok) {
      return buildFallbackApiFailure(response.status) as T
    }

    throw new Error(INVALID_RESPONSE_MESSAGE)
  }

  try {
    return JSON.parse(trimmedBody) as T
  } catch {
    if (!response.ok) {
      return buildFallbackApiFailure(response.status) as T
    }

    throw new Error(INVALID_RESPONSE_MESSAGE)
  }
}

// ============================================================
// Global redirect guard — prevents multiple redirect attempts
// and keeps react-query in "loading" state during navigation
// ============================================================
let isRedirectingToLogin = false

/**
 * Sign out and redirect to auth error, returning a never-resolving promise.
 * This keeps react-query in a "loading" state so AuthGuard/AuthRedirect
 * won't fire while the browser is navigating away.
 */
async function redirectToLogin(): Promise<never> {
  if (isRedirectingToLogin) {
    return new Promise<never>(() => {})
  }

  isRedirectingToLogin = true

  try {
    await signOut({ redirect: false })
  } catch (_e) {
    // signOut failure is non-critical, continue with redirect
  }

  window.location.href = `/auth/error?error=session_expired&returnUrl=${encodeURIComponent(window.location.href)}`

  return new Promise<never>(() => {})
}

/**
 * Expands comma-joined integer array query params into repeated params.
 *
 * Orval's fetch client serializes array params via `.toString()`:
 *   userIds=1,2,3  →  userIds=1&userIds=2&userIds=3
 *
 * Only integer-only comma-separated values are expanded to avoid
 * false positives on legitimate string params.
 */
function expandArrayQueryParams(url: string): string {
  const [base, queryString] = url.split('?')

  if (!queryString) return url

  const expanded = queryString
    .split('&')
    .flatMap(part => {
      const eqIdx = part.indexOf('=')

      if (eqIdx === -1) return [part]

      const key = part.slice(0, eqIdx)
      const value = decodeURIComponent(part.slice(eqIdx + 1))
      const segments = value.split(',')

      if (segments.length > 1 && segments.every(s => /^\d+$/.test(s.trim()))) {
        return segments.map(s => `${key}=${encodeURIComponent(s.trim())}`)
      }

      return [part]
    })
    .join('&')

  return `${base}?${expanded}`
}

/**
 * Gateway base URL (public, build-time inlined).
 * Used for browser redirect URLs (SSO check, logout, etc.) — NOT for API calls.
 * API calls go through the BFF proxy at /api/gateway/[...path].
 */
export const GATEWAY_URL = NEXT_PUBLIC_GATEWAY_URL

/**
 * Custom fetch mutator for Orval — BFF Proxy pattern.
 */
export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const normalizedUrl = expandArrayQueryParams(url)
  const requestMethod = (options?.method ?? 'GET').toUpperCase()
  const shouldThrowHookError = requestMethod === 'GET'

  // Server-side (NextAuth callbacks, SSR): call gateway directly — no proxy needed
  if (typeof window === 'undefined') {
    const serverGatewayUrl = process.env.INTERNAL_GATEWAY_URL || GATEWAY_URL

    if (!serverGatewayUrl) {
      throw new Error('[API] Missing INTERNAL_GATEWAY_URL or NEXT_PUBLIC_GATEWAY_URL')
    }

    const fullUrl = normalizedUrl.startsWith('http') ? normalizedUrl : `${serverGatewayUrl}${normalizedUrl}`
    const response = await fetch(fullUrl, { ...options })
    const body = await parseResponseBody<T>(response)

    if (shouldThrowHookError && (!response.ok || isApiEnvelopeFailure(body))) {
      throw body
    }

    return body
  }

  if (isRedirectingToLogin) {
    return new Promise<never>(() => {})
  }

  // Client-side: route through BFF proxy — converts /core/users → /api/gateway/core/users
  const proxyUrl = normalizedUrl.startsWith('http') ? normalizedUrl : `/api/gateway${normalizedUrl}`

  const response = await fetch(proxyUrl, {
    ...options,
    credentials: 'include' // Sends HttpOnly session cookie automatically
  })

  // The proxy already handles token refresh server-side.
  // If we still get 401, it means the session is truly expired.
  if (response.status === 401) {
    // Auth endpoints (login, token) use 401 for invalid credentials — not session expiry.
    // Return the response body so the UI can display the actual error.
    const isAuthEndpoint = url.includes('/auth/sso-login') || url.includes('/auth/token')

    if (isAuthEndpoint) {
      return parseResponseBody<T>(response)
    }

    // Check if the response body indicates a permission error (vs session expired)
    const body = await parseResponseBody<T>(response)
    const apiBody = body as { errors?: Array<{ code?: string }> }
    const isPermissionError = apiBody.errors?.some(e => e.code !== 'UNAUTHORIZED')

    if (isPermissionError) {
      if (shouldThrowHookError && isApiEnvelopeFailure(body)) {
        throw body
      }

      return body
    }

    return redirectToLogin()
  }

  const body = await parseResponseBody<T>(response)

  if (shouldThrowHookError && (!response.ok || isApiEnvelopeFailure(body))) {
    throw body
  }

  return body
}

// Error type for react-query
export type ErrorType<Error> = Error

export default customFetch

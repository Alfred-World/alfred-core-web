import { signOut } from 'next-auth/react'

import { NEXT_PUBLIC_GATEWAY_URL } from './env'
import type { ApiErrorResponse } from '@/generated/core-api'

const isApiEnvelopeFailure = (payload: unknown): payload is ApiErrorResponse => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as ApiErrorResponse

  return candidate.success === false && Array.isArray(candidate.errors)
}

// ============================================================
// Global redirect guard — prevents multiple redirect attempts
// and keeps react-query in "loading" state during navigation
// ============================================================
let isRedirectingToLogin = false

/**
 * Sign out and redirect to login, returning a never-resolving promise.
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

  window.location.href = '/login?error=session_expired'

  return new Promise<never>(() => {})
}

/**
 * Gateway base URL (public, build-time inlined).
 * Used for browser redirect URLs (SSO check, logout, etc.) — NOT for API calls.
 * API calls go through the BFF proxy at /api/gateway/[...path].
 */
export const GATEWAY_URL = NEXT_PUBLIC_GATEWAY_URL

/**
 * Custom fetch mutator for Orval — BFF Proxy pattern.
 *
 * Authentication flow (2 legs):
 *   Leg 1: Browser → Next.js proxy — HttpOnly session cookie (automatic, anti-XSS)
 *   Leg 2: Next.js proxy → Gateway — JWT Authorization header (server-side only)
 *
 * The browser NEVER sees the JWT access token. It is kept inside the
 * encrypted NextAuth session cookie (HttpOnly, Secure).
 *
 * The proxy handles token refresh server-side. If the proxy returns 401,
 * the token is truly invalid (refresh also failed) — redirect to login.
 *
 * @example
 * const response = await postApiAuthLogin({ identity, password })
 *
 * if (!response.success) {
 *   console.log(response.errors[0].message)
 *   return
 * }
 * console.log(response.result)
 */
export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const requestMethod = (options?.method ?? 'GET').toUpperCase()
  const shouldThrowHookError = requestMethod === 'GET'

  // Server-side (NextAuth callbacks, SSR): call gateway directly — no proxy needed
  if (typeof window === 'undefined') {
    const serverGatewayUrl = process.env.INTERNAL_GATEWAY_URL || GATEWAY_URL
    const fullUrl = url.startsWith('http') ? url : `${serverGatewayUrl}${url}`

    const response = await fetch(fullUrl, { ...options })
    const body = (await response.json()) as T

    if (shouldThrowHookError && (!response.ok || isApiEnvelopeFailure(body))) {
      throw body
    }

    return body
  }

  if (isRedirectingToLogin) {
    return new Promise<never>(() => {})
  }

  // Client-side: route through BFF proxy — converts /core/users → /api/gateway/core/users
  const proxyUrl = url.startsWith('http') ? url : `/api/gateway${url}`

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
      return response.json() as Promise<T>
    }

    // Check if the response body indicates a permission error (vs session expired)
    const body = (await response.json()) as T
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

  const body = (await response.json()) as T

  if (shouldThrowHookError && (!response.ok || isApiEnvelopeFailure(body))) {
    throw body
  }

  return body
}

// Error type for react-query
export type ErrorType<Error> = Error

export default customFetch

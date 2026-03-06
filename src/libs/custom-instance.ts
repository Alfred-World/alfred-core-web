import { signOut } from 'next-auth/react'

import { NEXT_PUBLIC_GATEWAY_URL } from './env'

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
 * Base interface for API return types with common properties.
 */
export interface ApiReturnBase {
  success: boolean
  message?: string
}

/**
 * Success return type with result data.
 * When success is true, result is guaranteed to be present.
 * @template T - The result type
 */
export interface ApiReturnSuccess<T> extends ApiReturnBase {
  success: true
  result: T
}

/**
 * Failure return type with error information.
 * When success is false, errors array is guaranteed to be present.
 */
export interface ApiReturnFailure extends ApiReturnBase {
  success: false
  errors: Array<{ message: string; code?: string }>
}

/**
 * Discriminated union type for API responses.
 * @template T - The success result type
 */
export type ApiReturn<T> = ApiReturnSuccess<T> | ApiReturnFailure

/**
 * Helper type to extract result type from generated API response
 * Converts SomeApiSuccessResponse to ApiReturn<ResultType>
 */
export type ToApiReturn<T> = T extends { result?: infer R | null } ? ApiReturn<NonNullable<R>> : ApiReturn<T>

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
  // Server-side (NextAuth callbacks, SSR): call gateway directly — no proxy needed
  if (typeof window === 'undefined') {
    const serverGatewayUrl = process.env.INTERNAL_GATEWAY_URL || GATEWAY_URL
    const fullUrl = url.startsWith('http') ? url : `${serverGatewayUrl}${url}`

    const response = await fetch(fullUrl, { ...options })

    return response.json() as Promise<T>
  }

  if (isRedirectingToLogin) {
    return new Promise<never>(() => {})
  }

  // Client-side: route through BFF proxy — converts /core/users → /api/gateway/core/users
  const proxyUrl = url.startsWith('http') ? url : `/api/gateway${url}`

  const response = await fetch(proxyUrl, {
    ...options,
    credentials: 'include', // Sends HttpOnly session cookie automatically
  })

  // The proxy already handles token refresh server-side.
  // If we still get 401, it means the session is truly expired.
  if (response.status === 401) {
    // Check if the response body indicates a permission error (vs session expired)
    const body = await response.json() as T
    const apiBody = body as { errors?: Array<{ code?: string }> }
    const isPermissionError = apiBody.errors?.some(e => e.code !== 'UNAUTHORIZED')

    if (isPermissionError) {
      return body
    }

    return redirectToLogin()
  }

  // For all responses (including 4xx/5xx), return JSON body
  // so react-query can use success/errors for type narrowing
  return response.json() as Promise<T>
}

// Error type for react-query
export type ErrorType<Error> = Error

export default customFetch

import { getSession } from 'next-auth/react'

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

/** Gateway base URL */
export const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://gateway.test'

// Track if we're currently refreshing the session
let isRefreshing = false
let refreshPromise: Promise<unknown> | null = null

/**
 * Force refresh the NextAuth session to get new tokens
 */
async function forceRefreshSession() {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'include'
  }).finally(() => {
    isRefreshing = false
    refreshPromise = null
  })

  return refreshPromise
}

/**
 * Get authorization headers from NextAuth session.
 * Redirects to login if session is expired.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') return {}

  const session = await getSession()

  if (session?.error === 'RefreshAccessTokenError') {
    window.location.href = '/login?error=session_expired'
    throw new Error('Session expired, redirecting to login')
  }

  if (session?.accessToken) {
    return { Authorization: `Bearer ${session.accessToken}` }
  }

  return {}
}

/**
 * Custom fetch mutator for Orval (pure fetch, no axios).
 *
 * Authentication flow:
 * 1. User logs in via SSO OAuth flow -> NextAuth stores tokens in session
 * 2. Before each request, token is fetched from NextAuth session
 * 3. Token is added to Authorization header
 * 4. On 401, session is refreshed and request is retried once
 *
 * Error handling:
 * - On 2xx: returns parsed JSON body as T
 * - On 4xx/5xx with JSON body: returns error body as T
 *   (which has { success: false, errors: [...] })
 * - On network error (no response): re-throws
 *
 * @example
 * const response = await postApiAuthLogin({ identity, password })
 *
 * if (!response.success) {
 *   console.log(response.errors[0].message)
 *   return
 * }
 * console.log(response.result.accessToken)
 */
export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const authHeaders = await getAuthHeaders()

  const fullUrl = url.startsWith('http') ? url : `${GATEWAY_URL}${url}`

  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers: {
      ...options?.headers,
      ...authHeaders
    }
  })

  // Handle 401: refresh session and retry once
  if (response.status === 401 && typeof window !== 'undefined') {
    await forceRefreshSession()
    const freshAuthHeaders = await getAuthHeaders()

    const retryResponse = await fetch(fullUrl, {
      ...options,
      credentials: 'include',
      headers: {
        ...options?.headers,
        ...freshAuthHeaders
      }
    })

    if (retryResponse.status === 401) {
      window.location.href = '/login?error=session_expired'
      throw new Error('Session expired, redirecting to login')
    }

    return retryResponse.json() as Promise<T>
  }

  // For non-2xx responses, still return the JSON body so react-query
  // can use success/errors for type narrowing
  return response.json() as Promise<T>
}

// Error type for react-query
export type ErrorType<Error> = Error

export default customFetch

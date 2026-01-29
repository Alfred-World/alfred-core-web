import type { AxiosError, AxiosRequestConfig } from 'axios'
import axios from 'axios'
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

/**
 * Axios instance with base configuration
 * 
 * Authentication flow:
 * 1. User logs in via SSO OAuth flow -> NextAuth stores tokens in session
 * 2. Request interceptor gets token from NextAuth session
 * 3. Token is added to Authorization header for API calls
 * 4. Token refresh is handled automatically by NextAuth
 */
export const AXIOS_INSTANCE = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL,
  withCredentials: true, // Send cookies with requests
  paramsSerializer: params => {
    const searchParams = new URLSearchParams()

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value))
      }
    })

    return searchParams.toString()
  }
})

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

// Request interceptor to add Authorization header from NextAuth session
AXIOS_INSTANCE.interceptors.request.use(async config => {
  // Only run on client side
  if (typeof window !== 'undefined') {
    const session = await getSession()

    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`
    }

    // Check if session has error (token refresh failed)
    if (session?.error === 'RefreshAccessTokenError') {
      // Session is invalid, redirect to login
      window.location.href = '/login?error=session_expired'
      throw new axios.Cancel('Session expired, redirecting to login')
    }
  }

  return config
})

// Response interceptor to handle 401 and retry with refreshed token
AXIOS_INSTANCE.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // If 401 and we haven't retried yet, try to refresh session
    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      originalRequest._retry = true

      // Force refresh the session
      await forceRefreshSession()

      // Get fresh session
      const session = await getSession()

      if (session?.accessToken) {
        // Retry with new token
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${session.accessToken}`
        }
        return AXIOS_INSTANCE(originalRequest)
      }

      // Still no token after refresh, redirect to login
      window.location.href = '/login?error=session_expired'
      throw new axios.Cancel('Session expired, redirecting to login')
    }

    return Promise.reject(error)
  }
)

/**
 * Custom instance for Orval - returns unified ApiReturn type automatically
 * No need to wrap API calls, just use directly:
 *
 * @example
 *
 * const response = await postApiAuthLogin({ identity, password })
 *
 * if (!response.success) {
 *   console.log(response.errors[0].message)
 *   return
 * }
 * console.log(response.result.accessToken)
 *
 */
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<ToApiReturn<T>> => {
  // eslint-disable-next-line import/no-named-as-default-member
  const source = axios.CancelToken.source()

  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token
  })
    .then(({ data }) => {
      return data as ToApiReturn<T>
    })
    .catch((error: AxiosError) => {
      // Handle cancelled requests
      if (axios.isCancel(error)) {
        throw error
      }

      const responseData = error.response?.data as
        | {
          success?: boolean
          message?: string
          errors?: Array<{ message: string; code?: string }>
        }
        | undefined

      // If BE already returned error format, use it
      if (responseData && responseData.success === false && responseData.errors) {
        return responseData as ToApiReturn<T>
      }

      // Create unified error response
      const errorResponse: ApiReturnFailure = {
        success: false,
        errors: [
          {
            message: responseData?.message || error.message || 'An unexpected error occurred',
            code: error.code || 'UNKNOWN_ERROR'
          }
        ]
      }

      return errorResponse as ToApiReturn<T>
    })

  // @ts-expect-error adding cancel method to promise
  promise.cancel = () => {
    source.cancel('Query was cancelled')
  }

  return promise
}

export default customInstance

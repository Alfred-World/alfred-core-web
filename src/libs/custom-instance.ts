import type { AxiosError, AxiosRequestConfig } from 'axios'
import axios from 'axios'

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
 */
export const AXIOS_INSTANCE = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL,
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

// Add request interceptor for auth token
AXIOS_INSTANCE.interceptors.request.use(config => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

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

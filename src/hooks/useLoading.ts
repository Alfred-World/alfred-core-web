import { useState, useCallback } from 'react'

/**
 * A hook to manage loading states for async operations.
 *
 * @returns {Object} An object containing the loading state and a wrapper function.
 */
export const useLoading = (initialState: boolean = false) => {
  const [isLoading, setIsLoading] = useState(initialState)

  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    setIsLoading(true)

    try {
      return await asyncFn()
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    setIsLoading,
    withLoading
  }
}

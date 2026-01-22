'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

// Context
interface LoadingContextType {
  isLoading: boolean
  setLoading: (loading: boolean) => void
  showLoader: () => void
  hideLoader: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

// Hook
export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

// Provider Component
interface LoadingProviderProps {
  children: ReactNode
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false)

  const setLoading = (loading: boolean) => setIsLoading(loading)
  const showLoader = () => setIsLoading(true)
  const hideLoader = () => setIsLoading(false)

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, showLoader, hideLoader }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-backgroundPaper/80 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      )}
    </LoadingContext.Provider>
  )
}

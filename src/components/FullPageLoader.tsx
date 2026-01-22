'use client'

/**
 * Full page loading spinner - standalone component for simple use cases
 */
export default function FullPageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  )
}

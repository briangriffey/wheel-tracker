'use client'

import { useEffect } from 'react'
import { ErrorMessage } from '@/components/ui/error-message'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Auth error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <ErrorMessage
          title="Authentication Error"
          message={
            error.message ||
            'Unable to process your authentication request. Please try again.'
          }
          onRetry={reset}
        />
      </div>
    </div>
  )
}

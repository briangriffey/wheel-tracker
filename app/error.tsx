'use client'

import { useEffect } from 'react'
import { ErrorMessage } from '@/components/ui/error-message'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Root error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">Oops!</h1>
          <p className="text-neutral-600">Something went wrong</p>
        </div>
        <ErrorMessage
          title="Application Error"
          message={
            error.message ||
            'An unexpected error occurred. Please try again or contact support if the problem persists.'
          }
          onRetry={reset}
        />
        <div className="mt-6 text-center">
          <a
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

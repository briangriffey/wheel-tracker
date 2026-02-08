'use client'

import { useEffect } from 'react'
import { ErrorMessage } from '@/components/ui/error-message'

export default function PositionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Positions error:', error)
  }, [error])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ErrorMessage
        title="Positions Error"
        message={
          error.message ||
          'Unable to load your positions. Please try again or check your connection.'
        }
        onRetry={reset}
      />
    </div>
  )
}

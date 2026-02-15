'use client'

import { useEffect } from 'react'
import { ErrorMessage } from '@/components/ui/error-message'

export default function TradesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Trades error:', error)
  }, [error])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ErrorMessage
        title="Trades Error"
        message={
          error.message || 'Unable to load your trades. Please try again or check your connection.'
        }
        onRetry={reset}
      />
    </div>
  )
}

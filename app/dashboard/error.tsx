'use client'

import { useEffect } from 'react'
import { ErrorMessage } from '@/components/ui/error-message'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ErrorMessage
        title="Dashboard Error"
        message={
          error.message ||
          'Unable to load your dashboard. Please try again or check your connection.'
        }
        onRetry={reset}
      />
    </div>
  )
}

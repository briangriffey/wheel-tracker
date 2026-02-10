'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button } from '@/components/design-system/button/button'

export function RefreshPricesButton() {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshPrices = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/market-data/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()

      if (data.success) {
        toast.success(`Refreshed ${data.summary.successful} prices`)
        router.refresh()
      } else {
        toast.error('Failed to refresh prices')
      }
    } catch {
      toast.error('Error refreshing prices')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Button
      onClick={handleRefreshPrices}
      disabled={isRefreshing}
      variant="outline"
      size="md"
      aria-label="Refresh stock prices"
      leftIcon={
        isRefreshing ? (
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      }
    >
      {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
    </Button>
  )
}

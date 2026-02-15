'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/design-system/button/button'
import { FREE_TRADE_LIMIT } from '@/lib/constants'
import { createCheckoutSession } from '@/lib/actions/billing'
import { trackEvent } from '@/lib/analytics'

interface UpgradePromptProps {
  tradesUsed?: number
  onCancel?: () => void
}

export function UpgradePrompt({ tradesUsed, onCancel }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tracked = useRef(false)

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true
      trackEvent('upgrade_prompt_shown', {
        tradesUsed: tradesUsed ?? FREE_TRADE_LIMIT,
        source: 'trade_limit',
      })
    }
  }, [tradesUsed])

  async function handleUpgrade() {
    setLoading(true)
    setError(null)

    const result = await createCheckoutSession('monthly')

    if (result.success) {
      window.location.assign(result.data.url)
    } else {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-lg border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-6 text-center"
      role="alert"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <svg
          className="h-6 w-6 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-amber-900">
        {(tradesUsed ?? FREE_TRADE_LIMIT) > FREE_TRADE_LIMIT
          ? 'Thanks for being an early user!'
          : 'Free trade limit reached'}
      </h3>
      <p className="mt-1 text-sm text-amber-700">
        {(tradesUsed ?? FREE_TRADE_LIMIT) > FREE_TRADE_LIMIT
          ? `You\u2019ve tracked ${tradesUsed} trades with GreekWheel. As we introduce our pricing model, your existing data is safe and always accessible. To continue tracking new trades, upgrade to Pro.`
          : `You\u2019ve used all ${tradesUsed ?? FREE_TRADE_LIMIT} of your free trades.`}
      </p>

      <div className="mt-4 mx-auto max-w-xs text-left">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
          Pro includes
        </p>
        <ul className="space-y-1.5 text-sm text-neutral-700">
          <li className="flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5 text-green-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Unlimited trade tracking
          </li>
          <li className="flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5 text-green-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Full analytics &amp; exports
          </li>
          <li className="flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5 text-green-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Cancel anytime
          </li>
        </ul>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="button" variant="primary" onClick={handleUpgrade} loading={loading}>
          {loading ? 'Redirecting...' : 'Upgrade to Pro \u2014 $8/mo'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => window.location.assign('/pricing')}
        >
          See all plans
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

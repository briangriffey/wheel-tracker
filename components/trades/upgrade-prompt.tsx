'use client'

import React from 'react'
import { Button } from '@/components/design-system/button/button'
import { FREE_TRADE_LIMIT } from '@/lib/constants'

interface UpgradePromptProps {
  tradesUsed?: number
  onCancel?: () => void
}

/**
 * Full upgrade prompt shown when the free trade limit is reached.
 * Replaces the trade form with a clear upgrade CTA.
 */
export function UpgradePrompt({ tradesUsed, onCancel }: UpgradePromptProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center" role="alert">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-amber-900">Free trade limit reached</h3>
      <p className="mt-1 text-sm text-amber-700">
        You&apos;ve used all {tradesUsed ?? FREE_TRADE_LIMIT} of your free trades.
        Upgrade to Pro for unlimited trade tracking.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="primary"
          onClick={() => window.location.assign('/pricing')}
        >
          Upgrade to Pro — $8/mo
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

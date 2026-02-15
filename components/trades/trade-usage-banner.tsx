'use client'

import React from 'react'
import type { TradeUsage } from '@/lib/actions/subscription'

interface TradeUsageBannerProps {
  usage: TradeUsage
}

/**
 * Progressive trade usage banner following PRD thresholds:
 *
 * | Trades Used | UX Treatment |
 * |-------------|--------------|
 * | 1-14        | Hidden — no indication |
 * | 15-17       | Subtle info: "You've used X of 20 free trades." |
 * | 18          | Warning: "2 trades remaining. Upgrade for unlimited tracking." |
 * | 19          | Prominent: "1 trade remaining. After this, you'll need to upgrade." |
 * | 20+         | Hidden — UpgradePrompt handles this state |
 * | PRO         | Hidden — clean experience |
 */
export function TradeUsageBanner({ usage }: TradeUsageBannerProps) {
  // PRO users and users who hit the limit see nothing (UpgradePrompt handles limit)
  if (usage.tier === 'PRO' || usage.limitReached) {
    return null
  }

  const { tradesUsed, tradeLimit, remaining } = usage

  // 1-14 trades: no indication
  if (tradesUsed < 15) {
    return null
  }

  // 19 trades: prominent warning
  if (remaining === 1) {
    return (
      <div
        className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        role="alert"
      >
        <span className="font-medium">1 trade remaining.</span>{' '}
        After this, you&apos;ll need to upgrade.
      </div>
    )
  }

  // 18 trades: warning with upgrade nudge
  if (remaining <= 2) {
    return (
      <div
        className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        role="status"
      >
        {remaining} trades remaining.{' '}
        <a href="/pricing" className="font-medium underline hover:text-amber-900">
          Upgrade for unlimited tracking.
        </a>
      </div>
    )
  }

  // 15-17 trades: subtle info banner
  return (
    <div
      className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600"
      role="status"
    >
      You&apos;ve used {tradesUsed} of {tradeLimit} free trades.
    </div>
  )
}

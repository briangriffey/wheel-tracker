'use client'

import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/design-system/button/button'
import { createPortalSession } from '@/lib/actions/billing'
import type { SubscriptionInfo } from '@/lib/actions/billing'
import type { TradeUsage } from '@/lib/actions/subscription'
import { FREE_TRADE_LIMIT } from '@/lib/constants'
import { CheckoutSuccess } from './checkout-success'

interface BillingContentProps {
  subscription: SubscriptionInfo | null
  usage: TradeUsage | null
}

export function BillingContent({ subscription, usage }: BillingContentProps) {
  const searchParams = useSearchParams()
  const isSuccess = searchParams.get('success') === 'true'
  const [loading, setLoading] = useState(false)

  const isPro = subscription?.tier === 'PRO'
  const tradesUsed = usage?.tradesUsed ?? 0
  const remaining = usage?.remaining ?? FREE_TRADE_LIMIT

  async function handleManageBilling() {
    setLoading(true)
    try {
      const result = await createPortalSession()
      if (result.success) {
        window.location.assign(result.data.url)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Checkout Success Celebration */}
      {isSuccess && isPro && <CheckoutSuccess />}

      {/* Current Plan */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-neutral-900">
                {isPro ? 'Pro' : 'Free'}
              </span>
              {isPro && (
                <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                  Active
                </span>
              )}
            </div>
            {isPro && subscription?.currentPeriodEnd && (
              <p className="mt-1 text-sm text-neutral-500">
                {subscription.status === 'canceled'
                  ? `Access until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
              </p>
            )}
          </div>
          {isPro ? (
            <Button variant="outline" onClick={handleManageBilling} loading={loading}>
              Manage Billing
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => window.location.assign('/pricing')}
            >
              Upgrade to Pro
            </Button>
          )}
        </div>
      </div>

      {/* Trade Usage */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Trade Usage</h2>
        {isPro ? (
          <div>
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-neutral-900">{tradesUsed}</span> trades recorded
            </p>
            <p className="mt-1 text-sm text-neutral-500">Unlimited trades with Pro</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-600">
                <span className="font-medium text-neutral-900">{tradesUsed}</span> of {FREE_TRADE_LIMIT} free trades used
              </p>
              <span className="text-sm text-neutral-500">{remaining} remaining</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  tradesUsed >= FREE_TRADE_LIMIT
                    ? 'bg-red-500'
                    : tradesUsed >= 15
                      ? 'bg-amber-500'
                      : 'bg-primary-500'
                }`}
                style={{ width: `${Math.min(100, (tradesUsed / FREE_TRADE_LIMIT) * 100)}%` }}
              />
            </div>
            {usage?.limitReached && (
              <p className="mt-2 text-sm text-amber-700">
                {tradesUsed > FREE_TRADE_LIMIT
                  ? `Thanks for being an early GreekWheel user! Your ${tradesUsed} trades are safe and always accessible. `
                  : 'You\u2019ve reached the free trade limit. '}
                <a href="/pricing" className="font-medium underline hover:text-amber-900">
                  Upgrade to Pro
                </a>{' '}
                for unlimited trades.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

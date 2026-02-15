'use client'

import React, { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/design-system/button/button'
import { createCheckoutSession } from '@/lib/actions/billing'
import { trackEvent } from '@/lib/analytics'
import { PLANS } from '@/lib/stripe'

interface PricingToggleProps {
  isLoggedIn: boolean
  freeFeatures: string[]
  proFeatures: string[]
}

export function PricingToggle({ isLoggedIn, freeFeatures, proFeatures }: PricingToggleProps) {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)

  const monthlyPrice = PLANS.monthly.amount / 100 // amount is in cents so divide by 100
  const annualPrice = PLANS.annual.amount / 100 // amount is in cents so divide by 100
  const annualMonthly = annualPrice / 12

  async function handleStartPro() {
    if (!isLoggedIn) {
      window.location.assign('/register')
      return
    }

    setLoading(true)
    try {
      trackEvent('checkout_started', { plan: interval, source: 'pricing_page' })
      const result: Awaited<ReturnType<typeof createCheckoutSession>> =
        await createCheckoutSession(interval)

      console.log(`Received back checkout session ${JSON.stringify(result)}`)
      if (result.success) {
        window.location.assign(result.data.url)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span
            className={`text-sm font-medium ${interval === 'monthly' ? 'text-neutral-900' : 'text-neutral-500'}`}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={interval === 'annual'}
            aria-label="Toggle annual billing"
            onClick={() => setInterval(interval === 'monthly' ? 'annual' : 'monthly')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${interval === 'annual' ? 'bg-primary-500' : 'bg-neutral-300'
              }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${interval === 'annual' ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${interval === 'annual' ? 'text-neutral-900' : 'text-neutral-500'}`}
          >
            Annual
          </span>
          {interval === 'annual' && (
            <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
              Save 25%
            </span>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="rounded-2xl border-2 border-neutral-200 bg-white p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-neutral-900">Free</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Perfect for learning the wheel
              </p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-neutral-900">$0</span>
              <span className="text-neutral-500 ml-1">/month</span>
            </div>
            <div className="mb-8">
              {isLoggedIn ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.assign('/dashboard')}
                >
                  Current Plan
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.assign('/register')}
                >
                  Get Started Free
                </Button>
              )}
            </div>
            <ul className="space-y-3">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Tier */}
          <div className="rounded-2xl border-2 border-primary-500 bg-white p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">
                Most Popular
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-neutral-900">Pro</h3>
              <p className="mt-1 text-sm text-neutral-500">
                For serious wheel traders
              </p>
            </div>
            <div className="mb-6">
              {interval === 'monthly' ? (
                <>
                  <span className="text-4xl font-bold text-neutral-900">${monthlyPrice}</span>
                  <span className="text-neutral-500 ml-1">/month</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold text-neutral-900">${annualMonthly}</span>
                  <span className="text-neutral-500 ml-1">/month</span>
                  <p className="text-sm text-neutral-500 mt-1">
                    ${annualPrice} billed annually
                  </p>
                </>
              )}
            </div>
            <div className="mb-8">
              <Button
                variant="primary"
                className="w-full"
                onClick={handleStartPro}
                loading={loading}
              >
                Start Pro — ${interval === 'monthly' ? `${monthlyPrice}/mo` : `${annualPrice}/yr`}
              </Button>
            </div>
            <ul className="space-y-3">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-sm text-neutral-500 mt-8">
          No credit card required to start. Cancel anytime.
        </p>
      </div>
    </section>
  )
}

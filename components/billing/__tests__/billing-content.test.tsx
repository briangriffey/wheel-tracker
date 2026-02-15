import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillingContent } from '../billing-content'

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}))

vi.mock('@/lib/actions/billing', () => ({
  createPortalSession: vi.fn(),
}))

vi.mock('../checkout-success', () => ({
  CheckoutSuccess: () => <div data-testid="checkout-success">Success!</div>,
}))

import { useSearchParams } from 'next/navigation'
import { createPortalSession } from '@/lib/actions/billing'

const mockUseSearchParams = vi.mocked(useSearchParams)
const mockCreatePortalSession = vi.mocked(createPortalSession)

describe('BillingContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSearchParams.mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)
    Object.defineProperty(window, 'location', {
      value: { assign: vi.fn() },
      writable: true,
    })
  })

  it('renders free plan for free users', () => {
    render(
      <BillingContent
        subscription={{ tier: 'FREE', status: null, currentPeriodEnd: null, stripeCustomerId: null }}
        usage={{ tradesUsed: 5, tradeLimit: 20, tier: 'FREE', remaining: 15, limitReached: false }}
      />
    )

    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument()
  })

  it('shows trade usage with progress bar for free users', () => {
    render(
      <BillingContent
        subscription={{ tier: 'FREE', status: null, currentPeriodEnd: null, stripeCustomerId: null }}
        usage={{ tradesUsed: 12, tradeLimit: 20, tier: 'FREE', remaining: 8, limitReached: false }}
      />
    )

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText(/8 remaining/)).toBeInTheDocument()
  })

  it('shows Pro plan details for pro users', () => {
    render(
      <BillingContent
        subscription={{
          tier: 'PRO',
          status: 'active',
          currentPeriodEnd: new Date('2026-03-14'),
          stripeCustomerId: 'cus_123',
        }}
        usage={{ tradesUsed: 50, tradeLimit: Infinity, tier: 'PRO', remaining: Infinity, limitReached: false }}
      />
    )

    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Manage Billing')).toBeInTheDocument()
  })

  it('shows success celebration when success param and pro tier', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('success=true') as ReturnType<typeof useSearchParams>
    )

    render(
      <BillingContent
        subscription={{
          tier: 'PRO',
          status: 'active',
          currentPeriodEnd: new Date('2026-03-14'),
          stripeCustomerId: 'cus_123',
        }}
        usage={{ tradesUsed: 50, tradeLimit: Infinity, tier: 'PRO', remaining: Infinity, limitReached: false }}
      />
    )

    expect(screen.getByTestId('checkout-success')).toBeInTheDocument()
  })

  it('does not show success celebration for free users even with param', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('success=true') as ReturnType<typeof useSearchParams>
    )

    render(
      <BillingContent
        subscription={{ tier: 'FREE', status: null, currentPeriodEnd: null, stripeCustomerId: null }}
        usage={{ tradesUsed: 5, tradeLimit: 20, tier: 'FREE', remaining: 15, limitReached: false }}
      />
    )

    expect(screen.queryByTestId('checkout-success')).not.toBeInTheDocument()
  })

  it('calls createPortalSession when manage button is clicked', async () => {
    mockCreatePortalSession.mockResolvedValueOnce({
      success: true,
      data: { url: 'https://billing.stripe.com/portal' },
    })

    const user = userEvent.setup()
    render(
      <BillingContent
        subscription={{
          tier: 'PRO',
          status: 'active',
          currentPeriodEnd: new Date('2026-03-14'),
          stripeCustomerId: 'cus_123',
        }}
        usage={{ tradesUsed: 50, tradeLimit: Infinity, tier: 'PRO', remaining: Infinity, limitReached: false }}
      />
    )

    await user.click(screen.getByRole('button', { name: /manage billing/i }))
    expect(mockCreatePortalSession).toHaveBeenCalled()
    expect(window.location.assign).toHaveBeenCalledWith('https://billing.stripe.com/portal')
  })

  it('shows canceled status with access end date', () => {
    render(
      <BillingContent
        subscription={{
          tier: 'PRO',
          status: 'canceled',
          currentPeriodEnd: new Date('2026-04-01'),
          stripeCustomerId: 'cus_123',
        }}
        usage={{ tradesUsed: 30, tradeLimit: Infinity, tier: 'PRO', remaining: Infinity, limitReached: false }}
      />
    )

    expect(screen.getByText(/Access until/)).toBeInTheDocument()
  })

  it('shows limit reached message with upgrade link', () => {
    render(
      <BillingContent
        subscription={{ tier: 'FREE', status: null, currentPeriodEnd: null, stripeCustomerId: null }}
        usage={{ tradesUsed: 20, tradeLimit: 20, tier: 'FREE', remaining: 0, limitReached: true }}
      />
    )

    expect(screen.getByText(/reached the free trade limit/)).toBeInTheDocument()
  })
})

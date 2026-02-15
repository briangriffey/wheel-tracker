import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpgradePrompt } from '../upgrade-prompt'

vi.mock('@/lib/actions/billing', () => ({
  createCheckoutSession: vi.fn(),
}))

import { createCheckoutSession } from '@/lib/actions/billing'

const mockCreateCheckoutSession = vi.mocked(createCheckoutSession)

describe('UpgradePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      value: { assign: vi.fn() },
      writable: true,
    })
  })

  it('renders the limit reached heading', () => {
    render(<UpgradePrompt />)
    expect(screen.getByText('Free trade limit reached')).toBeInTheDocument()
  })

  it('shows the default trade count when tradesUsed is not provided', () => {
    render(<UpgradePrompt />)
    expect(screen.getByText(/all 20 of your free trades/)).toBeInTheDocument()
  })

  it('shows the actual trade count when tradesUsed is provided', () => {
    render(<UpgradePrompt tradesUsed={23} />)
    expect(screen.getByText(/all 23 of your free trades/)).toBeInTheDocument()
  })

  it('renders the upgrade CTA button', () => {
    render(<UpgradePrompt />)
    const button = screen.getByRole('button', { name: /upgrade to pro/i })
    expect(button).toBeInTheDocument()
  })

  it('calls createCheckoutSession and redirects on success', async () => {
    mockCreateCheckoutSession.mockResolvedValueOnce({
      success: true,
      data: { url: 'https://checkout.stripe.com/test' },
    })

    const user = userEvent.setup()
    render(<UpgradePrompt />)

    await user.click(screen.getByRole('button', { name: /upgrade to pro/i }))
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith('monthly')
    expect(window.location.assign).toHaveBeenCalledWith('https://checkout.stripe.com/test')
  })

  it('shows error when checkout fails', async () => {
    mockCreateCheckoutSession.mockResolvedValueOnce({
      success: false,
      error: 'Payment failed',
    })

    const user = userEvent.setup()
    render(<UpgradePrompt />)

    await user.click(screen.getByRole('button', { name: /upgrade to pro/i }))
    expect(await screen.findByText('Payment failed')).toBeInTheDocument()
  })

  it('renders "See all plans" link', () => {
    render(<UpgradePrompt />)
    expect(screen.getByRole('button', { name: /see all plans/i })).toBeInTheDocument()
  })

  it('shows Pro feature list', () => {
    render(<UpgradePrompt />)
    expect(screen.getByText('Unlimited trade tracking')).toBeInTheDocument()
    expect(screen.getByText(/Full analytics/)).toBeInTheDocument()
    expect(screen.getByText('Cancel anytime')).toBeInTheDocument()
  })

  it('renders cancel button when onCancel is provided', () => {
    const onCancel = vi.fn()
    render(<UpgradePrompt onCancel={onCancel} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('does not render cancel button when onCancel is not provided', () => {
    render(<UpgradePrompt />)
    expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<UpgradePrompt onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('has role="alert" for accessibility', () => {
    render(<UpgradePrompt />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

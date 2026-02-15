import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpgradePrompt } from '../upgrade-prompt'

describe('UpgradePrompt', () => {
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

  it('navigates to /pricing when upgrade button is clicked', async () => {
    const assignMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { assign: assignMock },
      writable: true,
    })

    const user = userEvent.setup()
    render(<UpgradePrompt />)

    await user.click(screen.getByRole('button', { name: /upgrade to pro/i }))
    expect(assignMock).toHaveBeenCalledWith('/pricing')
  })

  it('renders cancel button when onCancel is provided', () => {
    const onCancel = vi.fn()
    render(<UpgradePrompt onCancel={onCancel} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('does not render cancel button when onCancel is not provided', () => {
    render(<UpgradePrompt />)
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<UpgradePrompt onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('has role="alert" for accessibility', () => {
    render(<UpgradePrompt />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

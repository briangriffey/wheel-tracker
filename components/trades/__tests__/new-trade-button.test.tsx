import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewTradeButton } from '../new-trade-button'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock the TradeEntryForm component
vi.mock('@/components/forms/trade-entry-form', () => ({
  TradeEntryForm: ({
    onSuccess,
    onCancel,
  }: {
    onSuccess?: () => void
    onCancel?: () => void
  }) => (
    <div data-testid="trade-entry-form">
      <button onClick={onSuccess} data-testid="form-submit">
        Submit
      </button>
      <button onClick={onCancel} data-testid="form-cancel">
        Cancel
      </button>
    </div>
  ),
}))

describe('NewTradeButton', () => {
  it('renders the new trade button', () => {
    render(<NewTradeButton />)
    const button = screen.getByRole('button', { name: /new trade/i })
    expect(button).toBeInTheDocument()
  })

  it('opens modal when button is clicked', async () => {
    const user = userEvent.setup()
    render(<NewTradeButton />)

    const button = screen.getByRole('button', { name: /new trade/i })
    await user.click(button)

    // Modal should be open with form
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Create New Trade')).toBeInTheDocument()
      expect(screen.getByTestId('trade-entry-form')).toBeInTheDocument()
    })
  })

  it('closes modal when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<NewTradeButton />)

    // Open modal
    const button = screen.getByRole('button', { name: /new trade/i })
    await user.click(button)

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Click cancel
    const cancelButton = screen.getByTestId('form-cancel')
    await user.click(cancelButton)

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes modal when form is successfully submitted', async () => {
    const user = userEvent.setup()
    render(<NewTradeButton />)

    // Open modal
    const button = screen.getByRole('button', { name: /new trade/i })
    await user.click(button)

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Submit form
    const submitButton = screen.getByTestId('form-submit')
    await user.click(submitButton)

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes modal when clicking the X button', async () => {
    const user = userEvent.setup()
    render(<NewTradeButton />)

    // Open modal
    const button = screen.getByRole('button', { name: /new trade/i })
    await user.click(button)

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Click close button
    const closeButton = screen.getByRole('button', { name: /close dialog/i })
    await user.click(closeButton)

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('has proper accessibility attributes', () => {
    render(<NewTradeButton />)
    const button = screen.getByRole('button', { name: /new trade/i })

    expect(button).toHaveAttribute('aria-label', 'Create new trade')
  })
})

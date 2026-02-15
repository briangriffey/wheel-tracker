import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WithdrawalForm } from '../withdrawal-form'
import * as depositsActions from '@/lib/actions/deposits'
import * as depositPreviewActions from '@/lib/actions/deposit-preview'

// Mock the actions
vi.mock('@/lib/actions/deposits', () => ({
  recordCashWithdrawal: vi.fn(),
}))

vi.mock('@/lib/actions/deposit-preview', () => ({
  calculateWithdrawalPreview: vi.fn(),
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('WithdrawalForm', () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the withdrawal form with all fields', () => {
    render(<WithdrawalForm />)

    expect(screen.getByRole('spinbutton', { name: /withdrawal amount/i })).toBeInTheDocument()
    expect(document.getElementById('depositDate')).toBeInTheDocument()
    expect(document.getElementById('notes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /record withdrawal/i })).toBeInTheDocument()
  })

  it('renders cancel button when onCancel prop is provided', () => {
    render(<WithdrawalForm onCancel={mockOnCancel} />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('does not render cancel button when onCancel prop is not provided', () => {
    render(<WithdrawalForm />)

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<WithdrawalForm onCancel={mockOnCancel} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('calculates preview when amount and date are entered', async () => {
    const user = userEvent.setup()
    const mockPreview = {
      success: true as const,
      data: {
        spyPrice: 450.25,
        spyShares: -2.2206,
        priceDate: new Date('2024-01-15'),
        netInvested: 5000,
        remainingAfterWithdrawal: 4000,
      },
    }

    vi.mocked(depositPreviewActions.calculateWithdrawalPreview).mockResolvedValue(mockPreview)

    render(<WithdrawalForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /withdrawal amount/i })
    const dateInput = document.getElementById('depositDate')!

    await user.type(amountInput, '1000')
    await user.type(dateInput, '2024-01-15')

    // Wait for debounce and preview calculation
    await waitFor(
      () => {
        expect(depositPreviewActions.calculateWithdrawalPreview).toHaveBeenCalledWith(
          1000,
          expect.any(Date)
        )
      },
      { timeout: 2000 }
    )

    await waitFor(() => {
      expect(screen.getByText(/preview calculation/i)).toBeInTheDocument()
      expect(screen.getByText(/current net invested:/i)).toBeInTheDocument()
      expect(screen.getByText(/\$5000\.00/)).toBeInTheDocument()
      expect(screen.getByText(/remaining invested:/i)).toBeInTheDocument()
      expect(screen.getByText(/\$4000\.00/)).toBeInTheDocument()
    })
  })

  it('shows loading state while calculating preview', async () => {
    const user = userEvent.setup()

    // Mock a delayed response
    vi.mocked(depositPreviewActions.calculateWithdrawalPreview).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                success: true as const,
                data: {
                  spyPrice: 450.25,
                  spyShares: -2.2206,
                  priceDate: new Date('2024-01-15'),
                  netInvested: 5000,
                  remainingAfterWithdrawal: 4000,
                },
              }),
            2000
          )
        })
    )

    render(<WithdrawalForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /withdrawal amount/i })
    await user.type(amountInput, '1000')

    // Wait for the calculating state to appear
    await waitFor(
      () => {
        expect(screen.getByText(/calculating/i)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('shows error when preview calculation fails (exceeds invested amount)', async () => {
    const user = userEvent.setup()

    vi.mocked(depositPreviewActions.calculateWithdrawalPreview).mockResolvedValue({
      success: false as const,
      error: 'Cannot withdraw $6000.00. You have only invested $5000.00 total.',
    })

    render(<WithdrawalForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /withdrawal amount/i })
    await user.type(amountInput, '6000')

    // Wait for error to appear
    await waitFor(
      () => {
        expect(screen.getByText(/cannot withdraw/i)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('shows error when SPY price fetch fails', async () => {
    const user = userEvent.setup()

    vi.mocked(depositPreviewActions.calculateWithdrawalPreview).mockResolvedValue({
      success: false as const,
      error: 'Failed to fetch SPY price',
    })

    render(<WithdrawalForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /withdrawal amount/i })
    await user.type(amountInput, '1000')

    // Wait for error to appear
    await waitFor(
      () => {
        expect(screen.getByText(/failed to fetch spy price/i)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()

    vi.mocked(depositsActions.recordCashWithdrawal).mockResolvedValue({
      success: true as const,
      data: {
        id: 'test-id',
        userId: 'user-id',
        amount: -1000,
        type: 'WITHDRAWAL',
        depositDate: new Date('2024-01-15'),
        notes: 'Test withdrawal',
        spyPrice: 450.25,
        spyShares: -2.2206,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    render(<WithdrawalForm onSuccess={mockOnSuccess} />)

    const amountInput = screen.getByRole('spinbutton', { name: /withdrawal amount/i })
    const dateInput = document.getElementById('depositDate')!
    const notesInput = document.getElementById('notes')!

    await user.clear(amountInput)
    await user.type(amountInput, '1000')
    await user.clear(dateInput)
    await user.type(dateInput, '2024-01-15')
    await user.type(notesInput, 'Test withdrawal')

    // Wait a bit for any debouncing or validation
    await new Promise((resolve) => setTimeout(resolve, 100))

    const submitButton = screen.getByRole('button', { name: /record withdrawal/i })
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(depositsActions.recordCashWithdrawal).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 1000,
            notes: 'Test withdrawal',
          })
        )
      },
      { timeout: 2000 }
    )

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('shows error message when submission fails', async () => {
    const user = userEvent.setup()

    vi.mocked(depositsActions.recordCashWithdrawal).mockResolvedValue({
      success: false as const,
      error: 'Cannot withdraw $6000. You have only invested $5000 total.',
    })

    const toast = await import('react-hot-toast')

    render(<WithdrawalForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /withdrawal amount/i })
    const submitButton = screen.getByRole('button', { name: /record withdrawal/i })

    await user.type(amountInput, '6000')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith(
        'Cannot withdraw $6000. You have only invested $5000 total.'
      )
    })
  })

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup()

    vi.mocked(depositsActions.recordCashWithdrawal).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                success: true as const,
                data: {
                  id: 'test-id',
                  userId: 'user-id',
                  amount: -1000,
                  type: 'WITHDRAWAL',
                  depositDate: new Date(),
                  notes: null,
                  spyPrice: 450.25,
                  spyShares: -2.2206,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              }),
            1000
          )
        })
    )

    render(<WithdrawalForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /withdrawal amount/i })
    const submitButton = screen.getByRole('button', { name: /record withdrawal/i })

    await user.type(amountInput, '1000')
    await user.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/recording withdrawal/i)).toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<WithdrawalForm />)

    const submitButton = screen.getByRole('button', { name: /record withdrawal/i })
    await user.click(submitButton)

    // Form should not submit without required fields
    expect(depositsActions.recordCashWithdrawal).not.toHaveBeenCalled()
  })

  it('does not show preview when amount is zero or negative', async () => {
    const user = userEvent.setup()
    render(<WithdrawalForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /withdrawal amount/i })
    await user.clear(amountInput)
    await user.type(amountInput, '0')

    // Wait a bit to ensure debounce has time to run
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(depositPreviewActions.calculateWithdrawalPreview).not.toHaveBeenCalled()
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()

    vi.mocked(depositsActions.recordCashWithdrawal).mockResolvedValue({
      success: true as const,
      data: {
        id: 'test-id',
        userId: 'user-id',
        amount: -1000,
        type: 'WITHDRAWAL',
        depositDate: new Date(),
        notes: null,
        spyPrice: 450.25,
        spyShares: -2.2206,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    render(<WithdrawalForm />)

    const amountInput = screen.getByRole('spinbutton', {
      name: /withdrawal amount/i,
    }) as HTMLInputElement

    await user.clear(amountInput)
    await user.type(amountInput, '1000')

    // Wait a bit for any debouncing
    await new Promise((resolve) => setTimeout(resolve, 100))

    const submitButton = screen.getByRole('button', { name: /record withdrawal/i })
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(amountInput.value).toBe('')
      },
      { timeout: 2000 }
    )
  })

  it('displays negative SPY shares correctly in preview', async () => {
    const user = userEvent.setup()
    const mockPreview = {
      success: true as const,
      data: {
        spyPrice: 480.0,
        spyShares: -2.0833,
        priceDate: new Date('2024-01-15'),
        netInvested: 10000,
        remainingAfterWithdrawal: 9000,
      },
    }

    vi.mocked(depositPreviewActions.calculateWithdrawalPreview).mockResolvedValue(mockPreview)

    render(<WithdrawalForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /withdrawal amount/i })
    await user.type(amountInput, '1000')

    await waitFor(() => {
      expect(screen.getByText(/2\.0833 shares/)).toBeInTheDocument()
    })
  })
})

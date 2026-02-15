import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DepositForm } from '../deposit-form'
import * as depositsActions from '@/lib/actions/deposits'
import * as depositPreviewActions from '@/lib/actions/deposit-preview'

// Mock the actions
vi.mock('@/lib/actions/deposits', () => ({
  recordCashDeposit: vi.fn(),
}))

vi.mock('@/lib/actions/deposit-preview', () => ({
  calculateDepositPreview: vi.fn(),
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('DepositForm', () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the deposit form with all fields', () => {
    render(<DepositForm />)

    expect(screen.getByRole('spinbutton', { name: /deposit amount/i })).toBeInTheDocument()
    expect(document.getElementById('depositDate')).toBeInTheDocument()
    expect(document.getElementById('notes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /record deposit/i })).toBeInTheDocument()
  })

  it('renders cancel button when onCancel prop is provided', () => {
    render(<DepositForm onCancel={mockOnCancel} />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('does not render cancel button when onCancel prop is not provided', () => {
    render(<DepositForm />)

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<DepositForm onCancel={mockOnCancel} />)

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
        spyShares: 2.2206,
        priceDate: new Date('2024-01-15'),
      },
    }

    vi.mocked(depositPreviewActions.calculateDepositPreview).mockResolvedValue(mockPreview)

    render(<DepositForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /deposit amount/i })
    const dateInput = document.getElementById('depositDate')!

    await user.type(amountInput, '1000')
    await user.type(dateInput, '2024-01-15')

    // Wait for debounce and preview calculation
    await waitFor(
      () => {
        expect(depositPreviewActions.calculateDepositPreview).toHaveBeenCalledWith(
          1000,
          expect.any(Date)
        )
      },
      { timeout: 2000 }
    )

    await waitFor(() => {
      expect(screen.getByText(/preview calculation/i)).toBeInTheDocument()
      expect(screen.getByText(/spy price:/i)).toBeInTheDocument()
      expect(screen.getByText(/2\.2206 shares/)).toBeInTheDocument()
    })
  })

  it('shows loading state while calculating preview', async () => {
    const user = userEvent.setup()

    // Mock a delayed response
    vi.mocked(depositPreviewActions.calculateDepositPreview).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                success: true as const,
                data: {
                  spyPrice: 450.25,
                  spyShares: 2.2206,
                  priceDate: new Date('2024-01-15'),
                },
              }),
            2000
          )
        })
    )

    render(<DepositForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /deposit amount/i })
    await user.type(amountInput, '1000')

    // Wait for the calculating state to appear
    await waitFor(
      () => {
        expect(screen.getByText(/calculating/i)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('shows error when preview calculation fails', async () => {
    const user = userEvent.setup()

    vi.mocked(depositPreviewActions.calculateDepositPreview).mockResolvedValue({
      success: false as const,
      error: 'Failed to fetch SPY price',
    })

    render(<DepositForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /deposit amount/i })
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

    vi.mocked(depositsActions.recordCashDeposit).mockResolvedValue({
      success: true as const,
      data: {
        id: 'test-id',
        userId: 'user-id',
        amount: 1000,
        type: 'DEPOSIT',
        depositDate: new Date('2024-01-15'),
        notes: 'Test deposit',
        spyPrice: 450.25,
        spyShares: 2.2206,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    render(<DepositForm onSuccess={mockOnSuccess} />)

    const amountInput = screen.getByRole('spinbutton', { name: /deposit amount/i })
    const dateInput = document.getElementById('depositDate')!
    const notesInput = document.getElementById('notes')!

    await user.clear(amountInput)
    await user.type(amountInput, '1000')
    await user.clear(dateInput)
    await user.type(dateInput, '2024-01-15')
    await user.type(notesInput, 'Test deposit')

    // Wait a bit for any debouncing or validation
    await new Promise((resolve) => setTimeout(resolve, 100))

    const submitButton = screen.getByRole('button', { name: /record deposit/i })
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(depositsActions.recordCashDeposit).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 1000,
            notes: 'Test deposit',
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

    vi.mocked(depositsActions.recordCashDeposit).mockResolvedValue({
      success: false as const,
      error: 'Failed to record deposit',
    })

    const toast = await import('react-hot-toast')

    render(<DepositForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /deposit amount/i })
    const submitButton = screen.getByRole('button', { name: /record deposit/i })

    await user.type(amountInput, '1000')
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Failed to record deposit')
    })
  })

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup()

    vi.mocked(depositsActions.recordCashDeposit).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                success: true as const,
                data: {
                  id: 'test-id',
                  userId: 'user-id',
                  amount: 1000,
                  type: 'DEPOSIT',
                  depositDate: new Date(),
                  notes: null,
                  spyPrice: 450.25,
                  spyShares: 2.2206,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              }),
            1000
          )
        })
    )

    render(<DepositForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /deposit amount/i })
    const submitButton = screen.getByRole('button', { name: /record deposit/i })

    await user.type(amountInput, '1000')
    await user.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/recording deposit/i)).toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<DepositForm />)

    const submitButton = screen.getByRole('button', { name: /record deposit/i })
    await user.click(submitButton)

    // Form should not submit without required fields
    expect(depositsActions.recordCashDeposit).not.toHaveBeenCalled()
  })

  it('does not show preview when amount is zero or negative', async () => {
    const user = userEvent.setup()
    render(<DepositForm />)

    const amountInput = screen.getByRole('spinbutton', { name: /deposit amount/i })
    await user.clear(amountInput)
    await user.type(amountInput, '0')

    // Wait a bit to ensure debounce has time to run
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(depositPreviewActions.calculateDepositPreview).not.toHaveBeenCalled()
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()

    vi.mocked(depositsActions.recordCashDeposit).mockResolvedValue({
      success: true as const,
      data: {
        id: 'test-id',
        userId: 'user-id',
        amount: 1000,
        type: 'DEPOSIT',
        depositDate: new Date(),
        notes: null,
        spyPrice: 450.25,
        spyShares: 2.2206,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    render(<DepositForm />)

    const amountInput = screen.getByRole('spinbutton', {
      name: /deposit amount/i,
    }) as HTMLInputElement

    await user.clear(amountInput)
    await user.type(amountInput, '1000')

    // Wait a bit for any debouncing
    await new Promise((resolve) => setTimeout(resolve, 100))

    const submitButton = screen.getByRole('button', { name: /record deposit/i })
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(amountInput.value).toBe('')
      },
      { timeout: 2000 }
    )
  })
})

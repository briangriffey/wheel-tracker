import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SellCallDialog, type SellCallPosition } from '../sell-call-dialog'
import * as tradesActions from '@/lib/actions/trades'
import { Toaster } from 'react-hot-toast'

// Mock the trades actions
vi.mock('@/lib/actions/trades', () => ({
  createTrade: vi.fn(),
}))

describe('SellCallDialog', () => {
  const mockPosition: SellCallPosition = {
    id: 'pos_123',
    ticker: 'AAPL',
    shares: 100,
    costBasis: 147.5,
    status: 'OPEN',
    coveredCalls: [],
  }

  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog when open', () => {
    render(
      <>
        <SellCallDialog
          isOpen={true}
          onClose={mockOnClose}
          position={mockPosition}
          onSuccess={mockOnSuccess}
        />
        <Toaster />
      </>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Position Summary')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sell Covered Call/i })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <SellCallDialog
        isOpen={false}
        onClose={mockOnClose}
        position={mockPosition}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('displays position information correctly', () => {
    render(
      <SellCallDialog
        isOpen={true}
        onClose={mockOnClose}
        position={mockPosition}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('$147.50 per share')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // contracts
  })

  it('suggests strike price based on cost basis and desired return', () => {
    render(
      <SellCallDialog
        isOpen={true}
        onClose={mockOnClose}
        position={mockPosition}
        onSuccess={mockOnSuccess}
        desiredReturn={5}
      />
    )

    // Suggested strike should be 147.50 * 1.05 = 154.875 ≈ 154.88
    const strikeInput = screen.getByLabelText(/Strike Price/i) as HTMLInputElement
    expect(strikeInput.value).toBe('154.88')
  })

  it('shows warning when strike price is below cost basis', async () => {
    render(
      <SellCallDialog
        isOpen={true}
        onClose={mockOnClose}
        position={mockPosition}
        onSuccess={mockOnSuccess}
      />
    )

    const strikeInput = screen.getByLabelText(/Strike Price/i)

    // Change strike to below cost basis
    fireEvent.change(strikeInput, { target: { value: '145' } })

    await waitFor(() => {
      expect(screen.getByText(/⚠️ Warning:/)).toBeInTheDocument()
      expect(
        screen.getByText(/Strike price .* is below cost basis/i)
      ).toBeInTheDocument()
    })
  })

  it('prevents selling call when position already has open call', () => {
    const positionWithOpenCall: SellCallPosition = {
      ...mockPosition,
      coveredCalls: [{ status: 'OPEN' }],
    }

    render(
      <SellCallDialog
        isOpen={true}
        onClose={mockOnClose}
        position={positionWithOpenCall}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText(/Cannot sell covered call:/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Position .* already has .* open CALL/i)
    ).toBeInTheDocument()

    const submitButton = screen.getByRole('button', { name: /Sell Covered Call/i })
    expect(submitButton).toBeDisabled()
  })

  it('prevents selling call when position is closed', () => {
    const closedPosition: SellCallPosition = {
      ...mockPosition,
      status: 'CLOSED',
    }

    render(
      <SellCallDialog
        isOpen={true}
        onClose={mockOnClose}
        position={closedPosition}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText(/Cannot sell covered call:/i)).toBeInTheDocument()
    expect(screen.getByText(/Position .* is CLOSED/i)).toBeInTheDocument()
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    const mockCreateTrade = vi.mocked(tradesActions.createTrade)
    mockCreateTrade.mockResolvedValue({
      success: true,
      data: { id: 'trade_456' },
    })

    render(
      <>
        <SellCallDialog
          isOpen={true}
          onClose={mockOnClose}
          position={mockPosition}
          onSuccess={mockOnSuccess}
        />
        <Toaster />
      </>
    )

    // Get a future date (30 days from now)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const futureDateString = futureDate.toISOString().split('T')[0]

    // Fill in form
    const strikeInput = screen.getByLabelText(/Strike Price/i)
    const premiumInput = screen.getByLabelText(/Premium/i)
    const expirationInput = screen.getByLabelText(/Expiration Date/i)

    await user.clear(strikeInput)
    await user.type(strikeInput, '155')
    await user.type(premiumInput, '250')
    await user.type(expirationInput, futureDateString)

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Sell Covered Call/i })
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(mockCreateTrade).toHaveBeenCalledWith(
          expect.objectContaining({
            ticker: 'AAPL',
            type: 'CALL',
            action: 'SELL_TO_OPEN',
            strikePrice: 155,
            premium: 250,
            contracts: 1,
            positionId: 'pos_123',
          })
        )
      },
      { timeout: 3000 }
    )

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('shows error when submission fails', async () => {
    const user = userEvent.setup()
    const mockCreateTrade = vi.mocked(tradesActions.createTrade)
    mockCreateTrade.mockResolvedValue({
      success: false,
      error: 'Failed to create trade',
    })

    render(
      <>
        <SellCallDialog
          isOpen={true}
          onClose={mockOnClose}
          position={mockPosition}
          onSuccess={mockOnSuccess}
        />
        <Toaster />
      </>
    )

    // Get a future date
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const futureDateString = futureDate.toISOString().split('T')[0]

    // Fill in minimal required fields
    const strikeInput = screen.getByLabelText(/Strike Price/i)
    const premiumInput = screen.getByLabelText(/Premium/i)
    const expirationInput = screen.getByLabelText(/Expiration Date/i)

    await user.clear(strikeInput)
    await user.type(strikeInput, '155')
    await user.type(premiumInput, '250')
    await user.type(expirationInput, futureDateString)

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Sell Covered Call/i })
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(mockCreateTrade).toHaveBeenCalled()
      },
      { timeout: 3000 }
    )

    // Wait a bit for callbacks (or lack thereof)
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Should not call success callbacks
    expect(mockOnSuccess).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('closes dialog when cancel button is clicked', () => {
    render(
      <SellCallDialog
        isOpen={true}
        onClose={mockOnClose}
        position={mockPosition}
        onSuccess={mockOnSuccess}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calculates correct number of contracts from shares', () => {
    const positionWith300Shares: SellCallPosition = {
      ...mockPosition,
      shares: 300,
    }

    render(
      <SellCallDialog
        isOpen={true}
        onClose={mockOnClose}
        position={positionWith300Shares}
        onSuccess={mockOnSuccess}
      />
    )

    // 300 shares = 3 contracts
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('allows entering notes', async () => {
    const user = userEvent.setup()
    const mockCreateTrade = vi.mocked(tradesActions.createTrade)
    mockCreateTrade.mockResolvedValue({
      success: true,
      data: { id: 'trade_456' },
    })

    render(
      <>
        <SellCallDialog
          isOpen={true}
          onClose={mockOnClose}
          position={mockPosition}
          onSuccess={mockOnSuccess}
        />
        <Toaster />
      </>
    )

    // Get a future date
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const futureDateString = futureDate.toISOString().split('T')[0]

    const notesInput = screen.getByLabelText(/Notes/i)
    const testNotes = 'Selling call to generate income'

    await user.type(notesInput, testNotes)

    // Fill required fields and submit
    const strikeInput = screen.getByLabelText(/Strike Price/i)
    const premiumInput = screen.getByLabelText(/Premium/i)
    const expirationInput = screen.getByLabelText(/Expiration Date/i)

    await user.clear(strikeInput)
    await user.type(strikeInput, '155')
    await user.type(premiumInput, '250')
    await user.type(expirationInput, futureDateString)

    const submitButton = screen.getByRole('button', { name: /Sell Covered Call/i })
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(mockCreateTrade).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: testNotes,
          })
        )
      },
      { timeout: 3000 }
    )
  })
})

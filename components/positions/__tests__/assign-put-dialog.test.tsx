import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AssignPutDialog } from '../assign-put-dialog'
import * as positionsActions from '@/lib/actions/positions'
import * as pricesActions from '@/lib/actions/prices'
import toast from 'react-hot-toast'

// Mock dependencies
vi.mock('@/lib/actions/positions')
vi.mock('@/lib/actions/prices')
vi.mock('react-hot-toast')

describe('AssignPutDialog', () => {
  const mockTrade = {
    id: 'trade123',
    ticker: 'AAPL',
    type: 'PUT',
    strikePrice: 150,
    premium: 500,
    shares: 100,
    expirationDate: new Date('2026-03-15'),
    status: 'OPEN',
  }

  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnSellCall = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    vi.spyOn(pricesActions, 'getLatestPrice').mockResolvedValue({
      success: false,
      error: 'Price not found',
    })

    vi.spyOn(positionsActions, 'assignPut').mockResolvedValue({
      success: true,
      data: {
        positionId: 'pos123',
        tradeId: 'trade123',
      },
    })
  })

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.queryByText('Mark PUT as Assigned')).not.toBeInTheDocument()
    })

    it('should render dialog when isOpen is true', () => {
      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Mark PUT as Assigned')).toBeInTheDocument()
    })

    it('should display PUT trade details correctly', () => {
      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getAllByText('AAPL')[0]).toBeInTheDocument()
      expect(screen.getAllByText('100')[0]).toBeInTheDocument()
      expect(screen.getAllByText('$150.00').length).toBeGreaterThan(0)
      expect(screen.getAllByText('$500.00').length).toBeGreaterThan(0)
    })
  })

  describe('Cost Calculations', () => {
    it('should calculate cost basis correctly', () => {
      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Cost basis per share = strike - premium/shares = 150 - 500/100 = 145
      const costBasisElements = screen.getAllByText('$145.00')
      expect(costBasisElements.length).toBeGreaterThan(0)
    })

    it('should calculate total cost correctly', () => {
      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Total cost = cost basis * shares = 145 * 100 = 14,500
      // Check if the text includes the formatted value
      const totalCostText = screen.getByText((content, element) => {
        return element?.textContent === '$14,500.00' && element?.tagName === 'SPAN'
      })
      expect(totalCostText).toBeInTheDocument()
    })
  })

  describe('Price Fetching', () => {
    it('should fetch current price when dialog opens', async () => {
      const mockGetLatestPrice = vi.spyOn(pricesActions, 'getLatestPrice')
      mockGetLatestPrice.mockResolvedValue({
        success: true,
        data: {
          ticker: 'AAPL',
          price: 160,
          date: new Date(),
          source: 'test',
          isStale: false,
          ageInHours: 0,
        },
      })

      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      await waitFor(() => {
        expect(mockGetLatestPrice).toHaveBeenCalledWith('AAPL')
      })
    })

    it('should display unrealized P&L when price is available', async () => {
      const mockGetLatestPrice = vi.spyOn(pricesActions, 'getLatestPrice')
      mockGetLatestPrice.mockResolvedValue({
        success: true,
        data: {
          ticker: 'AAPL',
          price: 160,
          date: new Date(),
          source: 'test',
          isStale: false,
          ageInHours: 0,
        },
      })

      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Current Market Value')).toBeInTheDocument()
      })

      // Current value = 160 * 100 = 16,000
      // Total cost = 14,500
      // Unrealized P&L = 16,000 - 14,500 = 1,500
      expect(screen.getByText('$16,000.00')).toBeInTheDocument()
    })

    it('should handle price fetch failure gracefully', async () => {
      const mockGetLatestPrice = vi.spyOn(pricesActions, 'getLatestPrice')
      mockGetLatestPrice.mockResolvedValue({
        success: false,
        error: 'Price not found',
      })

      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      await waitFor(() => {
        expect(mockGetLatestPrice).toHaveBeenCalled()
      })

      // Dialog should still render without price
      expect(screen.getByText('Mark PUT as Assigned')).toBeInTheDocument()
    })
  })

  describe('Assignment Flow', () => {
    it('should call assignPut when Confirm Assignment is clicked', async () => {
      const mockAssignPut = vi.spyOn(positionsActions, 'assignPut')
      mockAssignPut.mockResolvedValue({
        success: true,
        data: {
          positionId: 'pos123',
          tradeId: 'trade123',
        },
      })

      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const confirmButton = screen.getByText('Confirm Assignment')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockAssignPut).toHaveBeenCalledWith({ tradeId: 'trade123' })
      })
    })

    it('should show success toast and call onSuccess when assignment succeeds', async () => {
      const mockAssignPut = vi.spyOn(positionsActions, 'assignPut')
      const mockToastSuccess = vi.spyOn(toast, 'success')

      mockAssignPut.mockResolvedValue({
        success: true,
        data: {
          positionId: 'pos123',
          tradeId: 'trade123',
        },
      })

      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const confirmButton = screen.getByText('Confirm Assignment')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('PUT assigned successfully! Position created.')
        expect(mockOnSuccess).toHaveBeenCalledWith('pos123', 'AAPL', 100)
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should show error toast when assignment fails', async () => {
      const mockAssignPut = vi.spyOn(positionsActions, 'assignPut')
      const mockToastError = vi.spyOn(toast, 'error')

      mockAssignPut.mockResolvedValue({
        success: false,
        error: 'Assignment failed',
      })

      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const confirmButton = screen.getByText('Confirm Assignment')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Assignment failed')
      })
    })

    it('should disable buttons while submitting', async () => {
      const mockAssignPut = vi.spyOn(positionsActions, 'assignPut')
      mockAssignPut.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { positionId: 'pos123', tradeId: 'trade123' },
                }),
              1000
            )
          )
      )

      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const confirmButton = screen.getByText('Confirm Assignment')
      fireEvent.click(confirmButton)

      // Buttons should be disabled during submission
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument()
      })
    })
  })

  describe('Next Step Flow', () => {
    it('should show next step dialog after successful assignment when onSellCall is provided', async () => {
      const mockAssignPut = vi.spyOn(positionsActions, 'assignPut')
      mockAssignPut.mockResolvedValue({
        success: true,
        data: {
          positionId: 'pos123',
          tradeId: 'trade123',
        },
      })

      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          onSellCall={mockOnSellCall}
        />
      )

      const confirmButton = screen.getByText('Confirm Assignment')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('Next Step: Sell Covered Call?')).toBeInTheDocument()
      })
    })

    it('should call onSellCall when user clicks Sell Covered Call', async () => {
      const mockAssignPut = vi.spyOn(positionsActions, 'assignPut')
      mockAssignPut.mockResolvedValue({
        success: true,
        data: {
          positionId: 'pos123',
          tradeId: 'trade123',
        },
      })

      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          onSellCall={mockOnSellCall}
        />
      )

      const confirmButton = screen.getByText('Confirm Assignment')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('Next Step: Sell Covered Call?')).toBeInTheDocument()
      })

      const sellCallButton = screen.getByText('Sell Covered Call')
      fireEvent.click(sellCallButton)

      expect(mockOnSellCall).toHaveBeenCalledWith('pos123', 'AAPL', 100)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onSuccess when user clicks Skip for Now', async () => {
      const mockAssignPut = vi.spyOn(positionsActions, 'assignPut')
      mockAssignPut.mockResolvedValue({
        success: true,
        data: {
          positionId: 'pos123',
          tradeId: 'trade123',
        },
      })

      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          onSellCall={mockOnSellCall}
        />
      )

      const confirmButton = screen.getByText('Confirm Assignment')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('Next Step: Sell Covered Call?')).toBeInTheDocument()
      })

      const skipButton = screen.getByText('Skip for Now')
      fireEvent.click(skipButton)

      expect(mockOnSuccess).toHaveBeenCalledWith('pos123', 'AAPL', 100)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not show next step if onSellCall is not provided', async () => {
      const mockAssignPut = vi.spyOn(positionsActions, 'assignPut')
      mockAssignPut.mockResolvedValue({
        success: true,
        data: {
          positionId: 'pos123',
          tradeId: 'trade123',
        },
      })

      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const confirmButton = screen.getByText('Confirm Assignment')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('pos123', 'AAPL', 100)
        expect(mockOnClose).toHaveBeenCalled()
      })

      expect(screen.queryByText('Next Step: Sell Covered Call?')).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should close dialog when Cancel is clicked', () => {
      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close dialog when X button is clicked', () => {
      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const closeButton = screen.getByLabelText('Close dialog')
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close dialog when backdrop is clicked', () => {
      render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      const backdrop = screen.getByRole('dialog').parentElement?.previousElementSibling
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle trades with zero premium', () => {
      const tradeSpy = {
        ...mockTrade,
        premium: 0,
      }

      render(
        <AssignPutDialog
          trade={tradeSpy}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Cost basis should equal strike price when premium is 0
      // Total cost should be 150 * 100 = $15,000
      const totalCostText = screen.getByText((content, element) => {
        return element?.textContent === '$15,000.00' && element?.tagName === 'SPAN'
      })
      expect(totalCostText).toBeInTheDocument()
    })

    it('should handle trades with different share amounts', () => {
      const tradeSpy = {
        ...mockTrade,
        shares: 500,
      }

      render(
        <AssignPutDialog
          trade={tradeSpy}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('500')).toBeInTheDocument()
    })

    it('should reset state when dialog closes and reopens', async () => {
      const { rerender } = render(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Close the dialog
      rerender(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Reopen the dialog
      rerender(
        <AssignPutDialog
          trade={mockTrade}
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Dialog should be in initial state
      expect(screen.getByText('Mark PUT as Assigned')).toBeInTheDocument()
      expect(screen.queryByText('Next Step: Sell Covered Call?')).not.toBeInTheDocument()
    })
  })
})

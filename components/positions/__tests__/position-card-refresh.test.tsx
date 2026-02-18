import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PositionCard, type PositionCardData } from '../position-card'
import type { PriceData } from '@/lib/actions/prices'

// Mock server-side modules to prevent next/server import chain
vi.mock('@/components/trades/close-option-dialog', () => ({
  CloseOptionDialog: () => null,
}))

vi.mock('../assign-call-dialog', () => ({
  AssignCallDialog: () => null,
}))

// Mock the price actions
vi.mock('@/lib/actions/prices', () => ({
  refreshSinglePositionPrice: vi.fn(),
}))

const { refreshSinglePositionPrice } = await import('@/lib/actions/prices')

describe('PositionCard - Price Refresh Features', () => {
  const mockPosition: PositionCardData = {
    id: 'pos1',
    ticker: 'AAPL',
    shares: 100,
    costBasis: 150,
    totalCost: 15000,
    currentValue: 15500,
    status: 'OPEN',
    acquiredDate: new Date('2026-01-15'),
    closedDate: null,
    coveredCalls: [],
  }

  const freshPriceData: PriceData = {
    ticker: 'AAPL',
    price: 155.0,
    date: new Date('2026-02-07T14:30:00Z'),
    source: 'financial_data',
    canRefresh: false,
    nextRefreshAt: new Date('2026-02-07T18:30:00Z'),
    refreshReason: 'Recently updated during market hours',
  }

  const refreshablePriceData: PriceData = {
    ticker: 'AAPL',
    price: 155.0,
    date: new Date('2026-02-07T10:00:00Z'),
    source: 'financial_data',
    canRefresh: true,
    nextRefreshAt: null,
    refreshReason: 'Price is older than 4 hours',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Refresh Button', () => {
    it('should display refresh button for OPEN positions', () => {
      render(<PositionCard position={mockPosition} />)

      const refreshButton = screen.getByLabelText('Refresh price')
      expect(refreshButton).toBeInTheDocument()
    })

    it('should not display refresh button for CLOSED positions', () => {
      const closedPosition = { ...mockPosition, status: 'CLOSED' as const }
      render(<PositionCard position={closedPosition} />)

      const refreshButton = screen.queryByLabelText('Refresh price')
      expect(refreshButton).not.toBeInTheDocument()
    })

    it('should call refreshSinglePositionPrice when clicked', async () => {
      vi.mocked(refreshSinglePositionPrice).mockResolvedValue({
        success: true,
        data: {
          currentValue: 15600,
          priceData: freshPriceData,
        },
      })

      const mockRefresh = vi.fn()
      render(<PositionCard position={mockPosition} onPriceRefresh={mockRefresh} />)

      const refreshButton = screen.getByLabelText('Refresh price')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(refreshSinglePositionPrice).toHaveBeenCalledWith('pos1')
      })
    })

    it('should show loading state while refreshing', async () => {
      vi.mocked(refreshSinglePositionPrice).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: {
                    currentValue: 15600,
                    priceData: freshPriceData,
                  },
                }),
              100
            )
          )
      )

      render(<PositionCard position={mockPosition} />)

      const refreshButton = screen.getByLabelText('Refresh price')
      fireEvent.click(refreshButton)

      // Check that button shows loading state (disabled and spinning)
      expect(refreshButton).toBeDisabled()

      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled()
      })
    })

    it('should display error message when refresh fails', async () => {
      vi.mocked(refreshSinglePositionPrice).mockResolvedValue({
        success: false,
        error: 'Failed to fetch price',
      })

      render(<PositionCard position={mockPosition} />)

      const refreshButton = screen.getByLabelText('Refresh price')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(screen.getByText(/Unable to fetch current price/i)).toBeInTheDocument()
        expect(screen.getByText(/Failed to fetch price/i)).toBeInTheDocument()
      })
    })

    it('should call onPriceRefresh callback after successful refresh', async () => {
      vi.mocked(refreshSinglePositionPrice).mockResolvedValue({
        success: true,
        data: {
          currentValue: 15600,
          priceData: freshPriceData,
        },
      })

      const mockRefresh = vi.fn()
      render(<PositionCard position={mockPosition} onPriceRefresh={mockRefresh} />)

      const refreshButton = screen.getByLabelText('Refresh price')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledWith('pos1')
      })
    })

    it('should be disabled when isLoadingPrice prop is true', () => {
      render(<PositionCard position={mockPosition} isLoadingPrice={true} />)

      const refreshButton = screen.getByLabelText('Refresh price')
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('Price Refresh Available Warning', () => {
    it('should not show refresh warning for non-refreshable prices', () => {
      render(<PositionCard position={mockPosition} priceData={freshPriceData} />)

      const refreshWarning = screen.queryByText(/Price update available/i)
      expect(refreshWarning).not.toBeInTheDocument()
    })

    it('should show refresh warning for refreshable prices', () => {
      render(<PositionCard position={mockPosition} priceData={refreshablePriceData} />)

      const refreshWarning = screen.getByText(/Price update available/i)
      expect(refreshWarning).toBeInTheDocument()
    })

    it('should not show refresh warning for CLOSED positions', () => {
      const closedPosition = { ...mockPosition, status: 'CLOSED' as const }
      render(<PositionCard position={closedPosition} priceData={refreshablePriceData} />)

      const refreshWarning = screen.queryByText(/Price update available/i)
      expect(refreshWarning).not.toBeInTheDocument()
    })

    it('should include refresh button in refresh warning', () => {
      render(<PositionCard position={mockPosition} priceData={refreshablePriceData} />)

      const refreshWarning = screen.getByText(/Price update available/i)
      expect(refreshWarning).toBeInTheDocument()

      // Should have a refresh button within the warning
      const refreshButtons = screen.getAllByText('Refresh')
      expect(refreshButtons.length).toBeGreaterThan(0)
    })

    it('should not show refresh warning when there is a price error', () => {
      render(
        <PositionCard
          position={mockPosition}
          priceData={refreshablePriceData}
          priceError="Failed to fetch"
        />
      )

      const refreshWarning = screen.queryByText(/Price update available/i)
      expect(refreshWarning).not.toBeInTheDocument()

      // But should show the error instead
      expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument()
    })
  })

  describe('Price Last Updated Display', () => {
    it('should display updated time when price data is available', () => {
      render(<PositionCard position={mockPosition} priceData={freshPriceData} />)

      expect(screen.getByText(/Updated/i)).toBeInTheDocument()
    })

    it('should show next refresh time when available', () => {
      render(<PositionCard position={mockPosition} priceData={freshPriceData} />)

      expect(screen.getByText(/Updated/i)).toBeInTheDocument()
      expect(screen.getByText(/Next:/i)).toBeInTheDocument()
    })

    it('should not display updated time when there is a price error', () => {
      render(
        <PositionCard
          position={mockPosition}
          priceData={freshPriceData}
          priceError="Network error"
        />
      )

      // The "Updated" text is inside the price info section, which is hidden when there's an error
      expect(screen.queryByText(/· Next:/i)).not.toBeInTheDocument()
    })

    it('should not display updated time when price data is null', () => {
      render(<PositionCard position={mockPosition} priceData={null} />)

      expect(screen.queryByText(/· Next:/i)).not.toBeInTheDocument()
    })
  })

  describe('Price Error States', () => {
    it('should display price error message', () => {
      render(<PositionCard position={mockPosition} priceError="API rate limit exceeded" />)

      expect(screen.getByText(/Unable to fetch current price/i)).toBeInTheDocument()
      expect(screen.getByText(/API rate limit exceeded/i)).toBeInTheDocument()
    })

    it('should display refresh error message after failed refresh', async () => {
      vi.mocked(refreshSinglePositionPrice).mockResolvedValue({
        success: false,
        error: 'Database error',
      })

      render(<PositionCard position={mockPosition} />)

      const refreshButton = screen.getByLabelText('Refresh price')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(screen.getByText(/Database error/i)).toBeInTheDocument()
      })
    })

    it('should clear refresh error when new refresh succeeds', async () => {
      // First, simulate a failed refresh
      vi.mocked(refreshSinglePositionPrice).mockResolvedValueOnce({
        success: false,
        error: 'Database error',
      })

      render(<PositionCard position={mockPosition} />)

      const refreshButton = screen.getByLabelText('Refresh price')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(screen.getByText(/Database error/i)).toBeInTheDocument()
      })

      // Then simulate a successful refresh
      vi.mocked(refreshSinglePositionPrice).mockResolvedValueOnce({
        success: true,
        data: {
          currentValue: 15600,
          priceData: freshPriceData,
        },
      })

      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(screen.queryByText(/Database error/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible refresh button with aria-label', () => {
      render(<PositionCard position={mockPosition} />)

      const refreshButton = screen.getByLabelText('Refresh price')
      expect(refreshButton).toHaveAttribute('aria-label', 'Refresh price')
    })

    it('should indicate loading state to screen readers', async () => {
      vi.mocked(refreshSinglePositionPrice).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: {
                    currentValue: 15600,
                    priceData: freshPriceData,
                  },
                }),
              100
            )
          )
      )

      render(<PositionCard position={mockPosition} />)

      const refreshButton = screen.getByLabelText('Refresh price')
      fireEvent.click(refreshButton)

      // Button should be disabled during refresh
      expect(refreshButton).toBeDisabled()

      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled()
      })
    })
  })
})

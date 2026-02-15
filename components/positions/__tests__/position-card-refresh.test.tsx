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
    source: 'alpha_vantage',
    isStale: false,
    ageInHours: 0.5,
  }

  const stalePriceData: PriceData = {
    ticker: 'AAPL',
    price: 155.0,
    date: new Date('2026-02-07T10:00:00Z'),
    source: 'alpha_vantage',
    isStale: true,
    ageInHours: 4.5,
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

  describe('Price Staleness Warning', () => {
    it('should not show staleness warning for fresh prices', () => {
      render(<PositionCard position={mockPosition} priceData={freshPriceData} />)

      const stalenessWarning = screen.queryByText(/Price data is stale/i)
      expect(stalenessWarning).not.toBeInTheDocument()
    })

    it('should show staleness warning for stale prices', () => {
      render(<PositionCard position={mockPosition} priceData={stalePriceData} />)

      const stalenessWarning = screen.getByText(/Price data is stale/i)
      expect(stalenessWarning).toBeInTheDocument()
      expect(screen.getByText(/4 hours old/i)).toBeInTheDocument()
    })

    it('should not show staleness warning for CLOSED positions', () => {
      const closedPosition = { ...mockPosition, status: 'CLOSED' as const }
      render(<PositionCard position={closedPosition} priceData={stalePriceData} />)

      const stalenessWarning = screen.queryByText(/Price data is stale/i)
      expect(stalenessWarning).not.toBeInTheDocument()
    })

    it('should include refresh button in staleness warning', () => {
      render(<PositionCard position={mockPosition} priceData={stalePriceData} />)

      const stalenessWarning = screen.getByText(/Price data is stale/i)
      expect(stalenessWarning).toBeInTheDocument()

      // Should have a refresh button within the warning
      const refreshButtons = screen.getAllByText('Refresh')
      expect(refreshButtons.length).toBeGreaterThan(0)
    })

    it('should not show staleness warning when there is a price error', () => {
      render(
        <PositionCard
          position={mockPosition}
          priceData={stalePriceData}
          priceError="Failed to fetch"
        />
      )

      const stalenessWarning = screen.queryByText(/Price data is stale/i)
      expect(stalenessWarning).not.toBeInTheDocument()

      // But should show the error instead
      expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument()
    })
  })

  describe('Price Last Updated Display', () => {
    it('should display last updated timestamp when price data is available', () => {
      render(<PositionCard position={mockPosition} priceData={freshPriceData} />)

      expect(screen.getByText(/Last updated:/i)).toBeInTheDocument()
    })

    it('should show age in hours for stale prices', () => {
      render(<PositionCard position={mockPosition} priceData={stalePriceData} />)

      expect(screen.getByText(/Last updated:/i)).toBeInTheDocument()
      expect(screen.getByText(/4h ago/i)).toBeInTheDocument()
    })

    it('should not display last updated when there is a price error', () => {
      render(
        <PositionCard
          position={mockPosition}
          priceData={freshPriceData}
          priceError="Network error"
        />
      )

      expect(screen.queryByText(/Last updated:/i)).not.toBeInTheDocument()
    })

    it('should not display last updated when price data is null', () => {
      render(<PositionCard position={mockPosition} priceData={null} />)

      expect(screen.queryByText(/Last updated:/i)).not.toBeInTheDocument()
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

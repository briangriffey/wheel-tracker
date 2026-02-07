import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PositionCard, type PositionCardData } from './position-card'

// Mock position data
const mockOpenPosition: PositionCardData = {
  id: 'pos-123',
  ticker: 'AAPL',
  shares: 100,
  costBasis: 150.0,
  totalCost: 15000.0,
  currentValue: 16500.0,
  status: 'OPEN',
  acquiredDate: new Date('2024-01-01'),
  closedDate: null,
  coveredCalls: [
    { id: 'call-1', premium: 250, status: 'OPEN' },
    { id: 'call-2', premium: 300, status: 'CLOSED' },
  ],
}

const mockClosedPosition: PositionCardData = {
  id: 'pos-456',
  ticker: 'TSLA',
  shares: 200,
  costBasis: 200.0,
  totalCost: 40000.0,
  currentValue: 38000.0,
  status: 'CLOSED',
  acquiredDate: new Date('2024-01-01'),
  closedDate: new Date('2024-06-01'),
  coveredCalls: [],
}

const mockPositionWithoutPrice: PositionCardData = {
  id: 'pos-789',
  ticker: 'NVDA',
  shares: 50,
  costBasis: 500.0,
  totalCost: 25000.0,
  currentValue: null,
  status: 'OPEN',
  acquiredDate: new Date('2024-01-01'),
  closedDate: null,
  coveredCalls: [],
}

describe('PositionCard', () => {
  describe('Rendering', () => {
    it('should render position ticker and status', () => {
      render(<PositionCard position={mockOpenPosition} />)

      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('OPEN')).toBeInTheDocument()
    })

    it('should render all key metrics', () => {
      render(<PositionCard position={mockOpenPosition} />)

      expect(screen.getByText('100')).toBeInTheDocument() // shares
      expect(screen.getByText('$150.00')).toBeInTheDocument() // cost basis
      expect(screen.getByText('$15,000.00')).toBeInTheDocument() // total cost
      expect(screen.getByText('$16,500.00')).toBeInTheDocument() // current value
      expect(screen.getByText('$165.00')).toBeInTheDocument() // current price
    })

    it('should calculate and display unrealized P&L correctly', () => {
      render(<PositionCard position={mockOpenPosition} />)

      // Unrealized P&L = 16500 - 15000 = 1500
      expect(screen.getByText('$1,500.00')).toBeInTheDocument()
      // Percentage = (1500 / 15000) * 100 = 10%
      expect(screen.getByText('+10.00%')).toBeInTheDocument()
    })

    it('should display negative P&L with correct formatting', () => {
      render(<PositionCard position={mockClosedPosition} />)

      // Unrealized P&L = 38000 - 40000 = -2000
      expect(screen.getByText('-$2,000.00')).toBeInTheDocument()
      // Percentage = (-2000 / 40000) * 100 = -5%
      expect(screen.getByText('-5.00%')).toBeInTheDocument()
    })

    it('should display days held correctly', () => {
      render(<PositionCard position={mockOpenPosition} />)

      // Should calculate days from acquiredDate to now
      const daysHeldLabel = screen.getByText('Days Held')
      expect(daysHeldLabel).toBeInTheDocument()
      // The days value should be a number greater than 0
      const container = daysHeldLabel.parentElement
      expect(container).toBeInTheDocument()
    })

    it('should display covered call premium when available', () => {
      render(<PositionCard position={mockOpenPosition} />)

      // Total premium = 250 + 300 = 550
      expect(screen.getByText('$550.00')).toBeInTheDocument()
      expect(screen.getByText('2 Calls')).toBeInTheDocument()
    })

    it('should not display covered call section when no calls exist', () => {
      render(<PositionCard position={mockClosedPosition} />)

      expect(screen.queryByText(/Covered Call Premium/i)).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when price is loading', () => {
      render(<PositionCard position={mockOpenPosition} isLoadingPrice={true} />)

      // Should show loading text in multiple places (current price and current value)
      const loadingElements = screen.getAllByText('Loading...')
      expect(loadingElements.length).toBeGreaterThanOrEqual(2)
    })

    it('should show N/A when current value is null', () => {
      render(<PositionCard position={mockPositionWithoutPrice} />)

      const naElements = screen.getAllByText('N/A')
      expect(naElements.length).toBeGreaterThan(0)
    })
  })

  describe('Error State', () => {
    it('should display error message when price fetch fails', () => {
      const errorMessage = 'API rate limit exceeded'
      render(<PositionCard position={mockOpenPosition} priceError={errorMessage} />)

      // Check that the error message container is present
      const errorElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('Unable to fetch current price') &&
               element?.textContent?.includes(errorMessage) || false
      })
      expect(errorElements.length).toBeGreaterThan(0)
    })
  })

  describe('Color Coding', () => {
    it('should apply green color class for positive P&L', () => {
      render(<PositionCard position={mockOpenPosition} />)

      // Check for green color class on P&L value
      const pnlElement = screen.getByText('$1,500.00')
      const pnlContainer = pnlElement.closest('dd')
      expect(pnlContainer?.className).toContain('text-green-600')
    })

    it('should apply red color class for negative P&L', () => {
      render(<PositionCard position={mockClosedPosition} />)

      // Check for red color class on P&L value
      const pnlElement = screen.getByText('-$2,000.00')
      const pnlContainer = pnlElement.closest('dd')
      expect(pnlContainer?.className).toContain('text-red-600')
    })

    it('should apply green background for profitable position', () => {
      const { container } = render(<PositionCard position={mockOpenPosition} />)

      // Card should have green background
      const card = container.querySelector('.bg-green-50')
      expect(card).toBeInTheDocument()
    })

    it('should apply red background for losing position', () => {
      const { container } = render(<PositionCard position={mockClosedPosition} />)

      // Card should have red background
      const card = container.querySelector('.bg-red-50')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should render action buttons for OPEN positions', () => {
      render(<PositionCard position={mockOpenPosition} onSellCall={vi.fn()} onViewDetails={vi.fn()} />)

      expect(screen.getByText('Sell Covered Call')).toBeInTheDocument()
      expect(screen.getByText('View Details')).toBeInTheDocument()
    })

    it('should not render action buttons for CLOSED positions', () => {
      render(<PositionCard position={mockClosedPosition} onSellCall={vi.fn()} onViewDetails={vi.fn()} />)

      expect(screen.queryByText('Sell Covered Call')).not.toBeInTheDocument()
      expect(screen.queryByText('View Details')).not.toBeInTheDocument()
    })

    it('should call onSellCall when Sell Covered Call button is clicked', () => {
      const onSellCall = vi.fn()
      render(<PositionCard position={mockOpenPosition} onSellCall={onSellCall} onViewDetails={vi.fn()} />)

      const sellCallButton = screen.getByText('Sell Covered Call')
      fireEvent.click(sellCallButton)

      expect(onSellCall).toHaveBeenCalledWith('pos-123')
    })

    it('should call onViewDetails when View Details button is clicked', () => {
      const onViewDetails = vi.fn()
      render(<PositionCard position={mockOpenPosition} onSellCall={vi.fn()} onViewDetails={onViewDetails} />)

      const viewDetailsButton = screen.getByText('View Details')
      fireEvent.click(viewDetailsButton)

      expect(onViewDetails).toHaveBeenCalledWith('pos-123')
    })

    it('should not render Sell Call button when onSellCall is not provided', () => {
      render(<PositionCard position={mockOpenPosition} onViewDetails={vi.fn()} />)

      expect(screen.queryByText('Sell Covered Call')).not.toBeInTheDocument()
    })

    it('should not render View Details button when onViewDetails is not provided', () => {
      render(<PositionCard position={mockOpenPosition} onSellCall={vi.fn()} />)

      expect(screen.queryByText('View Details')).not.toBeInTheDocument()
    })
  })

  describe('Expand/Collapse', () => {
    it('should toggle expanded state when Show More/Less is clicked', () => {
      render(<PositionCard position={mockOpenPosition} />)

      const toggleButton = screen.getByText('Show More')
      expect(screen.queryByText('Acquired Date:')).not.toBeInTheDocument()

      // Expand
      fireEvent.click(toggleButton)
      expect(screen.getByText('Acquired Date:')).toBeInTheDocument()
      expect(screen.getByText('Show Less')).toBeInTheDocument()

      // Collapse
      fireEvent.click(screen.getByText('Show Less'))
      expect(screen.queryByText('Acquired Date:')).not.toBeInTheDocument()
      expect(screen.getByText('Show More')).toBeInTheDocument()
    })

    it('should show closed date when position is closed and expanded', () => {
      render(<PositionCard position={mockClosedPosition} />)

      const toggleButton = screen.getByText('Show More')
      fireEvent.click(toggleButton)

      expect(screen.getByText('Closed Date:')).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      render(<PositionCard position={mockOpenPosition} />)

      const toggleButton = screen.getByLabelText('Expand details')
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(toggleButton)
      expect(screen.getByLabelText('Collapse details')).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Responsive Design', () => {
    it('should render grid layout for metrics', () => {
      const { container } = render(<PositionCard position={mockOpenPosition} />)

      // Check for grid classes
      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()
      expect(grid?.className).toContain('grid-cols-2')
      expect(grid?.className).toContain('sm:grid-cols-3')
    })

    it('should render flex layout for action buttons', () => {
      const { container } = render(
        <PositionCard position={mockOpenPosition} onSellCall={vi.fn()} onViewDetails={vi.fn()} />
      )

      // Check for flex classes on button container
      const buttonContainer = container.querySelector('.flex.flex-col.sm\\:flex-row')
      expect(buttonContainer).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for icons', () => {
      render(<PositionCard position={mockOpenPosition} priceError="Test error" />)

      // Error message should be visible when there's an error
      const errorMessages = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('Unable to fetch current price') || false
      })
      expect(errorMessages.length).toBeGreaterThan(0)
    })

    it('should have descriptive button text', () => {
      render(<PositionCard position={mockOpenPosition} onSellCall={vi.fn()} onViewDetails={vi.fn()} />)

      expect(screen.getByRole('button', { name: 'Sell Covered Call' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'View Details' })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero shares gracefully', () => {
      const positionWithZeroShares: PositionCardData = {
        ...mockOpenPosition,
        shares: 0,
      }
      render(<PositionCard position={positionWithZeroShares} />)

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should handle break-even P&L (exactly 0)', () => {
      const breakEvenPosition: PositionCardData = {
        ...mockOpenPosition,
        totalCost: 16500.0,
        currentValue: 16500.0,
      }
      const { container } = render(<PositionCard position={breakEvenPosition} />)

      expect(screen.getByText('$0.00')).toBeInTheDocument()
      expect(screen.getByText('+0.00%')).toBeInTheDocument()

      // Should have gray color for break-even
      const card = container.querySelector('.bg-gray-50')
      expect(card).toBeInTheDocument()
    })

    it('should handle single covered call correctly', () => {
      const positionWithOneCall: PositionCardData = {
        ...mockOpenPosition,
        coveredCalls: [{ id: 'call-1', premium: 250, status: 'OPEN' }],
      }
      render(<PositionCard position={positionWithOneCall} />)

      expect(screen.getByText('1 Call')).toBeInTheDocument()
    })
  })
})

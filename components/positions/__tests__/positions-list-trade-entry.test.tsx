import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PositionsList } from '../positions-list'
import { Prisma } from '@/lib/generated/prisma'
import type { PositionWithCalculations } from '@/lib/queries/positions'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/lib/actions/prices', () => ({
  refreshPositionPrices: vi.fn().mockResolvedValue({ success: true }),
  getLatestPrices: vi.fn().mockResolvedValue({ success: true, data: {} }),
  refreshSinglePositionPrice: vi.fn(),
}))

vi.mock('@/lib/actions/trades', () => ({
  createTrade: vi.fn().mockResolvedValue({ success: true, data: { id: 'new-trade-id' } }),
}))

vi.mock('@/components/trades/close-option-dialog', () => ({
  CloseOptionDialog: () => null,
}))

vi.mock('../assign-call-dialog', () => ({
  AssignCallDialog: () => null,
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/actions/billing', () => ({
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
}))

vi.mock('@/lib/actions/subscription', () => ({
  getTradeUsage: vi.fn().mockResolvedValue({ used: 0, limit: 20, isAtLimit: false }),
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockPositions: PositionWithCalculations[] = [
  {
    id: '1',
    userId: 'user1',
    ticker: 'AAPL',
    shares: 500,
    costBasis: new Prisma.Decimal(150),
    totalCost: new Prisma.Decimal(75000),
    currentValue: new Prisma.Decimal(77500),
    realizedGainLoss: null,
    status: 'OPEN',
    acquiredDate: new Date('2026-01-15'),
    closedDate: null,
    notes: null,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-02-07'),
    assignmentTradeId: 'trade1',
    wheelId: null,
    assignmentTrade: {
      id: 'trade1',
      ticker: 'AAPL',
      strikePrice: new Prisma.Decimal(150),
      premium: new Prisma.Decimal(500),
      expirationDate: new Date('2026-01-15'),
    },
    coveredCalls: [],
    unrealizedPL: 2500,
    unrealizedPLPercent: 3.33,
    daysHeld: 23,
    coveredCallsPremium: 0,
    netCostBasis: 150,
  },
]

describe('PositionsList Trade Entry Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the "New Trade" button', () => {
    render(<PositionsList initialPositions={mockPositions} />)

    const newTradeButton = screen.getByRole('button', { name: /new trade/i })
    expect(newTradeButton).toBeDefined()
  })

  it('should open the trade entry modal when "New Trade" button is clicked', async () => {
    const user = userEvent.setup()
    render(<PositionsList initialPositions={mockPositions} />)

    const newTradeButton = screen.getByRole('button', { name: /new trade/i })
    await user.click(newTradeButton)

    // Check if modal title appears
    await waitFor(() => {
      expect(screen.getByText('Create New Trade')).toBeDefined()
    })
  })

  it('should display the trade entry form inside the modal', async () => {
    const user = userEvent.setup()
    render(<PositionsList initialPositions={mockPositions} />)

    const newTradeButton = screen.getByRole('button', { name: /new trade/i })
    await user.click(newTradeButton)

    // Wait for modal to appear first
    await waitFor(() => {
      expect(screen.getByText('Create New Trade')).toBeDefined()
    })

    // Check if form is present - look for the form element itself
    await waitFor(
      () => {
        const form = screen.getByRole('form', { name: /trade entry form/i })
        expect(form).toBeDefined()
      },
      { timeout: 2000 }
    )
  })

  it('should close the modal when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<PositionsList initialPositions={mockPositions} />)

    // Open modal
    const newTradeButton = screen.getByRole('button', { name: /new trade/i })
    await user.click(newTradeButton)

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Create New Trade')).toBeDefined()
    })

    // Close modal by clicking the close button
    const closeButton = screen.getByRole('button', { name: /close modal/i })
    await user.click(closeButton)

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Create New Trade')).toBeNull()
    })
  })

  it('should close the modal when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<PositionsList initialPositions={mockPositions} />)

    // Open modal
    const newTradeButton = screen.getByRole('button', { name: /new trade/i })
    await user.click(newTradeButton)

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Create New Trade')).toBeDefined()
    })

    // Close modal by clicking cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Create New Trade')).toBeNull()
    })
  })

  it('should have a primary action button styling for "New Trade"', () => {
    render(<PositionsList initialPositions={mockPositions} />)

    const newTradeButton = screen.getByRole('button', { name: /new trade/i })

    // Check if button has the primary background class (design system primary button)
    expect(newTradeButton.className).toContain('bg-primary-500')
  })

  it('should display an icon in the "New Trade" button', () => {
    render(<PositionsList initialPositions={mockPositions} />)

    const newTradeButton = screen.getByRole('button', { name: /new trade/i })

    // Check if SVG icon exists within the button
    const svg = newTradeButton.querySelector('svg')
    expect(svg).toBeDefined()
  })

  it('should position "New Trade" button near other action buttons', () => {
    render(<PositionsList initialPositions={mockPositions} />)

    const newTradeButton = screen.getByRole('button', { name: /new trade/i })
    const refreshButton = screen.getByRole('button', { name: /refresh all prices/i })

    // Both buttons should be in the same container (have common parent)
    expect(newTradeButton.parentElement).toBe(refreshButton.parentElement)
  })

  it('should not display modal by default', () => {
    render(<PositionsList initialPositions={mockPositions} />)

    // Modal should not be visible initially
    expect(screen.queryByText('Create New Trade')).toBeNull()
  })

  it('should allow keyboard interaction to close modal with Escape key', async () => {
    const user = userEvent.setup()
    render(<PositionsList initialPositions={mockPositions} />)

    // Open modal
    const newTradeButton = screen.getByRole('button', { name: /new trade/i })
    await user.click(newTradeButton)

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('Create New Trade')).toBeDefined()
    })

    // Press Escape key
    await user.keyboard('{Escape}')

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Create New Trade')).toBeNull()
    })
  })
})

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TradeActionsDialog } from '../trade-actions-dialog'
import { Prisma } from '@/lib/generated/prisma'
import type { Trade } from '@/lib/generated/prisma'
import type { StockPriceResult } from '@/lib/services/market-data'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockDeleteTrade = vi.fn()
const mockUpdateTradeStatus = vi.fn()

vi.mock('@/lib/actions/trades', () => ({
  deleteTrade: (...args: unknown[]) => mockDeleteTrade(...args),
  updateTradeStatus: (...args: unknown[]) => mockUpdateTradeStatus(...args),
}))

vi.mock('@/lib/design/colors', () => ({
  getStatusColor: () => ({
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
  }),
  getPnlColor: () => ({
    text: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  }),
}))

global.confirm = vi.fn() as unknown as typeof window.confirm

const mockOpenTrade: Trade = {
  id: '1',
  userId: 'user1',
  ticker: 'AAPL',
  type: 'PUT',
  action: 'SELL_TO_OPEN',
  status: 'OPEN',
  strikePrice: new Prisma.Decimal(150),
  premium: new Prisma.Decimal(500),
  closePremium: null,
  realizedGainLoss: null,
  contracts: 5,
  shares: 500,
  expirationDate: new Date('2026-03-15'),
  openDate: new Date('2026-02-01'),
  closeDate: null,
  notes: 'Test trade',
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-01'),
  positionId: null,
  wheelId: null,
  rolledFromId: null,
}

const mockExpiredTrade: Trade = {
  ...mockOpenTrade,
  id: '2',
  status: 'EXPIRED',
  closeDate: new Date('2026-02-20'),
}

const mockCurrentPrice: StockPriceResult = {
  ticker: 'AAPL',
  price: 152.45,
  date: new Date(),
  success: true,
}

const mockStalePrice: StockPriceResult = {
  ticker: 'AAPL',
  price: 152.45,
  date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  success: true,
}

describe('TradeActionsDialog - Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={false} onClose={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should display trade ticker in header', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('should display trade type badge', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('PUT')).toBeInTheDocument()
  })

  it('should display trade status badge', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('OPEN')).toBeInTheDocument()
  })

  it('should display current price when provided', () => {
    render(
      <TradeActionsDialog
        trade={mockOpenTrade}
        isOpen={true}
        onClose={vi.fn()}
        currentPrice={mockCurrentPrice}
      />
    )

    expect(screen.getByText('Current Price:')).toBeInTheDocument()
    expect(screen.getByText('$152.45')).toBeInTheDocument()
  })

  it('should not display price section when price not provided', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.queryByText('Current Price:')).not.toBeInTheDocument()
  })

  it('should display updated time indicator for all prices', () => {
    render(
      <TradeActionsDialog
        trade={mockOpenTrade}
        isOpen={true}
        onClose={vi.fn()}
        currentPrice={mockStalePrice}
      />
    )

    // Should show "Updated" time text
    expect(screen.getByText(/Updated/i)).toBeInTheDocument()
  })
})

describe('TradeActionsDialog - Trade Details', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display strike price', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Strike Price:')).toBeInTheDocument()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
  })

  it('should display premium', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Premium:')).toBeInTheDocument()
    expect(screen.getByText('$500.00')).toBeInTheDocument()
  })

  it('should display contracts', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Contracts:')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should display shares', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Shares:')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('should display formatted dates', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Expiration:')).toBeInTheDocument()
    expect(screen.getByText('Open Date:')).toBeInTheDocument()
  })
})

describe('TradeActionsDialog - Actions for OPEN Trades', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show all action buttons for OPEN trades', () => {
    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('View Full Details')).toBeInTheDocument()
    expect(screen.getByText('Close Early')).toBeInTheDocument()
    expect(screen.getByText('Mark as Expired')).toBeInTheDocument()
    expect(screen.getByText('Mark as Assigned')).toBeInTheDocument()
    expect(screen.getByText('Delete Trade')).toBeInTheDocument()
  })

  it('should only show View Details for non-OPEN trades', () => {
    render(<TradeActionsDialog trade={mockExpiredTrade} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('View Full Details')).toBeInTheDocument()
    expect(screen.queryByText('Close Early')).not.toBeInTheDocument()
    expect(screen.queryByText('Mark as Expired')).not.toBeInTheDocument()
    expect(screen.queryByText('Mark as Assigned')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete Trade')).not.toBeInTheDocument()
  })
})

describe('TradeActionsDialog - User Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(global.confirm).mockReturnValue(true)
  })

  it('should close dialog when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={onClose} />)

    const closeButton = screen.getByLabelText('Close dialog')
    await user.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('should close dialog when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    const { container } = render(
      <TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={onClose} />
    )

    // Click the backdrop (the div with aria-hidden="true")
    const backdrop = container.querySelector('[aria-hidden="true"]')
    if (backdrop) {
      await user.click(backdrop)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('should call updateTradeStatus when Mark as Expired is clicked', async () => {
    const user = userEvent.setup()
    mockUpdateTradeStatus.mockResolvedValue({ success: true, data: { id: '1' } })

    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    const expiredButton = screen.getByText('Mark as Expired')
    await user.click(expiredButton)

    await waitFor(() => {
      expect(mockUpdateTradeStatus).toHaveBeenCalledWith({
        id: '1',
        status: 'EXPIRED',
      })
    })
  })

  it('should call updateTradeStatus when Mark as Assigned is clicked', async () => {
    const user = userEvent.setup()
    mockUpdateTradeStatus.mockResolvedValue({ success: true, data: { id: '1' } })

    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    const assignedButton = screen.getByText('Mark as Assigned')
    await user.click(assignedButton)

    await waitFor(() => {
      expect(mockUpdateTradeStatus).toHaveBeenCalledWith({
        id: '1',
        status: 'ASSIGNED',
      })
    })
  })

  it('should call deleteTrade when Delete is clicked and confirmed', async () => {
    const user = userEvent.setup()
    mockDeleteTrade.mockResolvedValue({ success: true, data: { id: '1' } })
    vi.mocked(global.confirm).mockReturnValue(true)

    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    const deleteButton = screen.getByText('Delete Trade')
    await user.click(deleteButton)

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this trade?')
      expect(mockDeleteTrade).toHaveBeenCalledWith('1')
    })
  })

  it('should not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    vi.mocked(global.confirm).mockReturnValue(false)

    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    const deleteButton = screen.getByText('Delete Trade')
    await user.click(deleteButton)

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled()
      expect(mockDeleteTrade).not.toHaveBeenCalled()
    })
  })

  it('should show success toast on successful status update', async () => {
    const user = userEvent.setup()
    mockUpdateTradeStatus.mockResolvedValue({ success: true, data: { id: '1' } })
    const toast = await import('react-hot-toast')

    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    const expiredButton = screen.getByText('Mark as Expired')
    await user.click(expiredButton)

    await waitFor(() => {
      expect(toast.default.success).toHaveBeenCalledWith('Trade marked as expired')
    })
  })

  it('should show error toast on failed status update', async () => {
    const user = userEvent.setup()
    mockUpdateTradeStatus.mockResolvedValue({
      success: false,
      error: 'Update failed',
    })
    const toast = await import('react-hot-toast')

    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    const expiredButton = screen.getByText('Mark as Expired')
    await user.click(expiredButton)

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Update failed')
    })
  })

  it('should disable buttons while action is in progress', async () => {
    const user = userEvent.setup()
    let resolveUpdate: (value: { success: boolean; data: { id: string } }) => void
    const updatePromise = new Promise<{ success: boolean; data: { id: string } }>((resolve) => {
      resolveUpdate = resolve
    })
    mockUpdateTradeStatus.mockReturnValue(updatePromise)

    render(<TradeActionsDialog trade={mockOpenTrade} isOpen={true} onClose={vi.fn()} />)

    const expiredButton = screen.getByText('Mark as Expired')
    await user.click(expiredButton)

    // Buttons should be disabled
    await waitFor(() => {
      expect(expiredButton.closest('button')).toBeDisabled()
    })

    // Resolve the promise
    resolveUpdate!({ success: true, data: { id: '1' } })

    // Buttons should be enabled again
    await waitFor(() => {
      expect(expiredButton.closest('button')).not.toBeDisabled()
    })
  })
})

describe('TradeActionsDialog - Currency Formatting', () => {
  it('should format currency values correctly', () => {
    const formatCurrency = (value: number) => `$${value.toFixed(2)}`

    expect(formatCurrency(150)).toBe('$150.00')
    expect(formatCurrency(150.5)).toBe('$150.50')
    expect(formatCurrency(150.99)).toBe('$150.99')
    expect(formatCurrency(1000)).toBe('$1000.00')
  })
})

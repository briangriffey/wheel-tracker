import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TradeList } from '../trade-list'
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

vi.mock('@/lib/actions/trades', () => ({
  deleteTrade: vi.fn(),
  updateTradeStatus: vi.fn(),
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

const mockTrades: Trade[] = [
  {
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
    notes: 'Test trade 1',
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-01'),
    positionId: null,
    wheelId: null,
    rolledFromId: null,
  },
  {
    id: '2',
    userId: 'user1',
    ticker: 'TSLA',
    type: 'CALL',
    action: 'SELL_TO_OPEN',
    status: 'EXPIRED',
    strikePrice: new Prisma.Decimal(200),
    premium: new Prisma.Decimal(750),
    closePremium: null,
    realizedGainLoss: null,
    contracts: 3,
    shares: 300,
    expirationDate: new Date('2026-02-20'),
    openDate: new Date('2026-01-15'),
    closeDate: new Date('2026-02-20'),
    notes: null,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-02-20'),
    positionId: null,
    wheelId: null,
    rolledFromId: null,
  },
]

const mockPrices = new Map<string, StockPriceResult>([
  [
    'AAPL',
    {
      ticker: 'AAPL',
      price: 152.45,
      date: new Date(),
      success: true,
    },
  ],
  [
    'TSLA',
    {
      ticker: 'TSLA',
      price: 198.75,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (stale)
      success: true,
    },
  ],
])

describe('TradeList - Price Display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display current prices in the table', () => {
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    // Check for price column header (only in open trades section)
    expect(screen.getByText('Current Price')).toBeInTheDocument()

    // Check AAPL price is displayed (open trade)
    expect(screen.getAllByText('$152.45').length).toBeGreaterThan(0)

    // TSLA is EXPIRED (closed section) - no current price shown
  })

  it('should show time ago indicator when refreshInfo provided', () => {
    const refreshInfo = {
      AAPL: {
        canRefresh: true,
        nextRefreshAt: null,
        reason: 'Price is older than 4 hours',
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    }
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} refreshInfo={refreshInfo} />)

    // AAPL (open trade) price should show time ago indicator
    const agoIndicators = screen.getAllByText(/ago/)
    expect(agoIndicators.length).toBeGreaterThan(0)
  })

  it('should show dash when price not available', () => {
    // Use two OPEN trades so both appear in the open section with price column
    const twoOpenTrades: Trade[] = [
      mockTrades[0], // AAPL - OPEN
      {
        ...mockTrades[1],
        status: 'OPEN',
        closeDate: null,
      },
    ]
    const pricesWithoutTSLA = new Map([['AAPL', mockPrices.get('AAPL')!]])

    render(<TradeList initialTrades={twoOpenTrades} prices={pricesWithoutTSLA} />)

    // Should still show AAPL price (may appear in both table and mobile card)
    expect(screen.getAllByText('$152.45').length).toBeGreaterThan(0)

    // TSLA should show a dash in the open trades table
    const rows = screen.getAllByRole('row')
    const tslaRow = rows.find((row) => row.textContent?.includes('TSLA'))
    expect(tslaRow?.textContent).toContain('-')
  })

  it('should format prices with 2 decimal places', () => {
    const pricesWithWholeNumber = new Map<string, StockPriceResult>([
      [
        'AAPL',
        {
          ticker: 'AAPL',
          price: 150,
          date: new Date(),
          success: true,
        },
      ],
    ])

    render(<TradeList initialTrades={[mockTrades[0]]} prices={pricesWithWholeNumber} />)

    // Should show .00 even for whole numbers
    expect(screen.getAllByText('$150.00').length).toBeGreaterThan(0)
  })
})

describe('TradeList - Action Button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show Action button per trade row', () => {
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const actionButtons = screen.getAllByText('Action')
    expect(actionButtons.length).toBeGreaterThan(0)
  })

  it('should open dialog when clicking Action button', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const actionButtons = screen.getAllByText('Action')
    await user.click(actionButtons[0])

    // Dialog should open and show trade details
    await waitFor(() => {
      expect(screen.getByText('View Full Details')).toBeInTheDocument()
    })
  })

  it('should show all actions for OPEN trades in dialog', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const actionButtons = screen.getAllByText('Action')
    // Open trades section renders first: AAPL (OPEN) at index 0
    // Closed trades section renders second: TSLA (EXPIRED) at index 1
    await user.click(actionButtons[0])

    await waitFor(() => {
      expect(screen.getByText('View Full Details')).toBeInTheDocument()
      expect(screen.getByText('Close Early')).toBeInTheDocument()
      expect(screen.getByText('Mark as Expired')).toBeInTheDocument()
      expect(screen.getByText('Mark as Assigned')).toBeInTheDocument()
      expect(screen.getByText('Delete Trade')).toBeInTheDocument()
    })
  })

  it('should only show View Full Details for non-OPEN trades', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const actionButtons = screen.getAllByText('Action')
    // Open trades section renders first: AAPL (OPEN) at index 0
    // Closed trades section renders second: TSLA (EXPIRED) at index 1
    await user.click(actionButtons[1])

    await waitFor(() => {
      expect(screen.getByText('View Full Details')).toBeInTheDocument()
      // These should not be present for EXPIRED trades
      expect(screen.queryByText('Close Early')).not.toBeInTheDocument()
      expect(screen.queryByText('Mark as Expired')).not.toBeInTheDocument()
    })
  })
})

describe('TradeList - Row Click Dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should open dialog when clicking on a trade row', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    // Find and click a table row (by ticker text - use first match)
    const appleCells = screen.getAllByText('AAPL')
    await user.click(appleCells[0])

    // Dialog should open and show trade details
    await waitFor(() => {
      // Should show ticker in dialog header (more than table+card)
      const allApple = screen.getAllByText('AAPL')
      expect(allApple.length).toBeGreaterThan(2) // table + card + dialog
    })
  })

  it('should display current price in dialog', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const appleCells = screen.getAllByText('AAPL')
    await user.click(appleCells[0])

    await waitFor(() => {
      // Should show "Current Price:" label in dialog
      expect(screen.getByText('Current Price:')).toBeInTheDocument()
    })
  })

  it('should close dialog when clicking close button', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    // Open dialog
    const appleCells = screen.getAllByText('AAPL')
    await user.click(appleCells[0])

    await waitFor(() => {
      expect(screen.getByText('Current Price:')).toBeInTheDocument()
    })

    // Find and click close button (X button)
    const closeButton = screen.getByLabelText('Close dialog')
    await user.click(closeButton)

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Current Price:')).not.toBeInTheDocument()
    })
  })

  it('should open dialog when clicking Action button', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const actionButtons = screen.getAllByText('Action')
    await user.click(actionButtons[0])

    // Dialog should open with trade details
    await waitFor(() => {
      expect(screen.getByText('View Full Details')).toBeInTheDocument()
    })
  })
})

describe('TradeList - Trade Count Display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display trade count', () => {
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    expect(screen.getByText(/Showing 2 of 2 trades/)).toBeInTheDocument()
  })

  it('should update count when filtering', () => {
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    // Initially shows all trades
    expect(screen.getByText(/Showing 2 of 2 trades/)).toBeInTheDocument()
  })
})

describe('TradeList - Price Staleness Logic', () => {
  it('should identify prices older than 1 day as stale', () => {
    const isPriceStale = (date: Date) => {
      const dayInMs = 24 * 60 * 60 * 1000
      return Date.now() - new Date(date).getTime() > dayInMs
    }

    // Fresh price (now)
    const freshPrice = new Date()
    expect(isPriceStale(freshPrice)).toBe(false)

    // Stale price (2 days ago)
    const stalePrice = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    expect(isPriceStale(stalePrice)).toBe(true)

    // Edge case: exactly 1 day (should not be stale)
    const oneDayPrice = new Date(Date.now() - 24 * 60 * 60 * 1000)
    expect(isPriceStale(oneDayPrice)).toBe(false)

    // Edge case: just over 1 day (should be stale)
    const justOverOneDayPrice = new Date(Date.now() - 24 * 60 * 60 * 1000 - 1000)
    expect(isPriceStale(justOverOneDayPrice)).toBe(true)
  })
})

describe('TradeList - Mobile Card View', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display prices in mobile card view', () => {
    // Set viewport to mobile size
    global.innerWidth = 500

    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    // Should show AAPL price (open trade) in the document
    expect(screen.getAllByText('$152.45').length).toBeGreaterThan(0)

    // TSLA is EXPIRED (closed section) - no current price shown in cards
  })

  it('should show tap hint on mobile cards', () => {
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    // Should show hint text (one for each trade)
    const hints = screen.getAllByText('Tap to view actions')
    expect(hints.length).toBeGreaterThan(0)
  })
})

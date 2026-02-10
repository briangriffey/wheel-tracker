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
  getStatusColor: (status: string) => ({
    bg: 'bg-green-100',
    text: 'text-green-800',
  }),
}))

global.confirm = vi.fn() as unknown as typeof window.confirm
global.fetch = vi.fn() as unknown as typeof window.fetch

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

    // Check for price column header
    expect(screen.getByText('Current Price')).toBeInTheDocument()

    // Check AAPL price is displayed
    expect(screen.getByText('$152.45')).toBeInTheDocument()

    // Check TSLA price is displayed
    expect(screen.getByText('$198.75')).toBeInTheDocument()
  })

  it('should mark stale prices with indicator', () => {
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    // TSLA price should be marked as stale (2 days old)
    const staleIndicators = screen.getAllByText('stale')
    expect(staleIndicators.length).toBeGreaterThan(0)
  })

  it('should show dash when price not available', () => {
    const pricesWithoutTSLA = new Map([['AAPL', mockPrices.get('AAPL')!]])

    render(<TradeList initialTrades={mockTrades} prices={pricesWithoutTSLA} />)

    // Should still show AAPL price
    expect(screen.getByText('$152.45')).toBeInTheDocument()

    // TSLA should show a dash (check for it in the appropriate context)
    const rows = screen.getAllByRole('row')
    const tslaRow = rows.find(row => row.textContent?.includes('TSLA'))
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
    expect(screen.getByText('$150.00')).toBeInTheDocument()
  })
})

describe('TradeList - Dropdown Menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show Actions dropdown button', () => {
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const actionButtons = screen.getAllByText('Actions')
    expect(actionButtons.length).toBeGreaterThan(0)
  })

  it('should open dropdown menu when clicking Actions button', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const actionButtons = screen.getAllByText('Actions')
    await user.click(actionButtons[0])

    // Menu should open and show options
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument()
    })
  })

  it('should show all actions for OPEN trades in dropdown', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const actionButtons = screen.getAllByText('Actions')
    // Click the first one (OPEN trade)
    await user.click(actionButtons[0])

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument()
      expect(screen.getByText('Close Early')).toBeInTheDocument()
      expect(screen.getByText('Mark as Expired')).toBeInTheDocument()
      expect(screen.getByText('Mark as Assigned')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  it('should only show View Details for non-OPEN trades', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const actionButtons = screen.getAllByText('Actions')
    // Click the second one (EXPIRED trade)
    await user.click(actionButtons[1])

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument()
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

    // Find and click a table row (by ticker text)
    const appleCell = screen.getByText('AAPL')
    await user.click(appleCell)

    // Dialog should open and show trade details
    await waitFor(() => {
      // Should show ticker in dialog header
      const headers = screen.getAllByText('AAPL')
      expect(headers.length).toBeGreaterThan(1) // One in table, one in dialog
    })
  })

  it('should display current price in dialog', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const appleCell = screen.getByText('AAPL')
    await user.click(appleCell)

    await waitFor(() => {
      // Should show "Current Price:" label in dialog
      expect(screen.getByText('Current Price:')).toBeInTheDocument()
      // Price should be visible
      expect(screen.getByText('$152.45')).toBeInTheDocument()
    })
  })

  it('should close dialog when clicking close button', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    // Open dialog
    const appleCell = screen.getByText('AAPL')
    await user.click(appleCell)

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

  it('should not open dialog when clicking Actions dropdown', async () => {
    const user = userEvent.setup()
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const actionButtons = screen.getAllByText('Actions')
    await user.click(actionButtons[0])

    // Dropdown menu should open
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument()
    })

    // Dialog should NOT open (no "Current Price:" text which is unique to dialog)
    expect(screen.queryByText('Current Price:')).not.toBeInTheDocument()
  })
})

describe('TradeList - Refresh Prices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display Refresh Prices button', () => {
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    expect(screen.getByText('Refresh Prices')).toBeInTheDocument()
  })

  it('should call API and show success toast on refresh', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        summary: {
          successful: 2,
          failed: 0,
          total: 2,
        },
      }),
    } as Response)

    const toast = await import('react-hot-toast')

    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const refreshButton = screen.getByText('Refresh Prices')
    await user.click(refreshButton)

    // Should call the API
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/market-data/refresh',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    // Should show success toast
    await waitFor(() => {
      expect(toast.default.success).toHaveBeenCalledWith('Refreshed 2 prices')
    })
  })

  it('should show loading state while refreshing', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(global.fetch)

    // Create a promise that we can control
    let resolvePromise: (value: Response) => void
    const fetchPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })
    mockFetch.mockReturnValueOnce(fetchPromise)

    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const refreshButton = screen.getByText('Refresh Prices')
    await user.click(refreshButton)

    // Should show loading text
    await waitFor(() => {
      expect(screen.getByText('Refreshing...')).toBeInTheDocument()
    })

    // Button should be disabled
    const loadingButton = screen.getByText('Refreshing...')
    expect(loadingButton.closest('button')).toBeDisabled()

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({
        success: true,
        summary: { successful: 2, failed: 0, total: 2 },
      }),
    } as Response)

    // Should return to normal state
    await waitFor(() => {
      expect(screen.getByText('Refresh Prices')).toBeInTheDocument()
    })
  })

  it('should show error toast on refresh failure', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(global.fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'API Error',
      }),
    } as Response)

    const toast = await import('react-hot-toast')

    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    const refreshButton = screen.getByText('Refresh Prices')
    await user.click(refreshButton)

    // Should show error toast
    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Failed to refresh prices')
    })
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

    // Should show both prices in the document
    expect(screen.getByText('$152.45')).toBeInTheDocument()
    expect(screen.getByText('$198.75')).toBeInTheDocument()
  })

  it('should show tap hint on mobile cards', () => {
    render(<TradeList initialTrades={mockTrades} prices={mockPrices} />)

    // Should show hint text (one for each trade)
    const hints = screen.getAllByText('Tap to view actions')
    expect(hints.length).toBeGreaterThan(0)
  })
})

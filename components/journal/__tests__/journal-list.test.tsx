import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JournalList } from '../journal-list'
import type { Trade } from '@/lib/generated/prisma'
import { Prisma } from '@/lib/generated/prisma'

// Mock the actions
vi.mock('@/lib/actions/trades', () => ({
  updateTrade: vi.fn(() => Promise.resolve({ success: true, data: { id: '1' } })),
  bulkUpdateTags: vi.fn(() => Promise.resolve({ success: true, data: { count: 1 } })),
}))

vi.mock('@/lib/actions/export', () => ({
  exportTradesToCSV: vi.fn(() =>
    Promise.resolve('Ticker,Type,Premium\nAAPL,PUT,250.00')
  ),
}))

const mockTrades: Trade[] = [
  {
    id: '1',
    userId: 'user1',
    ticker: 'AAPL',
    type: 'PUT',
    action: 'SELL_TO_OPEN',
    status: 'OPEN',
    strikePrice: new Prisma.Decimal(150),
    premium: new Prisma.Decimal(250),
    contracts: 1,
    shares: 100,
    expirationDate: new Date('2026-03-15'),
    openDate: new Date('2026-02-01'),
    closeDate: null,
    notes: 'Test note for AAPL',
    tags: ['earnings', 'high-iv'],
    outcome: 'GREAT',
    positionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    userId: 'user1',
    ticker: 'MSFT',
    type: 'CALL',
    action: 'SELL_TO_OPEN',
    status: 'OPEN',
    strikePrice: new Prisma.Decimal(400),
    premium: new Prisma.Decimal(300),
    contracts: 1,
    shares: 100,
    expirationDate: new Date('2026-04-15'),
    openDate: new Date('2026-02-05'),
    closeDate: null,
    notes: 'Test note for MSFT',
    tags: ['tech'],
    outcome: 'OKAY',
    positionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    userId: 'user1',
    ticker: 'GOOGL',
    type: 'PUT',
    action: 'SELL_TO_OPEN',
    status: 'EXPIRED',
    strikePrice: new Prisma.Decimal(120),
    premium: new Prisma.Decimal(180),
    contracts: 1,
    shares: 100,
    expirationDate: new Date('2026-02-20'),
    openDate: new Date('2026-01-15'),
    closeDate: new Date('2026-02-20'),
    notes: null,
    tags: [],
    outcome: null,
    positionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

describe('JournalList', () => {
  it('should render all trades initially', () => {
    render(<JournalList initialTrades={mockTrades} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.getByText('GOOGL')).toBeInTheDocument()
  })

  it('should show correct trade count', () => {
    render(<JournalList initialTrades={mockTrades} />)

    expect(screen.getByText('Showing 3 of 3 trades')).toBeInTheDocument()
  })

  it('should filter trades by search query', async () => {
    const user = userEvent.setup()
    render(<JournalList initialTrades={mockTrades} />)

    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'AAPL')

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1 of 3 trades')).toBeInTheDocument()
  })

  it('should filter trades by outcome', async () => {
    const user = userEvent.setup()
    render(<JournalList initialTrades={mockTrades} />)

    const outcomeFilter = screen.getByLabelText('Outcome')
    await user.selectOptions(outcomeFilter, 'GREAT')

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1 of 3 trades')).toBeInTheDocument()
  })

  it('should clear all filters', async () => {
    const user = userEvent.setup()
    render(<JournalList initialTrades={mockTrades} />)

    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'AAPL')

    const clearButton = screen.getByText('Clear all filters')
    await user.click(clearButton)

    expect(searchInput).toHaveValue('')
    expect(screen.getByText('Showing 3 of 3 trades')).toBeInTheDocument()
  })

  it('should show empty state when no trades found', () => {
    render(<JournalList initialTrades={[]} />)

    expect(screen.getByText('No trades found')).toBeInTheDocument()
  })

  it('should display tags for trades', () => {
    render(<JournalList initialTrades={mockTrades} />)

    // Check for AAPL's tags
    expect(screen.getByText('earnings')).toBeInTheDocument()
    expect(screen.getByText('high-iv')).toBeInTheDocument()

    // Check for MSFT's tags
    expect(screen.getByText('tech')).toBeInTheDocument()
  })

  it('should allow selecting trades', async () => {
    const user = userEvent.setup()
    render(<JournalList initialTrades={mockTrades} />)

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1]) // Click first trade checkbox (skip the "select all")

    expect(screen.getByText(/1 selected/)).toBeInTheDocument()
  })

  it('should allow selecting all trades', async () => {
    const user = userEvent.setup()
    render(<JournalList initialTrades={mockTrades} />)

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
    await user.click(selectAllCheckbox)

    expect(screen.getByText(/3 selected/)).toBeInTheDocument()
  })

  it('should search in notes', async () => {
    const user = userEvent.setup()
    render(<JournalList initialTrades={mockTrades} />)

    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'note for MSFT')

    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
  })
})

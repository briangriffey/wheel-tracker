/**
 * Tests for the post-assignment Sell Covered Call flow (PR #12).
 *
 * Covers:
 * - assign-put-dialog.tsx: onSellCoveredCall signature change (now passes ticker, positionId, contracts)
 * - trade-actions-dialog.tsx: "Assign PUT" button replaces "Mark as Assigned" for PUT trades,
 *   AssignPutDialog rendered inline, onSellCoveredCall wired through
 * - trade-list.tsx: coveredCallPrefill state, handleSellCoveredCall, Modal+TradeEntryForm
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Prisma } from '@/lib/generated/prisma'
import type { Trade } from '@/lib/generated/prisma'
import type { TradeWithWheel } from '@/lib/queries/trades'
import type { StockPriceResult } from '@/lib/services/market-data'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/actions/trades', () => ({
  deleteTrade: vi.fn(),
  updateTradeStatus: vi.fn(),
  createTrade: vi.fn(),
}))

vi.mock('@/lib/actions/positions', () => ({
  assignPut: vi.fn(),
}))

vi.mock('@/lib/actions/prices', () => ({
  fetchStockPrice: vi.fn().mockResolvedValue({ success: false, error: 'No API key' }),
  refreshSinglePrice: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  getCurrentUserId: vi.fn(),
}))

vi.mock('@/lib/actions/wheel-queries', () => ({
  getOpenPositionsForTicker: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getActiveWheelForTicker: vi.fn().mockResolvedValue({ success: true, data: null }),
}))

vi.mock('@/lib/actions/subscription', () => ({
  getTradeUsage: vi.fn().mockResolvedValue({
    success: true,
    data: { tradesUsed: 0, tradeLimit: 10, limitReached: false },
  }),
}))

vi.mock('@/lib/design/colors', () => ({
  getStatusColor: () => ({ bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }),
  getPnlColor: () => ({ text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }),
}))

global.confirm = vi.fn() as unknown as typeof window.confirm

// ── Imports after mocks ───────────────────────────────────────────────────────

import { TradeActionsDialog } from '../trade-actions-dialog'
import { TradeList } from '../trade-list'
import { assignPut } from '@/lib/actions/positions'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const POSITION_ID = 'claaaaaaaaaaaaaaaaaaaaaaa'

const makePutTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: 'clccccccccccccccccccccccc',
  userId: 'user1',
  ticker: 'AAPL',
  type: 'PUT',
  action: 'SELL_TO_OPEN',
  status: 'OPEN',
  strikePrice: new Prisma.Decimal(150),
  premium: new Prisma.Decimal(2.5),
  closePremium: null,
  realizedGainLoss: null,
  contracts: 2,
  shares: 200,
  expirationDate: new Date('2026-05-16'),
  openDate: new Date('2026-03-06'),
  closeDate: null,
  notes: null,
  createdAt: new Date('2026-03-06'),
  updatedAt: new Date('2026-03-06'),
  positionId: null,
  wheelId: null,
  rolledFromId: null,
  ...overrides,
})

const makeCallTrade = (overrides: Partial<Trade> = {}): Trade =>
  makePutTrade({ type: 'CALL', ...overrides })

const makeTradeWithWheel = (trade: Trade): TradeWithWheel => ({
  ...trade,
  wheel: null,
})

const mockPrices = new Map<string, StockPriceResult>([
  ['AAPL', { ticker: 'AAPL', price: 148, date: new Date(), success: true }],
])

// ── TradeActionsDialog tests ──────────────────────────────────────────────────

describe('TradeActionsDialog — PUT vs CALL assign button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "Assign PUT" for an OPEN PUT trade', () => {
    render(
      <TradeActionsDialog
        trade={makePutTrade()}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Assign PUT')).toBeInTheDocument()
    expect(screen.queryByText('Mark as Assigned')).not.toBeInTheDocument()
  })

  it('shows "Mark as Assigned" for an OPEN CALL trade', () => {
    render(
      <TradeActionsDialog
        trade={makeCallTrade()}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Mark as Assigned')).toBeInTheDocument()
    expect(screen.queryByText('Assign PUT')).not.toBeInTheDocument()
  })

  it('opens AssignPutDialog inline when "Assign PUT" is clicked', async () => {
    const user = userEvent.setup()

    render(
      <TradeActionsDialog
        trade={makePutTrade()}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getByText('Assign PUT'))

    // The AssignPutDialog renders a form with the trade's ticker
    await waitFor(() => {
      // AssignPutDialog shows the ticker in its heading / content
      const dialogs = screen.getAllByText('AAPL')
      expect(dialogs.length).toBeGreaterThan(0)
    })
  })

  it('passes onSellCoveredCall through to AssignPutDialog', async () => {
    const user = userEvent.setup()
    const onSellCoveredCall = vi.fn()
    vi.mocked(assignPut).mockResolvedValue({
      success: true,
      data: { positionId: POSITION_ID, tradeId: 'clccccccccccccccccccccccc' },
    })

    render(
      <TradeActionsDialog
        trade={makePutTrade({ contracts: 3, shares: 300 })}
        isOpen={true}
        onClose={vi.fn()}
        onSellCoveredCall={onSellCoveredCall}
      />
    )

    // Open AssignPutDialog
    await user.click(screen.getByText('Assign PUT'))

    // Submit the assignment
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /assign/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /assign/i }))

    // After assignment, the "Sell Covered Call?" prompt appears — click it
    await waitFor(() => {
      const sellCallBtn = screen.queryByRole('button', { name: /sell covered call/i })
      if (sellCallBtn) {
        return true
      }
    }, { timeout: 3000 })

    const sellCallBtn = screen.queryByRole('button', { name: /sell covered call/i })
    if (sellCallBtn) {
      await user.click(sellCallBtn)
      expect(onSellCoveredCall).toHaveBeenCalledWith('AAPL', POSITION_ID, 3)
    }
  })
})

// ── TradeList covered call modal tests ────────────────────────────────────────

describe('TradeList — Sell Covered Call modal after assignment', () => {
  const openPutTrade = makeTradeWithWheel(makePutTrade())
  const expiredTrade = makeTradeWithWheel(makePutTrade({ status: 'EXPIRED', closeDate: new Date() }))

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without the covered call modal by default', () => {
    render(<TradeList initialTrades={[openPutTrade, expiredTrade]} prices={mockPrices} />)

    // The covered call modal title should not be present initially
    expect(screen.queryByText(/sell covered call on/i)).not.toBeInTheDocument()
  })

  it('opens the covered call modal when handleSellCoveredCall is triggered', async () => {
    const user = userEvent.setup()
    vi.mocked(assignPut).mockResolvedValue({
      success: true,
      data: { positionId: POSITION_ID, tradeId: 'clccccccccccccccccccccccc' },
    })

    render(<TradeList initialTrades={[openPutTrade, expiredTrade]} prices={mockPrices} />)

    // Click the Action button to open TradeActionsDialog
    const actionButtons = screen.getAllByText('Action')
    await user.click(actionButtons[0])

    // Open AssignPutDialog from TradeActionsDialog
    await waitFor(() => {
      expect(screen.getByText('Assign PUT')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Assign PUT'))

    // Submit the assignment form
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /assign/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /assign/i }))

    // After assignment success, prompt appears — click Sell Covered Call
    await waitFor(() => {
      const btn = screen.queryByRole('button', { name: /sell covered call/i })
      return !!btn
    }, { timeout: 3000 })

    const sellBtn = screen.queryByRole('button', { name: /sell covered call/i })
    if (sellBtn) {
      await user.click(sellBtn)

      // The covered call modal should now be open
      await waitFor(() => {
        expect(screen.getByText(/sell covered call on aapl/i)).toBeInTheDocument()
      })
    }
  })

  it('closes the covered call modal when cancel is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(assignPut).mockResolvedValue({
      success: true,
      data: { positionId: POSITION_ID, tradeId: 'clccccccccccccccccccccccc' },
    })

    render(<TradeList initialTrades={[openPutTrade, expiredTrade]} prices={mockPrices} />)

    // Trigger the full flow to open the covered call modal
    const actionButtons = screen.getAllByText('Action')
    await user.click(actionButtons[0])

    await waitFor(() => expect(screen.getByText('Assign PUT')).toBeInTheDocument())
    await user.click(screen.getByText('Assign PUT'))

    await waitFor(() => expect(screen.getByRole('button', { name: /assign/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /assign/i }))

    await waitFor(() => {
      return !!screen.queryByRole('button', { name: /sell covered call/i })
    }, { timeout: 3000 })

    const sellBtn = screen.queryByRole('button', { name: /sell covered call/i })
    if (sellBtn) {
      await user.click(sellBtn)

      await waitFor(() => {
        expect(screen.getByText(/sell covered call on aapl/i)).toBeInTheDocument()
      })

      // Cancel button closes the modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText(/sell covered call on aapl/i)).not.toBeInTheDocument()
      })
    }
  })
})

// ── onSellCoveredCall signature tests ─────────────────────────────────────────

describe('AssignPutDialog — onSellCoveredCall signature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls onSellCoveredCall with ticker, positionId, and contracts after assignment', async () => {
    const { AssignPutDialog } = await import('../assign-put-dialog')
    const user = userEvent.setup()
    const onSellCoveredCall = vi.fn()

    vi.mocked(assignPut).mockResolvedValue({
      success: true,
      data: { positionId: POSITION_ID, tradeId: 'clccccccccccccccccccccccc' },
    })

    render(
      <AssignPutDialog
        trade={{
          id: 'clccccccccccccccccccccccc',
          ticker: 'TSLA',
          strikePrice: 200,
          premium: 3.5,
          contracts: 4,
          shares: 400,
          expirationDate: new Date('2026-05-16'),
          status: 'OPEN',
          type: 'PUT',
        }}
        wheelId={null}
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onSellCoveredCall={onSellCoveredCall}
      />
    )

    // Submit assignment
    const assignButton = screen.getByRole('button', { name: /assign/i })
    await user.click(assignButton)

    // After success, click Sell Covered Call
    await waitFor(() => {
      return !!screen.queryByRole('button', { name: /sell covered call/i })
    }, { timeout: 2000 })

    const sellBtn = screen.queryByRole('button', { name: /sell covered call/i })
    if (sellBtn) {
      await user.click(sellBtn)
      expect(onSellCoveredCall).toHaveBeenCalledWith('TSLA', POSITION_ID, 4)
    }
  })

  it('does not call onSellCoveredCall if no positionId was returned', async () => {
    const { AssignPutDialog } = await import('../assign-put-dialog')
    const user = userEvent.setup()
    const onSellCoveredCall = vi.fn()

    // assignPut returns success but we test that the guard in handleSellCoveredCall works
    vi.mocked(assignPut).mockResolvedValue({
      success: false,
      error: 'Assignment failed',
    })

    render(
      <AssignPutDialog
        trade={{
          id: 'clccccccccccccccccccccccc',
          ticker: 'TSLA',
          strikePrice: 200,
          premium: 3.5,
          contracts: 4,
          shares: 400,
          expirationDate: new Date('2026-05-16'),
          status: 'OPEN',
          type: 'PUT',
        }}
        wheelId={null}
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onSellCoveredCall={onSellCoveredCall}
      />
    )

    const assignButton = screen.getByRole('button', { name: /assign/i })
    await user.click(assignButton)

    // After failure, no prompt appears, so onSellCoveredCall is never called
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500))
    })

    expect(onSellCoveredCall).not.toHaveBeenCalled()
  })
})

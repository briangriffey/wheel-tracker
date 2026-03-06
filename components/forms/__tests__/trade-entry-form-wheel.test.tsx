/**
 * Tests for TradeEntryForm wheel enhancements:
 * - prefill/readOnlyFields props
 * - wheel badge indicator (existing / new wheel)
 * - position selector for CALL + SELL_TO_OPEN
 * - auto-select when exactly one position
 * - multiple-positions warning
 * - wheel-linked toast message on success
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TradeEntryForm } from '../trade-entry-form'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/actions/trades', () => ({
  createTrade: vi.fn(),
}))

vi.mock('@/lib/actions/subscription', () => ({
  getTradeUsage: vi.fn().mockResolvedValue({
    success: true,
    data: { tradesUsed: 0, tradeLimit: 10, limitReached: false },
  }),
}))

vi.mock('@/lib/actions/wheel-queries', () => ({
  getOpenPositionsForTicker: vi.fn(),
  getActiveWheelForTicker: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
  getCurrentUserId: vi.fn().mockResolvedValue(null),
}))

// ── Imports after mocks ───────────────────────────────────────────────────────

import { createTrade } from '@/lib/actions/trades'
import { getOpenPositionsForTicker, getActiveWheelForTicker } from '@/lib/actions/wheel-queries'
import toast from 'react-hot-toast'
import type { OpenPositionForForm, ActiveWheelForForm } from '@/lib/actions/wheel-queries'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const POSITION_ID = 'claaaaaaaaaaaaaaaaaaaaaaa'
const WHEEL_ID = 'clbbbbbbbbbbbbbbbbbbbbbbb'

const makePosition = (overrides: Partial<OpenPositionForForm> = {}): OpenPositionForForm => ({
  id: POSITION_ID,
  ticker: 'AAPL',
  shares: 100,
  costBasis: 145.5,
  acquiredDate: new Date('2026-01-15'),
  wheelId: WHEEL_ID,
  hasOpenCall: false,
  ...overrides,
})

const makeWheel = (overrides: Partial<ActiveWheelForForm> = {}): ActiveWheelForForm => ({
  id: WHEEL_ID,
  ticker: 'AAPL',
  status: 'ACTIVE',
  cycleCount: 1,
  totalPremiums: 500,
  ...overrides,
})

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Default: no positions, no active wheel */
function setupDefaultMocks() {
  vi.mocked(getOpenPositionsForTicker).mockResolvedValue({ success: true, data: [] })
  vi.mocked(getActiveWheelForTicker).mockResolvedValue({ success: true, data: null })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TradeEntryForm — prefill props', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('pre-fills ticker when prefill.ticker is provided', async () => {
    render(<TradeEntryForm prefill={{ ticker: 'TSLA' }} />)

    await waitFor(() => {
      const input = screen.getByLabelText(/ticker symbol/i) as HTMLInputElement
      expect(input.value).toBe('TSLA')
    })
  })

  it('pre-fills type when prefill.type is provided', async () => {
    render(<TradeEntryForm prefill={{ type: 'CALL' }} />)

    await waitFor(() => {
      const select = document.getElementById('type') as HTMLSelectElement
      expect(select.value).toBe('CALL')
    })
  })

  it('pre-fills action when prefill.action is provided', async () => {
    render(<TradeEntryForm prefill={{ action: 'BUY_TO_CLOSE' }} />)

    await waitFor(() => {
      const select = document.getElementById('action') as HTMLSelectElement
      expect(select.value).toBe('BUY_TO_CLOSE')
    })
  })

  it('pre-fills contracts when prefill.contracts is provided', async () => {
    render(<TradeEntryForm prefill={{ contracts: 3 }} />)

    await waitFor(() => {
      const input = document.getElementById('contracts') as HTMLInputElement
      expect(Number(input.value)).toBe(3)
    })
  })

  it('defaults action to SELL_TO_OPEN when not prefilled', () => {
    render(<TradeEntryForm />)

    const select = document.getElementById('action') as HTMLSelectElement
    expect(select.value).toBe('SELL_TO_OPEN')
  })
})

describe('TradeEntryForm — readOnlyFields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('disables ticker field when readOnlyFields includes ticker', () => {
    render(<TradeEntryForm prefill={{ ticker: 'AAPL' }} readOnlyFields={['ticker']} />)

    const input = screen.getByLabelText(/ticker symbol/i) as HTMLInputElement
    expect(input).toBeDisabled()
  })

  it('disables type field when readOnlyFields includes type', () => {
    render(<TradeEntryForm prefill={{ type: 'CALL' }} readOnlyFields={['type']} />)

    const select = document.getElementById('type') as HTMLSelectElement
    expect(select).toBeDisabled()
  })

  it('disables action field when readOnlyFields includes action', () => {
    render(<TradeEntryForm readOnlyFields={['action']} />)

    const select = document.getElementById('action') as HTMLSelectElement
    expect(select).toBeDisabled()
  })

  it('disables contracts field when readOnlyFields includes contracts', () => {
    render(<TradeEntryForm prefill={{ contracts: 2 }} readOnlyFields={['contracts']} />)

    const input = document.getElementById('contracts') as HTMLInputElement
    expect(input).toBeDisabled()
  })

  it('does not disable fields not in readOnlyFields', () => {
    render(
      <TradeEntryForm
        prefill={{ ticker: 'AAPL', type: 'PUT' }}
        readOnlyFields={['ticker']}
      />
    )

    const typeSelect = document.getElementById('type') as HTMLSelectElement
    expect(typeSelect).not.toBeDisabled()
  })
})

describe('TradeEntryForm — wheel badge indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('shows "new wheel" banner when ticker entered and no existing wheel', async () => {
    vi.mocked(getActiveWheelForTicker).mockResolvedValue({ success: true, data: null })

    render(<TradeEntryForm prefill={{ ticker: 'AAPL', action: 'SELL_TO_OPEN' }} />)

    await waitFor(
      () => {
        expect(
          screen.getByText(/a new wheel will be created for/i)
        ).toBeInTheDocument()
      },
      { timeout: 1000 }
    )
  })

  it('shows "added to existing wheel" banner when active wheel exists', async () => {
    vi.mocked(getActiveWheelForTicker).mockResolvedValue({
      success: true,
      data: makeWheel({ ticker: 'AAPL', cycleCount: 2 }),
    })

    render(<TradeEntryForm prefill={{ ticker: 'AAPL', action: 'SELL_TO_OPEN' }} />)

    await waitFor(
      () => {
        expect(
          screen.getByText(/this trade will be added to your/i)
        ).toBeInTheDocument()
        expect(screen.getByText(/cycle 3/i)).toBeInTheDocument()
      },
      { timeout: 1000 }
    )
  })

  it('shows correct cycle number (cycleCount + 1)', async () => {
    vi.mocked(getActiveWheelForTicker).mockResolvedValue({
      success: true,
      data: makeWheel({ cycleCount: 0 }),
    })

    render(<TradeEntryForm prefill={{ ticker: 'AAPL', action: 'SELL_TO_OPEN' }} />)

    await waitFor(
      () => {
        expect(screen.getByText(/cycle 1/i)).toBeInTheDocument()
      },
      { timeout: 1000 }
    )
  })

  it('does not show wheel banner when action is BUY_TO_CLOSE', async () => {
    render(<TradeEntryForm prefill={{ ticker: 'AAPL', action: 'BUY_TO_CLOSE' }} />)

    // Wait long enough for any debounced fetch to run
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500))
    })

    expect(screen.queryByText(/a new wheel will be created/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/this trade will be added to your/i)).not.toBeInTheDocument()
  })

  it('does not show wheel banner when ticker is empty', async () => {
    render(<TradeEntryForm prefill={{ action: 'SELL_TO_OPEN' }} />)

    await act(async () => {
      await new Promise((r) => setTimeout(r, 500))
    })

    expect(screen.queryByText(/a new wheel will be created/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/this trade will be added to your/i)).not.toBeInTheDocument()
  })
})

describe('TradeEntryForm — position selector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('does not show position selector for PUT trades', async () => {
    render(<TradeEntryForm prefill={{ ticker: 'AAPL', type: 'PUT', action: 'SELL_TO_OPEN' }} />)

    await act(async () => {
      await new Promise((r) => setTimeout(r, 500))
    })

    expect(screen.queryByLabelText(/position/i)).not.toBeInTheDocument()
  })

  it('does not show position selector for BUY_TO_CLOSE CALL', async () => {
    render(
      <TradeEntryForm prefill={{ ticker: 'AAPL', type: 'CALL', action: 'BUY_TO_CLOSE' }} />
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 500))
    })

    expect(screen.queryByLabelText(/position/i)).not.toBeInTheDocument()
  })

  it('shows position selector for CALL + SELL_TO_OPEN when positions exist', async () => {
    vi.mocked(getOpenPositionsForTicker).mockResolvedValue({
      success: true,
      data: [makePosition()],
    })

    render(
      <TradeEntryForm prefill={{ ticker: 'AAPL', type: 'CALL', action: 'SELL_TO_OPEN' }} />
    )

    await waitFor(
      () => {
        expect(document.getElementById('positionId')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )
  })

  it('shows "no open positions" message when ticker has no positions', async () => {
    vi.mocked(getOpenPositionsForTicker).mockResolvedValue({ success: true, data: [] })

    render(
      <TradeEntryForm prefill={{ ticker: 'AAPL', type: 'CALL', action: 'SELL_TO_OPEN' }} />
    )

    await waitFor(
      () => {
        expect(screen.getByText(/no open positions found for aapl/i)).toBeInTheDocument()
      },
      { timeout: 1000 }
    )
  })

  it('formats position option with shares, cost basis and acquired date', async () => {
    vi.mocked(getOpenPositionsForTicker).mockResolvedValue({
      success: true,
      data: [
        makePosition({
          shares: 200,
          costBasis: 148.75,
          acquiredDate: new Date('2026-01-15'),
        }),
      ],
    })

    render(
      <TradeEntryForm prefill={{ ticker: 'AAPL', type: 'CALL', action: 'SELL_TO_OPEN' }} />
    )

    await waitFor(
      () => {
        const select = document.getElementById('positionId') as HTMLSelectElement
        expect(select).toBeInTheDocument()
        // The option text should contain shares, cost basis, and date
        expect(select.textContent).toContain('200 shares')
        expect(select.textContent).toContain('$148.75')
      },
      { timeout: 1000 }
    )
  })

  it('auto-selects position when exactly one exists and no prefill positionId', async () => {
    const pos = makePosition({ id: POSITION_ID })
    vi.mocked(getOpenPositionsForTicker).mockResolvedValue({ success: true, data: [pos] })

    render(
      <TradeEntryForm prefill={{ ticker: 'AAPL', type: 'CALL', action: 'SELL_TO_OPEN' }} />
    )

    await waitFor(
      () => {
        const select = document.getElementById('positionId') as HTMLSelectElement
        expect(select?.value).toBe(POSITION_ID)
      },
      { timeout: 1000 }
    )
  })

  it('does not auto-select when prefill.positionId is already set', async () => {
    const OTHER_POS_ID = 'clzzzzzzzzzzzzzzzzzzzzzza'
    const pos1 = makePosition({ id: POSITION_ID })
    const pos2 = makePosition({ id: OTHER_POS_ID, shares: 200 })
    vi.mocked(getOpenPositionsForTicker).mockResolvedValue({ success: true, data: [pos1, pos2] })

    render(
      <TradeEntryForm
        prefill={{
          ticker: 'AAPL',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          positionId: OTHER_POS_ID,
        }}
      />
    )

    await waitFor(
      () => {
        const select = document.getElementById('positionId') as HTMLSelectElement
        expect(select).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Should keep the prefilled positionId, not overwrite with auto-select
    const select = document.getElementById('positionId') as HTMLSelectElement
    expect(select?.value).toBe(OTHER_POS_ID)
  })

  it('shows multiple-positions warning when more than one position found', async () => {
    vi.mocked(getOpenPositionsForTicker).mockResolvedValue({
      success: true,
      data: [makePosition(), makePosition({ id: 'clzzzzzzzzzzzzzzzzzzzzzza', shares: 200 })],
    })

    render(
      <TradeEntryForm prefill={{ ticker: 'AAPL', type: 'CALL', action: 'SELL_TO_OPEN' }} />
    )

    await waitFor(
      () => {
        expect(
          screen.getByText(/multiple positions found for this ticker/i)
        ).toBeInTheDocument()
      },
      { timeout: 1000 }
    )
  })

  it('marks positions with open calls as disabled in the dropdown', async () => {
    vi.mocked(getOpenPositionsForTicker).mockResolvedValue({
      success: true,
      data: [makePosition({ hasOpenCall: true })],
    })

    render(
      <TradeEntryForm prefill={{ ticker: 'AAPL', type: 'CALL', action: 'SELL_TO_OPEN' }} />
    )

    await waitFor(
      () => {
        const select = document.getElementById('positionId') as HTMLSelectElement
        expect(select).toBeInTheDocument()
        const options = Array.from(select.options)
        const posOption = options.find((o) => o.value === POSITION_ID)
        expect(posOption?.disabled).toBe(true)
        expect(posOption?.text).toContain('[Has Open Call]')
      },
      { timeout: 1000 }
    )
  })

  it('disables position selector when positionId is in readOnlyFields', async () => {
    vi.mocked(getOpenPositionsForTicker).mockResolvedValue({
      success: true,
      data: [makePosition()],
    })

    render(
      <TradeEntryForm
        prefill={{ ticker: 'AAPL', type: 'CALL', action: 'SELL_TO_OPEN', positionId: POSITION_ID }}
        readOnlyFields={['positionId']}
      />
    )

    await waitFor(
      () => {
        const select = document.getElementById('positionId') as HTMLSelectElement
        expect(select).toBeDisabled()
      },
      { timeout: 1000 }
    )
  })
})

describe('TradeEntryForm — wheel-linked success toast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('shows wheel-linked toast when createTrade returns wheelId and wheelTicker', async () => {
    vi.mocked(createTrade).mockResolvedValue({
      success: true,
      data: { id: 'clccccccccccccccccccccccc', wheelId: WHEEL_ID, wheelTicker: 'AAPL' },
    })

    const user = userEvent.setup()
    render(<TradeEntryForm />)

    // Fill out minimum required fields
    await user.type(screen.getByLabelText(/ticker symbol/i), 'AAPL')

    const typeSelect = document.getElementById('type') as HTMLSelectElement
    await user.selectOptions(typeSelect, 'PUT')

    await user.type(document.getElementById('strikePrice')!, '150')
    await user.type(document.getElementById('premium')!, '250')
    await user.type(document.getElementById('contracts')!, '1')
    await user.type(document.getElementById('expirationDate')!, '2026-05-16')

    await user.click(screen.getByRole('button', { name: /create trade/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('linked to AAPL wheel')
      )
    })
  })

  it('shows generic success toast when createTrade returns no wheelId', async () => {
    vi.mocked(createTrade).mockResolvedValue({
      success: true,
      data: { id: 'clccccccccccccccccccccccc' },
    })

    const user = userEvent.setup()
    render(<TradeEntryForm />)

    await user.type(screen.getByLabelText(/ticker symbol/i), 'AAPL')

    const typeSelect = document.getElementById('type') as HTMLSelectElement
    await user.selectOptions(typeSelect, 'PUT')

    await user.type(document.getElementById('strikePrice')!, '150')
    await user.type(document.getElementById('premium')!, '250')
    await user.type(document.getElementById('contracts')!, '1')
    await user.type(document.getElementById('expirationDate')!, '2026-05-16')

    await user.click(screen.getByRole('button', { name: /create trade/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Trade created successfully!')
    })
  })
})

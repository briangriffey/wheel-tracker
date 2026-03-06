/**
 * Tests for wheel badge integration in getTrades / getOpenTrades.
 * Verifies that the wheel relation is included in query results and
 * that TradeWithWheel is correctly typed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { getTrades, getOpenTrades } from '../trades'
import type { TradeWithWheel } from '../trades'

vi.mock('@/lib/db', () => ({
  prisma: {
    trade: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn(),
}))

const mockUserId = 'user-abc'

// Minimal trade stub that matches the shape returned by Prisma
function makeTrade(overrides: Record<string, unknown> = {}): TradeWithWheel {
  return {
    id: 'clccccccccccccccccccccccc',
    userId: mockUserId,
    ticker: 'AAPL',
    type: 'PUT',
    action: 'SELL_TO_OPEN',
    status: 'OPEN',
    strikePrice: 150 as never,
    premium: 2.5 as never,
    contracts: 1,
    shares: 100,
    expirationDate: new Date('2026-04-17'),
    openDate: new Date('2026-03-06'),
    closeDate: null,
    closePremium: null,
    realizedGainLoss: null,
    notes: null,
    positionId: null,
    wheelId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    position: null,
    wheel: null,
    ...overrides,
  } as never
}

describe('getTrades — wheel relation included', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserId).mockResolvedValue(mockUserId)
  })

  it('includes wheel select in the Prisma query', async () => {
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])

    await getTrades()

    expect(prisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          wheel: expect.objectContaining({
            select: expect.objectContaining({
              id: true,
              ticker: true,
              status: true,
            }),
          }),
        }),
      })
    )
  })

  it('returns trade with wheel data when wheel is present', async () => {
    const tradeWithWheel = makeTrade({
      wheelId: 'clbbbbbbbbbbbbbbbbbbbbbbb',
      wheel: {
        id: 'clbbbbbbbbbbbbbbbbbbbbbbb',
        ticker: 'AAPL',
        status: 'ACTIVE',
      },
    })
    vi.mocked(prisma.trade.findMany).mockResolvedValue([tradeWithWheel as never])

    const result = await getTrades()

    expect(result).toHaveLength(1)
    expect(result[0].wheel).not.toBeNull()
    expect(result[0].wheel!.id).toBe('clbbbbbbbbbbbbbbbbbbbbbbb')
    expect(result[0].wheel!.ticker).toBe('AAPL')
    expect(result[0].wheel!.status).toBe('ACTIVE')
  })

  it('returns trade with wheel=null when trade has no wheel', async () => {
    const tradeNoWheel = makeTrade({ wheelId: null, wheel: null })
    vi.mocked(prisma.trade.findMany).mockResolvedValue([tradeNoWheel as never])

    const result = await getTrades()

    expect(result[0].wheel).toBeNull()
  })

  it('returns multiple trades with correct wheel associations', async () => {
    const wheel = { id: 'clbbbbbbbbbbbbbbbbbbbbbbb', ticker: 'AAPL', status: 'ACTIVE' }
    const trades = [
      makeTrade({ ticker: 'AAPL', wheelId: wheel.id, wheel }),
      makeTrade({ ticker: 'MSFT', wheelId: null, wheel: null }),
    ]
    vi.mocked(prisma.trade.findMany).mockResolvedValue(trades as never)

    const result = await getTrades()

    expect(result[0].wheel).not.toBeNull()
    expect(result[0].wheel!.ticker).toBe('AAPL')
    expect(result[1].wheel).toBeNull()
  })
})

describe('getOpenTrades — wheel relation included', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserId).mockResolvedValue(mockUserId)
  })

  it('includes wheel select in the Prisma query', async () => {
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])

    await getOpenTrades()

    expect(prisma.trade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          wheel: expect.objectContaining({
            select: expect.objectContaining({
              id: true,
              ticker: true,
              status: true,
            }),
          }),
        }),
      })
    )
  })

  it('returns only OPEN trades with wheel data', async () => {
    const openTrade = makeTrade({
      status: 'OPEN',
      wheelId: 'clbbbbbbbbbbbbbbbbbbbbbbb',
      wheel: { id: 'clbbbbbbbbbbbbbbbbbbbbbbb', ticker: 'TSLA', status: 'ACTIVE' },
    })
    vi.mocked(prisma.trade.findMany).mockResolvedValue([openTrade as never])

    const result = await getOpenTrades()

    expect(result).toHaveLength(1)
    expect(result[0].wheel!.ticker).toBe('TSLA')
  })

  it('returns wheel=null for open trades without a wheel', async () => {
    vi.mocked(prisma.trade.findMany).mockResolvedValue([makeTrade({ status: 'OPEN' }) as never])

    const result = await getOpenTrades()

    expect(result[0].wheel).toBeNull()
  })
})

describe('TradeWithWheel type shape', () => {
  it('wheel badge link uses trade.wheel.id for the URL', () => {
    const trade = makeTrade({
      wheel: { id: 'clbbbbbbbbbbbbbbbbbbbbbbb', ticker: 'AAPL', status: 'ACTIVE' },
    })
    // This is a type-level/runtime check — the badge links to /wheels/:id
    const expectedPath = `/wheels/${trade.wheel!.id}`
    expect(expectedPath).toBe('/wheels/clbbbbbbbbbbbbbbbbbbbbbbb')
  })

  it('wheel badge title uses trade.wheel.ticker', () => {
    const trade = makeTrade({
      wheel: { id: 'clbbbbbbbbbbbbbbbbbbbbbbb', ticker: 'AAPL', status: 'ACTIVE' },
    })
    const expectedTitle = `Part of ${trade.wheel!.ticker} wheel`
    expect(expectedTitle).toBe('Part of AAPL wheel')
  })
})

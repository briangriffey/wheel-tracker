/**
 * Tests for wheel auto-linking logic in createTrade, updateTradeStatus,
 * and closeOption.
 *
 * IMPORTANT: premium is per-share. Total premium = premium * contracts * 100.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createTrade, updateTradeStatus, closeOption } from '../trades'

// Valid CUID-format IDs (required by Zod validation)
const POSITION_ID = 'claaaaaaaaaaaaaaaaaaaaaaa'
const WHEEL_ID = 'clbbbbbbbbbbbbbbbbbbbbbbb'
const TRADE_ID = 'clccccccccccccccccccccccc'

// Mock Prisma with all models used across all three function groups
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    trade: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    wheel: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    position: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  getCurrentUserId: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/analytics-server', () => ({
  recordAnalyticsEvent: vi.fn(),
}))

import { getCurrentUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const mockUserId = 'user-abc'

function setupTransaction() {
  vi.mocked(prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)
  )
}

function setupProUser() {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    subscriptionTier: 'PRO',
    subscriptionStatus: 'active',
    subscriptionEndsAt: null,
  } as never)
}

const baseTradeInput = {
  strikePrice: 150,
  premium: 2.5, // per-share
  contracts: 1,
  expirationDate: new Date('2026-04-17'),
  openDate: new Date('2026-03-06'),
}

// =============================================================================
// createTrade — wheel auto-linking
// =============================================================================

describe('createTrade — wheel auto-linking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserId).mockResolvedValue(mockUserId)
    setupProUser()
    setupTransaction()
  })

  // ---------------------------------------------------------------------------
  // SELL_TO_OPEN PUT — new wheel creation
  // ---------------------------------------------------------------------------

  describe('SELL_TO_OPEN PUT — no existing wheel', () => {
    it('creates a new ACTIVE wheel and sets wheelId on the trade', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.wheel.create).mockResolvedValue({ id: WHEEL_ID, ticker: 'AAPL' } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ...baseTradeInput,
        ticker: 'AAPL',
        type: 'PUT',
        action: 'SELL_TO_OPEN',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.wheelId).toBe(WHEEL_ID)
        expect(result.data.wheelTicker).toBe('AAPL')
      }

      expect(prisma.wheel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            ticker: 'AAPL',
            status: 'ACTIVE',
            cycleCount: 0,
          }),
        })
      )
    })

    it('sets totalPremiums = premium * contracts * 100 on new wheel', async () => {
      // premium=2.5, contracts=1, shares=100 → totalPremium=250
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.wheel.create).mockResolvedValue({ id: WHEEL_ID, ticker: 'AAPL' } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      await createTrade({
        ticker: 'AAPL',
        type: 'PUT',
        action: 'SELL_TO_OPEN',
        strikePrice: 150,
        premium: 2.5,
        contracts: 1,
        expirationDate: new Date('2026-04-17'),
        openDate: new Date('2026-03-06'),
      })

      expect(prisma.wheel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalPremiums: 250, // 2.5 * 100 * 1
          }),
        })
      )
    })

    it('calculates totalPremiums correctly for multiple contracts', async () => {
      // premium=3.0, contracts=5, shares=500 → totalPremium=1500
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.wheel.create).mockResolvedValue({ id: WHEEL_ID, ticker: 'TSLA' } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      await createTrade({
        ticker: 'TSLA',
        type: 'PUT',
        action: 'SELL_TO_OPEN',
        strikePrice: 200,
        premium: 3.0,
        contracts: 5,
        expirationDate: new Date('2026-04-17'),
        openDate: new Date('2026-03-06'),
      })

      expect(prisma.wheel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalPremiums: 1500, // 3.0 * 500
          }),
        })
      )
    })

    it('sets wheelId on the created trade', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.wheel.create).mockResolvedValue({ id: WHEEL_ID, ticker: 'AAPL' } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      await createTrade({ ...baseTradeInput, ticker: 'AAPL', type: 'PUT', action: 'SELL_TO_OPEN' })

      expect(prisma.trade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ wheelId: WHEEL_ID }),
        })
      )
    })

    it('revalidates /wheels and /wheels/:id after creating new wheel', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.wheel.create).mockResolvedValue({ id: WHEEL_ID, ticker: 'AAPL' } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      await createTrade({ ...baseTradeInput, ticker: 'AAPL', type: 'PUT', action: 'SELL_TO_OPEN' })

      expect(revalidatePath).toHaveBeenCalledWith('/wheels')
      expect(revalidatePath).toHaveBeenCalledWith(`/wheels/${WHEEL_ID}`)
    })
  })

  // ---------------------------------------------------------------------------
  // SELL_TO_OPEN PUT — existing ACTIVE wheel
  // ---------------------------------------------------------------------------

  describe('SELL_TO_OPEN PUT — existing ACTIVE wheel', () => {
    it('uses the existing ACTIVE wheel (does not create a new one)', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue({
        id: WHEEL_ID,
        ticker: 'AAPL',
        status: 'ACTIVE',
      } as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ...baseTradeInput,
        ticker: 'AAPL',
        type: 'PUT',
        action: 'SELL_TO_OPEN',
      })

      expect(prisma.wheel.create).not.toHaveBeenCalled()
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.wheelId).toBe(WHEEL_ID)
      }
    })

    it('increments totalPremiums on existing ACTIVE wheel', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue({
        id: WHEEL_ID,
        ticker: 'AAPL',
        status: 'ACTIVE',
      } as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      await createTrade({
        ticker: 'AAPL',
        type: 'PUT',
        action: 'SELL_TO_OPEN',
        strikePrice: 150,
        premium: 2.5,
        contracts: 2, // shares=200 → totalPremium=500
        expirationDate: new Date('2026-04-17'),
        openDate: new Date('2026-03-06'),
      })

      expect(prisma.wheel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WHEEL_ID },
          data: expect.objectContaining({
            totalPremiums: { increment: 500 }, // 2.5 * 200
            lastActivityAt: expect.any(Date),
          }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // SELL_TO_OPEN PUT — IDLE wheel reactivation
  // ---------------------------------------------------------------------------

  describe('SELL_TO_OPEN PUT — IDLE wheel reactivation', () => {
    it('reactivates an IDLE wheel to ACTIVE status', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue({
        id: WHEEL_ID,
        ticker: 'AAPL',
        status: 'IDLE',
      } as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ...baseTradeInput,
        ticker: 'AAPL',
        type: 'PUT',
        action: 'SELL_TO_OPEN',
      })

      expect(prisma.wheel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WHEEL_ID },
          data: expect.objectContaining({ status: 'ACTIVE' }),
        })
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.wheelId).toBe(WHEEL_ID)
      }
    })

    it('does not create a new wheel when IDLE wheel exists', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue({
        id: WHEEL_ID,
        ticker: 'AAPL',
        status: 'IDLE',
      } as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      await createTrade({ ...baseTradeInput, ticker: 'AAPL', type: 'PUT', action: 'SELL_TO_OPEN' })

      expect(prisma.wheel.create).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // SELL_TO_OPEN CALL with positionId
  // ---------------------------------------------------------------------------

  describe('SELL_TO_OPEN CALL with positionId', () => {
    it('inherits wheelId from the position', async () => {
      vi.mocked(prisma.position.findUnique).mockResolvedValue({ wheelId: WHEEL_ID } as never)
      vi.mocked(prisma.wheel.findUnique).mockResolvedValue({ ticker: 'AAPL' } as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)
      vi.mocked(prisma.position.count).mockResolvedValue(1)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ...baseTradeInput,
        ticker: 'AAPL',
        type: 'CALL',
        action: 'SELL_TO_OPEN',
        positionId: POSITION_ID,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.wheelId).toBe(WHEEL_ID)
        expect(result.data.wheelTicker).toBe('AAPL')
      }

      expect(prisma.trade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ wheelId: WHEEL_ID }),
        })
      )
    })

    it('increments totalPremiums on the wheel with premium * contracts * 100', async () => {
      // premium=1.5, contracts=2, shares=200 → totalPremium=300
      vi.mocked(prisma.position.findUnique).mockResolvedValue({ wheelId: WHEEL_ID } as never)
      vi.mocked(prisma.wheel.findUnique).mockResolvedValue({ ticker: 'AAPL' } as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)
      vi.mocked(prisma.position.count).mockResolvedValue(1)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      await createTrade({
        ticker: 'AAPL',
        type: 'CALL',
        action: 'SELL_TO_OPEN',
        positionId: POSITION_ID,
        strikePrice: 155,
        premium: 1.5,
        contracts: 2,
        expirationDate: new Date('2026-04-17'),
        openDate: new Date('2026-03-06'),
      })

      expect(prisma.wheel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WHEEL_ID },
          data: expect.objectContaining({
            totalPremiums: { increment: 300 }, // 1.5 * 200
          }),
        })
      )
    })

    it('handles position with no wheelId gracefully (no wheel update)', async () => {
      vi.mocked(prisma.position.findUnique).mockResolvedValue({ wheelId: null } as never)
      vi.mocked(prisma.position.count).mockResolvedValue(1)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ...baseTradeInput,
        ticker: 'AAPL',
        type: 'CALL',
        action: 'SELL_TO_OPEN',
        positionId: POSITION_ID,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.wheelId).toBeUndefined()
      }
      expect(prisma.wheel.update).not.toHaveBeenCalled()
    })

    it('includes a warning when multiple open positions exist for the ticker', async () => {
      vi.mocked(prisma.position.findUnique).mockResolvedValue({ wheelId: WHEEL_ID } as never)
      vi.mocked(prisma.wheel.findUnique).mockResolvedValue({ ticker: 'AAPL' } as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)
      vi.mocked(prisma.position.count).mockResolvedValue(2) // two open positions
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ...baseTradeInput,
        ticker: 'AAPL',
        type: 'CALL',
        action: 'SELL_TO_OPEN',
        positionId: POSITION_ID,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.warnings).toBeDefined()
        expect(result.data.warnings!.length).toBeGreaterThan(0)
        expect(result.data.warnings![0]).toContain('AAPL')
      }
    })
  })

  // ---------------------------------------------------------------------------
  // SELL_TO_OPEN CALL without positionId
  // ---------------------------------------------------------------------------

  describe('SELL_TO_OPEN CALL without positionId', () => {
    it('links to ACTIVE wheel for the ticker if one exists', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue({
        id: WHEEL_ID,
        ticker: 'MSFT',
        status: 'ACTIVE',
      } as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ...baseTradeInput,
        ticker: 'MSFT',
        type: 'CALL',
        action: 'SELL_TO_OPEN',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.wheelId).toBe(WHEEL_ID)
      }
    })

    it('creates no wheel when no ACTIVE wheel found for naked call', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ...baseTradeInput,
        ticker: 'MSFT',
        type: 'CALL',
        action: 'SELL_TO_OPEN',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.wheelId).toBeUndefined()
      }
      expect(prisma.wheel.create).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // BUY_TO_CLOSE
  // ---------------------------------------------------------------------------

  describe('BUY_TO_CLOSE', () => {
    it('inherits wheelId from the matching open SELL_TO_OPEN trade', async () => {
      vi.mocked(prisma.trade.findFirst).mockResolvedValue({
        wheelId: WHEEL_ID,
        wheel: { ticker: 'AAPL' },
      } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ticker: 'AAPL',
        type: 'PUT',
        action: 'BUY_TO_CLOSE',
        strikePrice: 150,
        premium: 1.0,
        contracts: 1,
        expirationDate: new Date('2026-04-17'),
        openDate: new Date('2026-03-06'),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.wheelId).toBe(WHEEL_ID)
        expect(result.data.wheelTicker).toBe('AAPL')
      }

      expect(prisma.trade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ wheelId: WHEEL_ID }),
        })
      )
    })

    it('creates no wheel and sets no wheelId when no matching open trade exists', async () => {
      vi.mocked(prisma.trade.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ticker: 'AAPL',
        type: 'PUT',
        action: 'BUY_TO_CLOSE',
        strikePrice: 150,
        premium: 1.0,
        contracts: 1,
        expirationDate: new Date('2026-04-17'),
        openDate: new Date('2026-03-06'),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.wheelId).toBeUndefined()
      }
      expect(prisma.wheel.create).not.toHaveBeenCalled()
    })

    it('inherits wheelId for CALL BUY_TO_CLOSE as well', async () => {
      vi.mocked(prisma.trade.findFirst).mockResolvedValue({
        wheelId: WHEEL_ID,
        wheel: { ticker: 'TSLA' },
      } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ticker: 'TSLA',
        type: 'CALL',
        action: 'BUY_TO_CLOSE',
        strikePrice: 200,
        premium: 0.5,
        contracts: 1,
        expirationDate: new Date('2026-04-17'),
        openDate: new Date('2026-03-06'),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.wheelId).toBe(WHEEL_ID)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Serializable transaction (concurrency safety)
  // ---------------------------------------------------------------------------

  describe('Concurrency: serializable transaction', () => {
    it('runs wheel find-or-create inside the serializable transaction', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.wheel.create).mockResolvedValue({ id: WHEEL_ID, ticker: 'AAPL' } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      await createTrade({ ...baseTradeInput, ticker: 'AAPL', type: 'PUT', action: 'SELL_TO_OPEN' })

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' }
      )
    })
  })

  // ---------------------------------------------------------------------------
  // No regression: trades without wheel-linking still work
  // ---------------------------------------------------------------------------

  describe('regression: non-linking scenarios still succeed', () => {
    it('returns id without wheelId when no wheel is auto-linked', async () => {
      vi.mocked(prisma.trade.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.trade.create).mockResolvedValue({ id: TRADE_ID } as never)

      const result = await createTrade({
        ticker: 'AAPL',
        type: 'PUT',
        action: 'BUY_TO_CLOSE',
        strikePrice: 150,
        premium: 1.0,
        contracts: 1,
        expirationDate: new Date('2026-04-17'),
        openDate: new Date('2026-03-06'),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(TRADE_ID)
        expect(result.data.wheelId).toBeUndefined()
        expect(result.data.warnings).toBeUndefined()
      }
    })
  })
})

// =============================================================================
// updateTradeStatus — EXPIRED wheel stats
// =============================================================================

describe('updateTradeStatus — EXPIRED wheel stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserId).mockResolvedValue(mockUserId)
    setupTransaction()
  })

  it('adds full premium (per-share * shares) to wheel totalRealizedPL when EXPIRED', async () => {
    // premium=2.5/share, shares=100 (1 contract) → fullPremium=250
    vi.mocked(prisma.trade.findUnique).mockResolvedValue({
      userId: mockUserId,
      status: 'OPEN',
      expirationDate: new Date('2026-04-17'),
      wheelId: WHEEL_ID,
      shares: 100,
      premium: 2.5,
    } as never)
    vi.mocked(prisma.trade.update).mockResolvedValue({ id: TRADE_ID } as never)
    vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

    const result = await updateTradeStatus({ id: TRADE_ID, status: 'EXPIRED' })

    expect(result.success).toBe(true)
    expect(prisma.wheel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: WHEEL_ID },
        data: expect.objectContaining({
          totalRealizedPL: { increment: 250 }, // 2.5 * 100
          lastActivityAt: expect.any(Date),
        }),
      })
    )
  })

  it('calculates full premium correctly for multiple contracts', async () => {
    // premium=3.0/share, shares=500 (5 contracts) → fullPremium=1500
    vi.mocked(prisma.trade.findUnique).mockResolvedValue({
      userId: mockUserId,
      status: 'OPEN',
      expirationDate: new Date('2026-04-17'),
      wheelId: WHEEL_ID,
      shares: 500,
      premium: 3.0,
    } as never)
    vi.mocked(prisma.trade.update).mockResolvedValue({ id: TRADE_ID } as never)
    vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

    await updateTradeStatus({ id: TRADE_ID, status: 'EXPIRED' })

    expect(prisma.wheel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: WHEEL_ID },
        data: expect.objectContaining({
          totalRealizedPL: { increment: 1500 }, // 3.0 * 500
        }),
      })
    )
  })

  it('does not update wheel when trade has no wheelId', async () => {
    vi.mocked(prisma.trade.findUnique).mockResolvedValue({
      userId: mockUserId,
      status: 'OPEN',
      expirationDate: new Date('2026-04-17'),
      wheelId: null,
      shares: 100,
      premium: 2.5,
    } as never)
    vi.mocked(prisma.trade.update).mockResolvedValue({ id: TRADE_ID } as never)

    const result = await updateTradeStatus({ id: TRADE_ID, status: 'EXPIRED' })

    expect(result.success).toBe(true)
    expect(prisma.wheel.update).not.toHaveBeenCalled()
  })

  it('does not update wheel for non-EXPIRED status transitions', async () => {
    vi.mocked(prisma.trade.findUnique).mockResolvedValue({
      userId: mockUserId,
      status: 'OPEN',
      expirationDate: null,
      wheelId: WHEEL_ID,
      shares: 100,
      premium: 2.5,
    } as never)
    vi.mocked(prisma.trade.update).mockResolvedValue({ id: TRADE_ID } as never)

    await updateTradeStatus({ id: TRADE_ID, status: 'CLOSED' })

    expect(prisma.wheel.update).not.toHaveBeenCalled()
  })

  it('revalidates /wheels and /wheels/:id on EXPIRED with wheelId', async () => {
    vi.mocked(prisma.trade.findUnique).mockResolvedValue({
      userId: mockUserId,
      status: 'OPEN',
      expirationDate: new Date('2026-04-17'),
      wheelId: WHEEL_ID,
      shares: 100,
      premium: 2.5,
    } as never)
    vi.mocked(prisma.trade.update).mockResolvedValue({ id: TRADE_ID } as never)
    vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

    await updateTradeStatus({ id: TRADE_ID, status: 'EXPIRED' })

    expect(revalidatePath).toHaveBeenCalledWith('/wheels')
    expect(revalidatePath).toHaveBeenCalledWith(`/wheels/${WHEEL_ID}`)
  })
})

// =============================================================================
// closeOption — wheel premium adjustments
// =============================================================================

describe('closeOption — wheel premium adjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserId).mockResolvedValue(mockUserId)
    setupTransaction()
  })

  function makeOpenTrade(overrides: Record<string, unknown> = {}) {
    return {
      id: TRADE_ID,
      userId: mockUserId,
      ticker: 'AAPL',
      type: 'PUT',
      status: 'OPEN',
      premium: 3.0,  // per-share
      shares: 100,
      positionId: null,
      wheelId: WHEEL_ID,
      position: null,
      ...overrides,
    }
  }

  it('decrements totalPremiums by closePremium * shares', async () => {
    // closePremium=1.0/share, shares=100 → decrement=100
    vi.mocked(prisma.trade.findUnique).mockResolvedValue(makeOpenTrade() as never)
    vi.mocked(prisma.trade.update).mockResolvedValue({ id: TRADE_ID } as never)
    vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

    const result = await closeOption({ tradeId: TRADE_ID, closePremium: 1.0 })

    expect(result.success).toBe(true)
    expect(prisma.wheel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: WHEEL_ID },
        data: expect.objectContaining({
          totalPremiums: { decrement: 100 }, // 1.0 * 100
        }),
      })
    )
  })

  it('increments totalRealizedPL by netPL * shares', async () => {
    // originalPremium=3.0, closePremium=1.0 → netPL=2.0/share, shares=100 → increment=200
    vi.mocked(prisma.trade.findUnique).mockResolvedValue(makeOpenTrade() as never)
    vi.mocked(prisma.trade.update).mockResolvedValue({ id: TRADE_ID } as never)
    vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

    await closeOption({ tradeId: TRADE_ID, closePremium: 1.0 })

    expect(prisma.wheel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: WHEEL_ID },
        data: expect.objectContaining({
          totalRealizedPL: { increment: 200 }, // (3.0 - 1.0) * 100
        }),
      })
    )
  })

  it('handles loss scenario: close premium > original premium', async () => {
    // originalPremium=1.0, closePremium=3.0 → netPL=-2.0/share, shares=100 → increment=-200
    vi.mocked(prisma.trade.findUnique).mockResolvedValue(
      makeOpenTrade({ premium: 1.0 }) as never
    )
    vi.mocked(prisma.trade.update).mockResolvedValue({ id: TRADE_ID } as never)
    vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

    await closeOption({ tradeId: TRADE_ID, closePremium: 3.0 })

    expect(prisma.wheel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalRealizedPL: { increment: -200 }, // (1.0 - 3.0) * 100
        }),
      })
    )
  })

  it('does not update wheel when trade has no wheelId', async () => {
    vi.mocked(prisma.trade.findUnique).mockResolvedValue(
      makeOpenTrade({ wheelId: null }) as never
    )
    vi.mocked(prisma.trade.update).mockResolvedValue({ id: TRADE_ID } as never)

    const result = await closeOption({ tradeId: TRADE_ID, closePremium: 1.0 })

    expect(result.success).toBe(true)
    expect(prisma.wheel.update).not.toHaveBeenCalled()
  })

  it('calculates correctly for multiple contracts', async () => {
    // originalPremium=2.0, closePremium=0.5, netPL=1.5/share, shares=300 (3 contracts)
    // decrement=150, increment=450
    vi.mocked(prisma.trade.findUnique).mockResolvedValue(
      makeOpenTrade({ premium: 2.0, shares: 300 }) as never
    )
    vi.mocked(prisma.trade.update).mockResolvedValue({ id: TRADE_ID } as never)
    vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

    await closeOption({ tradeId: TRADE_ID, closePremium: 0.5 })

    expect(prisma.wheel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalPremiums: { decrement: 150 }, // 0.5 * 300
          totalRealizedPL: { increment: 450 }, // 1.5 * 300
        }),
      })
    )
  })
})

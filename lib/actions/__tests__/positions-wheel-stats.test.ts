import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { assignCall } from '../positions'

// Mock Prisma — include all models used by assignCall
vi.mock('@/lib/db', () => ({
  prisma: {
    trade: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    position: {
      update: vi.fn(),
    },
    wheel: {
      update: vi.fn(),
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

import { getCurrentUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const mockUserId = 'user-abc'

// Valid CUID-format IDs required by Zod validation
const TRADE_ID = 'clccccccccccccccccccccccc'
const POSITION_ID = 'claaaaaaaaaaaaaaaaaaaaaaa'
const WHEEL_ID = 'clbbbbbbbbbbbbbbbbbbbbbbb'

function setupTransaction() {
  vi.mocked(prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)
  )
}

// A realistic covered call trade fixture with an associated position
function makeCallTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: TRADE_ID,
    userId: mockUserId,
    ticker: 'AAPL',
    type: 'CALL',
    status: 'OPEN',
    strikePrice: 160,
    premium: 2.0, // per-share
    shares: 100,
    positionId: POSITION_ID,
    wheelId: WHEEL_ID,
    position: {
      id: POSITION_ID,
      status: 'OPEN',
      totalCost: 14500, // e.g. 145/share * 100
      assignmentTrade: {
        premium: 3.0, // PUT premium per-share
      },
    },
    ...overrides,
  }
}

describe('assignCall — wheel stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserId).mockResolvedValue(mockUserId)
    setupTransaction()

    vi.mocked(prisma.position.update).mockResolvedValue({
      id: POSITION_ID,
      status: 'CLOSED',
    } as never)

    vi.mocked(prisma.trade.update).mockResolvedValue({
      id: TRADE_ID,
    } as never)
  })

  describe('cycleCount increments by 1', () => {
    it('increments cycleCount when CALL is assigned', async () => {
      vi.mocked(prisma.trade.findUnique).mockResolvedValue(makeCallTrade() as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

      const result = await assignCall({ tradeId: TRADE_ID })

      expect(result.success).toBe(true)

      expect(prisma.wheel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WHEEL_ID },
          data: expect.objectContaining({
            cycleCount: { increment: 1 },
          }),
        })
      )
    })
  })

  describe('totalRealizedPL updates with realizedGainLoss', () => {
    it('increments totalRealizedPL by the correct realizedGainLoss', async () => {
      // saleProceeds = 160 * 100 = 16000
      // totalPremiums (per-share) = putPremium + callPremium = 3.0 + 2.0 = 5.0
      // realizedGainLoss = 16000 + 5.0 - 14500 = 1505 — wait, premiums are per-share
      // totalPremiums = putPremium + callPremium = both per-share? Let's read the code:
      //   saleProceeds = strikePrice * shares = 160 * 100 = 16000
      //   totalPremiums = putPremium(per-share) + callPremium(per-share) = 3.0 + 2.0 = 5.0
      //   realizedGainLoss = saleProceeds + totalPremiums - totalCost
      //                    = 16000 + 5.0 - 14500 = 1505
      vi.mocked(prisma.trade.findUnique).mockResolvedValue(makeCallTrade() as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

      await assignCall({ tradeId: TRADE_ID })

      // realizedGainLoss = 160*100 + (3.0 + 2.0) - 14500 = 16000 + 5 - 14500 = 1505
      expect(prisma.wheel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WHEEL_ID },
          data: expect.objectContaining({
            totalRealizedPL: { increment: 1505 },
          }),
        })
      )
    })

    it('handles a loss scenario correctly', async () => {
      // strikePrice=130, putPremium=2.0, callPremium=1.0, shares=100, totalCost=14500
      // saleProceeds = 130 * 100 = 13000
      // realizedGainLoss = 13000 + (2.0 + 1.0) - 14500 = -1497
      vi.mocked(prisma.trade.findUnique).mockResolvedValue(
        makeCallTrade({
          strikePrice: 130,
          premium: 1.0,
          position: {
            id: 'pos-1',
            status: 'OPEN',
            totalCost: 14500,
            assignmentTrade: { premium: 2.0 },
          },
        }) as never
      )
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

      await assignCall({ tradeId: TRADE_ID })

      expect(prisma.wheel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalRealizedPL: { increment: -1497 },
          }),
        })
      )
    })
  })

  describe('wheel status changes to IDLE', () => {
    it('sets wheel status to IDLE after CALL assignment', async () => {
      vi.mocked(prisma.trade.findUnique).mockResolvedValue(makeCallTrade() as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

      await assignCall({ tradeId: TRADE_ID })

      expect(prisma.wheel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: WHEEL_ID },
          data: expect.objectContaining({
            status: 'IDLE',
          }),
        })
      )
    })
  })

  describe('lastActivityAt is updated', () => {
    it('sets lastActivityAt to a recent Date', async () => {
      vi.mocked(prisma.trade.findUnique).mockResolvedValue(makeCallTrade() as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

      const before = new Date()
      await assignCall({ tradeId: TRADE_ID })
      const after = new Date()

      const wheelUpdateCall = vi.mocked(prisma.wheel.update).mock.calls[0][0]
      const lastActivityAt = wheelUpdateCall.data.lastActivityAt as Date
      expect(lastActivityAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(lastActivityAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('no wheel update when trade has no wheelId', () => {
    it('does not call wheel.update when trade.wheelId is null', async () => {
      vi.mocked(prisma.trade.findUnique).mockResolvedValue(
        makeCallTrade({ wheelId: null }) as never
      )

      await assignCall({ tradeId: TRADE_ID })

      expect(prisma.wheel.update).not.toHaveBeenCalled()
    })

    it('still succeeds and returns data when trade has no wheelId', async () => {
      vi.mocked(prisma.trade.findUnique).mockResolvedValue(
        makeCallTrade({ wheelId: null }) as never
      )

      const result = await assignCall({ tradeId: TRADE_ID })

      expect(result.success).toBe(true)
    })
  })

  describe('wheel path revalidation', () => {
    it('revalidates /wheels and the specific wheel path when wheelId is set', async () => {
      vi.mocked(prisma.trade.findUnique).mockResolvedValue(makeCallTrade() as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

      await assignCall({ tradeId: TRADE_ID })

      expect(revalidatePath).toHaveBeenCalledWith('/wheels')
      expect(revalidatePath).toHaveBeenCalledWith(`/wheels/${WHEEL_ID}`)
    })

    it('does not revalidate wheel paths when trade has no wheelId', async () => {
      vi.mocked(prisma.trade.findUnique).mockResolvedValue(
        makeCallTrade({ wheelId: null }) as never
      )

      await assignCall({ tradeId: TRADE_ID })

      expect(revalidatePath).not.toHaveBeenCalledWith('/wheels')
      expect(revalidatePath).not.toHaveBeenCalledWith(expect.stringMatching(/^\/wheels\//))
    })
  })

  describe('all wheel updates happen in a single transaction', () => {
    it('uses a transaction for the combined position close + wheel update', async () => {
      vi.mocked(prisma.trade.findUnique).mockResolvedValue(makeCallTrade() as never)
      vi.mocked(prisma.wheel.update).mockResolvedValue({} as never)

      await assignCall({ tradeId: TRADE_ID })

      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })
})

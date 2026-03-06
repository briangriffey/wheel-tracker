import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getOpenPositionsForTicker, getActiveWheelForTicker } from '../wheel-queries'

vi.mock('@/lib/db', () => ({
  prisma: {
    position: {
      findMany: vi.fn(),
    },
    wheel: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn(),
}))

import { getCurrentUserId } from '@/lib/auth'

const mockUserId = 'user-abc'

describe('getOpenPositionsForTicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserId).mockResolvedValue(mockUserId)
  })

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  describe('authentication', () => {
    it('returns an error when user is not authenticated', async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(null)

      const result = await getOpenPositionsForTicker('AAPL')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toMatch(/auth|log in|Unauthorized/i)
      }
    })

    it('does not query Prisma when unauthenticated', async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(null)

      await getOpenPositionsForTicker('AAPL')

      expect(prisma.position.findMany).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Ticker normalization
  // ---------------------------------------------------------------------------

  describe('ticker normalization', () => {
    it('normalizes lowercase ticker to uppercase', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      await getOpenPositionsForTicker('aapl')

      expect(prisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ticker: 'AAPL' }),
        })
      )
    })

    it('normalizes mixed-case ticker to uppercase', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      await getOpenPositionsForTicker('Msft')

      expect(prisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ticker: 'MSFT' }),
        })
      )
    })

    it('trims whitespace from ticker', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      await getOpenPositionsForTicker('  AAPL  ')

      expect(prisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ticker: 'AAPL' }),
        })
      )
    })

    it('returns error for empty ticker after trimming', async () => {
      const result = await getOpenPositionsForTicker('   ')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toMatch(/required|ticker/i)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Only OPEN positions are returned
  // ---------------------------------------------------------------------------

  describe('filters by OPEN status', () => {
    it('queries for OPEN positions only', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      await getOpenPositionsForTicker('AAPL')

      expect(prisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'OPEN' }),
        })
      )
    })

    it('queries for positions belonging to the authenticated user only', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      await getOpenPositionsForTicker('AAPL')

      expect(prisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // hasOpenCall flag accuracy
  // ---------------------------------------------------------------------------

  describe('hasOpenCall flag', () => {
    it('sets hasOpenCall=true when position has covered calls with OPEN status', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([
        {
          id: 'pos-1',
          ticker: 'AAPL',
          shares: 100,
          costBasis: 150,
          acquiredDate: new Date('2026-01-15'),
          wheelId: 'wheel-1',
          coveredCalls: [{ id: 'call-open-1' }],
        },
      ] as never)

      const result = await getOpenPositionsForTicker('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data[0].hasOpenCall).toBe(true)
      }
    })

    it('sets hasOpenCall=false when position has no open covered calls', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([
        {
          id: 'pos-1',
          ticker: 'AAPL',
          shares: 100,
          costBasis: 150,
          acquiredDate: new Date('2026-01-15'),
          wheelId: 'wheel-1',
          coveredCalls: [], // no open calls
        },
      ] as never)

      const result = await getOpenPositionsForTicker('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data[0].hasOpenCall).toBe(false)
      }
    })

    it('passes { status: OPEN } filter to coveredCalls query', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      await getOpenPositionsForTicker('AAPL')

      expect(prisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            coveredCalls: expect.objectContaining({
              where: { status: 'OPEN' },
            }),
          }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Prisma Decimal conversion
  // ---------------------------------------------------------------------------

  describe('Decimal serialization', () => {
    it('converts costBasis Prisma Decimal to plain number', async () => {
      // Simulate Prisma returning a Decimal-like object (Number() converts it)
      vi.mocked(prisma.position.findMany).mockResolvedValue([
        {
          id: 'pos-1',
          ticker: 'AAPL',
          shares: 100,
          costBasis: { toNumber: () => 145.5, toString: () => '145.5' },
          acquiredDate: new Date('2026-01-15'),
          wheelId: 'wheel-1',
          coveredCalls: [],
        },
      ] as never)

      const result = await getOpenPositionsForTicker('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data[0].costBasis).toBe('number')
        expect(result.data[0].costBasis).toBe(145.5)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Return shape
  // ---------------------------------------------------------------------------

  describe('return shape', () => {
    it('returns an empty array when no OPEN positions exist for ticker', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      const result = await getOpenPositionsForTicker('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })

    it('returns all required fields on each position', async () => {
      const acquiredDate = new Date('2026-01-15')
      vi.mocked(prisma.position.findMany).mockResolvedValue([
        {
          id: 'pos-1',
          ticker: 'AAPL',
          shares: 200,
          costBasis: 148.75,
          acquiredDate,
          wheelId: 'wheel-1',
          coveredCalls: [],
        },
      ] as never)

      const result = await getOpenPositionsForTicker('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        const pos = result.data[0]
        expect(pos.id).toBe('pos-1')
        expect(pos.ticker).toBe('AAPL')
        expect(pos.shares).toBe(200)
        expect(pos.costBasis).toBe(148.75)
        expect(pos.acquiredDate).toEqual(acquiredDate)
        expect(pos.wheelId).toBe('wheel-1')
        expect(pos.hasOpenCall).toBe(false)
      }
    })

    it('returns multiple positions when they exist', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([
        {
          id: 'pos-1',
          ticker: 'AAPL',
          shares: 100,
          costBasis: 145,
          acquiredDate: new Date('2026-01-15'),
          wheelId: 'wheel-1',
          coveredCalls: [],
        },
        {
          id: 'pos-2',
          ticker: 'AAPL',
          shares: 200,
          costBasis: 150,
          acquiredDate: new Date('2026-02-01'),
          wheelId: 'wheel-1',
          coveredCalls: [{ id: 'call-1' }],
        },
      ] as never)

      const result = await getOpenPositionsForTicker('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].id).toBe('pos-1')
        expect(result.data[1].id).toBe('pos-2')
        expect(result.data[1].hasOpenCall).toBe(true)
      }
    })

    it('wheelId is null when position has no associated wheel', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([
        {
          id: 'pos-1',
          ticker: 'AAPL',
          shares: 100,
          costBasis: 145,
          acquiredDate: new Date('2026-01-15'),
          wheelId: null,
          coveredCalls: [],
        },
      ] as never)

      const result = await getOpenPositionsForTicker('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data[0].wheelId).toBeNull()
      }
    })
  })
})

// ---------------------------------------------------------------------------
// getActiveWheelForTicker
// ---------------------------------------------------------------------------

describe('getActiveWheelForTicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserId).mockResolvedValue(mockUserId)
  })

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  describe('authentication', () => {
    it('returns an error when user is not authenticated', async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(null)

      const result = await getActiveWheelForTicker('AAPL')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toMatch(/auth|log in|Unauthorized/i)
      }
    })

    it('does not query Prisma when unauthenticated', async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(null)

      await getActiveWheelForTicker('AAPL')

      expect(prisma.wheel.findFirst).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Ticker normalization
  // ---------------------------------------------------------------------------

  describe('ticker normalization', () => {
    it('normalizes lowercase ticker to uppercase', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)

      await getActiveWheelForTicker('tsla')

      expect(prisma.wheel.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ticker: 'TSLA' }),
        })
      )
    })

    it('trims whitespace', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)

      await getActiveWheelForTicker('  AAPL  ')

      expect(prisma.wheel.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ticker: 'AAPL' }),
        })
      )
    })

    it('returns error for empty ticker after trimming', async () => {
      const result = await getActiveWheelForTicker('   ')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toMatch(/required|ticker/i)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Queries ACTIVE and IDLE wheels
  // ---------------------------------------------------------------------------

  describe('status filter', () => {
    it('queries for ACTIVE and IDLE wheels', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)

      await getActiveWheelForTicker('AAPL')

      expect(prisma.wheel.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['ACTIVE', 'IDLE'] },
          }),
        })
      )
    })

    it('queries for wheels belonging to the authenticated user only', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)

      await getActiveWheelForTicker('AAPL')

      expect(prisma.wheel.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Return value: found wheel
  // ---------------------------------------------------------------------------

  describe('when wheel is found', () => {
    it('returns the wheel data with success=true', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue({
        id: 'wheel-1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 3,
        totalPremiums: 750,
      } as never)

      const result = await getActiveWheelForTicker('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toBeNull()
        expect(result.data!.id).toBe('wheel-1')
        expect(result.data!.ticker).toBe('AAPL')
        expect(result.data!.status).toBe('ACTIVE')
        expect(result.data!.cycleCount).toBe(3)
        expect(result.data!.totalPremiums).toBe(750)
      }
    })

    it('returns an IDLE wheel when only IDLE wheel exists', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue({
        id: 'wheel-idle',
        ticker: 'MSFT',
        status: 'IDLE',
        cycleCount: 2,
        totalPremiums: 500,
      } as never)

      const result = await getActiveWheelForTicker('MSFT')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data!.status).toBe('IDLE')
      }
    })

    it('converts Prisma Decimal totalPremiums to a plain number', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue({
        id: 'wheel-1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 1,
        // Simulate a Prisma Decimal-like object
        totalPremiums: { toNumber: () => 1234.5, toString: () => '1234.5' },
      } as never)

      const result = await getActiveWheelForTicker('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data!.totalPremiums).toBe('number')
        expect(result.data!.totalPremiums).toBe(1234.5)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Return value: no wheel found
  // ---------------------------------------------------------------------------

  describe('when no wheel is found', () => {
    it('returns success=true with data=null when no ACTIVE/IDLE wheel exists', async () => {
      vi.mocked(prisma.wheel.findFirst).mockResolvedValue(null)

      const result = await getActiveWheelForTicker('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })
})

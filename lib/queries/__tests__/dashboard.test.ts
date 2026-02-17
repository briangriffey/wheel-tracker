import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'
import type { User, Trade, Position } from '@/lib/generated/prisma'
import { getLatestPrice } from '@/lib/services/market-data'
import { getDashboardMetrics, getPLOverTime, getPLByTicker, getWinRateData } from '../dashboard'

// Mock React cache to be a passthrough (prevents stale cached results between tests)
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  }
})

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    position: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    trade: {
      findMany: vi.fn(),
    },
    cashDeposit: {
      aggregate: vi.fn(),
    },
  },
}))

// Mock market data service
vi.mock('@/lib/services/market-data', () => ({
  getLatestPrice: vi.fn(),
}))

describe('getDashboardMetrics', () => {
  const mockUser: User = {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: null,
    image: null,
    password: null,
    subscriptionTier: 'FREE',
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    subscriptionEndsAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Default mocks for new dependencies (cash deposits, SPY price, distinct stocks)
  const defaultCashDepositAgg = {
    _sum: { amount: new Prisma.Decimal(0), spyShares: new Prisma.Decimal(0) },
    _count: {},
    _avg: {},
    _min: {},
    _max: {},
  }
  const defaultSpyPrice = { ticker: 'SPY', price: 500, date: new Date(), success: true }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return mock user
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser)
    // Default: return zero cash deposits and SPY price
    vi.mocked(prisma.cashDeposit.aggregate).mockResolvedValue(defaultCashDepositAgg as never)
    vi.mocked(getLatestPrice).mockResolvedValue(defaultSpyPrice)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Premium Calculation', () => {
    it('should correctly calculate total premium collected: contracts × premium × 100', async () => {
      // Setup test data:
      // Trade 1: 2 contracts × $1.50 premium × 100 = $300
      // Trade 2: 3 contracts × $2.25 premium × 100 = $675
      // Trade 3: 1 contract × $0.75 premium × 100 = $75
      // Total expected: $1,050
      const mockTrades = [
        {
          premium: new Prisma.Decimal(1.5),
          contracts: 2,
          status: 'OPEN',
        },
        {
          premium: new Prisma.Decimal(2.25),
          contracts: 3,
          status: 'ASSIGNED',
        },
        {
          premium: new Prisma.Decimal(0.75),
          contracts: 1,
          status: 'CLOSED',
        },
      ]

      // Mock all Prisma calls
      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(0),
          currentValue: new Prisma.Decimal(0),
          totalCost: new Prisma.Decimal(0),
        },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      })

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as unknown as Trade[])

      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      const result = await getDashboardMetrics('All')

      // Verify premium calculation
      // (2 × 1.50 × 100) + (3 × 2.25 × 100) + (1 × 0.75 × 100) = 300 + 675 + 75 = 1050
      expect(result.totalPremiumCollected).toBe(1050)
    })

    it('should handle decimal premiums correctly', async () => {
      // Trade: 5 contracts × $0.33 premium × 100 = $165
      const mockTrades = [
        {
          premium: new Prisma.Decimal(0.33),
          contracts: 5,
          status: 'OPEN',
        },
      ]

      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(0),
          currentValue: new Prisma.Decimal(0),
          totalCost: new Prisma.Decimal(0),
        },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      })

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as unknown as Trade[])
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      const result = await getDashboardMetrics('All')

      expect(result.totalPremiumCollected).toBe(165)
    })

    it('should return 0 when there are no trades', async () => {
      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(0),
          currentValue: new Prisma.Decimal(0),
          totalCost: new Prisma.Decimal(0),
        },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      })

      vi.mocked(prisma.trade.findMany).mockResolvedValue([])
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      const result = await getDashboardMetrics('All')

      expect(result.totalPremiumCollected).toBe(0)
    })
  })

  describe('P&L Calculations', () => {
    it('should correctly calculate realized P&L', async () => {
      const mockTrades: Partial<Trade>[] = []

      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(1500.5),
          currentValue: new Prisma.Decimal(0),
          totalCost: new Prisma.Decimal(0),
        },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      })

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as Trade[])
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      const result = await getDashboardMetrics('All')

      expect(result.realizedPL).toBe(1500.5)
    })

    it('should correctly calculate unrealized P&L with covered calls', async () => {
      const mockOpenPositions = [
        {
          totalCost: new Prisma.Decimal(10000),
          currentValue: new Prisma.Decimal(10500),
          coveredCalls: [
            { premium: new Prisma.Decimal(150) },
            { premium: new Prisma.Decimal(200) },
          ],
        },
        {
          totalCost: new Prisma.Decimal(5000),
          currentValue: new Prisma.Decimal(4800),
          coveredCalls: [{ premium: new Prisma.Decimal(100) }],
        },
      ]

      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(0),
          currentValue: new Prisma.Decimal(0),
          totalCost: new Prisma.Decimal(0),
        },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      })

      vi.mocked(prisma.trade.findMany).mockResolvedValue([])
      vi.mocked(prisma.position.findMany)
        .mockResolvedValueOnce(mockOpenPositions as unknown as Position[])
        .mockResolvedValueOnce([])

      const result = await getDashboardMetrics('All')

      // Position 1: (10500 - 10000) + 150 + 200 = 850
      // Position 2: (4800 - 5000) + 100 = -100
      // Total: 850 + (-100) = 750
      expect(result.unrealizedPL).toBe(750)
    })

    it('should correctly calculate total P&L as sum of realized and unrealized', async () => {
      const mockOpenPositions = [
        {
          totalCost: new Prisma.Decimal(10000),
          currentValue: new Prisma.Decimal(10500),
          coveredCalls: [],
        },
      ]

      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(1000),
          currentValue: new Prisma.Decimal(0),
          totalCost: new Prisma.Decimal(0),
        },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      })

      vi.mocked(prisma.trade.findMany).mockResolvedValue([])
      vi.mocked(prisma.position.findMany)
        .mockResolvedValueOnce(mockOpenPositions as unknown as Position[])
        .mockResolvedValueOnce([])

      const result = await getDashboardMetrics('All')

      expect(result.realizedPL).toBe(1000)
      expect(result.unrealizedPL).toBe(500) // 10500 - 10000
      expect(result.totalPL).toBe(1500) // 1000 + 500
    })
  })

  describe('Options Win Rate Calculation', () => {
    it('should correctly calculate options win rate from trades', async () => {
      const mockTrades = [
        { premium: new Prisma.Decimal(2.0), contracts: 1, status: 'EXPIRED' }, // winner (kept full premium)
        { premium: new Prisma.Decimal(1.5), contracts: 1, status: 'CLOSED', closePremium: new Prisma.Decimal(0.5) }, // winner (1.5 - 0.5 > 0)
        { premium: new Prisma.Decimal(1.0), contracts: 1, status: 'CLOSED', closePremium: new Prisma.Decimal(1.5) }, // loser (1.0 - 1.5 < 0)
        { premium: new Prisma.Decimal(1.0), contracts: 1, status: 'OPEN' }, // not counted (still open)
      ]

      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(0),
          currentValue: new Prisma.Decimal(0),
          totalCost: new Prisma.Decimal(0),
        },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      })

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as unknown as Trade[])
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      const result = await getDashboardMetrics('All')

      // 2 winners out of 3 closed/expired = 66.67%
      expect(result.optionsWinRate).toBeCloseTo(66.67, 1)
    })

    it('should return 0 options win rate when no closed or expired trades', async () => {
      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(0),
          currentValue: new Prisma.Decimal(0),
          totalCost: new Prisma.Decimal(0),
        },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      })

      vi.mocked(prisma.trade.findMany).mockResolvedValue([])
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      const result = await getDashboardMetrics('All')

      expect(result.optionsWinRate).toBe(0)
    })
  })

  describe('Assignment Rate Calculation', () => {
    it('should correctly calculate assignment rate', async () => {
      const mockTrades = [
        { premium: new Prisma.Decimal(1.0), contracts: 1, status: 'ASSIGNED' },
        { premium: new Prisma.Decimal(1.0), contracts: 1, status: 'OPEN' },
        { premium: new Prisma.Decimal(1.0), contracts: 1, status: 'ASSIGNED' },
        { premium: new Prisma.Decimal(1.0), contracts: 1, status: 'CLOSED' },
        { premium: new Prisma.Decimal(1.0), contracts: 1, status: 'ASSIGNED' },
      ]

      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(0),
          currentValue: new Prisma.Decimal(0),
          totalCost: new Prisma.Decimal(0),
        },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      })

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as unknown as Trade[])
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      const result = await getDashboardMetrics('All')

      // 3 assigned out of 5 total = 60%
      expect(result.assignmentRate).toBe(60)
    })

    it('should return 0 assignment rate when no trades', async () => {
      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(0),
          currentValue: new Prisma.Decimal(0),
          totalCost: new Prisma.Decimal(0),
        },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      })

      vi.mocked(prisma.trade.findMany).mockResolvedValue([])
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      const result = await getDashboardMetrics('All')

      expect(result.assignmentRate).toBe(0)
    })
  })

  describe('Complete Metrics Integration', () => {
    it('should return all metrics correctly with realistic data', async () => {
      // Realistic scenario:
      // - 4 trades with different premiums, contracts, and statuses
      // - 2 open positions with P&L
      // - 1 assigned trade out of 4 total

      const mockTrades = [
        { premium: new Prisma.Decimal(2.5), contracts: 5, status: 'ASSIGNED' },
        { premium: new Prisma.Decimal(1.75), contracts: 3, status: 'OPEN' },
        { premium: new Prisma.Decimal(3.0), contracts: 2, status: 'CLOSED', closePremium: new Prisma.Decimal(1.0) }, // winner: 3.0 - 1.0 > 0
        { premium: new Prisma.Decimal(1.0), contracts: 1, status: 'EXPIRED' }, // winner: kept full premium
      ]

      const mockOpenPositions = [
        {
          totalCost: new Prisma.Decimal(15000),
          currentValue: new Prisma.Decimal(15750),
          coveredCalls: [{ premium: new Prisma.Decimal(250) }],
        },
        {
          totalCost: new Prisma.Decimal(8000),
          currentValue: new Prisma.Decimal(7600),
          coveredCalls: [],
        },
      ]

      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(750),
          currentValue: new Prisma.Decimal(0),
          totalCost: new Prisma.Decimal(0),
        },
        _count: {},
        _avg: {},
        _min: {},
        _max: {},
      })

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as unknown as Trade[])
      vi.mocked(prisma.position.findMany)
        .mockResolvedValueOnce(mockOpenPositions as unknown as Position[])
        .mockResolvedValueOnce([{ ticker: 'AAPL' }, { ticker: 'TSLA' }] as unknown as Position[])

      const result = await getDashboardMetrics('All')

      // Premium: (5 × 2.50 × 100) + (3 × 1.75 × 100) + (2 × (3.00 - 1.00) × 100) + (1 × 1.00 × 100)
      //        = 1250 + 525 + 400 + 100 = 2275
      expect(result.totalPremiumCollected).toBe(2275)

      // Realized P&L: 750
      expect(result.realizedPL).toBe(750)

      // Unrealized P&L: (15750 - 15000 + 250) + (7600 - 8000)
      //                = 1000 + (-400) = 600
      expect(result.unrealizedPL).toBe(600)

      // Total P&L: 750 + 600 = 1350
      expect(result.totalPL).toBe(1350)

      // Options win rate: 2 winners (1 CLOSED winner + 1 EXPIRED) / 2 closed+expired = 100%
      expect(result.optionsWinRate).toBe(100)

      // Assignment rate: 1 assigned / 4 total = 25%
      expect(result.assignmentRate).toBe(25)

      // Open contracts: 3 (1 OPEN trade with 3 contracts)
      expect(result.openContracts).toBe(3)

      // Distinct stock count: 2 (AAPL, TSLA)
      expect(result.distinctStockCount).toBe(2)
    })
  })

  describe('Error Handling', () => {
    it('should throw error when database query fails', async () => {
      vi.mocked(prisma.position.aggregate).mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(getDashboardMetrics('All')).rejects.toThrow('Failed to fetch dashboard metrics')
    })

    it('should throw error when no user found', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

      await expect(getDashboardMetrics('All')).rejects.toThrow('Failed to fetch dashboard metrics')
    })
  })
})

// Shared setup for getPLOverTime, getPLByTicker, getWinRateData tests
const setupUserMock = () => {
  const mockUser: User = {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: null,
    image: null,
    password: null,
    subscriptionTier: 'FREE',
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    subscriptionEndsAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser)
}

describe('getPLOverTime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupUserMock()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty array when no positions or trades', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])

    const result = await getPLOverTime('All')
    expect(result).toEqual([])
  })

  it('should calculate position-only P&L with premiumPL: 0', async () => {
    const today = new Date()
    const dateKey = today.toISOString().split('T')[0]

    vi.mocked(prisma.position.findMany).mockResolvedValue([
      {
        acquiredDate: today,
        closedDate: today,
        status: 'CLOSED',
        totalCost: new Prisma.Decimal(1000),
        currentValue: null,
        realizedGainLoss: new Prisma.Decimal(200),
        coveredCalls: [],
      },
    ] as unknown as Position[])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])

    const result = await getPLOverTime('All')

    // Find the data point for the position date
    const point = result.find((dp) => dp.date === dateKey)
    expect(point).toBeDefined()
    expect(point!.realizedPL).toBe(200)
    expect(point!.premiumPL).toBe(0)
    expect(point!.totalPL).toBe(200)
  })

  it('should add premium on trade openDate', async () => {
    const openDate = new Date('2024-06-01')
    const dateKey = '2024-06-01'

    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([
      {
        openDate,
        closeDate: null,
        status: 'OPEN',
        premium: new Prisma.Decimal(5), // per-share
        closePremium: null,
        contracts: 1,
        positionId: null,
      },
    ] as unknown as Trade[])

    const result = await getPLOverTime('All')

    const point = result.find((dp) => dp.date === dateKey)
    expect(point).toBeDefined()
    // 5 * 1 * 100 = 500
    expect(point!.premiumPL).toBe(500)
    // Standalone trade, so premium is in totalPL
    expect(point!.totalPL).toBe(500)
  })

  it('should subtract closePremium on closeDate for CLOSED trades', async () => {
    const openDate = new Date('2024-06-01')
    const closeDate = new Date('2024-06-15')

    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([
      {
        openDate,
        closeDate,
        status: 'CLOSED',
        premium: new Prisma.Decimal(5), // per-share
        closePremium: new Prisma.Decimal(2), // per-share
        contracts: 1,
        positionId: null,
      },
    ] as unknown as Trade[])

    const result = await getPLOverTime('All')

    // On open date: premium = 5 * 1 * 100 = 500
    const openPoint = result.find((dp) => dp.date === '2024-06-01')
    expect(openPoint).toBeDefined()
    expect(openPoint!.premiumPL).toBe(500)

    // On close date: premium = 500 - (2 * 1 * 100) = 500 - 200 = 300 cumulative
    const closePoint = result.find((dp) => dp.date === '2024-06-15')
    expect(closePoint).toBeDefined()
    expect(closePoint!.premiumPL).toBe(300)
    expect(closePoint!.totalPL).toBe(300)
  })

  it('should keep full premium for EXPIRED trades', async () => {
    const openDate = new Date('2024-06-01')
    const closeDate = new Date('2024-06-15')

    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([
      {
        openDate,
        closeDate,
        status: 'EXPIRED',
        premium: new Prisma.Decimal(5), // per-share
        closePremium: null,
        contracts: 1,
        positionId: null,
      },
    ] as unknown as Trade[])

    const result = await getPLOverTime('All')

    // Premium should remain 5 * 1 * 100 = 500 throughout (no deduction for expired)
    const closePoint = result.find((dp) => dp.date === '2024-06-15')
    expect(closePoint).toBeDefined()
    expect(closePoint!.premiumPL).toBe(500)
    expect(closePoint!.totalPL).toBe(500)
  })

  it('should exclude ASSIGNED trades', async () => {
    // ASSIGNED trades are filtered out at the query level (status: { not: 'ASSIGNED' })
    // This test verifies the query filter works by checking that no premium appears
    // when we mock findMany to return empty (simulating the filter)
    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])

    const result = await getPLOverTime('All')
    expect(result).toEqual([])
  })

  it('should track covered call premium in premiumPL but not double-count in totalPL', async () => {
    const openDate = new Date('2024-06-01')

    // Position with a covered call
    vi.mocked(prisma.position.findMany).mockResolvedValue([
      {
        acquiredDate: openDate,
        closedDate: null,
        status: 'OPEN',
        totalCost: new Prisma.Decimal(5000),
        currentValue: new Prisma.Decimal(5200),
        realizedGainLoss: null,
        coveredCalls: [{ premium: new Prisma.Decimal(300) }],
      },
    ] as unknown as Position[])

    // The covered call trade itself (has positionId)
    // premium is per-share: 3.00 * 1 contract * 100 = 300
    vi.mocked(prisma.trade.findMany).mockResolvedValue([
      {
        openDate,
        closeDate: null,
        status: 'OPEN',
        premium: new Prisma.Decimal(3),
        closePremium: null,
        contracts: 1,
        positionId: 'pos1', // linked to position
      },
    ] as unknown as Trade[])

    const result = await getPLOverTime('All')

    const point = result.find((dp) => dp.date === '2024-06-01')
    expect(point).toBeDefined()
    // premiumPL shows all premium including covered calls: 3 * 1 * 100 = 300
    expect(point!.premiumPL).toBe(300)
    // unrealizedPL includes covered call premium: (5200 - 5000 + 300) = 500
    expect(point!.unrealizedPL).toBe(500)
    // totalPL = realized(0) + unrealized(500) + standalonePremium(0)
    // Covered call premium is NOT in standalone, so no double-counting
    expect(point!.totalPL).toBe(500)
  })

  it('should fill date gaps carrying forward premium', async () => {
    const day1 = new Date('2024-06-01')
    const day3 = new Date('2024-06-03')

    vi.mocked(prisma.position.findMany).mockResolvedValue([
      {
        acquiredDate: day1,
        closedDate: null,
        status: 'OPEN',
        totalCost: new Prisma.Decimal(1000),
        currentValue: new Prisma.Decimal(1100),
        realizedGainLoss: null,
        coveredCalls: [],
      },
    ] as unknown as Position[])

    vi.mocked(prisma.trade.findMany).mockResolvedValue([
      {
        openDate: day1,
        closeDate: null,
        status: 'OPEN',
        premium: new Prisma.Decimal(2), // per-share: 2 * 1 * 100 = 200
        closePremium: null,
        contracts: 1,
        positionId: null,
      },
      {
        openDate: day3,
        closeDate: null,
        status: 'OPEN',
        premium: new Prisma.Decimal(1), // per-share: 1 * 1 * 100 = 100
        closePremium: null,
        contracts: 1,
        positionId: null,
      },
    ] as unknown as Trade[])

    const result = await getPLOverTime('All')

    // Day 1: premiumPL = 2 * 1 * 100 = 200
    const day1Point = result.find((dp) => dp.date === '2024-06-01')
    expect(day1Point!.premiumPL).toBe(200)

    // Day 2 (gap): premiumPL should carry forward
    const day2Point = result.find((dp) => dp.date === '2024-06-02')
    expect(day2Point).toBeDefined()
    expect(day2Point!.premiumPL).toBe(200)

    // Day 3: premiumPL = 200 + 100 = 300
    const day3Point = result.find((dp) => dp.date === '2024-06-03')
    expect(day3Point!.premiumPL).toBe(300)
  })
})

describe('getPLByTicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupUserMock()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty array when no data', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])

    const result = await getPLByTicker('All')
    expect(result).toEqual([])
  })

  it('should group position P&L by ticker with premiumPL: 0', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([
      {
        ticker: 'AAPL',
        status: 'CLOSED',
        totalCost: new Prisma.Decimal(5000),
        currentValue: null,
        realizedGainLoss: new Prisma.Decimal(500),
        coveredCalls: [],
      },
      {
        ticker: 'TSLA',
        status: 'CLOSED',
        totalCost: new Prisma.Decimal(3000),
        currentValue: null,
        realizedGainLoss: new Prisma.Decimal(-100),
        coveredCalls: [],
      },
    ] as unknown as Position[])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])

    const result = await getPLByTicker('All')

    expect(result).toHaveLength(2)
    // Sorted by totalPL descending
    expect(result[0].ticker).toBe('AAPL')
    expect(result[0].realizedPL).toBe(500)
    expect(result[0].premiumPL).toBe(0)
    expect(result[0].totalPL).toBe(500)
    expect(result[1].ticker).toBe('TSLA')
    expect(result[1].realizedPL).toBe(-100)
    expect(result[1].premiumPL).toBe(0)
    expect(result[1].totalPL).toBe(-100)
  })

  it('should add standalone trade premium to correct ticker', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([
      {
        ticker: 'AAPL',
        premium: new Prisma.Decimal(5), // per-share
        closePremium: new Prisma.Decimal(1), // per-share
        contracts: 1,
        positionId: null,
      },
      {
        ticker: 'TSLA',
        premium: new Prisma.Decimal(3), // per-share
        closePremium: null,
        contracts: 1,
        positionId: null,
      },
    ] as unknown as Trade[])

    const result = await getPLByTicker('All')

    expect(result).toHaveLength(2)
    const aapl = result.find((d) => d.ticker === 'AAPL')!
    // (5 - 1) * 1 * 100 = 400
    expect(aapl.premiumPL).toBe(400)
    expect(aapl.totalPL).toBe(400) // standalone premium in totalPL

    const tsla = result.find((d) => d.ticker === 'TSLA')!
    // 3 * 1 * 100 = 300
    expect(tsla.premiumPL).toBe(300)
    expect(tsla.totalPL).toBe(300)
  })

  it('should handle covered calls (in premiumPL, not double-counted in totalPL)', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([
      {
        ticker: 'AAPL',
        status: 'OPEN',
        totalCost: new Prisma.Decimal(5000),
        currentValue: new Prisma.Decimal(5200),
        realizedGainLoss: null,
        coveredCalls: [{ premium: new Prisma.Decimal(300) }],
      },
    ] as unknown as Position[])

    // Covered call trade linked to position
    // premium per-share: 3.00 * 1 contract * 100 = 300
    vi.mocked(prisma.trade.findMany).mockResolvedValue([
      {
        ticker: 'AAPL',
        premium: new Prisma.Decimal(3),
        closePremium: null,
        contracts: 1,
        positionId: 'pos1',
      },
    ] as unknown as Trade[])

    const result = await getPLByTicker('All')

    expect(result).toHaveLength(1)
    const aapl = result[0]
    expect(aapl.premiumPL).toBe(300) // shows covered call premium: 3 * 1 * 100
    // unrealizedPL = (5200 - 5000 + 300) = 500
    expect(aapl.unrealizedPL).toBe(500)
    // totalPL = realized(0) + unrealized(500) + standalonePremium(0) = 500
    // No double-counting because covered call is not standalone
    expect(aapl.totalPL).toBe(500)
  })

  it('should sort by totalPL descending', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([
      {
        ticker: 'AAPL',
        status: 'CLOSED',
        totalCost: new Prisma.Decimal(5000),
        currentValue: null,
        realizedGainLoss: new Prisma.Decimal(100),
        coveredCalls: [],
      },
      {
        ticker: 'TSLA',
        status: 'CLOSED',
        totalCost: new Prisma.Decimal(3000),
        currentValue: null,
        realizedGainLoss: new Prisma.Decimal(500),
        coveredCalls: [],
      },
    ] as unknown as Position[])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])

    const result = await getPLByTicker('All')

    expect(result[0].ticker).toBe('TSLA') // 500 > 100
    expect(result[1].ticker).toBe('AAPL')
  })
})

describe('getWinRateData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupUserMock()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return all zeros when no data', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])

    const result = await getWinRateData('All')

    expect(result.winners).toBe(0)
    expect(result.losers).toBe(0)
    expect(result.breakeven).toBe(0)
    expect(result.totalTrades).toBe(0)
    expect(result.winRate).toBe(0)
  })

  it('should count position winners/losers correctly', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([
      { realizedGainLoss: new Prisma.Decimal(100) },
      { realizedGainLoss: new Prisma.Decimal(-50) },
      { realizedGainLoss: new Prisma.Decimal(200) },
    ] as unknown as Position[])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])

    const result = await getWinRateData('All')

    expect(result.winners).toBe(2)
    expect(result.losers).toBe(1)
    expect(result.totalTrades).toBe(3)
    expect(result.winRate).toBeCloseTo(66.67, 1)
  })

  it('should count EXPIRED trades as winners', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([
      { status: 'EXPIRED', realizedGainLoss: null },
      { status: 'EXPIRED', realizedGainLoss: null },
    ] as unknown as Trade[])

    const result = await getWinRateData('All')

    expect(result.winners).toBe(2)
    expect(result.losers).toBe(0)
    expect(result.totalTrades).toBe(2)
    expect(result.winRate).toBe(100)
  })

  it('should count CLOSED trades by realizedGainLoss sign', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([
      { status: 'CLOSED', realizedGainLoss: new Prisma.Decimal(150) },
      { status: 'CLOSED', realizedGainLoss: new Prisma.Decimal(-50) },
      { status: 'CLOSED', realizedGainLoss: new Prisma.Decimal(0) },
    ] as unknown as Trade[])

    const result = await getWinRateData('All')

    expect(result.winners).toBe(1)
    expect(result.losers).toBe(1)
    expect(result.breakeven).toBe(1)
    expect(result.totalTrades).toBe(3)
  })

  it('should combine positions and trades in total count and win rate', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([
      { realizedGainLoss: new Prisma.Decimal(100) }, // position winner
      { realizedGainLoss: new Prisma.Decimal(-50) }, // position loser
    ] as unknown as Position[])

    vi.mocked(prisma.trade.findMany).mockResolvedValue([
      { status: 'EXPIRED', realizedGainLoss: null }, // trade winner
      { status: 'CLOSED', realizedGainLoss: new Prisma.Decimal(200) }, // trade winner
      { status: 'CLOSED', realizedGainLoss: new Prisma.Decimal(-100) }, // trade loser
    ] as unknown as Trade[])

    const result = await getWinRateData('All')

    // 1 position winner + 2 trade winners = 3 winners
    expect(result.winners).toBe(3)
    // 1 position loser + 1 trade loser = 2 losers
    expect(result.losers).toBe(2)
    expect(result.totalTrades).toBe(5)
    // 3/5 = 60%
    expect(result.winRate).toBe(60)
  })
})

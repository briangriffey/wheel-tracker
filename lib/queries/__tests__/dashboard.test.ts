import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'
import type { User, Trade, Position } from '@/lib/generated/prisma'
import { getDashboardMetrics } from '../dashboard'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    position: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    trade: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('getDashboardMetrics', () => {
  const mockUser: User = {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: null,
    image: null,
    password: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return mock user
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser)
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
          premium: new Prisma.Decimal(1.50),
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

      vi.mocked(prisma.trade.count).mockResolvedValue(0)

      vi.mocked(prisma.position.count).mockResolvedValue(0)

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
      vi.mocked(prisma.trade.count).mockResolvedValue(0)
      vi.mocked(prisma.position.count).mockResolvedValue(0)

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
      vi.mocked(prisma.trade.count).mockResolvedValue(0)
      vi.mocked(prisma.position.count).mockResolvedValue(0)

      const result = await getDashboardMetrics('All')

      expect(result.totalPremiumCollected).toBe(0)
    })
  })

  describe('P&L Calculations', () => {
    it('should correctly calculate realized P&L', async () => {
      const mockTrades: Partial<Trade>[] = []

      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(1500.50),
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
      vi.mocked(prisma.trade.count).mockResolvedValue(0)
      vi.mocked(prisma.position.count).mockResolvedValue(0)

      const result = await getDashboardMetrics('All')

      expect(result.realizedPL).toBe(1500.50)
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
      vi.mocked(prisma.trade.count).mockResolvedValue(0)
      vi.mocked(prisma.position.count).mockResolvedValue(2)

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
      vi.mocked(prisma.trade.count).mockResolvedValue(0)
      vi.mocked(prisma.position.count).mockResolvedValue(1)

      const result = await getDashboardMetrics('All')

      expect(result.realizedPL).toBe(1000)
      expect(result.unrealizedPL).toBe(500) // 10500 - 10000
      expect(result.totalPL).toBe(1500) // 1000 + 500
    })
  })

  describe('Win Rate Calculation', () => {
    it('should correctly calculate win rate', async () => {
      const mockClosedPositions = [
        { realizedGainLoss: new Prisma.Decimal(100) }, // winner
        { realizedGainLoss: new Prisma.Decimal(200) }, // winner
        { realizedGainLoss: new Prisma.Decimal(-50) }, // loser
        { realizedGainLoss: new Prisma.Decimal(75) }, // winner
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
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockClosedPositions as unknown as Position[])
      vi.mocked(prisma.trade.count).mockResolvedValue(0)
      vi.mocked(prisma.position.count).mockResolvedValue(0)

      const result = await getDashboardMetrics('All')

      // 3 winners out of 4 total = 75%
      expect(result.winRate).toBe(75)
    })

    it('should return 0 win rate when no closed positions', async () => {
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
      vi.mocked(prisma.trade.count).mockResolvedValue(0)
      vi.mocked(prisma.position.count).mockResolvedValue(0)

      const result = await getDashboardMetrics('All')

      expect(result.winRate).toBe(0)
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
      vi.mocked(prisma.trade.count).mockResolvedValue(1) // open trades
      vi.mocked(prisma.position.count).mockResolvedValue(0)

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
      vi.mocked(prisma.trade.count).mockResolvedValue(0)
      vi.mocked(prisma.position.count).mockResolvedValue(0)

      const result = await getDashboardMetrics('All')

      expect(result.assignmentRate).toBe(0)
    })
  })

  describe('Complete Metrics Integration', () => {
    it('should return all metrics correctly with realistic data', async () => {
      // Realistic scenario:
      // - 3 trades with different premiums and contracts
      // - 2 open positions with P&L
      // - 4 closed positions (3 winners, 1 loser)
      // - 1 assigned trade out of 3 total

      const mockTrades = [
        { premium: new Prisma.Decimal(2.50), contracts: 5, status: 'ASSIGNED' },
        { premium: new Prisma.Decimal(1.75), contracts: 3, status: 'OPEN' },
        { premium: new Prisma.Decimal(3.00), contracts: 2, status: 'CLOSED' },
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

      const mockClosedPositions = [
        { realizedGainLoss: new Prisma.Decimal(500) },
        { realizedGainLoss: new Prisma.Decimal(300) },
        { realizedGainLoss: new Prisma.Decimal(-200) },
        { realizedGainLoss: new Prisma.Decimal(150) },
      ]

      vi.mocked(prisma.position.aggregate).mockResolvedValue({
        _sum: {
          realizedGainLoss: new Prisma.Decimal(750), // sum of closed positions
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
        .mockResolvedValueOnce(mockClosedPositions as unknown as Position[])
      vi.mocked(prisma.trade.count).mockResolvedValue(1) // 1 open trade
      vi.mocked(prisma.position.count).mockResolvedValue(2) // 2 active positions

      const result = await getDashboardMetrics('All')

      // Premium: (5 × 2.50 × 100) + (3 × 1.75 × 100) + (2 × 3.00 × 100)
      //        = 1250 + 525 + 600 = 2375
      expect(result.totalPremiumCollected).toBe(2375)

      // Realized P&L: 750
      expect(result.realizedPL).toBe(750)

      // Unrealized P&L: (15750 - 15000 + 250) + (7600 - 8000)
      //                = 1000 + (-400) = 600
      expect(result.unrealizedPL).toBe(600)

      // Total P&L: 750 + 600 = 1350
      expect(result.totalPL).toBe(1350)

      // Win rate: 3 winners / 4 total = 75%
      expect(result.winRate).toBe(75)

      // Assignment rate: 1 assigned / 3 total = 33.333...%
      expect(result.assignmentRate).toBeCloseTo(33.33, 2)

      // Active positions: 2
      expect(result.activePositions).toBe(2)

      // Open contracts: 1
      expect(result.openContracts).toBe(1)

      // vsSPY not implemented yet
      expect(result.vsSPY).toBe(null)
    })
  })

  describe('Error Handling', () => {
    it('should throw error when database query fails', async () => {
      vi.mocked(prisma.position.aggregate).mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(getDashboardMetrics('All')).rejects.toThrow(
        'Failed to fetch dashboard metrics'
      )
    })

    it('should throw error when no user found', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

      await expect(getDashboardMetrics('All')).rejects.toThrow(
        'Failed to fetch dashboard metrics'
      )
    })
  })
})

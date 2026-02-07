import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateRealizedPnL,
  calculateUnrealizedPnL,
  calculatePnLByTicker,
  calculatePnLByTimeframe,
  calculateAllTimeframes,
  calculatePortfolioStats,
  calculateCompletePnL,
} from './profit-loss'
import { prisma } from '@/lib/db'
import * as marketData from '@/lib/services/market-data'

// Mock the dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    position: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    trade: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/services/market-data', () => ({
  getLatestPrices: vi.fn(),
}))

const TEST_USER_ID = 'test-user-123'

describe('calculateRealizedPnL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate total realized P&L from closed positions', async () => {
    const mockPositions = [
      { ticker: 'AAPL', realizedGainLoss: 500 },
      { ticker: 'MSFT', realizedGainLoss: 300 },
      { ticker: 'AAPL', realizedGainLoss: 200 },
    ]

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)

    const result = await calculateRealizedPnL(TEST_USER_ID)

    expect(result.total).toBe(1000)
    expect(result.count).toBe(3)
    expect(result.byTicker.get('AAPL')).toBe(700)
    expect(result.byTicker.get('MSFT')).toBe(300)
  })

  it('should handle empty portfolio', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([])

    const result = await calculateRealizedPnL(TEST_USER_ID)

    expect(result.total).toBe(0)
    expect(result.count).toBe(0)
    expect(result.byTicker.size).toBe(0)
  })

  it('should handle negative realized P&L (losses)', async () => {
    const mockPositions = [
      { ticker: 'AAPL', realizedGainLoss: -500 },
      { ticker: 'MSFT', realizedGainLoss: 300 },
    ]

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)

    const result = await calculateRealizedPnL(TEST_USER_ID)

    expect(result.total).toBe(-200)
    expect(result.byTicker.get('AAPL')).toBe(-500)
    expect(result.byTicker.get('MSFT')).toBe(300)
  })

  it('should filter by ticker', async () => {
    const mockPositions = [
      { ticker: 'AAPL', realizedGainLoss: 500 },
    ]

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)

    const result = await calculateRealizedPnL(TEST_USER_ID, { ticker: 'AAPL' })

    expect(result.total).toBe(500)
    expect(prisma.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ticker: 'AAPL' }),
      })
    )
  })

  it('should filter by date range', async () => {
    const mockPositions = [
      { ticker: 'AAPL', realizedGainLoss: 500 },
    ]

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)

    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-12-31')

    const result = await calculateRealizedPnL(TEST_USER_ID, { startDate, endDate })

    expect(result.total).toBe(500)
    expect(prisma.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          closedDate: expect.objectContaining({ gte: startDate, lte: endDate }),
        }),
      })
    )
  })

  it('should handle null realized gains', async () => {
    const mockPositions = [
      { ticker: 'AAPL', realizedGainLoss: null },
      { ticker: 'MSFT', realizedGainLoss: 300 },
    ]

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)

    const result = await calculateRealizedPnL(TEST_USER_ID)

    expect(result.total).toBe(300)
  })

  it('should aggregate multiple positions for same ticker', async () => {
    const mockPositions = [
      { ticker: 'AAPL', realizedGainLoss: 100 },
      { ticker: 'AAPL', realizedGainLoss: 200 },
      { ticker: 'AAPL', realizedGainLoss: 300 },
    ]

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)

    const result = await calculateRealizedPnL(TEST_USER_ID)

    expect(result.total).toBe(600)
    expect(result.byTicker.get('AAPL')).toBe(600)
  })
})

describe('calculateUnrealizedPnL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate unrealized P&L with current prices', async () => {
    const mockPositions = [
      { ticker: 'AAPL', shares: 100, totalCost: 15000, costBasis: 150 },
      { ticker: 'MSFT', shares: 50, totalCost: 10000, costBasis: 200 },
    ]

    const mockPrices = new Map([
      ['AAPL', { ticker: 'AAPL', price: 160, date: new Date(), success: true }],
      ['MSFT', { ticker: 'MSFT', price: 220, date: new Date(), success: true }],
    ])

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)
    vi.mocked(marketData.getLatestPrices).mockResolvedValue(mockPrices)

    const result = await calculateUnrealizedPnL(TEST_USER_ID)

    // AAPL: (160 * 100) - 15000 = 16000 - 15000 = 1000
    // MSFT: (220 * 50) - 10000 = 11000 - 10000 = 1000
    expect(result.total).toBe(2000)
    expect(result.currentValue).toBe(27000)
    expect(result.costBasis).toBe(25000)
    expect(result.totalPercent).toBeCloseTo(8, 0)

    const aaplData = result.byTicker.get('AAPL')
    expect(aaplData).toBeDefined()
    expect(aaplData!.pnl).toBe(1000)
    expect(aaplData!.currentValue).toBe(16000)
  })

  it('should handle empty open positions', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([])

    const result = await calculateUnrealizedPnL(TEST_USER_ID)

    expect(result.total).toBe(0)
    expect(result.totalPercent).toBe(0)
    expect(result.currentValue).toBe(0)
    expect(result.costBasis).toBe(0)
    expect(result.byTicker.size).toBe(0)
  })

  it('should handle negative unrealized P&L (losses)', async () => {
    const mockPositions = [
      { ticker: 'AAPL', shares: 100, totalCost: 16000, costBasis: 160 },
    ]

    const mockPrices = new Map([
      ['AAPL', { ticker: 'AAPL', price: 150, date: new Date(), success: true }],
    ])

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)
    vi.mocked(marketData.getLatestPrices).mockResolvedValue(mockPrices)

    const result = await calculateUnrealizedPnL(TEST_USER_ID)

    // (150 * 100) - 16000 = 15000 - 16000 = -1000
    expect(result.total).toBe(-1000)
    expect(result.totalPercent).toBeCloseTo(-6.25, 2)
  })

  it('should skip positions without price data', async () => {
    const mockPositions = [
      { ticker: 'AAPL', shares: 100, totalCost: 15000, costBasis: 150 },
      { ticker: 'UNKNOWN', shares: 50, totalCost: 10000, costBasis: 200 },
    ]

    const mockPrices = new Map([
      ['AAPL', { ticker: 'AAPL', price: 160, date: new Date(), success: true }],
    ])

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)
    vi.mocked(marketData.getLatestPrices).mockResolvedValue(mockPrices)

    const result = await calculateUnrealizedPnL(TEST_USER_ID)

    // Only AAPL should be included
    expect(result.total).toBe(1000)
    expect(result.byTicker.size).toBe(1)
    expect(result.byTicker.has('AAPL')).toBe(true)
    expect(result.byTicker.has('UNKNOWN')).toBe(false)
  })

  it('should aggregate multiple positions of same ticker', async () => {
    const mockPositions = [
      { ticker: 'AAPL', shares: 100, totalCost: 15000, costBasis: 150 },
      { ticker: 'AAPL', shares: 50, totalCost: 7500, costBasis: 150 },
    ]

    const mockPrices = new Map([
      ['AAPL', { ticker: 'AAPL', price: 160, date: new Date(), success: true }],
    ])

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)
    vi.mocked(marketData.getLatestPrices).mockResolvedValue(mockPrices)

    const result = await calculateUnrealizedPnL(TEST_USER_ID)

    // Total: (160 * 150) - 22500 = 24000 - 22500 = 1500
    expect(result.total).toBe(1500)

    const aaplData = result.byTicker.get('AAPL')
    expect(aaplData!.currentValue).toBe(24000)
    expect(aaplData!.costBasis).toBe(22500)
    expect(aaplData!.pnl).toBe(1500)
  })

  it('should filter by ticker', async () => {
    const mockPositions = [
      { ticker: 'AAPL', shares: 100, totalCost: 15000, costBasis: 150 },
    ]

    const mockPrices = new Map([
      ['AAPL', { ticker: 'AAPL', price: 160, date: new Date(), success: true }],
    ])

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)
    vi.mocked(marketData.getLatestPrices).mockResolvedValue(mockPrices)

    await calculateUnrealizedPnL(TEST_USER_ID, { ticker: 'AAPL' })

    expect(prisma.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ticker: 'AAPL' }),
      })
    )
  })
})

describe('calculatePnLByTicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should combine realized and unrealized P&L by ticker', async () => {
    // Mock closed positions (realized)
    const mockClosedPositions = [
      { ticker: 'AAPL', realizedGainLoss: 500 },
      { ticker: 'MSFT', realizedGainLoss: 300 },
    ]

    // Mock open positions (unrealized)
    const mockOpenPositions = [
      { ticker: 'AAPL', shares: 100, totalCost: 15000, costBasis: 150 },
      { ticker: 'GOOGL', shares: 50, totalCost: 10000, costBasis: 200 },
    ]

    const mockPrices = new Map([
      ['AAPL', { ticker: 'AAPL', price: 160, date: new Date(), success: true }],
      ['GOOGL', { ticker: 'GOOGL', price: 220, date: new Date(), success: true }],
    ])

    vi.mocked(prisma.position.findMany)
      .mockResolvedValueOnce(mockClosedPositions as never) // First call: realized
      .mockResolvedValueOnce(mockOpenPositions as never) // Second call: unrealized

    vi.mocked(marketData.getLatestPrices).mockResolvedValue(mockPrices)

    const result = await calculatePnLByTicker(TEST_USER_ID)

    // AAPL: realized 500 + unrealized 1000 = 1500
    const aapl = result.find(t => t.ticker === 'AAPL')
    expect(aapl).toBeDefined()
    expect(aapl!.realizedPnL).toBe(500)
    expect(aapl!.unrealizedPnL).toBe(1000)
    expect(aapl!.totalPnL).toBe(1500)

    // MSFT: realized 300 only
    const msft = result.find(t => t.ticker === 'MSFT')
    expect(msft).toBeDefined()
    expect(msft!.realizedPnL).toBe(300)
    expect(msft!.unrealizedPnL).toBe(0)
    expect(msft!.totalPnL).toBe(300)

    // GOOGL: unrealized 1000 only
    const googl = result.find(t => t.ticker === 'GOOGL')
    expect(googl).toBeDefined()
    expect(googl!.realizedPnL).toBe(0)
    expect(googl!.unrealizedPnL).toBe(1000)
    expect(googl!.totalPnL).toBe(1000)
  })

  it('should sort by total P&L descending', async () => {
    const mockClosedPositions = [
      { ticker: 'AAPL', realizedGainLoss: 100 },
      { ticker: 'MSFT', realizedGainLoss: 500 },
      { ticker: 'GOOGL', realizedGainLoss: 300 },
    ]

    vi.mocked(prisma.position.findMany)
      .mockResolvedValueOnce(mockClosedPositions as never)
      .mockResolvedValueOnce([])

    vi.mocked(marketData.getLatestPrices).mockResolvedValue(new Map())

    const result = await calculatePnLByTicker(TEST_USER_ID)

    expect(result[0].ticker).toBe('MSFT')
    expect(result[0].totalPnL).toBe(500)
    expect(result[1].ticker).toBe('GOOGL')
    expect(result[1].totalPnL).toBe(300)
    expect(result[2].ticker).toBe('AAPL')
    expect(result[2].totalPnL).toBe(100)
  })

  it('should handle empty portfolio', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(marketData.getLatestPrices).mockResolvedValue(new Map())

    const result = await calculatePnLByTicker(TEST_USER_ID)

    expect(result).toEqual([])
  })
})

describe('calculatePnLByTimeframe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate daily P&L (realized only)', async () => {
    const mockPositions = [
      { ticker: 'AAPL', realizedGainLoss: 500 },
    ]

    vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)

    const result = await calculatePnLByTimeframe(TEST_USER_ID, 'daily')

    expect(result).toBe(500)
    expect(prisma.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          closedDate: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    )
  })

  it('should calculate all-time P&L (realized + unrealized)', async () => {
    const mockClosedPositions = [
      { ticker: 'AAPL', realizedGainLoss: 500 },
    ]

    const mockOpenPositions = [
      { ticker: 'MSFT', shares: 100, totalCost: 15000, costBasis: 150 },
    ]

    const mockPrices = new Map([
      ['MSFT', { ticker: 'MSFT', price: 160, date: new Date(), success: true }],
    ])

    vi.mocked(prisma.position.findMany)
      .mockResolvedValueOnce(mockClosedPositions as never) // Realized
      .mockResolvedValueOnce(mockOpenPositions as never) // Unrealized

    vi.mocked(marketData.getLatestPrices).mockResolvedValue(mockPrices)

    const result = await calculatePnLByTimeframe(TEST_USER_ID, 'all')

    // Realized: 500, Unrealized: 1000
    expect(result).toBe(1500)
  })
})

describe('calculateAllTimeframes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate all timeframes in parallel', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([
      { ticker: 'AAPL', realizedGainLoss: 500 },
    ] as never)

    vi.mocked(marketData.getLatestPrices).mockResolvedValue(new Map())

    const result = await calculateAllTimeframes(TEST_USER_ID)

    expect(result).toHaveProperty('daily')
    expect(result).toHaveProperty('weekly')
    expect(result).toHaveProperty('monthly')
    expect(result).toHaveProperty('ytd')
    expect(result).toHaveProperty('allTime')

    // Should have called findMany for each timeframe
    expect(prisma.position.findMany).toHaveBeenCalled()
  })
})

describe('calculatePortfolioStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate comprehensive portfolio statistics', async () => {
    const mockClosedPositions = [
      { ticker: 'AAPL', realizedGainLoss: 500 }, // Win
      { ticker: 'MSFT', realizedGainLoss: -200 }, // Loss
      { ticker: 'GOOGL', realizedGainLoss: 300 }, // Win
    ]

    const mockOpenPositions = [
      { ticker: 'AAPL', shares: 100, totalCost: 15000, costBasis: 150 },
      { ticker: 'TSLA', shares: 50, totalCost: 10000, costBasis: 200 },
    ]

    const mockTrades = [
      { premium: 500, status: 'ASSIGNED' },
      { premium: 300, status: 'CLOSED' },
      { premium: 200, status: 'ASSIGNED' },
      { premium: 150, status: 'EXPIRED' },
    ]

    const mockPrices = new Map([
      ['AAPL', { ticker: 'AAPL', price: 160, date: new Date(), success: true }],
      ['TSLA', { ticker: 'TSLA', price: 220, date: new Date(), success: true }],
    ])

    // Setup mocks for parallel calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.position.findMany).mockImplementation((args: any) => {
      if (args?.where?.status === 'CLOSED') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Promise.resolve(mockClosedPositions) as any
      } else if (args?.where?.status === 'OPEN') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Promise.resolve(mockOpenPositions) as any
      }
      // For realized P&L calculation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Promise.resolve(mockClosedPositions) as any
    })

    vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as never)
    vi.mocked(marketData.getLatestPrices).mockResolvedValue(mockPrices)

    const result = await calculatePortfolioStats(TEST_USER_ID)

    // Capital deployed
    expect(result.capitalDeployed).toBe(25000) // 15000 + 10000

    // Premium collected
    expect(result.premiumCollected).toBe(1150) // 500 + 300 + 200 + 150

    // Win rate: 2 wins out of 3 closed positions
    expect(result.winRate).toBeCloseTo(66.67, 1)

    // Assignment rate: 2 assigned out of 4 trades
    expect(result.assignmentRate).toBe(50)

    // Counts
    expect(result.totalTrades).toBe(4)
    expect(result.closedPositions).toBe(3)
    expect(result.openPositions).toBe(2)

    // Realized P&L: 500 - 200 + 300 = 600
    expect(result.realizedPnL).toBe(600)

    // Unrealized P&L: (160*100 - 15000) + (220*50 - 10000) = 1000 + 1000 = 2000
    expect(result.unrealizedPnL).toBe(2000)

    // Total P&L
    expect(result.totalPnL).toBe(2600)

    // Current value
    expect(result.currentValue).toBe(27000)
  })

  it('should handle empty portfolio', async () => {
    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])
    vi.mocked(marketData.getLatestPrices).mockResolvedValue(new Map())

    const result = await calculatePortfolioStats(TEST_USER_ID)

    expect(result.capitalDeployed).toBe(0)
    expect(result.totalPnL).toBe(0)
    expect(result.premiumCollected).toBe(0)
    expect(result.winRate).toBe(0)
    expect(result.assignmentRate).toBe(0)
    expect(result.totalTrades).toBe(0)
    expect(result.closedPositions).toBe(0)
    expect(result.openPositions).toBe(0)
  })

  it('should calculate win rate correctly with all losses', async () => {
    const mockClosedPositions = [
      { ticker: 'AAPL', realizedGainLoss: -500 },
      { ticker: 'MSFT', realizedGainLoss: -200 },
    ]

    vi.mocked(prisma.position.findMany)
      .mockResolvedValueOnce(mockClosedPositions as never) // For realized
      .mockResolvedValueOnce([]) // For unrealized
      .mockResolvedValueOnce([]) // For trades
      .mockResolvedValueOnce(mockClosedPositions as never) // For closedPositions
      .mockResolvedValueOnce([]) // For openPositions

    vi.mocked(prisma.trade.findMany).mockResolvedValue([])
    vi.mocked(marketData.getLatestPrices).mockResolvedValue(new Map())

    const result = await calculatePortfolioStats(TEST_USER_ID)

    expect(result.winRate).toBe(0)
  })
})

describe('calculateCompletePnL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate complete P&L analysis', async () => {
    // Simple mocks - just return empty data to test structure
    vi.mocked(prisma.position.findMany).mockResolvedValue([])
    vi.mocked(prisma.trade.findMany).mockResolvedValue([])
    vi.mocked(marketData.getLatestPrices).mockResolvedValue(new Map())

    const result = await calculateCompletePnL(TEST_USER_ID)

    // Verify all sections are present with correct structure
    expect(result).toHaveProperty('realized')
    expect(result.realized).toHaveProperty('total')
    expect(result.realized).toHaveProperty('byTicker')
    expect(result.realized).toHaveProperty('count')

    expect(result).toHaveProperty('unrealized')
    expect(result.unrealized).toHaveProperty('total')
    expect(result.unrealized).toHaveProperty('totalPercent')
    expect(result.unrealized).toHaveProperty('currentValue')
    expect(result.unrealized).toHaveProperty('costBasis')
    expect(result.unrealized).toHaveProperty('byTicker')

    expect(result).toHaveProperty('byTicker')
    expect(Array.isArray(result.byTicker)).toBe(true)

    expect(result).toHaveProperty('byTimeframe')
    expect(result.byTimeframe).toHaveProperty('daily')
    expect(result.byTimeframe).toHaveProperty('weekly')
    expect(result.byTimeframe).toHaveProperty('monthly')
    expect(result.byTimeframe).toHaveProperty('ytd')
    expect(result.byTimeframe).toHaveProperty('allTime')

    expect(result).toHaveProperty('portfolio')
    expect(result.portfolio).toHaveProperty('capitalDeployed')
    expect(result.portfolio).toHaveProperty('totalPnL')
    expect(result.portfolio).toHaveProperty('realizedPnL')
    expect(result.portfolio).toHaveProperty('unrealizedPnL')
    expect(result.portfolio).toHaveProperty('returnPercent')
    expect(result.portfolio).toHaveProperty('premiumCollected')
    expect(result.portfolio).toHaveProperty('winRate')
    expect(result.portfolio).toHaveProperty('assignmentRate')
  })
})

describe('Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should complete calculations in under 100ms', async () => {
    // Setup realistic data
    const mockClosedPositions = Array.from({ length: 50 }, (_, i) => ({
      ticker: `STOCK${i}`,
      realizedGainLoss: Math.random() * 1000 - 500,
    }))

    const mockOpenPositions = Array.from({ length: 20 }, (_, i) => ({
      ticker: `STOCK${i}`,
      shares: 100,
      totalCost: 15000,
      costBasis: 150,
    }))

    const mockTrades = Array.from({ length: 100 }, (_, i) => ({
      premium: Math.random() * 500,
      status: i % 2 === 0 ? 'ASSIGNED' : 'CLOSED',
    }))

    const mockPrices = new Map(
      Array.from({ length: 20 }, (_, i) => [
        `STOCK${i}`,
        { ticker: `STOCK${i}`, price: 160, date: new Date(), success: true },
      ])
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.position.findMany).mockImplementation((args: any) => {
      if (args?.where?.status === 'CLOSED') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Promise.resolve(mockClosedPositions) as any
      } else if (args?.where?.status === 'OPEN') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Promise.resolve(mockOpenPositions) as any
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Promise.resolve(mockClosedPositions) as any
    })

    vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as never)
    vi.mocked(marketData.getLatestPrices).mockResolvedValue(mockPrices)

    const startTime = performance.now()
    await calculateCompletePnL(TEST_USER_ID)
    const endTime = performance.now()

    const duration = endTime - startTime

    // Should complete in under 100ms (generous for test environment)
    expect(duration).toBeLessThan(100)
  })
})

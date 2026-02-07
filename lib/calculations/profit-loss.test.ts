/**
 * Unit tests for P&L calculation service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getDateRanges,
  calculateRealizedPnL,
  calculateUnrealizedPnL,
  calculatePnLByTicker,
  calculatePortfolioStats,
  calculateCompletePnL,
  calculatePnLByPeriod,
  type TimePeriod,
} from './profit-loss'
import { TradeStatus, TradeType, Prisma } from '@/lib/generated/prisma'

const Decimal = Prisma.Decimal

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    position: {
      findMany: vi.fn(),
    },
    trade: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/services/market-data', () => ({
  getLatestPrices: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { getLatestPrices } from '@/lib/services/market-data'

const mockPrisma = prisma as unknown as {
  position: { findMany: ReturnType<typeof vi.fn> }
  trade: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> }
}
const mockGetLatestPrices = getLatestPrices as unknown as ReturnType<typeof vi.fn>

describe('getDateRanges', () => {
  it('should return correct date ranges', () => {
    const ranges = getDateRanges()

    expect(ranges.daily).toBeDefined()
    expect(ranges.weekly).toBeDefined()
    expect(ranges.monthly).toBeDefined()
    expect(ranges.ytd).toBeDefined()
    expect(ranges.allTime).toBeDefined()

    // Daily should be today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expect(ranges.daily.startDate.getTime()).toBeGreaterThanOrEqual(today.getTime())

    // Weekly should be 7 days ago
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    expect(ranges.weekly.startDate.getDate()).toBeLessThanOrEqual(weekAgo.getDate() + 1)

    // Monthly should be first of month
    expect(ranges.monthly.startDate.getDate()).toBe(1)

    // YTD should be Jan 1
    expect(ranges.ytd.startDate.getMonth()).toBe(0)
    expect(ranges.ytd.startDate.getDate()).toBe(1)

    // All time should be epoch
    expect(ranges.allTime.startDate.getTime()).toBe(0)
  })
})

describe('calculateRealizedPnL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate realized P&L from closed positions', async () => {
    // Mock closed positions
    mockPrisma.position.findMany.mockResolvedValueOnce([
      { realizedGainLoss: new Decimal(500) },
      { realizedGainLoss: new Decimal(300) },
      { realizedGainLoss: new Decimal(-100) },
    ])

    // Mock expired options
    mockPrisma.trade.findMany.mockResolvedValueOnce([
      { premium: new Decimal(250) },
      { premium: new Decimal(150) },
    ])

    // Mock closed options (opening trades)
    mockPrisma.trade.findMany.mockResolvedValueOnce([
      { id: '1', premium: new Decimal(300), ticker: 'AAPL', closeDate: new Date() },
    ])

    // Mock corresponding closing trade
    mockPrisma.trade.findFirst.mockResolvedValueOnce({
      premium: new Decimal(100),
    })

    const result = await calculateRealizedPnL('user1')

    expect(result.totalRealizedPnL).toBe(1300) // 700 + 400 + 200
    expect(result.closedPositionsPnL).toBe(700)
    expect(result.expiredOptionsPnL).toBe(400)
    expect(result.closedOptionsPnL).toBe(200) // 300 - 100
    expect(result.tradeCount).toBe(6) // 3 positions + 2 expired + 1 closed
    expect(result.winningTrades).toBe(5) // 2 winning positions + 2 expired + 1 closed option with profit
    expect(result.losingTrades).toBe(1)
  })

  it('should handle empty results', async () => {
    mockPrisma.position.findMany.mockResolvedValue([])
    mockPrisma.trade.findMany.mockResolvedValue([])

    const result = await calculateRealizedPnL('user1')

    expect(result.totalRealizedPnL).toBe(0)
    expect(result.tradeCount).toBe(0)
    expect(result.winningTrades).toBe(0)
    expect(result.losingTrades).toBe(0)
  })

  it('should filter by time period', async () => {
    const period: TimePeriod = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    }

    mockPrisma.position.findMany.mockResolvedValue([])
    mockPrisma.trade.findMany.mockResolvedValue([])

    await calculateRealizedPnL('user1', period)

    // Verify that findMany was called with date filters
    expect(mockPrisma.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          closedDate: {
            gte: period.startDate,
            lte: period.endDate,
          },
        }),
      })
    )
  })

  it('should handle null realized gain/loss', async () => {
    mockPrisma.position.findMany.mockResolvedValueOnce([
      { realizedGainLoss: new Decimal(500) },
      { realizedGainLoss: null },
    ])
    mockPrisma.trade.findMany.mockResolvedValue([])

    const result = await calculateRealizedPnL('user1')

    expect(result.closedPositionsPnL).toBe(500)
  })
})

describe('calculateUnrealizedPnL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate unrealized P&L from open positions', async () => {
    // Mock open positions
    mockPrisma.position.findMany
      .mockResolvedValueOnce([{ ticker: 'AAPL' }]) // distinct tickers
      .mockResolvedValueOnce([
        // actual positions
        {
          ticker: 'AAPL',
          shares: 100,
          totalCost: new Decimal(14750),
        },
      ])

    // Mock open trades (distinct tickers)
    mockPrisma.trade.findMany
      .mockResolvedValueOnce([]) // distinct tickers
      .mockResolvedValueOnce([]) // open options

    // Mock current prices
    mockGetLatestPrices.mockResolvedValue(
      new Map([['AAPL', { ticker: 'AAPL', price: 150, success: true }]])
    )

    const result = await calculateUnrealizedPnL('user1')

    expect(result.openPositionsPnL).toBe(250) // (150 * 100) - 14750
    expect(result.currentValue).toBe(15000)
    expect(result.totalCost).toBe(14750)
    expect(result.totalUnrealizedPnL).toBe(250)
  })

  it('should calculate unrealized P&L from open options', async () => {
    // Mock no positions
    mockPrisma.position.findMany
      .mockResolvedValueOnce([]) // distinct tickers
      .mockResolvedValueOnce([]) // actual positions

    // Mock open PUT option
    mockPrisma.trade.findMany
      .mockResolvedValueOnce([{ ticker: 'AAPL' }]) // distinct tickers
      .mockResolvedValueOnce([
        {
          ticker: 'AAPL',
          type: TradeType.PUT,
          strikePrice: new Decimal(150),
          premium: new Decimal(250),
          shares: 100,
          expirationDate: new Date(),
        },
      ])

    // Mock current price (stock is below strike - PUT is ITM)
    mockGetLatestPrices.mockResolvedValue(
      new Map([['AAPL', { ticker: 'AAPL', price: 145, success: true }]])
    )

    const result = await calculateUnrealizedPnL('user1')

    // Option value = (150 - 145) * 100 = 500
    // Unrealized P&L = 250 (premium) - 500 (current value) = -250
    expect(result.openOptionsPnL).toBe(-250)
    expect(result.currentValue).toBe(500)
    expect(result.totalCost).toBe(250)
  })

  it('should handle out of the money options', async () => {
    mockPrisma.position.findMany.mockResolvedValue([])

    // Mock open PUT option (OTM)
    mockPrisma.trade.findMany
      .mockResolvedValueOnce([{ ticker: 'AAPL' }])
      .mockResolvedValueOnce([
        {
          ticker: 'AAPL',
          type: TradeType.PUT,
          strikePrice: new Decimal(150),
          premium: new Decimal(250),
          shares: 100,
          expirationDate: new Date(),
        },
      ])

    // Price above strike - PUT is OTM
    mockGetLatestPrices.mockResolvedValue(
      new Map([['AAPL', { ticker: 'AAPL', price: 155, success: true }]])
    )

    const result = await calculateUnrealizedPnL('user1')

    // OTM option has no intrinsic value
    expect(result.openOptionsPnL).toBe(250) // Full premium kept
    expect(result.currentValue).toBe(0)
  })

  it('should handle in the money CALL options', async () => {
    mockPrisma.position.findMany.mockResolvedValue([])

    mockPrisma.trade.findMany
      .mockResolvedValueOnce([{ ticker: 'AAPL' }])
      .mockResolvedValueOnce([
        {
          ticker: 'AAPL',
          type: TradeType.CALL,
          strikePrice: new Decimal(150),
          premium: new Decimal(300),
          shares: 100,
          expirationDate: new Date(),
        },
      ])

    // Price above strike - CALL is ITM
    mockGetLatestPrices.mockResolvedValue(
      new Map([['AAPL', { ticker: 'AAPL', price: 155, success: true }]])
    )

    const result = await calculateUnrealizedPnL('user1')

    // CALL value = (155 - 150) * 100 = 500
    // Unrealized P&L = 300 (premium) - 500 = -200
    expect(result.openOptionsPnL).toBe(-200)
    expect(result.currentValue).toBe(500)
  })

  it('should handle missing price data', async () => {
    mockPrisma.position.findMany
      .mockResolvedValueOnce([{ ticker: 'AAPL' }])
      .mockResolvedValueOnce([
        {
          ticker: 'AAPL',
          shares: 100,
          totalCost: new Decimal(14750),
        },
      ])

    mockPrisma.trade.findMany.mockResolvedValue([])

    // No price data available
    mockGetLatestPrices.mockResolvedValue(new Map())

    const result = await calculateUnrealizedPnL('user1')

    // With no price, position value is 0
    expect(result.openPositionsPnL).toBe(-14750)
    expect(result.currentValue).toBe(0)
  })
})

describe('calculatePnLByTicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should aggregate P&L by ticker', async () => {
    // Mock distinct tickers
    mockPrisma.position.findMany
      .mockResolvedValueOnce([{ ticker: 'AAPL' }])
      .mockResolvedValueOnce([
        { realizedGainLoss: new Decimal(500) },
      ])
      .mockResolvedValueOnce([
        {
          ticker: 'AAPL',
          shares: 100,
          totalCost: new Decimal(14750),
        },
      ])

    mockPrisma.trade.findMany
      .mockResolvedValueOnce([{ ticker: 'AAPL' }])
      .mockResolvedValueOnce([
        { premium: new Decimal(250) },
      ])
      .mockResolvedValueOnce([
        { premium: new Decimal(250), status: TradeStatus.EXPIRED },
      ])

    mockGetLatestPrices.mockResolvedValue(
      new Map([['AAPL', { ticker: 'AAPL', price: 150, success: true }]])
    )

    const result = await calculatePnLByTicker('user1')

    expect(result).toHaveLength(1)
    expect(result[0].ticker).toBe('AAPL')
    expect(result[0].realizedPnL).toBe(750) // 500 + 250
    expect(result[0].unrealizedPnL).toBe(250) // (150 * 100) - 14750
    expect(result[0].totalPnL).toBe(1000)
    expect(result[0].premiumCollected).toBe(250)
    expect(result[0].winRate).toBe(100) // 2/2 winning trades
  })

  it('should handle multiple tickers', async () => {
    mockPrisma.position.findMany
      .mockResolvedValueOnce([{ ticker: 'AAPL' }, { ticker: 'TSLA' }])
      .mockResolvedValueOnce([{ realizedGainLoss: new Decimal(500) }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ realizedGainLoss: new Decimal(300) }])
      .mockResolvedValueOnce([])

    mockPrisma.trade.findMany
      .mockResolvedValueOnce([{ ticker: 'AAPL' }, { ticker: 'TSLA' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ premium: new Decimal(250), status: TradeStatus.EXPIRED }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ premium: new Decimal(150), status: TradeStatus.EXPIRED }])

    mockGetLatestPrices.mockResolvedValue(new Map())

    const result = await calculatePnLByTicker('user1')

    expect(result).toHaveLength(2)
    // Should be sorted by total P&L descending
    expect(result[0].totalPnL).toBeGreaterThanOrEqual(result[1].totalPnL)
  })

  it('should calculate win rate correctly', async () => {
    mockPrisma.position.findMany
      .mockResolvedValueOnce([{ ticker: 'AAPL' }])
      .mockResolvedValueOnce([
        { realizedGainLoss: new Decimal(100) },
        { realizedGainLoss: new Decimal(-50) },
      ])
      .mockResolvedValueOnce([])

    mockPrisma.trade.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    mockGetLatestPrices.mockResolvedValue(new Map())

    const result = await calculatePnLByTicker('user1')

    expect(result[0].winRate).toBe(50) // 1 win, 1 loss = 50%
  })

  it('should handle zero trades gracefully', async () => {
    mockPrisma.position.findMany
      .mockResolvedValueOnce([{ ticker: 'AAPL' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    mockPrisma.trade.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    mockGetLatestPrices.mockResolvedValue(new Map())

    const result = await calculatePnLByTicker('user1')

    expect(result[0].winRate).toBe(0)
    expect(result[0].returnPercent).toBe(0)
  })
})

describe('calculatePortfolioStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate comprehensive portfolio statistics', async () => {
    vi.clearAllMocks()

    // Set up default mocks - use mockResolvedValue for repeated calls
    mockPrisma.position.findMany.mockResolvedValue([
      { totalCost: new Decimal(14750) }
    ])

    mockPrisma.trade.findMany.mockResolvedValue([
      { premium: new Decimal(250), status: TradeStatus.OPEN,
        ticker: 'AAPL', type: TradeType.PUT, strikePrice: new Decimal(150),
        shares: 100, expirationDate: new Date() },
      { premium: new Decimal(200), status: TradeStatus.ASSIGNED,
        ticker: 'AAPL', type: TradeType.PUT, strikePrice: new Decimal(150),
        shares: 100, expirationDate: new Date() },
    ])

    mockPrisma.trade.findFirst.mockResolvedValue(null)
    mockPrisma.trade.count.mockResolvedValue(1)

    mockGetLatestPrices.mockResolvedValue(
      new Map([['AAPL', { ticker: 'AAPL', price: 150, success: true }]])
    )

    const result = await calculatePortfolioStats('user1')

    // Verify basic structure
    expect(result).toHaveProperty('totalCapitalDeployed')
    expect(result).toHaveProperty('totalPremiumCollected')
    expect(result).toHaveProperty('totalRealizedPnL')
    expect(result).toHaveProperty('totalUnrealizedPnL')
    expect(result).toHaveProperty('totalPnL')
    expect(result).toHaveProperty('returnOnCapital')
    expect(result).toHaveProperty('winRate')
    expect(result).toHaveProperty('assignmentRate')
    expect(result).toHaveProperty('totalTrades')
    expect(result).toHaveProperty('activeTrades')
    expect(result).toHaveProperty('assignedTrades')

    expect(result.totalCapitalDeployed).toBeGreaterThanOrEqual(0)
    expect(result.totalTrades).toBeGreaterThanOrEqual(0)
  })

  it('should handle zero capital deployed', async () => {
    mockPrisma.position.findMany.mockResolvedValue([])
    mockPrisma.trade.findMany.mockResolvedValue([])
    mockPrisma.trade.findFirst.mockResolvedValue(null)
    mockPrisma.trade.count.mockResolvedValue(0)

    mockGetLatestPrices.mockResolvedValue(new Map())

    const result = await calculatePortfolioStats('user1')

    expect(result.totalCapitalDeployed).toBe(0)
    expect(result.returnOnCapital).toBe(0)
    expect(result.winRate).toBe(0)
    expect(result.assignmentRate).toBe(0)
  })
})

describe('calculateCompletePnL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return complete P&L analysis', async () => {
    // Setup comprehensive mocks
    mockPrisma.position.findMany.mockResolvedValue([])
    mockPrisma.trade.findMany.mockResolvedValue([])
    mockPrisma.trade.findFirst.mockResolvedValue(null)
    mockPrisma.trade.count.mockResolvedValue(0)
    mockGetLatestPrices.mockResolvedValue(new Map())

    const result = await calculateCompletePnL('user1')

    expect(result).toHaveProperty('realized')
    expect(result).toHaveProperty('unrealized')
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('byTicker')
    expect(result).toHaveProperty('portfolio')

    expect(result.total).toBe(
      result.realized.totalRealizedPnL + result.unrealized.totalUnrealizedPnL
    )
  })
})

describe('calculatePnLByPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate P&L for all time periods', async () => {
    mockPrisma.position.findMany.mockResolvedValue([])
    mockPrisma.trade.findMany.mockResolvedValue([])
    mockPrisma.trade.findFirst.mockResolvedValue(null)
    mockPrisma.trade.count.mockResolvedValue(0)
    mockGetLatestPrices.mockResolvedValue(new Map())

    const result = await calculatePnLByPeriod('user1')

    expect(result).toHaveProperty('daily')
    expect(result).toHaveProperty('weekly')
    expect(result).toHaveProperty('monthly')
    expect(result).toHaveProperty('ytd')
    expect(result).toHaveProperty('allTime')

    // Each period should have complete P&L structure
    expect(result.daily).toHaveProperty('realized')
    expect(result.daily).toHaveProperty('unrealized')
    expect(result.daily).toHaveProperty('total')
    expect(result.daily).toHaveProperty('byTicker')
    expect(result.daily).toHaveProperty('portfolio')
  })
})

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle database errors gracefully', async () => {
    mockPrisma.position.findMany.mockRejectedValue(new Error('Database error'))

    await expect(calculateRealizedPnL('user1')).rejects.toThrow('Database error')
  })

  it('should handle large numbers and decimal precision correctly', async () => {
    // Test both large numbers and decimal precision
    mockPrisma.position.findMany
      .mockResolvedValueOnce([
        { realizedGainLoss: new Decimal('999999999.99') },
        { realizedGainLoss: new Decimal('0.01') },
      ])

    mockPrisma.trade.findMany
      .mockResolvedValueOnce([]) // expired options
      .mockResolvedValueOnce([]) // closed options

    const result = await calculateRealizedPnL('user1')

    // Verify large numbers and decimal precision are handled correctly
    expect(result.closedPositionsPnL).toBe(1000000000)
    expect(result.totalRealizedPnL).toBe(1000000000)
  })
})

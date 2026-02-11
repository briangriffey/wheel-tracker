/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  calculateBenchmarkShares,
  calculateBenchmarkValue,
  calculateBenchmarkGainLoss,
  calculateBenchmarkReturn,
  getBenchmarkMetrics,
  getAllBenchmarkMetrics,
  compareToBenchmark,
  compareToAllBenchmarks,
} from './benchmark'
import { prisma } from '@/lib/db'
import * as marketData from '@/lib/services/market-data'
import * as profitLoss from './profit-loss'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    marketBenchmark: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    cashDeposit: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/services/market-data', () => ({
  getLatestPrice: vi.fn(),
  fetchStockPrice: vi.fn(),
}))

vi.mock('./profit-loss', () => ({
  calculatePortfolioStats: vi.fn(),
}))

// Helper to create mock Prisma Decimal objects
const mockDecimal = (value: number) => ({
  toNumber: () => value,
  valueOf: () => value,
  toString: () => String(value),
  [Symbol.toPrimitive]: () => value,
})

describe('Benchmark Calculations', () => {
  beforeEach(() => {
    // Default mock for cashDeposit queries (empty arrays)
    ;(prisma.cashDeposit.findMany as any).mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateBenchmarkShares', () => {
    it('should calculate shares correctly', () => {
      const shares = calculateBenchmarkShares(10000, 400)
      expect(shares).toBe(25)
    })

    it('should handle fractional shares', () => {
      const shares = calculateBenchmarkShares(10000, 333.33)
      expect(shares).toBeCloseTo(30.00, 2)
    })

    it('should throw error for zero price', () => {
      expect(() => calculateBenchmarkShares(10000, 0)).toThrow(
        'Initial price must be positive'
      )
    })

    it('should throw error for negative price', () => {
      expect(() => calculateBenchmarkShares(10000, -100)).toThrow(
        'Initial price must be positive'
      )
    })
  })

  describe('calculateBenchmarkValue', () => {
    it('should calculate current value correctly', () => {
      const value = calculateBenchmarkValue(25, 420)
      expect(value).toBe(10500)
    })

    it('should handle fractional shares', () => {
      const value = calculateBenchmarkValue(25.5, 400)
      expect(value).toBe(10200)
    })

    it('should return zero for zero shares', () => {
      const value = calculateBenchmarkValue(0, 400)
      expect(value).toBe(0)
    })

    it('should return zero for zero price', () => {
      const value = calculateBenchmarkValue(25, 0)
      expect(value).toBe(0)
    })
  })

  describe('calculateBenchmarkGainLoss', () => {
    it('should calculate gain correctly', () => {
      const gainLoss = calculateBenchmarkGainLoss(10500, 10000)
      expect(gainLoss).toBe(500)
    })

    it('should calculate loss correctly', () => {
      const gainLoss = calculateBenchmarkGainLoss(9500, 10000)
      expect(gainLoss).toBe(-500)
    })

    it('should return zero for no change', () => {
      const gainLoss = calculateBenchmarkGainLoss(10000, 10000)
      expect(gainLoss).toBe(0)
    })
  })

  describe('calculateBenchmarkReturn', () => {
    it('should calculate positive return correctly', () => {
      const returnPercent = calculateBenchmarkReturn(500, 10000)
      expect(returnPercent).toBe(5)
    })

    it('should calculate negative return correctly', () => {
      const returnPercent = calculateBenchmarkReturn(-500, 10000)
      expect(returnPercent).toBe(-5)
    })

    it('should return zero for zero gain/loss', () => {
      const returnPercent = calculateBenchmarkReturn(0, 10000)
      expect(returnPercent).toBe(0)
    })

    it('should return zero for zero initial capital', () => {
      const returnPercent = calculateBenchmarkReturn(500, 0)
      expect(returnPercent).toBe(0)
    })

    it('should handle large returns', () => {
      const returnPercent = calculateBenchmarkReturn(10000, 10000)
      expect(returnPercent).toBe(100)
    })
  })

  describe('getBenchmarkMetrics', () => {
    const mockBenchmark = {
      id: 'test-id',
      userId: 'user-1',
      ticker: 'SPY',
      initialCapital: mockDecimal(10000),
      setupDate: new Date('2024-01-01'),
      initialPrice: mockDecimal(400),
      shares: mockDecimal(25),
      lastUpdated: new Date('2024-06-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-06-01'),
    }

    it('should calculate metrics correctly', async () => {
      // Mock database query
      ;(prisma.marketBenchmark.findUnique as any).mockResolvedValue(
        mockBenchmark
      )

      // Mock price fetch
      ;(marketData.getLatestPrice as any).mockResolvedValue({
        ticker: 'SPY',
        price: 420,
        date: new Date('2024-06-01'),
        success: true,
      })

      const metrics = await getBenchmarkMetrics('user-1', 'SPY')

      expect(metrics).toEqual({
        ticker: 'SPY',
        initialCapital: 10000,
        setupDate: new Date('2024-01-01'),
        initialPrice: 400,
        shares: 25,
        currentPrice: 420,
        currentValue: 10500,
        gainLoss: 500,
        returnPercent: 5,
        lastUpdated: new Date('2024-06-01'),
      })
    })

    it('should return null for non-existent benchmark', async () => {
      ;(prisma.marketBenchmark.findUnique as any).mockResolvedValue(null)

      const metrics = await getBenchmarkMetrics('user-1', 'SPY')

      expect(metrics).toBeNull()
    })

    it('should throw error when price fetch fails', async () => {
      ;(prisma.marketBenchmark.findUnique as any).mockResolvedValue(
        mockBenchmark      )

      ;(marketData.getLatestPrice as any).mockResolvedValue({
        ticker: 'SPY',
        price: 0,
        date: new Date(),
        success: false,
        error: 'API error',
      })

      await expect(getBenchmarkMetrics('user-1', 'SPY')).rejects.toThrow(
        'Failed to fetch current price for SPY'
      )
    })

    describe('Deposit-based calculations', () => {
      it('should calculate metrics from single deposit', async () => {
        ;(prisma.marketBenchmark.findUnique as any).mockResolvedValue(
          mockBenchmark
        )

        const mockDeposits = [
          {
            id: 'deposit-1',
            userId: 'user-1',
            amount: mockDecimal(10000),
            type: 'DEPOSIT',
            depositDate: new Date('2024-01-01'),
            spyPrice: mockDecimal(400),
            spyShares: mockDecimal(25),
          },
        ]

        ;(prisma.cashDeposit.findMany as any)
          .mockResolvedValueOnce(mockDeposits) // deposits
          .mockResolvedValueOnce([]) // withdrawals

        ;(marketData.getLatestPrice as any).mockResolvedValue({
          ticker: 'SPY',
          price: 420,
          date: new Date('2024-06-01'),
          success: true,
        })

        const metrics = await getBenchmarkMetrics('user-1', 'SPY')

        expect(metrics).toEqual({
          ticker: 'SPY',
          initialCapital: 10000,
          setupDate: new Date('2024-01-01'),
          initialPrice: 400,
          shares: 25,
          currentPrice: 420,
          currentValue: 10500,
          gainLoss: 500,
          returnPercent: 5,
          lastUpdated: new Date('2024-06-01'),
        })
      })

      it('should calculate metrics from multiple deposits (dollar-cost averaging)', async () => {
        ;(prisma.marketBenchmark.findUnique as any).mockResolvedValue(
          mockBenchmark
        )

        const mockDeposits = [
          {
            id: 'deposit-1',
            userId: 'user-1',
            amount: mockDecimal(5000),
            type: 'DEPOSIT',
            depositDate: new Date('2024-01-01'),
            spyPrice: mockDecimal(400),
            spyShares: mockDecimal(12.5), // 5000 / 400
          },
          {
            id: 'deposit-2',
            userId: 'user-1',
            amount: mockDecimal(5000),
            type: 'DEPOSIT',
            depositDate: new Date('2024-02-01'),
            spyPrice: mockDecimal(420),
            spyShares: mockDecimal(11.9048), // 5000 / 420
          },
        ]

        ;(prisma.cashDeposit.findMany as any)
          .mockResolvedValueOnce(mockDeposits) // deposits
          .mockResolvedValueOnce([]) // withdrawals

        ;(marketData.getLatestPrice as any).mockResolvedValue({
          ticker: 'SPY',
          price: 440,
          date: new Date('2024-06-01'),
          success: true,
        })

        const metrics = await getBenchmarkMetrics('user-1', 'SPY')

        expect(metrics).toBeDefined()
        expect(metrics?.ticker).toBe('SPY')
        expect(metrics?.initialCapital).toBe(10000)
        expect(metrics?.shares).toBeCloseTo(24.4048, 4) // 12.5 + 11.9048
        expect(metrics?.initialPrice).toBeCloseTo(409.76, 2) // Weighted avg: 10000 / 24.4048
        expect(metrics?.currentPrice).toBe(440)
        expect(metrics?.currentValue).toBeCloseTo(10738.11, 2) // 24.4048 * 440
        expect(metrics?.gainLoss).toBeCloseTo(738.11, 2) // 10738.11 - 10000
        expect(metrics?.returnPercent).toBeCloseTo(7.38, 2) // (738.11 / 10000) * 100
      })

      it('should handle deposits and withdrawals', async () => {
        ;(prisma.marketBenchmark.findUnique as any).mockResolvedValue(
          mockBenchmark
        )

        const mockDeposits = [
          {
            id: 'deposit-1',
            userId: 'user-1',
            amount: mockDecimal(10000),
            type: 'DEPOSIT',
            depositDate: new Date('2024-01-01'),
            spyPrice: mockDecimal(400),
            spyShares: mockDecimal(25),
          },
          {
            id: 'deposit-2',
            userId: 'user-1',
            amount: mockDecimal(5000),
            type: 'DEPOSIT',
            depositDate: new Date('2024-03-01'),
            spyPrice: mockDecimal(420),
            spyShares: mockDecimal(11.9048),
          },
        ]

        const mockWithdrawals = [
          {
            id: 'withdrawal-1',
            userId: 'user-1',
            amount: mockDecimal(-3000),
            type: 'WITHDRAWAL',
            depositDate: new Date('2024-05-01'),
            spyPrice: mockDecimal(430),
            spyShares: mockDecimal(-6.9767), // 3000 / 430
          },
        ]

        ;(prisma.cashDeposit.findMany as any)
          .mockResolvedValueOnce(mockDeposits) // deposits
          .mockResolvedValueOnce(mockWithdrawals) // withdrawals

        ;(marketData.getLatestPrice as any).mockResolvedValue({
          ticker: 'SPY',
          price: 440,
          date: new Date('2024-06-01'),
          success: true,
        })

        const metrics = await getBenchmarkMetrics('user-1', 'SPY')

        expect(metrics).toBeDefined()
        expect(metrics?.initialCapital).toBe(12000) // 15000 - 3000
        expect(metrics?.shares).toBeCloseTo(29.9281, 4) // 25 + 11.9048 - 6.9767
        expect(metrics?.currentValue).toBeCloseTo(13168.36, 2) // 29.9281 * 440
        expect(metrics?.gainLoss).toBeCloseTo(1168.36, 2) // 13168.36 - 12000
      })

      it('should fall back to legacy calculation when no deposits exist', async () => {
        ;(prisma.marketBenchmark.findUnique as any).mockResolvedValue(
          mockBenchmark
        )

        ;(prisma.cashDeposit.findMany as any)
          .mockResolvedValueOnce([]) // deposits
          .mockResolvedValueOnce([]) // withdrawals

        ;(marketData.getLatestPrice as any).mockResolvedValue({
          ticker: 'SPY',
          price: 420,
          date: new Date('2024-06-01'),
          success: true,
        })

        const metrics = await getBenchmarkMetrics('user-1', 'SPY')

        // Should use legacy benchmark values
        expect(metrics).toEqual({
          ticker: 'SPY',
          initialCapital: 10000,
          setupDate: new Date('2024-01-01'),
          initialPrice: 400,
          shares: 25,
          currentPrice: 420,
          currentValue: 10500,
          gainLoss: 500,
          returnPercent: 5,
          lastUpdated: new Date('2024-06-01'),
        })
      })
    })
  })

  describe('getAllBenchmarkMetrics', () => {
    const mockBenchmarks = [
      {
        id: 'test-1',
        userId: 'user-1',
        ticker: 'SPY',
        initialCapital: mockDecimal(10000),
        setupDate: new Date('2024-01-01'),
        initialPrice: mockDecimal(400),
        shares: mockDecimal(25),
        lastUpdated: new Date('2024-06-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
      },
      {
        id: 'test-2',
        userId: 'user-1',
        ticker: 'QQQ',
        initialCapital: mockDecimal(5000),
        setupDate: new Date('2024-01-01'),
        initialPrice: mockDecimal(350),
        shares: mockDecimal(14.2857),
        lastUpdated: new Date('2024-06-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
      },
    ]

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should get all benchmarks', async () => {
      ;(prisma.marketBenchmark.findMany as any).mockResolvedValue(
        mockBenchmarks      )

      ;(marketData.getLatestPrice as any)
        .mockResolvedValueOnce({
          ticker: 'SPY',
          price: 420,
          date: new Date('2024-06-01'),
          success: true,
        })
        .mockResolvedValueOnce({
          ticker: 'QQQ',
          price: 360,
          date: new Date('2024-06-01'),
          success: true,
        })

      ;(prisma.marketBenchmark.findUnique as any)
        .mockResolvedValueOnce(mockBenchmarks[0] as any)
        .mockResolvedValueOnce(mockBenchmarks[1] as any)

      const metrics = await getAllBenchmarkMetrics('user-1')

      expect(metrics).toHaveLength(2)
      expect(metrics[0].ticker).toBe('SPY')
      expect(metrics[1].ticker).toBe('QQQ')
    })

    it('should skip benchmarks with errors', async () => {
      ;(prisma.marketBenchmark.findMany as any).mockResolvedValue(
        mockBenchmarks      )

      ;(prisma.marketBenchmark.findUnique as any)
        .mockResolvedValueOnce(mockBenchmarks[0] as any)
        .mockResolvedValueOnce(mockBenchmarks[1] as any)

      ;(marketData.getLatestPrice as any)
        .mockResolvedValueOnce({
          ticker: 'SPY',
          price: 420,
          date: new Date('2024-06-01'),
          success: true,
        })
        .mockResolvedValueOnce({
          ticker: 'QQQ',
          price: 0,
          date: new Date(),
          success: false,
          error: 'API error',
        })

      const metrics = await getAllBenchmarkMetrics('user-1')

      expect(metrics).toHaveLength(1)
      expect(metrics[0].ticker).toBe('SPY')
    })

    it('should return empty array when no benchmarks', async () => {
      ;(prisma.marketBenchmark.findMany as any).mockResolvedValue([])

      const metrics = await getAllBenchmarkMetrics('user-1')

      expect(metrics).toEqual([])
    })
  })

  describe('compareToBenchmark', () => {
    const mockPortfolioStats = {
      capitalDeployed: 15000,
      totalPnL: 1500,
      realizedPnL: 800,
      unrealizedPnL: 700,
      returnPercent: 10,
      premiumCollected: 2000,
      winRate: 75,
      assignmentRate: 30,
      totalTrades: 20,
      closedPositions: 5,
      openPositions: 3,
      currentValue: 16500,
    }

    const mockBenchmarkMetrics = {
      ticker: 'SPY',
      initialCapital: 10000,
      setupDate: new Date('2024-01-01'),
      initialPrice: 400,
      shares: 25,
      currentPrice: 420,
      currentValue: 10500,
      gainLoss: 500,
      returnPercent: 5,
      lastUpdated: new Date('2024-06-01'),
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should compare wheel to benchmark correctly', async () => {
      ;(profitLoss.calculatePortfolioStats as any).mockResolvedValue(
        mockPortfolioStats
      )

      ;(prisma.marketBenchmark.findUnique as any).mockResolvedValue({
        id: 'test-id',
        userId: 'user-1',
        ticker: 'SPY',
        initialCapital: mockDecimal(10000),
        setupDate: new Date('2024-01-01'),
        initialPrice: mockDecimal(400),
        shares: mockDecimal(25),
        lastUpdated: new Date('2024-06-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
      } as any)

      ;(marketData.getLatestPrice as any).mockResolvedValue({
        ticker: 'SPY',
        price: 420,
        date: new Date('2024-06-01'),
        success: true,
      })

      const comparison = await compareToBenchmark('user-1', 'SPY')

      expect(comparison).toEqual({
        wheelStrategy: {
          totalPnL: 1500,
          returnPercent: 10,
          capitalDeployed: 15000,
        },
        benchmark: mockBenchmarkMetrics,
        difference: {
          pnlDifference: 1000, // 1500 - 500
          returnDifference: 5, // 10 - 5
          outperforming: true,
        },
      })
    })

    it('should show wheel underperforming', async () => {
      const underperformingStats = {
        ...mockPortfolioStats,
        totalPnL: 200,
        returnPercent: 2,
      }

      ;(profitLoss.calculatePortfolioStats as any).mockResolvedValue(
        underperformingStats
      )

      ;(prisma.marketBenchmark.findUnique as any).mockResolvedValue({
        id: 'test-id',
        userId: 'user-1',
        ticker: 'SPY',
        initialCapital: mockDecimal(10000),
        setupDate: new Date('2024-01-01'),
        initialPrice: mockDecimal(400),
        shares: mockDecimal(25),
        lastUpdated: new Date('2024-06-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
      } as any)

      ;(marketData.getLatestPrice as any).mockResolvedValue({
        ticker: 'SPY',
        price: 420,
        date: new Date('2024-06-01'),
        success: true,
      })

      const comparison = await compareToBenchmark('user-1', 'SPY')

      expect(comparison?.difference.outperforming).toBe(false)
      expect(comparison?.difference.returnDifference).toBe(-3) // 2 - 5
    })

    it('should return null for non-existent benchmark', async () => {
      ;(profitLoss.calculatePortfolioStats as any).mockResolvedValue(
        mockPortfolioStats
      )

      ;(prisma.marketBenchmark.findUnique as any).mockResolvedValue(null)

      const comparison = await compareToBenchmark('user-1', 'SPY')

      expect(comparison).toBeNull()
    })
  })

  describe('compareToAllBenchmarks', () => {
    const mockPortfolioStats = {
      capitalDeployed: 15000,
      totalPnL: 1500,
      realizedPnL: 800,
      unrealizedPnL: 700,
      returnPercent: 10,
      premiumCollected: 2000,
      winRate: 75,
      assignmentRate: 30,
      totalTrades: 20,
      closedPositions: 5,
      openPositions: 3,
      currentValue: 16500,
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should compare to all benchmarks', async () => {
      ;(profitLoss.calculatePortfolioStats as any).mockResolvedValue(
        mockPortfolioStats
      )

      ;(prisma.marketBenchmark.findMany as any).mockResolvedValue([
        {
          id: 'test-1',
          userId: 'user-1',
          ticker: 'SPY',
          initialCapital: mockDecimal(10000),
          setupDate: new Date('2024-01-01'),
          initialPrice: mockDecimal(400),
          shares: mockDecimal(25),
          lastUpdated: new Date('2024-06-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-06-01'),
        },
        {
          id: 'test-2',
          userId: 'user-1',
          ticker: 'QQQ',
          initialCapital: mockDecimal(5000),
          setupDate: new Date('2024-01-01'),
          initialPrice: mockDecimal(350),
          shares: mockDecimal(14.2857),
          lastUpdated: new Date('2024-06-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-06-01'),
        },
      ] as any)

      ;(prisma.marketBenchmark.findUnique as any)
        .mockResolvedValueOnce({
          id: 'test-1',
          userId: 'user-1',
          ticker: 'SPY',
          initialCapital: mockDecimal(10000),
          setupDate: new Date('2024-01-01'),
          initialPrice: mockDecimal(400),
          shares: mockDecimal(25),
          lastUpdated: new Date('2024-06-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-06-01'),
        } as any)
        .mockResolvedValueOnce({
          id: 'test-2',
          userId: 'user-1',
          ticker: 'QQQ',
          initialCapital: mockDecimal(5000),
          setupDate: new Date('2024-01-01'),
          initialPrice: mockDecimal(350),
          shares: mockDecimal(14.2857),
          lastUpdated: new Date('2024-06-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-06-01'),
        } as any)

      ;(marketData.getLatestPrice as any)
        .mockResolvedValueOnce({
          ticker: 'SPY',
          price: 420,
          date: new Date('2024-06-01'),
          success: true,
        })
        .mockResolvedValueOnce({
          ticker: 'QQQ',
          price: 385,
          date: new Date('2024-06-01'),
          success: true,
        })

      const comparison = await compareToAllBenchmarks('user-1')

      expect(comparison.wheelStrategy.totalPnL).toBe(1500)
      expect(comparison.benchmarks).toHaveLength(2)
      expect(comparison.bestBenchmark?.ticker).toBe('QQQ')
      expect(comparison.worstBenchmark?.ticker).toBe('SPY')
    })

    it('should handle no benchmarks', async () => {
      ;(profitLoss.calculatePortfolioStats as any).mockResolvedValue(
        mockPortfolioStats
      )

      ;(prisma.marketBenchmark.findMany as any).mockResolvedValue([])

      const comparison = await compareToAllBenchmarks('user-1')

      expect(comparison.benchmarks).toEqual([])
      expect(comparison.bestBenchmark).toBeNull()
      expect(comparison.worstBenchmark).toBeNull()
    })
  })
})

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { setupBenchmark, deleteBenchmark } from './benchmarks'

let testUserId: string

// Mock the market data service
vi.mock('@/lib/services/market-data', () => ({
  fetchStockPrice: vi.fn().mockResolvedValue({
    ticker: 'SPY',
    price: 450.0,
    date: new Date(),
    source: 'test',
  }),
}))

describe('Benchmark Server Actions Integration Tests', () => {
  beforeAll(async () => {
    // Clean up and create test user
    await prisma.marketBenchmark.deleteMany()
    await prisma.user.deleteMany({ where: { email: 'test-benchmark@example.com' } })

    const user = await prisma.user.create({
      data: {
        email: 'test-benchmark@example.com',
        name: 'Benchmark Test User',
      },
    })
    testUserId = user.id
  })

  afterAll(async () => {
    await prisma.marketBenchmark.deleteMany({ where: { userId: testUserId } })
    await prisma.user.deleteMany({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.marketBenchmark.deleteMany({ where: { userId: testUserId } })
  })

  describe('setupBenchmark', () => {
    it('should create a new benchmark successfully', async () => {
      const result = await setupBenchmark({
        ticker: 'SPY',
        initialCapital: 10000,
        setupDate: new Date(),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ticker).toBe('SPY')
      }

      // Verify in database
      const benchmark = await prisma.marketBenchmark.findFirst({
        where: { userId: testUserId, ticker: 'SPY' },
      })

      expect(benchmark).toBeDefined()
      expect(Number(benchmark?.initialCapital)).toBe(10000)
    })

    it('should reject duplicate benchmark', async () => {
      // Create first benchmark
      await setupBenchmark({
        ticker: 'SPY',
        initialCapital: 10000,
        setupDate: new Date(),
      })

      // Try to create duplicate
      const result = await setupBenchmark({
        ticker: 'SPY',
        initialCapital: 20000,
        setupDate: new Date(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('already exists')
      }
    })

    it('should reject negative initial capital', async () => {
      const result = await setupBenchmark({
        ticker: 'SPY',
        initialCapital: -1000,
        setupDate: new Date(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })
  })

  describe('deleteBenchmark', () => {
    it('should delete a benchmark', async () => {
      // Create benchmark
      await setupBenchmark({
        ticker: 'SPY',
        initialCapital: 10000,
        setupDate: new Date(),
      })

      // Delete benchmark
      const result = await deleteBenchmark({
        ticker: 'SPY',
      })

      expect(result.success).toBe(true)

      // Verify deletion
      const benchmark = await prisma.marketBenchmark.findFirst({
        where: { userId: testUserId, ticker: 'SPY' },
      })

      expect(benchmark).toBeNull()
    })

    it('should handle deleting non-existent benchmark', async () => {
      const result = await deleteBenchmark({
        ticker: 'QQQ' as const,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })
  })
})

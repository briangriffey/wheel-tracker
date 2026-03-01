import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'
import type { User, StockPrice, Position } from '@/lib/generated/prisma'
import { getCurrentUserId } from '@/lib/auth'
import {
  getLatestPrice,
  getLatestPrices,
  refreshPositionPrices,
  refreshSinglePositionPrice,
} from '../prices'

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    stockPrice: {
      findUnique: vi.fn(),
    },
    position: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock Next.js cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock market utils
vi.mock('@/lib/utils/market', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    canRefreshPrice: vi.fn().mockReturnValue({
      canRefresh: false,
      lastUpdated: new Date(),
      nextRefreshAt: null,
      reason: 'Recently updated',
    }),
  }
})

describe('Price Actions', () => {
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
    onboardingCompletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return mock user ID
    vi.mocked(getCurrentUserId).mockResolvedValue('user1')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getLatestPrice', () => {
    it('should return the latest price for a ticker', async () => {
      const mockPrice: StockPrice = {
        id: 'price1',
        ticker: 'AAPL',
        price: new Prisma.Decimal(155.5),
        updatedAt: new Date('2026-02-07T14:00:00Z'),
        source: 'financial_data',
        createdAt: new Date(),
      }

      vi.mocked(prisma.stockPrice.findUnique).mockResolvedValue(mockPrice)

      const result = await getLatestPrice('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ticker).toBe('AAPL')
        expect(result.data.price).toBe(155.5)
        expect(result.data.source).toBe('financial_data')
      }

      expect(prisma.stockPrice.findUnique).toHaveBeenCalledWith({
        where: { ticker: 'AAPL' },
      })
    })

    it('should normalize ticker to uppercase', async () => {
      const mockPrice: StockPrice = {
        id: 'price1',
        ticker: 'AAPL',
        price: new Prisma.Decimal(155.5),
        updatedAt: new Date('2026-02-07T14:00:00Z'),
        source: 'financial_data',
        createdAt: new Date(),
      }

      vi.mocked(prisma.stockPrice.findUnique).mockResolvedValue(mockPrice)

      await getLatestPrice('aapl')

      expect(prisma.stockPrice.findUnique).toHaveBeenCalledWith({
        where: { ticker: 'AAPL' },
      })
    })

    it('should include refresh eligibility info', async () => {
      const { canRefreshPrice } = await import('@/lib/utils/market')
      vi.mocked(canRefreshPrice).mockReturnValue({
        canRefresh: true,
        lastUpdated: new Date(),
        nextRefreshAt: null,
        reason: 'Price is older than 4 hours',
      })

      const twoHoursAgo = new Date()
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)

      const mockPrice: StockPrice = {
        id: 'price1',
        ticker: 'AAPL',
        price: new Prisma.Decimal(155.5),
        updatedAt: twoHoursAgo,
        source: 'financial_data',
        createdAt: new Date(),
      }

      vi.mocked(prisma.stockPrice.findUnique).mockResolvedValue(mockPrice)

      const result = await getLatestPrice('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.canRefresh).toBe(true)
        expect(result.data.refreshReason).toBe('Price is older than 4 hours')
      }
    })

    it('should report canRefresh=false when recently updated', async () => {
      const { canRefreshPrice } = await import('@/lib/utils/market')
      const nextRefresh = new Date(Date.now() + 2 * 60 * 60 * 1000)
      vi.mocked(canRefreshPrice).mockReturnValue({
        canRefresh: false,
        lastUpdated: new Date(),
        nextRefreshAt: nextRefresh,
        reason: 'Recently updated during market hours',
      })

      const thirtyMinutesAgo = new Date()
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)

      const mockPrice: StockPrice = {
        id: 'price1',
        ticker: 'AAPL',
        price: new Prisma.Decimal(155.5),
        updatedAt: thirtyMinutesAgo,
        source: 'financial_data',
        createdAt: new Date(),
      }

      vi.mocked(prisma.stockPrice.findUnique).mockResolvedValue(mockPrice)

      const result = await getLatestPrice('AAPL')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.canRefresh).toBe(false)
        expect(result.data.nextRefreshAt).toEqual(nextRefresh)
      }
    })

    it('should return error if no price found', async () => {
      vi.mocked(prisma.stockPrice.findUnique).mockResolvedValue(null)

      const result = await getLatestPrice('UNKNOWN')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('No price data found')
      }
    })

    it('should handle database errors', async () => {
      vi.mocked(prisma.stockPrice.findUnique).mockRejectedValue(
        new Error('Database connection failed')
      )

      const result = await getLatestPrice('AAPL')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database connection failed')
      }
    })
  })

  describe('getLatestPrices', () => {
    it('should return prices for multiple tickers', async () => {
      const mockPriceAAPL = {
        id: 'price1',
        ticker: 'AAPL',
        price: new Prisma.Decimal(155.5),
        updatedAt: new Date('2026-02-07T14:00:00Z'),
        source: 'financial_data',
        createdAt: new Date(),
      }

      const mockPriceTSLA = {
        id: 'price2',
        ticker: 'TSLA',
        price: new Prisma.Decimal(210.75),
        updatedAt: new Date('2026-02-07T14:00:00Z'),
        source: 'financial_data',
        createdAt: new Date(),
      }

      vi.mocked(prisma.stockPrice.findUnique)
        .mockResolvedValueOnce(mockPriceAAPL)
        .mockResolvedValueOnce(mockPriceTSLA)

      const result = await getLatestPrices(['AAPL', 'TSLA'])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(Object.keys(result.data)).toHaveLength(2)
        expect(result.data['AAPL'].price).toBe(155.5)
        expect(result.data['TSLA'].price).toBe(210.75)
      }
    })

    it('should return partial success if some tickers fail', async () => {
      const mockPriceAAPL = {
        id: 'price1',
        ticker: 'AAPL',
        price: new Prisma.Decimal(155.5),
        updatedAt: new Date('2026-02-07T14:00:00Z'),
        source: 'financial_data',
        createdAt: new Date(),
      }

      vi.mocked(prisma.stockPrice.findUnique)
        .mockResolvedValueOnce(mockPriceAAPL)
        .mockResolvedValueOnce(null) // UNKNOWN ticker

      const result = await getLatestPrices(['AAPL', 'UNKNOWN'])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(Object.keys(result.data)).toHaveLength(1)
        expect(result.data['AAPL'].price).toBe(155.5)
      }
    })

    it('should return error if all tickers fail', async () => {
      vi.mocked(prisma.stockPrice.findUnique).mockResolvedValue(null)

      const result = await getLatestPrices(['UNKNOWN1', 'UNKNOWN2'])

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Failed to fetch any prices')
      }
    })
  })

  describe('refreshPositionPrices', () => {
    it('should update all open positions with latest prices', async () => {
      const mockPositions = [
        {
          id: 'pos1',
          ticker: 'AAPL',
          shares: 100,
        },
        {
          id: 'pos2',
          ticker: 'TSLA',
          shares: 50,
        },
      ]

      const mockPriceAAPL = {
        id: 'price1',
        ticker: 'AAPL',
        price: new Prisma.Decimal(155.5),
        updatedAt: new Date('2026-02-07T14:00:00Z'),
        source: 'financial_data',
        createdAt: new Date(),
      }

      const mockPriceTSLA = {
        id: 'price2',
        ticker: 'TSLA',
        price: new Prisma.Decimal(210.75),
        updatedAt: new Date('2026-02-07T14:00:00Z'),
        source: 'financial_data',
        createdAt: new Date(),
      }

      vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as unknown as Position[])
      vi.mocked(prisma.stockPrice.findUnique)
        .mockResolvedValueOnce(mockPriceAAPL)
        .mockResolvedValueOnce(mockPriceTSLA)
      vi.mocked(prisma.position.update).mockResolvedValue({} as unknown as Position)

      const result = await refreshPositionPrices()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.updatedCount).toBe(2)
        expect(result.data.failedTickers).toHaveLength(0)
      }

      expect(prisma.position.update).toHaveBeenCalledTimes(2)
      expect(prisma.position.update).toHaveBeenCalledWith({
        where: { id: 'pos1' },
        data: { currentValue: expect.any(Prisma.Decimal) },
      })
    })

    it('should handle positions with no price data', async () => {
      const mockPositions = [
        {
          id: 'pos1',
          ticker: 'AAPL',
          shares: 100,
        },
        {
          id: 'pos2',
          ticker: 'UNKNOWN',
          shares: 50,
        },
      ]

      const mockPriceAAPL = {
        id: 'price1',
        ticker: 'AAPL',
        price: new Prisma.Decimal(155.5),
        updatedAt: new Date('2026-02-07T14:00:00Z'),
        source: 'financial_data',
        createdAt: new Date(),
      }

      vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as unknown as Position[])
      vi.mocked(prisma.stockPrice.findUnique)
        .mockResolvedValueOnce(mockPriceAAPL)
        .mockResolvedValueOnce(null)
      vi.mocked(prisma.position.update).mockResolvedValue({} as unknown as Position)

      const result = await refreshPositionPrices()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.updatedCount).toBe(1)
        expect(result.data.failedTickers).toContain('UNKNOWN')
      }
    })

    it('should return early if no open positions', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([])

      const result = await refreshPositionPrices()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.updatedCount).toBe(0)
        expect(result.data.failedTickers).toHaveLength(0)
      }

      expect(prisma.stockPrice.findUnique).not.toHaveBeenCalled()
      expect(prisma.position.update).not.toHaveBeenCalled()
    })
  })

  describe('refreshSinglePositionPrice', () => {
    it('should update a single position with latest price', async () => {
      const mockPosition = {
        id: 'pos1',
        userId: 'user1',
        ticker: 'AAPL',
        shares: 100,
        status: 'OPEN',
      }

      const mockPrice = {
        id: 'price1',
        ticker: 'AAPL',
        price: new Prisma.Decimal(155.5),
        updatedAt: new Date('2026-02-07T14:00:00Z'),
        source: 'financial_data',
        createdAt: new Date(),
      }

      vi.mocked(prisma.position.findUnique).mockResolvedValue(mockPosition as unknown as Position)
      vi.mocked(prisma.stockPrice.findUnique).mockResolvedValue(mockPrice)
      vi.mocked(prisma.position.update).mockResolvedValue({} as unknown as Position)

      const result = await refreshSinglePositionPrice('pos1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.currentValue).toBe(15550) // 155.50 * 100
        expect(result.data.priceData.ticker).toBe('AAPL')
      }

      expect(prisma.position.update).toHaveBeenCalledWith({
        where: { id: 'pos1' },
        data: { currentValue: expect.any(Prisma.Decimal) },
      })
    })

    it('should return error if position not found', async () => {
      vi.mocked(prisma.position.findUnique).mockResolvedValue(null)

      const result = await refreshSinglePositionPrice('invalid')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Position not found')
      }
    })

    it('should return error if position is closed', async () => {
      const mockPosition = {
        id: 'pos1',
        userId: 'user1',
        ticker: 'AAPL',
        shares: 100,
        status: 'CLOSED',
      }

      vi.mocked(prisma.position.findUnique).mockResolvedValue(mockPosition as unknown as Position)

      const result = await refreshSinglePositionPrice('pos1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Cannot refresh price for closed position')
      }
    })

    it('should return error if unauthorized', async () => {
      const mockPosition = {
        id: 'pos1',
        userId: 'different-user',
        ticker: 'AAPL',
        shares: 100,
        status: 'OPEN',
      }

      vi.mocked(prisma.position.findUnique).mockResolvedValue(mockPosition as unknown as Position)

      const result = await refreshSinglePositionPrice('pos1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Unauthorized')
      }
    })
  })
})

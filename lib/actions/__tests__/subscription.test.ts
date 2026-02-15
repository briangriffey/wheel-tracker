import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { FREE_TRADE_LIMIT } from '@/lib/constants'
import { getTradeUsage } from '../subscription'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    trade: {
      count: vi.fn(),
    },
  },
}))

// Mock Next.js cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Subscription Actions', () => {
  const mockUserId = 'user1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: null,
      image: null,
      password: null,
      subscriptionTier: 'FREE',
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  })

  describe('getTradeUsage', () => {
    it('should return usage for FREE tier user with no trades', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(0)

      const result = await getTradeUsage()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tradesThisMonth).toBe(0)
        expect(result.data.tradeLimit).toBe(FREE_TRADE_LIMIT)
        expect(result.data.tier).toBe('FREE')
        expect(result.data.remaining).toBe(FREE_TRADE_LIMIT)
        expect(result.data.limitReached).toBe(false)
      }
    })

    it('should count trades in current calendar month', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(5)

      const result = await getTradeUsage()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tradesThisMonth).toBe(5)
        expect(result.data.remaining).toBe(FREE_TRADE_LIMIT - 5)
        expect(result.data.limitReached).toBe(false)
      }

      // Verify the query uses current month boundaries
      expect(prisma.trade.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          createdAt: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
      })
    })

    it('should report limit reached when trades equal FREE_TRADE_LIMIT', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT)

      const result = await getTradeUsage()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tradesThisMonth).toBe(FREE_TRADE_LIMIT)
        expect(result.data.remaining).toBe(0)
        expect(result.data.limitReached).toBe(true)
      }
    })

    it('should report limit reached when trades exceed FREE_TRADE_LIMIT', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT + 3)

      const result = await getTradeUsage()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tradesThisMonth).toBe(FREE_TRADE_LIMIT + 3)
        expect(result.data.remaining).toBe(0)
        expect(result.data.limitReached).toBe(true)
      }
    })

    it('should return unlimited for PRO tier users', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'PRO',
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(50)

      const result = await getTradeUsage()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tradesThisMonth).toBe(50)
        expect(result.data.tradeLimit).toBe(Infinity)
        expect(result.data.tier).toBe('PRO')
        expect(result.data.remaining).toBe(Infinity)
        expect(result.data.limitReached).toBe(false)
      }
    })

    it('should use correct month boundaries', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(0)

      await getTradeUsage()

      const callArgs = vi.mocked(prisma.trade.count).mock.calls[0][0]!
      const where = callArgs.where!
      const createdAt = where.createdAt as { gte: Date; lt: Date }

      // Month start should be day 1 at midnight
      expect(createdAt.gte.getDate()).toBe(1)
      expect(createdAt.gte.getHours()).toBe(0)
      expect(createdAt.gte.getMinutes()).toBe(0)

      // Month end should be day 1 of next month
      expect(createdAt.lt.getDate()).toBe(1)
      expect(createdAt.lt.getMonth()).toBe((createdAt.gte.getMonth() + 1) % 12)
    })

    it('should return error when user not found', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

      const result = await getTradeUsage()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('No user found')
      }
    })

    it('should return error when user record missing after auth', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await getTradeUsage()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('User not found')
      }
    })
  })
})

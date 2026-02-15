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
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      subscriptionEndsAt: null,
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
        expect(result.data.tradesUsed).toBe(0)
        expect(result.data.tradeLimit).toBe(FREE_TRADE_LIMIT)
        expect(result.data.tier).toBe('FREE')
        expect(result.data.remaining).toBe(FREE_TRADE_LIMIT)
        expect(result.data.limitReached).toBe(false)
      }
    })

    it('should count lifetime trades (no date filter)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(5)

      const result = await getTradeUsage()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tradesUsed).toBe(5)
        expect(result.data.remaining).toBe(FREE_TRADE_LIMIT - 5)
        expect(result.data.limitReached).toBe(false)
      }

      // Verify the query counts all trades (no createdAt filter)
      expect(prisma.trade.count).toHaveBeenCalledWith({
        where: { userId: mockUserId },
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
        expect(result.data.tradesUsed).toBe(FREE_TRADE_LIMIT)
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
        expect(result.data.tradesUsed).toBe(FREE_TRADE_LIMIT + 3)
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
        expect(result.data.tradesUsed).toBe(50)
        expect(result.data.tradeLimit).toBe(Infinity)
        expect(result.data.tier).toBe('PRO')
        expect(result.data.remaining).toBe(Infinity)
        expect(result.data.limitReached).toBe(false)
      }
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

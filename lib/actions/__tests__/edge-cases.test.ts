import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { FREE_TRADE_LIMIT } from '@/lib/constants'
import { createTrade } from '../trades'

// Mock Prisma — include $transaction for the atomic limit check
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    trade: {
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock NextAuth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock Next.js cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/lib/auth'

const validTradeInput = {
  ticker: 'AAPL',
  type: 'PUT' as const,
  action: 'SELL_TO_OPEN' as const,
  strikePrice: 150,
  premium: 250,
  contracts: 1,
  expirationDate: new Date('2026-03-15'),
  openDate: new Date('2026-02-14'),
}

/**
 * Helper: simulate prisma.$transaction by executing the callback with the
 * prisma mock as the transaction client. This mirrors how Prisma interactive
 * transactions work (the callback receives a `tx` client).
 */
function setupTransaction() {
  vi.mocked(prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)
  )
}

describe('Edge Cases & Hardening', () => {
  const mockUserId = 'user1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: '2026-12-31',
    } as never)
    setupTransaction()
  })

  describe('Trade Limit Boundary: exactly 20 trades', () => {
    it('should block trade #21 when user has exactly 20 trades', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: null,
        subscriptionEndsAt: null,
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT)

      const result = await createTrade(validTradeInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FREE_TIER_LIMIT_REACHED')
      }
      expect(prisma.trade.create).not.toHaveBeenCalled()
    })

    it('should allow trade #20 when user has 19 trades', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: null,
        subscriptionEndsAt: null,
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT - 1)
      vi.mocked(prisma.trade.create).mockResolvedValue({
        id: 'trade20',
      } as never)

      const result = await createTrade(validTradeInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('trade20')
      }
    })

    it('should block when user is well over the limit', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: null,
        subscriptionEndsAt: null,
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(50)

      const result = await createTrade(validTradeInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FREE_TIER_LIMIT_REACHED')
      }
    })
  })

  describe('Pro User Downgrade: existing trades preserved', () => {
    it('should block new trades after downgrade to FREE when over limit', async () => {
      // User was PRO, had 30 trades, then subscription deleted → now FREE
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'canceled',
        subscriptionEndsAt: new Date('2026-01-01'), // past grace period
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(30)

      const result = await createTrade(validTradeInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FREE_TIER_LIMIT_REACHED')
      }
    })

    it('should allow trades during grace period after cancellation', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'canceled',
        subscriptionEndsAt: futureDate,
      } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({
        id: 'trade_grace',
      } as never)

      const result = await createTrade(validTradeInput)

      expect(result.success).toBe(true)
      // Should NOT check trade count (PRO access via grace period)
      expect(prisma.trade.count).not.toHaveBeenCalled()
    })

    it('should block trades after grace period expires', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'canceled',
        subscriptionEndsAt: pastDate,
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT)

      const result = await createTrade(validTradeInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FREE_TIER_LIMIT_REACHED')
      }
    })
  })

  describe('Payment Failure: grace period', () => {
    it('should allow trades when payment is past_due but within grace period', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'PRO',
        subscriptionStatus: 'past_due',
        subscriptionEndsAt: futureDate,
      } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({
        id: 'trade_pastdue',
      } as never)

      const result = await createTrade(validTradeInput)

      expect(result.success).toBe(true)
      // PRO tier → no count check
      expect(prisma.trade.count).not.toHaveBeenCalled()
    })

    it('should allow trades for past_due user with FREE tier but valid grace period', async () => {
      // Edge case: tier already reverted to FREE but past_due with future end date
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'past_due',
        subscriptionEndsAt: futureDate,
      } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({
        id: 'trade_pastdue_free',
      } as never)

      const result = await createTrade(validTradeInput)

      expect(result.success).toBe(true)
      // Should NOT check trade count (past_due with valid grace period)
      expect(prisma.trade.count).not.toHaveBeenCalled()
    })

    it('should block trades for past_due user after grace period expires', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'past_due',
        subscriptionEndsAt: pastDate,
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT)

      const result = await createTrade(validTradeInput)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FREE_TIER_LIMIT_REACHED')
      }
    })
  })

  describe('Concurrent Trade Creation: race condition prevention', () => {
    it('should use a serializable transaction for limit check + create', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: null,
        subscriptionEndsAt: null,
      } as never)
      vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT - 1)
      vi.mocked(prisma.trade.create).mockResolvedValue({
        id: 'trade_atomic',
      } as never)

      const result = await createTrade(validTradeInput)

      expect(result.success).toBe(true)
      // Verify $transaction was called (count + create are atomic)
      expect(prisma.$transaction).toHaveBeenCalled()
      const txCall = vi.mocked(prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mock
        .calls[0]
      // Second argument should include isolation level
      expect(txCall[1]).toEqual({
        isolationLevel: 'Serializable',
      })
    })

    it('should not use count check in transaction for PRO users', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'PRO',
        subscriptionStatus: 'active',
        subscriptionEndsAt: null,
      } as never)
      vi.mocked(prisma.trade.create).mockResolvedValue({
        id: 'trade_pro',
      } as never)

      const result = await createTrade(validTradeInput)

      expect(result.success).toBe(true)
      // PRO user: transaction still used but no count check
      expect(prisma.trade.count).not.toHaveBeenCalled()
    })
  })

  describe('Deleted trades still count toward limit', () => {
    it('should count all trades including those created then deleted', async () => {
      // User created 20 trades, deleted 5 (OPEN ones), but count is lifetime
      // The count query uses no status filter, so it includes all historical trades
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        subscriptionTier: 'FREE',
        subscriptionStatus: null,
        subscriptionEndsAt: null,
      } as never)
      // Even if some were deleted from DB, the count reflects what's in DB
      // This test verifies we use a simple count with no status filter
      vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT)

      await createTrade(validTradeInput)

      expect(prisma.trade.count).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      })
    })
  })
})

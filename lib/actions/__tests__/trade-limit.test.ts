import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { FREE_TRADE_LIMIT } from '@/lib/constants'
import { createTrade } from '../trades'

// Mock Prisma
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

// Mock analytics
vi.mock('@/lib/analytics-server', () => ({
  recordAnalyticsEvent: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { recordAnalyticsEvent } from '@/lib/analytics-server'

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

describe('Trade Limit Enforcement', () => {
  const mockUserId = 'user1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: '2026-12-31',
    } as never)
    // Simulate $transaction by executing the callback with the prisma mock
    vi.mocked(prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)
    )
  })

  it('should allow trade creation for FREE user under limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'FREE',
    } as never)
    vi.mocked(prisma.trade.count).mockResolvedValue(5)
    vi.mocked(prisma.trade.create).mockResolvedValue({
      id: 'trade1',
    } as never)

    const result = await createTrade(validTradeInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('trade1')
    }
  })

  it('should block trade creation for FREE user at limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'FREE',
    } as never)
    vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT)

    const result = await createTrade(validTradeInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FREE_TIER_LIMIT_REACHED')
    }
    // Should not attempt to create the trade
    expect(prisma.trade.create).not.toHaveBeenCalled()
  })

  it('should block trade creation for FREE user over limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'FREE',
    } as never)
    vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT + 5)

    const result = await createTrade(validTradeInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FREE_TIER_LIMIT_REACHED')
    }
    expect(prisma.trade.create).not.toHaveBeenCalled()
  })

  it('should allow unlimited trades for PRO user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'PRO',
    } as never)
    vi.mocked(prisma.trade.create).mockResolvedValue({
      id: 'trade1',
    } as never)

    const result = await createTrade(validTradeInput)

    expect(result.success).toBe(true)
    // Should not check trade count for PRO users
    expect(prisma.trade.count).not.toHaveBeenCalled()
  })

  it('should allow FREE user to create trade at exactly limit minus 1', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'FREE',
    } as never)
    vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT - 1)
    vi.mocked(prisma.trade.create).mockResolvedValue({
      id: 'trade1',
    } as never)

    const result = await createTrade(validTradeInput)

    expect(result.success).toBe(true)
  })

  it('should return unauthorized for unauthenticated users', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)

    const result = await createTrade(validTradeInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Unauthorized')
    }
  })

  it('should record trade_limit_reached analytics event when limit hit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'FREE',
    } as never)
    vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT)

    await createTrade(validTradeInput)

    expect(recordAnalyticsEvent).toHaveBeenCalledWith('trade_limit_reached', mockUserId, {
      tradesUsed: FREE_TRADE_LIMIT,
      limit: FREE_TRADE_LIMIT,
    })
  })

  it('should not record analytics event when under limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'FREE',
    } as never)
    vi.mocked(prisma.trade.count).mockResolvedValue(5)
    vi.mocked(prisma.trade.create).mockResolvedValue({
      id: 'trade1',
    } as never)

    await createTrade(validTradeInput)

    expect(recordAnalyticsEvent).not.toHaveBeenCalled()
  })

  it('should count all trades for the user (lifetime, not monthly)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'FREE',
    } as never)
    vi.mocked(prisma.trade.count).mockResolvedValue(FREE_TRADE_LIMIT)

    await createTrade(validTradeInput)

    // Verify the count query uses only userId (no date filter)
    expect(prisma.trade.count).toHaveBeenCalledWith({
      where: { userId: mockUserId },
    })
  })
})

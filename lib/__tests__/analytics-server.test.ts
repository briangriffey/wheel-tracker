import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    analyticsEvent: {
      create: vi.fn(),
      count: vi.fn(),
    },
    webhookLog: {
      count: vi.fn(),
    },
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/constants', () => ({
  FREE_TRADE_LIMIT: 20,
}))

import { prisma } from '@/lib/db'
import {
  recordAnalyticsEvent,
  getConversionFunnelMetrics,
  getWebhookHealthMetrics,
} from '../analytics-server'

describe('Analytics Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('recordAnalyticsEvent', () => {
    it('records an event with properties', async () => {
      vi.mocked(prisma.analyticsEvent.create).mockResolvedValue({} as never)

      await recordAnalyticsEvent('trade_limit_reached', 'user1', {
        tradesUsed: 20,
        limit: 20,
      })

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          event: 'trade_limit_reached',
          userId: 'user1',
          properties: JSON.stringify({ tradesUsed: 20, limit: 20 }),
          timestamp: expect.any(Date),
        },
      })
    })

    it('records an event without properties', async () => {
      vi.mocked(prisma.analyticsEvent.create).mockResolvedValue({} as never)

      await recordAnalyticsEvent('subscription_activated', 'user1')

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          event: 'subscription_activated',
          userId: 'user1',
          properties: null,
          timestamp: expect.any(Date),
        },
      })
    })

    it('does not throw on database errors', async () => {
      vi.mocked(prisma.analyticsEvent.create).mockRejectedValue(new Error('DB connection lost'))

      // Should not throw
      await expect(recordAnalyticsEvent('checkout_started', 'user1')).resolves.toBeUndefined()
    })
  })

  describe('getConversionFunnelMetrics', () => {
    it('returns funnel counts and conversion rates', async () => {
      vi.mocked(prisma.analyticsEvent.count)
        .mockResolvedValueOnce(100 as never) // trade_limit_reached
        .mockResolvedValueOnce(80 as never) // upgrade_prompt_shown
        .mockResolvedValueOnce(20 as never) // checkout_started
        .mockResolvedValueOnce(15 as never) // subscription_activated

      const result = await getConversionFunnelMetrics(30)

      expect(result.period).toBe('30d')
      expect(result.funnel.trade_limit_reached).toBe(100)
      expect(result.funnel.upgrade_prompt_shown).toBe(80)
      expect(result.funnel.checkout_started).toBe(20)
      expect(result.funnel.subscription_activated).toBe(15)

      expect(result.conversionRates.limitToPrompt).toBe(0.8)
      expect(result.conversionRates.promptToCheckout).toBe(0.25)
      expect(result.conversionRates.checkoutToActivated).toBe(0.75)
      expect(result.conversionRates.overallConversion).toBe(0.15)
    })

    it('handles zero counts gracefully', async () => {
      vi.mocked(prisma.analyticsEvent.count).mockResolvedValue(0 as never)

      const result = await getConversionFunnelMetrics(30)

      expect(result.conversionRates.limitToPrompt).toBe(0)
      expect(result.conversionRates.overallConversion).toBe(0)
    })
  })

  describe('getWebhookHealthMetrics', () => {
    it('returns health metrics with success rate', async () => {
      vi.mocked(prisma.webhookLog.count)
        .mockResolvedValueOnce(100 as never) // total
        .mockResolvedValueOnce(2 as never) // failures

      const result = await getWebhookHealthMetrics(7)

      expect(result.period).toBe('7d')
      expect(result.totalProcessed).toBe(100)
      expect(result.failures).toBe(2)
      expect(result.successRate).toBe(0.98)
    })

    it('returns 100% success rate when no webhooks processed', async () => {
      vi.mocked(prisma.webhookLog.count).mockResolvedValue(0 as never)

      const result = await getWebhookHealthMetrics(7)

      expect(result.successRate).toBe(1)
    })
  })
})

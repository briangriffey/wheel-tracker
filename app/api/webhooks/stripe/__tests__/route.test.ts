import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
}))

function makeRequest(body: string): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: {
      'stripe-signature': 'sig_test_123',
    },
  })
}

/** Helper to create a mock subscription with items containing period data */
function mockSubscription(periodStart: number, periodEnd: number) {
  return {
    items: {
      data: [{
        current_period_start: periodStart,
        current_period_end: periodEnd,
      }],
    },
  }
}

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 for invalid signature', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const response = await POST(makeRequest('{}'))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid signature')
  })

  describe('checkout.session.completed', () => {
    it('should activate subscription on successful checkout', async () => {
      const now = Math.floor(Date.now() / 1000)
      const periodEnd = now + 30 * 86400

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_123' },
            customer: 'cus_123',
            subscription: 'sub_123',
          },
        },
      } as never)

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
        mockSubscription(now, periodEnd) as never
      )

      vi.mocked(prisma.user.update).mockResolvedValue({} as never)

      const response = await POST(makeRequest('{}'))

      expect(response.status).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: expect.objectContaining({
          subscriptionTier: 'PRO',
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          subscriptionStatus: 'active',
        }),
      })
    })
  })

  describe('invoice.payment_succeeded', () => {
    it('should extend billing period on payment success', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            customer: 'cus_123',
            parent: {
              subscription_details: {
                subscription: 'sub_123',
              },
            },
          },
        },
      } as never)

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
        mockSubscription(Math.floor(Date.now() / 1000), periodEnd) as never
      )

      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 })

      const response = await POST(makeRequest('{}'))

      expect(response.status).toBe(200)
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_123' },
        data: {
          subscriptionStatus: 'active',
          subscriptionEndsAt: new Date(periodEnd * 1000),
        },
      })
    })
  })

  describe('invoice.payment_failed', () => {
    it('should set status to past_due on payment failure', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_123',
          },
        },
      } as never)

      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 })

      const response = await POST(makeRequest('{}'))

      expect(response.status).toBe(200)
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_123' },
        data: {
          subscriptionStatus: 'past_due',
        },
      })
    })
  })

  describe('customer.subscription.updated', () => {
    it('should sync subscription status on update', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_123',
            status: 'active',
            items: {
              data: [{
                current_period_end: periodEnd,
              }],
            },
          },
        },
      } as never)

      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 })

      const response = await POST(makeRequest('{}'))

      expect(response.status).toBe(200)
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_123' },
        data: {
          subscriptionStatus: 'active',
          subscriptionEndsAt: new Date(periodEnd * 1000),
        },
      })
    })
  })

  describe('customer.subscription.deleted', () => {
    it('should revert user to free tier on subscription deletion', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_123',
          },
        },
      } as never)

      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 })

      const response = await POST(makeRequest('{}'))

      expect(response.status).toBe(200)
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_123' },
        data: expect.objectContaining({
          subscriptionTier: 'FREE',
          subscriptionStatus: null,
          stripeSubscriptionId: null,
          subscriptionEndsAt: null,
        }),
      })
    })
  })

  it('should acknowledge unhandled event types', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'payment_intent.created',
      data: { object: {} },
    } as never)

    const response = await POST(makeRequest('{}'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.received).toBe(true)
  })
})

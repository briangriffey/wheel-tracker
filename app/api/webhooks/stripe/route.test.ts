import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock Stripe
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

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'

/**
 * Helper to build a mock subscription retrieve result with items-level period end.
 * In Stripe API 2026-01-28.clover, current_period_end is on SubscriptionItem.
 */
function mockSubscriptionWithPeriodEnd(periodEnd: number) {
  return {
    items: { data: [{ current_period_end: periodEnd }] },
  } as unknown as Awaited<ReturnType<typeof stripe.subscriptions.retrieve>>
}

/**
 * Helper to build a mock invoice event object.
 * In Stripe API 2026-01-28.clover, subscription is under parent.subscription_details.
 */
function mockInvoiceObject(opts: {
  subscriptionId?: string | null
  customerId: string
}) {
  return {
    parent: opts.subscriptionId
      ? {
          subscription_details: { subscription: opts.subscriptionId },
        }
      : null,
    customer: opts.customerId,
  }
}

describe('Stripe Webhook Handler', () => {
  const mockWebhookSecret = 'whsec_test_secret'
  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = mockWebhookSecret
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Default: no duplicate events (idempotency check passes)
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({} as never)
  })

  afterEach(() => {
    if (originalWebhookSecret) {
      process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret
    } else {
      delete process.env.STRIPE_WEBHOOK_SECRET
    }
    vi.restoreAllMocks()
  })

  function makeRequest(body: string = '{}', signature: string | null = 'sig_test') {
    const headers: Record<string, string> = {}
    if (signature) {
      headers['stripe-signature'] = signature
    }
    return new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body,
      headers,
    })
  }

  describe('Signature Verification', () => {
    it('should reject requests without stripe-signature header', async () => {
      const request = makeRequest('{}', null)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing stripe-signature header')
    })

    it('should reject requests with invalid signature', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const request = makeRequest('{}', 'invalid_sig')

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid signature')
    })

    it('should return 500 if STRIPE_WEBHOOK_SECRET is not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET

      const request = makeRequest()

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Webhook secret not configured')
    })

    it('should accept requests with valid signature', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'unknown.event',
        data: { object: {} },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      const request = makeRequest()

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
    })
  })

  describe('checkout.session.completed', () => {
    it('should activate PRO subscription for user', async () => {
      const mockPeriodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_123' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
        mockSubscriptionWithPeriodEnd(mockPeriodEnd)
      )

      vi.mocked(prisma.user.update).mockResolvedValue({} as never)

      const request = makeRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          subscriptionTier: 'PRO',
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          subscriptionStatus: 'active',
          subscriptionStartDate: expect.any(Date),
          subscriptionEndsAt: new Date(mockPeriodEnd * 1000),
        },
      })

      expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123')
    })

    it('should handle missing userId in metadata gracefully', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {},
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(
        '[WEBHOOK] checkout.session.completed: missing userId in metadata'
      )
    })

    it('should handle missing subscription ID gracefully', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_123' },
            subscription: null,
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should handle missing customer ID gracefully', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_123' },
            subscription: 'sub_123',
            customer: null,
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('invoice.payment_succeeded', () => {
    it('should extend billing period for existing user', async () => {
      const mockPeriodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'invoice.payment_succeeded',
        data: {
          object: mockInvoiceObject({
            subscriptionId: 'sub_123',
            customerId: 'cus_123',
          }),
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
        mockSubscriptionWithPeriodEnd(mockPeriodEnd)
      )

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
      } as never)

      vi.mocked(prisma.user.update).mockResolvedValue({} as never)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          subscriptionStatus: 'active',
          subscriptionEndsAt: new Date(mockPeriodEnd * 1000),
        },
      })
    })

    it('should skip non-subscription invoices', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'invoice.payment_succeeded',
        data: {
          object: mockInvoiceObject({
            subscriptionId: null,
            customerId: 'cus_123',
          }),
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should handle user not found gracefully', async () => {
      const mockPeriodEnd = Math.floor(Date.now() / 1000) + 86400

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'invoice.payment_succeeded',
        data: {
          object: mockInvoiceObject({
            subscriptionId: 'sub_123',
            customerId: 'cus_unknown',
          }),
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
        mockSubscriptionWithPeriodEnd(mockPeriodEnd)
      )

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('no user found for customer cus_unknown')
      )
    })
  })

  describe('invoice.payment_failed', () => {
    it('should set subscription status to past_due', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
      } as never)

      vi.mocked(prisma.user.update).mockResolvedValue({} as never)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          subscriptionStatus: 'past_due',
        },
      })
    })

    it('should handle user not found gracefully', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_unknown',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('customer.subscription.updated', () => {
    it('should sync subscription status and period end', async () => {
      const mockPeriodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_123',
            status: 'active',
            items: { data: [{ current_period_end: mockPeriodEnd }] },
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
      } as never)

      vi.mocked(prisma.user.update).mockResolvedValue({} as never)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          subscriptionStatus: 'active',
          subscriptionEndsAt: new Date(mockPeriodEnd * 1000),
        },
      })
    })

    it('should handle past_due status from subscription update', async () => {
      const mockPeriodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_123',
            status: 'past_due',
            items: { data: [{ current_period_end: mockPeriodEnd }] },
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
      } as never)

      vi.mocked(prisma.user.update).mockResolvedValue({} as never)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          subscriptionStatus: 'past_due',
          subscriptionEndsAt: new Date(mockPeriodEnd * 1000),
        },
      })
    })

    it('should handle user not found gracefully', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_unknown',
            status: 'active',
            items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) }] },
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('customer.subscription.deleted', () => {
    it('should revert user to FREE tier with grace period', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
      } as never)

      vi.mocked(prisma.user.update).mockResolvedValue({} as never)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          subscriptionTier: 'FREE',
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
        },
      })
    })

    it('should handle user not found gracefully', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_unknown',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('Unhandled Events', () => {
    it('should return 200 for unhandled event types', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'payment_intent.created',
        data: { object: {} },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      const request = makeRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(console.log).toHaveBeenCalledWith(
        '[WEBHOOK] Unhandled event type: payment_intent.created'
      )
    })
  })

  describe('Webhook Idempotency', () => {
    it('should skip duplicate events and return 200', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_already_processed',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_123' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      // Event already exists in the database
      vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue({
        id: 'evt_already_processed',
        type: 'checkout.session.completed',
        processedAt: new Date(),
      } as never)

      const request = makeRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(data.duplicate).toBe(true)
      // Should NOT process the event
      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled()
    })

    it('should record event ID after successful processing', async () => {
      const mockPeriodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_new_event',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_123' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
        mockSubscriptionWithPeriodEnd(mockPeriodEnd)
      )
      vi.mocked(prisma.user.update).mockResolvedValue({} as never)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
        data: { id: 'evt_new_event', type: 'checkout.session.completed' },
      })
    })

    it('should not record event ID when handler fails', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_failing',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_123' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(stripe.subscriptions.retrieve).mockRejectedValue(
        new Error('Stripe API error')
      )

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(500)
      // Should NOT record the event since processing failed
      expect(prisma.webhookEvent.create).not.toHaveBeenCalled()
    })
  })

  describe('Account Deletion - Subscription Canceled', () => {
    it('should preserve subscriptionEndsAt for grace period on deletion', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_delete',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
      } as never)

      vi.mocked(prisma.user.update).mockResolvedValue({} as never)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify subscriptionEndsAt is NOT cleared (grace period preserved)
      const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0]
      expect(updateCall.data).not.toHaveProperty('subscriptionEndsAt')
      expect(updateCall.data).toEqual({
        subscriptionTier: 'FREE',
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
      })
    })
  })

  describe('Payment Failure Grace Period', () => {
    it('should set past_due without clearing subscription tier', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_payment_fail',
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
      } as never)

      vi.mocked(prisma.user.update).mockResolvedValue({} as never)

      const request = makeRequest()
      const response = await POST(request)

      expect(response.status).toBe(200)

      // Should only set past_due, NOT change the tier
      const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0]
      expect(updateCall.data).toEqual({
        subscriptionStatus: 'past_due',
      })
      expect(updateCall.data).not.toHaveProperty('subscriptionTier')
    })
  })

  describe('Error Handling', () => {
    it('should return 500 when handler throws', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user_123' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(stripe.subscriptions.retrieve).mockRejectedValue(
        new Error('Stripe API error')
      )

      const request = makeRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Webhook handler failed')
      expect(console.error).toHaveBeenCalledWith(
        '[WEBHOOK] Error handling checkout.session.completed:',
        'Stripe API error'
      )
    })

    it('should return 500 when database update throws', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: 'evt_test',
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_123',
          },
        },
      } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
      } as never)

      vi.mocked(prisma.user.update).mockRejectedValue(new Error('Database error'))

      const request = makeRequest()
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Webhook handler failed')
    })
  })
})

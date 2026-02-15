'use server'

import Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { stripe, PLANS } from '@/lib/stripe'
import { auth } from '@/lib/auth'
import { recordAnalyticsEvent } from '@/lib/analytics-server'

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * Create a Stripe Checkout session for subscribing to a plan.
 *
 * Redirects the user to Stripe's hosted checkout page. If the user
 * doesn't have a Stripe customer ID yet, one is created automatically
 * by Stripe during checkout.
 */
export async function createCheckoutSession(
  plan: 'monthly' | 'annual'
): Promise<ActionResult<{ url: string }>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, stripeCustomerId: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const planConfig = PLANS[plan]

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      metadata: {
        userId,
      },
      allow_promotion_codes: true,
    }

    // If user already has a Stripe customer, reuse it
    if (user.stripeCustomerId) {
      sessionParams.customer = user.stripeCustomerId
    } else {
      sessionParams.customer_email = user.email
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    if (!session.url) {
      return { success: false, error: 'Failed to create checkout session' }
    }

    recordAnalyticsEvent('checkout_started', userId, { plan, interval: planConfig.interval })

    return { success: true, data: { url: session.url } }
  } catch (error) {
    console.error('Error creating checkout session:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to create checkout session' }
  }
}

/**
 * Create a Stripe Customer Portal session for managing an existing subscription.
 *
 * Allows users to update payment methods, change plans, view invoices,
 * and cancel their subscription through Stripe's hosted portal.
 */
export async function createPortalSession(): Promise<ActionResult<{ url: string }>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    if (!user?.stripeCustomerId) {
      return { success: false, error: 'No billing account found. Please subscribe first.' }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/billing`,
    })

    return { success: true, data: { url: session.url } }
  } catch (error) {
    console.error('Error creating portal session:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to create billing portal session' }
  }
}

export interface SubscriptionInfo {
  tier: 'FREE' | 'PRO'
  status: string | null
  currentPeriodEnd: Date | null
  stripeCustomerId: string | null
}

/**
 * Get the current user's subscription status.
 */
export async function getSubscriptionStatus(): Promise<ActionResult<SubscriptionInfo>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    return {
      success: true,
      data: {
        tier: user.subscriptionTier,
        status: user.subscriptionStatus,
        currentPeriodEnd: user.subscriptionEndsAt,
        stripeCustomerId: user.stripeCustomerId,
      },
    }
  } catch (error) {
    console.error('Error getting subscription status:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to get subscription status' }
  }
}

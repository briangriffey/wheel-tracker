import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { recordAnalyticsEvent } from '@/lib/analytics-server'

/**
 * Extract current_period_end from a subscription.
 * In Stripe API 2026-01-28.clover, this field moved from Subscription to SubscriptionItem.
 */
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const item = subscription.items?.data?.[0]
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000)
  }
  return null
}

/**
 * Extract the subscription ID from an Invoice.
 * In Stripe API 2026-01-28.clover, this is under parent.subscription_details.subscription.
 */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}

/**
 * Log webhook event for monitoring and debugging
 */
async function logWebhookEvent(
  eventId: string,
  eventType: string,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    await prisma.webhookLog.create({
      data: { eventId, eventType, success, error },
    })
  } catch (logError) {
    console.error('[WEBHOOK] Failed to log webhook event:', logError)
  }
}

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for subscription lifecycle management.
 *
 * Events handled:
 * - checkout.session.completed: New subscription activated
 * - invoice.payment_succeeded: Recurring payment processed
 * - invoice.payment_failed: Payment failed, set past_due
 * - customer.subscription.updated: Subscription status changed
 * - customer.subscription.deleted: Subscription canceled
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('[WEBHOOK] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[WEBHOOK] Signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`[WEBHOOK] Received event: ${event.type} (${event.id})`)

  // Idempotency: skip events we've already processed
  const existing = await prisma.webhookEvent.findUnique({ where: { id: event.id } })
  if (existing) {
    console.log(`[WEBHOOK] Duplicate event ${event.id}, skipping`)
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`)
    }

    // Record event as processed (for idempotency)
    await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } })

    // Log event details for monitoring
    await logWebhookEvent(event.id, event.type, true)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[WEBHOOK] Error handling ${event.type}:`, message)
    await logWebhookEvent(event.id, event.type, false, message)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId
  if (!userId) {
    console.error('[WEBHOOK] checkout.session.completed: missing userId in metadata')
    return
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

  if (!subscriptionId) {
    console.error('[WEBHOOK] checkout.session.completed: missing subscription ID')
    return
  }

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

  if (!customerId) {
    console.error('[WEBHOOK] checkout.session.completed: missing customer ID')
    return
  }

  // Fetch the full subscription to get current_period_end from items
  const subscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const periodEnd: Date | null = getSubscriptionPeriodEnd(subscription)

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: 'PRO',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date(),
      ...(periodEnd && { subscriptionEndsAt: periodEnd }),
    },
  })

  recordAnalyticsEvent('subscription_activated', userId, {
    plan: 'pro',
    stripeCustomerId: customerId,
  })

  console.log(`[WEBHOOK] checkout.session.completed: activated PRO for user ${userId}`)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice)

  if (!subscriptionId) {
    return // Not a subscription invoice
  }

  // Fetch the subscription for the updated period end from items
  const subscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const periodEnd: Date | null = getSubscriptionPeriodEnd(subscription)

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

  if (!customerId) {
    console.error('[WEBHOOK] invoice.payment_succeeded: missing customer ID')
    return
  }

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  })

  if (!user) {
    console.error(`[WEBHOOK] invoice.payment_succeeded: no user found for customer ${customerId}`)
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'active',
      ...(periodEnd && { subscriptionEndsAt: periodEnd }),
    },
  })

  console.log(`[WEBHOOK] invoice.payment_succeeded: extended billing for user ${user.id}`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

  if (!customerId) {
    console.error('[WEBHOOK] invoice.payment_failed: missing customer ID')
    return
  }

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  })

  if (!user) {
    console.error(`[WEBHOOK] invoice.payment_failed: no user found for customer ${customerId}`)
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'past_due',
    },
  })

  console.log(`[WEBHOOK] invoice.payment_failed: set past_due for user ${user.id}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

  if (!customerId) {
    console.error('[WEBHOOK] customer.subscription.updated: missing customer ID')
    return
  }

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  })

  if (!user) {
    console.error(
      `[WEBHOOK] customer.subscription.updated: no user found for customer ${customerId}`
    )
    return
  }

  const periodEnd = getSubscriptionPeriodEnd(subscription)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: subscription.status,
      ...(periodEnd && { subscriptionEndsAt: periodEnd }),
    },
  })

  console.log(
    `[WEBHOOK] customer.subscription.updated: status=${subscription.status} for user ${user.id}`
  )
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

  if (!customerId) {
    console.error('[WEBHOOK] customer.subscription.deleted: missing customer ID')
    return
  }

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  })

  if (!user) {
    console.error(
      `[WEBHOOK] customer.subscription.deleted: no user found for customer ${customerId}`
    )
    return
  }

  // Keep subscriptionEndsAt for grace period — user retains PRO until that date
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: 'FREE',
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
    },
  })

  console.log(`[WEBHOOK] customer.subscription.deleted: reverted to FREE for user ${user.id}`)
}

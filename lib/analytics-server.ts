import { prisma } from '@/lib/db'
import type { AnalyticsEvent } from '@/lib/analytics'

/**
 * Record an analytics event server-side.
 * Used by webhook handlers and server actions where we have the userId directly.
 */
export async function recordAnalyticsEvent(
  event: AnalyticsEvent,
  userId: string,
  properties?: Record<string, string | number | boolean>
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event,
        userId,
        properties: properties ? JSON.stringify(properties) : null,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    // Analytics should never break the main flow
    console.error(`[ANALYTICS] Failed to record event ${event}:`, error)
  }
}

/**
 * Query conversion funnel metrics for the admin dashboard.
 */
export async function getConversionFunnelMetrics(days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const [limitReached, promptShown, checkoutStarted, activated] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { event: 'trade_limit_reached', timestamp: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { event: 'upgrade_prompt_shown', timestamp: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { event: 'checkout_started', timestamp: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { event: 'subscription_activated', timestamp: { gte: since } },
    }),
  ])

  return {
    period: `${days}d`,
    funnel: {
      trade_limit_reached: limitReached,
      upgrade_prompt_shown: promptShown,
      checkout_started: checkoutStarted,
      subscription_activated: activated,
    },
    conversionRates: {
      limitToPrompt: limitReached > 0 ? promptShown / limitReached : 0,
      promptToCheckout: promptShown > 0 ? checkoutStarted / promptShown : 0,
      checkoutToActivated: checkoutStarted > 0 ? activated / checkoutStarted : 0,
      overallConversion: limitReached > 0 ? activated / limitReached : 0,
    },
  }
}

/**
 * Get subscription metrics from the database.
 */
export async function getSubscriptionMetrics() {
  const [totalUsers, proUsers, freeUsersAtLimit, recentChurns] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { subscriptionTier: 'PRO' } }),
    prisma.user.count({
      where: {
        subscriptionTier: 'FREE',
        trades: { some: {} },
      },
    }).then(async () => {
      // Count free users who have >= FREE_TRADE_LIMIT trades
      const { FREE_TRADE_LIMIT } = await import('@/lib/constants')
      const users = await prisma.user.findMany({
        where: { subscriptionTier: 'FREE' },
        select: { id: true, _count: { select: { trades: true } } },
      })
      return users.filter((u: { _count: { trades: number } }) => u._count.trades >= FREE_TRADE_LIMIT).length
    }),
    prisma.user.count({
      where: {
        subscriptionStatus: 'canceled',
        subscriptionEndsAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ])

  const monthlyUsers = await prisma.user.count({
    where: {
      subscriptionTier: 'PRO',
      subscriptionStatus: 'active',
    },
  })

  return {
    totalUsers,
    proUsers,
    freeUsersAtLimit,
    recentChurns,
    activeProUsers: monthlyUsers,
    conversionRate: totalUsers > 0 ? proUsers / totalUsers : 0,
  }
}

/**
 * Get webhook health metrics.
 */
export async function getWebhookHealthMetrics(days = 7) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const [totalProcessed, failures] = await Promise.all([
    prisma.webhookLog.count({
      where: { timestamp: { gte: since } },
    }),
    prisma.webhookLog.count({
      where: { timestamp: { gte: since }, success: false },
    }),
  ])

  return {
    period: `${days}d`,
    totalProcessed,
    failures,
    successRate: totalProcessed > 0 ? (totalProcessed - failures) / totalProcessed : 1,
  }
}

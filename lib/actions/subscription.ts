'use server'

import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { FREE_TRADE_LIMIT } from '@/lib/constants'

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

export interface TradeUsage {
  tradesUsed: number
  tradeLimit: number
  tier: 'FREE' | 'PRO'
  remaining: number
  limitReached: boolean
}

/**
 * Get lifetime trade usage for the current user.
 *
 * Counts all trades ever created by the user (regardless of status)
 * and compares against their subscription tier limit.
 */
export async function getTradeUsage(): Promise<ActionResult<TradeUsage>> {
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
      },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const tradesUsed = await prisma.trade.count({
      where: { userId },
    })

    // Grace period: canceled and past_due users retain Pro access until subscriptionEndsAt
    const hasProAccess =
      user.subscriptionTier === 'PRO' ||
      (user.subscriptionStatus === 'canceled' &&
        user.subscriptionEndsAt != null &&
        new Date(user.subscriptionEndsAt) > new Date()) ||
      (user.subscriptionStatus === 'past_due' &&
        user.subscriptionEndsAt != null &&
        new Date(user.subscriptionEndsAt) > new Date())

    const tier = hasProAccess ? ('PRO' as const) : user.subscriptionTier
    const tradeLimit = tier === 'FREE' ? FREE_TRADE_LIMIT : Infinity
    const remaining = tier === 'PRO' ? Infinity : Math.max(0, FREE_TRADE_LIMIT - tradesUsed)
    const limitReached = tier === 'FREE' && tradesUsed >= FREE_TRADE_LIMIT

    return {
      success: true,
      data: {
        tradesUsed,
        tradeLimit,
        tier,
        remaining,
        limitReached,
      },
    }
  } catch (error) {
    console.error('Error getting trade usage:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to get trade usage' }
  }
}

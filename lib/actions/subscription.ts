'use server'

import { prisma } from '@/lib/db'
import { FREE_TRADE_LIMIT } from '@/lib/constants'

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface TradeUsage {
  tradesThisMonth: number
  tradeLimit: number
  tier: 'FREE' | 'PRO'
  remaining: number
  limitReached: boolean
}

/**
 * Get the current user ID
 * TODO: Replace with actual session-based authentication
 */
async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found. Please create a user first.')
  }
  return user.id
}

/**
 * Get trade usage for the current calendar month.
 *
 * Counts all trades opened by the user in the current month and compares
 * against their subscription tier limit.
 */
export async function getTradeUsage(): Promise<ActionResult<TradeUsage>> {
  try {
    const userId = await getCurrentUserId()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const tradesThisMonth = await prisma.trade.count({
      where: {
        userId,
        createdAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    })

    const tier = user.subscriptionTier
    const tradeLimit = tier === 'FREE' ? FREE_TRADE_LIMIT : Infinity
    const remaining = tier === 'PRO' ? Infinity : Math.max(0, FREE_TRADE_LIMIT - tradesThisMonth)
    const limitReached = tier === 'FREE' && tradesThisMonth >= FREE_TRADE_LIMIT

    return {
      success: true,
      data: {
        tradesThisMonth,
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

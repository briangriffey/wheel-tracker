'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import {
  RollOptionSchema,
  calculateNetPremium,
  type RollOptionInput,
} from '@/lib/validations/roll-option'
import { Prisma } from '@/lib/generated/prisma'

/**
 * Server action result type
 */
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

/**
 * Get the current user ID
 * TODO: Replace with actual session-based authentication
 */
async function getCurrentUserId(): Promise<string> {
  // This is a placeholder - in production, get this from NextAuth session
  // For now, return a test user ID
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found. Please create a user first.')
  }
  return user.id
}

/**
 * Roll an option to a new strike price and/or expiration date
 *
 * Rolling an option is a two-step process:
 * 1. Close the current option (BUY_TO_CLOSE)
 * 2. Open a new option with different parameters (SELL_TO_OPEN)
 *
 * This function creates both trades atomically and links them together.
 * The net premium (credit or debit) is calculated as:
 * Net = Open Premium - Close Premium
 *
 * Both trades maintain the same wheel relationship to preserve wheel continuity.
 *
 * @param input - Roll parameters including current trade ID and new option details
 * @returns Promise resolving to both trade IDs and net premium on success
 *
 * @throws {Error} If trade not found, not OPEN, or unauthorized
 *
 * @example
 * // Roll a PUT to a later date with higher strike
 * const result = await rollOption({
 *   tradeId: 'trade_123',
 *   newStrikePrice: 155,
 *   newExpirationDate: new Date('2024-04-15'),
 *   closePremium: 100,  // Paid to close current
 *   openPremium: 180    // Received from new option
 * });
 * // result.data.netPremium = 80 (net credit)
 */
export async function rollOption(
  input: RollOptionInput
): Promise<
  ActionResult<{
    closeTradeId: string
    openTradeId: string
    netPremium: number
  }>
> {
  try {
    // Validate input
    const validated = RollOptionSchema.parse(input)
    const { tradeId, newStrikePrice, newExpirationDate, closePremium, openPremium, notes } =
      validated

    // Get current user
    const userId = await getCurrentUserId()

    // Verify trade exists and get details
    const currentTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        id: true,
        userId: true,
        ticker: true,
        type: true,
        action: true,
        status: true,
        strikePrice: true,
        premium: true,
        contracts: true,
        shares: true,
        openDate: true,
        expirationDate: true,
        wheelId: true,
        positionId: true,
      },
    })

    if (!currentTrade) {
      return { success: false, error: 'Trade not found' }
    }

    if (currentTrade.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Only OPEN trades can be rolled
    if (currentTrade.status !== 'OPEN') {
      return {
        success: false,
        error: `Cannot roll ${currentTrade.status.toLowerCase()} trade. Only OPEN trades can be rolled.`,
      }
    }

    // Only SELL_TO_OPEN trades can be rolled (you can't roll a closing trade)
    if (currentTrade.action !== 'SELL_TO_OPEN') {
      return {
        success: false,
        error: 'Can only roll SELL_TO_OPEN trades',
      }
    }

    // Calculate net premium (positive = net credit, negative = net debit)
    const netPremium = calculateNetPremium(closePremium, openPremium)
    const closeDate = new Date()

    // Create both trades atomically in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the current trade to CLOSED status
      await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: 'CLOSED',
          closeDate,
        },
      })

      // 2. Create BUY_TO_CLOSE trade (closing the old position)
      const closeTrade = await tx.trade.create({
        data: {
          userId,
          ticker: currentTrade.ticker,
          type: currentTrade.type,
          action: 'BUY_TO_CLOSE',
          status: 'CLOSED',
          strikePrice: currentTrade.strikePrice,
          premium: new Prisma.Decimal(closePremium),
          contracts: currentTrade.contracts,
          shares: currentTrade.shares,
          expirationDate: currentTrade.expirationDate,
          openDate: closeDate,
          closeDate,
          notes: notes ? `Roll close: ${notes}` : 'Closed as part of roll',
          wheelId: currentTrade.wheelId,
          positionId: currentTrade.positionId,
          rolledFromId: currentTrade.id,
        },
      })

      // 3. Create SELL_TO_OPEN trade (opening the new position)
      const openTrade = await tx.trade.create({
        data: {
          userId,
          ticker: currentTrade.ticker,
          type: currentTrade.type,
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(newStrikePrice),
          premium: new Prisma.Decimal(openPremium),
          contracts: currentTrade.contracts,
          shares: currentTrade.shares,
          expirationDate: newExpirationDate,
          openDate: closeDate,
          notes: notes ? `Roll open: ${notes}` : 'Opened as part of roll',
          wheelId: currentTrade.wheelId,
          positionId: currentTrade.positionId,
          rolledFromId: currentTrade.id,
        },
      })

      // 4. Update wheel lastActivityAt if this trade is part of a wheel
      if (currentTrade.wheelId) {
        await tx.wheel.update({
          where: { id: currentTrade.wheelId },
          data: {
            lastActivityAt: closeDate,
          },
        })
      }

      return {
        closeTradeId: closeTrade.id,
        openTradeId: openTrade.id,
      }
    })

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath(`/trades/${tradeId}`)
    revalidatePath(`/trades/${result.closeTradeId}`)
    revalidatePath(`/trades/${result.openTradeId}`)
    revalidatePath('/dashboard')
    revalidatePath('/positions')

    return {
      success: true,
      data: {
        closeTradeId: result.closeTradeId,
        openTradeId: result.openTradeId,
        netPremium,
      },
    }
  } catch (error) {
    console.error('Error rolling option:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to roll option' }
  }
}

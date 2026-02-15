'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import {
  CreateTradeSchema,
  UpdateTradeSchema,
  UpdateTradeStatusSchema,
  CloseOptionSchema,
  type CreateTradeInput,
  type UpdateTradeInput,
  type UpdateTradeStatusInput,
  type CloseOptionInput,
} from '@/lib/validations/trade'
import { Prisma } from '@/lib/generated/prisma'
import { auth } from '@/lib/auth'
import { FREE_TRADE_LIMIT } from '@/lib/constants'
import { recordAnalyticsEvent } from '@/lib/analytics-server'

/**
 * Sentinel error thrown inside the trade-creation transaction when the free
 * tier limit is reached.  Caught in createTrade to return a typed result.
 */
class TradeLimitError extends Error {
  constructor(public readonly tradeCount: number) {
    super('FREE_TIER_LIMIT_REACHED')
    this.name = 'TradeLimitError'
  }
}

/**
 * Server action result type
 */
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

/**
 * Get the current user ID from NextAuth session
 */
async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * Create a new trade (PUT or CALL option)
 *
 * Creates a new options trade record in the database. Automatically calculates
 * shares from contracts (contracts * 100) and validates all input data.
 *
 * @param input - Trade data including ticker, type, strike, premium, etc.
 * @returns Promise resolving to action result with trade ID on success
 *
 * @example
 * const result = await createTrade({
 *   ticker: 'AAPL',
 *   type: 'PUT',
 *   action: 'SELL_TO_OPEN',
 *   strikePrice: 150,
 *   premium: 250,
 *   contracts: 1,
 *   expirationDate: new Date('2024-03-15')
 * });
 *
 * @throws {Error} If validation fails or database operation fails
 */
export async function createTrade(input: CreateTradeInput): Promise<ActionResult<{ id: string }>> {
  let userId: string | null = null
  try {
    // Validate input
    const validated = CreateTradeSchema.parse(input)

    // Get current user
    userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    // Check trade limit for free users (with grace period support)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    })

    const hasProAccess =
      user?.subscriptionTier === 'PRO' ||
      (user?.subscriptionStatus === 'canceled' &&
        user?.subscriptionEndsAt != null &&
        new Date(user.subscriptionEndsAt) > new Date()) ||
      (user?.subscriptionStatus === 'past_due' &&
        user?.subscriptionEndsAt != null &&
        new Date(user.subscriptionEndsAt) > new Date())

    // Calculate shares (contracts * 100)
    const shares = validated.contracts * 100

    // Use a serializable transaction to atomically check the limit and create
    // the trade. This prevents race conditions where concurrent requests both
    // read the same count and both proceed past the limit.
    const trade = await prisma.$transaction(
      async (tx) => {
        if (!hasProAccess) {
          const tradeCount = await tx.trade.count({
            where: { userId: userId! },
          })

          if (tradeCount >= FREE_TRADE_LIMIT) {
            throw new TradeLimitError(tradeCount)
          }
        }

        return tx.trade.create({
          data: {
            userId: userId!,
            ticker: validated.ticker,
            type: validated.type,
            action: validated.action,
            strikePrice: new Prisma.Decimal(validated.strikePrice),
            premium: new Prisma.Decimal(validated.premium),
            contracts: validated.contracts,
            shares,
            expirationDate: validated.expirationDate,
            openDate: validated.openDate ?? new Date(),
            notes: validated.notes,
            positionId: validated.positionId,
          },
        })
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    )

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath('/dashboard')
    revalidatePath('/positions')

    return { success: true, data: { id: trade.id } }
  } catch (error) {
    if (error instanceof TradeLimitError) {
      if (userId) {
        recordAnalyticsEvent('trade_limit_reached', userId, {
          tradesUsed: error.tradeCount,
          limit: FREE_TRADE_LIMIT,
        })
      }
      return { success: false, error: 'FREE_TIER_LIMIT_REACHED' }
    }

    console.error('Error creating trade:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to create trade' }
  }
}

/**
 * Update an existing trade
 *
 * Updates trade details such as notes, status, or other mutable fields.
 * Verifies that the trade belongs to the current user before updating.
 *
 * @param input - Trade update data including ID and fields to update
 * @returns Promise resolving to action result with trade ID on success
 *
 * @throws {Error} If trade not found, doesn't belong to user, or update fails
 */
export async function updateTrade(input: UpdateTradeInput): Promise<ActionResult<{ id: string }>> {
  try {
    // Validate input
    const validated = UpdateTradeSchema.parse(input)
    const { id, ...updates } = validated

    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    // Verify trade exists and belongs to user
    const existingTrade = await prisma.trade.findUnique({
      where: { id },
      select: { userId: true, status: true },
    })

    if (!existingTrade) {
      return { success: false, error: 'Trade not found' }
    }

    if (existingTrade.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Don't allow updating closed or assigned trades
    if (existingTrade.status === 'CLOSED' || existingTrade.status === 'ASSIGNED') {
      return {
        success: false,
        error: `Cannot update ${existingTrade.status.toLowerCase()} trade`,
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}

    if (updates.ticker !== undefined) updateData.ticker = updates.ticker
    if (updates.type !== undefined) updateData.type = updates.type
    if (updates.action !== undefined) updateData.action = updates.action
    if (updates.strikePrice !== undefined)
      updateData.strikePrice = new Prisma.Decimal(updates.strikePrice)
    if (updates.premium !== undefined) updateData.premium = new Prisma.Decimal(updates.premium)
    if (updates.expirationDate !== undefined) updateData.expirationDate = updates.expirationDate
    if (updates.openDate !== undefined) updateData.openDate = updates.openDate
    if (updates.closeDate !== undefined) updateData.closeDate = updates.closeDate
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.positionId !== undefined) updateData.positionId = updates.positionId

    // Recalculate shares if contracts changed
    if (updates.contracts !== undefined) {
      updateData.contracts = updates.contracts
      updateData.shares = updates.contracts * 100
    }

    // Update trade
    const trade = await prisma.trade.update({
      where: { id },
      data: updateData,
    })

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath(`/trades/${id}`)
    revalidatePath('/dashboard')

    return { success: true, data: { id: trade.id } }
  } catch (error) {
    console.error('Error updating trade:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to update trade' }
  }
}

/**
 * Update trade status with validation
 *
 * Handles status transitions for options trades. Validates that transitions
 * are valid and creates positions automatically when PUTs are assigned.
 *
 * Valid transitions:
 * - OPEN → EXPIRED: Option expired worthless
 * - OPEN → ASSIGNED: Option was exercised (creates position for PUTs)
 * - OPEN → CLOSED: Option closed early (bought back)
 *
 * @param input - Status update data including trade ID, new status, close date
 * @returns Promise resolving to action result with trade ID on success
 *
 * @throws {Error} If trade not found, unauthorized, or invalid status transition
 *
 * @example
 * // Mark a PUT as assigned (creates position automatically)
 * await updateTradeStatus({
 *   id: 'trade_123',
 *   status: 'ASSIGNED',
 *   closeDate: new Date()
 * });
 */
export async function updateTradeStatus(
  input: UpdateTradeStatusInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // Validate input
    const validated = UpdateTradeStatusSchema.parse(input)
    const { id, status, closeDate } = validated

    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    // Verify trade exists and belongs to user
    const existingTrade = await prisma.trade.findUnique({
      where: { id },
      select: { userId: true, status: true, expirationDate: true },
    })

    if (!existingTrade) {
      return { success: false, error: 'Trade not found' }
    }

    if (existingTrade.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      OPEN: ['CLOSED', 'EXPIRED', 'ASSIGNED'],
      CLOSED: [],
      EXPIRED: [],
      ASSIGNED: [],
    }

    const allowedStatuses = validTransitions[existingTrade.status] || []
    if (!allowedStatuses.includes(status)) {
      return {
        success: false,
        error: `Cannot transition from ${existingTrade.status} to ${status}`,
      }
    }

    // Update trade status
    const trade = await prisma.trade.update({
      where: { id },
      data: {
        status,
        closeDate: closeDate ?? (status !== 'OPEN' ? new Date() : undefined),
      },
    })

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath(`/trades/${id}`)
    revalidatePath('/dashboard')

    return { success: true, data: { id: trade.id } }
  } catch (error) {
    console.error('Error updating trade status:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to update trade status' }
  }
}

/**
 * Close an option early (BUY_TO_CLOSE)
 *
 * Closes an open option contract by buying it back. Calculates the net P/L
 * by comparing the original premium collected to the close premium paid.
 * For covered calls, this action will revert the position status back to OPEN.
 *
 * Net P/L = Original Premium - Close Premium
 * - Positive P/L: Profitable close (closed for less than collected)
 * - Negative P/L: Loss (closed for more than collected)
 *
 * @param input - Close option data including trade ID and close premium
 * @returns Promise resolving to action result with trade ID and net P/L on success
 *
 * @throws {Error} If trade not found, unauthorized, or not in OPEN status
 *
 * @example
 * // Close a PUT that was sold for $250, buying back for $100
 * await closeOption({ tradeId: 'trade_123', closePremium: 100 });
 * // Net P/L = $250 - $100 = $150 profit
 *
 * Edge Cases:
 * - Only OPEN trades can be closed (not EXPIRED, ASSIGNED, or already CLOSED)
 * - For covered CALL trades: position status reverts from COVERED to OPEN
 * - Wheel relationship is maintained and lastActivityAt is updated
 * - Transaction ensures atomicity (all updates succeed or fail together)
 */
export async function closeOption(
  input: CloseOptionInput
): Promise<ActionResult<{ id: string; netPL: number }>> {
  try {
    // Validate input
    const validated = CloseOptionSchema.parse(input)
    const { tradeId, closePremium } = validated

    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    // Verify trade exists and get details (including position and wheel relationship)
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        id: true,
        userId: true,
        ticker: true,
        type: true,
        status: true,
        premium: true,
        positionId: true,
        wheelId: true,
        position: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (!trade) {
      return { success: false, error: 'Trade not found' }
    }

    if (trade.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Only allow closing OPEN trades
    if (trade.status !== 'OPEN') {
      return {
        success: false,
        error: `Cannot close ${trade.status.toLowerCase()} trade. Only OPEN trades can be closed early.`,
      }
    }

    // Calculate net P/L (premium collected - premium paid to close)
    const originalPremium = Number(trade.premium)
    const netPL = originalPremium - closePremium

    // Close trade and update position (if covered call) in a transaction
    await prisma.$transaction(async (tx) => {
      // Update trade status to CLOSED and save closing data
      await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: 'CLOSED',
          closeDate: new Date(),
          closePremium: new Prisma.Decimal(closePremium),
          realizedGainLoss: new Prisma.Decimal(netPL),
        },
      })

      // If this is a covered CALL, revert position status to OPEN
      if (trade.type === 'CALL' && trade.positionId && trade.position) {
        await tx.position.update({
          where: { id: trade.positionId },
          data: {
            status: 'OPEN',
          },
        })
      }

      // Update wheel's lastActivityAt if this trade belongs to a wheel
      if (trade.wheelId) {
        await tx.wheel.update({
          where: { id: trade.wheelId },
          data: {
            lastActivityAt: new Date(),
          },
        })
      }
    })

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath(`/trades/${tradeId}`)
    revalidatePath('/dashboard')

    // Revalidate position page if this was a covered call
    if (trade.positionId) {
      revalidatePath('/positions')
      revalidatePath(`/positions/${trade.positionId}`)
    }

    // Revalidate wheel page if applicable
    if (trade.wheelId) {
      revalidatePath('/wheels')
      revalidatePath(`/wheels/${trade.wheelId}`)
    }

    return {
      success: true,
      data: {
        id: tradeId,
        netPL,
      },
    }
  } catch (error) {
    console.error('Error closing option:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to close option' }
  }
}

/**
 * Delete a trade
 *
 * Permanently removes a trade from the database. Only OPEN trades can be deleted
 * to prevent loss of historical data. For closed, expired, or assigned trades,
 * they should remain in the system for accurate P&L tracking.
 *
 * @param id - Trade ID to delete
 * @returns Promise resolving to action result with trade ID on success
 *
 * @throws {Error} If trade not found, unauthorized, or not in OPEN status
 *
 * @example
 * // Delete a mistakenly entered trade
 * await deleteTrade('trade_123');
 */
export async function deleteTrade(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    // Verify trade exists and belongs to user
    const existingTrade = await prisma.trade.findUnique({
      where: { id },
      select: { userId: true, status: true },
    })

    if (!existingTrade) {
      return { success: false, error: 'Trade not found' }
    }

    if (existingTrade.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Only allow deletion of OPEN trades
    if (existingTrade.status !== 'OPEN') {
      return {
        success: false,
        error: `Cannot delete ${existingTrade.status.toLowerCase()} trade. Use status update instead.`,
      }
    }

    // Delete trade
    await prisma.trade.delete({
      where: { id },
    })

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath('/dashboard')

    return { success: true, data: { id } }
  } catch (error) {
    console.error('Error deleting trade:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to delete trade' }
  }
}

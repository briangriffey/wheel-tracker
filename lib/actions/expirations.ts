'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import type { TradeStatus } from '@/lib/generated/prisma'

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
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found. Please create a user first.')
  }
  return user.id
}

/**
 * Validate status transition
 */
function validateStatusTransition(
  currentStatus: TradeStatus,
  newStatus: TradeStatus
): { valid: boolean; error?: string } {
  const validTransitions: Record<TradeStatus, TradeStatus[]> = {
    OPEN: ['CLOSED', 'EXPIRED', 'ASSIGNED'],
    CLOSED: [],
    EXPIRED: [],
    ASSIGNED: [],
  }

  const allowedStatuses = validTransitions[currentStatus] || []
  if (!allowedStatuses.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
    }
  }

  return { valid: true }
}

/**
 * Mark a trade as expired
 * Updates status to EXPIRED and sets closeDate
 */
export async function markExpired(tradeId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getCurrentUserId()

    // Verify trade exists and belongs to user
    const existingTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: { userId: true, status: true, ticker: true, expirationDate: true },
    })

    if (!existingTrade) {
      return { success: false, error: 'Trade not found' }
    }

    if (existingTrade.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate status transition
    const validation = validateStatusTransition(existingTrade.status, 'EXPIRED')
    if (!validation.valid) {
      return { success: false, error: validation.error! }
    }

    // Update trade status
    await prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: 'EXPIRED',
        closeDate: new Date(),
      },
    })

    // Revalidate relevant paths
    revalidatePath('/expirations')
    revalidatePath('/trades')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: { id: tradeId },
    }
  } catch (error) {
    console.error('Error marking trade as expired:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to mark trade as expired' }
  }
}

/**
 * Mark a trade as assigned
 * Updates status to ASSIGNED and sets closeDate
 */
export async function markAssigned(tradeId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getCurrentUserId()

    // Verify trade exists and belongs to user
    const existingTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: { userId: true, status: true, type: true, ticker: true },
    })

    if (!existingTrade) {
      return { success: false, error: 'Trade not found' }
    }

    if (existingTrade.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate status transition
    const validation = validateStatusTransition(existingTrade.status, 'ASSIGNED')
    if (!validation.valid) {
      return { success: false, error: validation.error! }
    }

    // Update trade status
    await prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: 'ASSIGNED',
        closeDate: new Date(),
      },
    })

    // Revalidate relevant paths
    revalidatePath('/expirations')
    revalidatePath('/trades')
    revalidatePath('/dashboard')
    revalidatePath('/positions')

    return {
      success: true,
      data: { id: tradeId },
    }
  } catch (error) {
    console.error('Error marking trade as assigned:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to mark trade as assigned' }
  }
}

/**
 * Roll an option to a new expiration date
 * This is a placeholder - full implementation would:
 * 1. Close the current option
 * 2. Create a new option with a later expiration date
 * 3. Handle the premium difference
 */
export async function rollOption(tradeId: string): Promise<ActionResult<{ message: string }>> {
  try {
    const userId = await getCurrentUserId()

    // Verify trade exists and belongs to user
    const existingTrade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: { userId: true, status: true, ticker: true, type: true },
    })

    if (!existingTrade) {
      return { success: false, error: 'Trade not found' }
    }

    if (existingTrade.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (existingTrade.status !== 'OPEN') {
      return {
        success: false,
        error: 'Can only roll OPEN trades',
      }
    }

    // TODO: Implement full rolling logic
    // For now, return a message that this feature is coming soon
    return {
      success: false,
      error: 'Roll option feature coming soon',
    }
  } catch (error) {
    console.error('Error rolling option:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to roll option' }
  }
}

/**
 * Mark multiple trades as expired (batch operation)
 * Useful for marking all expired trades at once
 */
export async function batchMarkExpired(
  tradeIds: string[]
): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await getCurrentUserId()

    // Verify all trades exist and belong to user
    const trades = await prisma.trade.findMany({
      where: {
        id: { in: tradeIds },
        userId,
        status: 'OPEN', // Only mark OPEN trades
      },
      select: { id: true },
    })

    if (trades.length === 0) {
      return {
        success: false,
        error: 'No valid trades found to mark as expired',
      }
    }

    if (trades.length !== tradeIds.length) {
      return {
        success: false,
        error: 'Some trades not found or cannot be expired',
      }
    }

    // Update all trades
    const result = await prisma.trade.updateMany({
      where: {
        id: { in: trades.map((t) => t.id) },
      },
      data: {
        status: 'EXPIRED',
        closeDate: new Date(),
      },
    })

    // Revalidate relevant paths
    revalidatePath('/expirations')
    revalidatePath('/trades')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: { count: result.count },
    }
  } catch (error) {
    console.error('Error batch marking trades as expired:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to batch mark trades as expired' }
  }
}

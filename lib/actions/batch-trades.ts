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
 * Batch operation result
 */
export interface BatchResult {
  successCount: number
  failedCount: number
  errors: Array<{ tradeId: string; error: string }>
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
 * Mark multiple trades as expired in batch
 *
 * Updates the status of multiple trades to EXPIRED and sets their close date.
 * Only processes trades that belong to the current user and are in OPEN status.
 *
 * @param tradeIds - Array of trade IDs to mark as expired
 * @returns Batch result with success/failure counts
 *
 * @example
 * const result = await batchMarkExpired(['trade1', 'trade2', 'trade3'])
 * // Returns: { successCount: 3, failedCount: 0, errors: [] }
 */
export async function batchMarkExpired(tradeIds: string[]): Promise<ActionResult<BatchResult>> {
  try {
    const userId = await getCurrentUserId()
    const closeDate = new Date()

    const errors: Array<{ tradeId: string; error: string }> = []
    let successCount = 0

    // Process each trade individually to handle validation
    for (const tradeId of tradeIds) {
      try {
        // Verify trade exists, belongs to user, and is OPEN
        const trade = await prisma.trade.findUnique({
          where: { id: tradeId },
          select: { userId: true, status: true },
        })

        if (!trade) {
          errors.push({ tradeId, error: 'Trade not found' })
          continue
        }

        if (trade.userId !== userId) {
          errors.push({ tradeId, error: 'Unauthorized' })
          continue
        }

        if (trade.status !== 'OPEN') {
          errors.push({
            tradeId,
            error: `Cannot expire ${trade.status.toLowerCase()} trade`,
          })
          continue
        }

        // Update trade status
        await prisma.trade.update({
          where: { id: tradeId },
          data: {
            status: 'EXPIRED',
            closeDate,
          },
        })

        successCount++
      } catch (error) {
        console.error(`Error marking trade ${tradeId} as expired:`, error)
        errors.push({
          tradeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath('/expirations')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        successCount,
        failedCount: errors.length,
        errors,
      },
    }
  } catch (error) {
    console.error('Error in batch mark expired:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to mark trades as expired' }
  }
}

/**
 * Mark multiple trades as assigned in batch
 *
 * Updates the status of multiple trades to ASSIGNED and sets their close date.
 * Only processes trades that belong to the current user and are in OPEN status.
 *
 * Note: This is a simple status update. For full assignment logic (creating positions
 * for PUTs, closing positions for CALLs), use the individual assignment actions.
 *
 * @param tradeIds - Array of trade IDs to mark as assigned
 * @returns Batch result with success/failure counts
 *
 * @example
 * const result = await batchMarkAssigned(['trade1', 'trade2'])
 * // Returns: { successCount: 2, failedCount: 0, errors: [] }
 */
export async function batchMarkAssigned(tradeIds: string[]): Promise<ActionResult<BatchResult>> {
  try {
    const userId = await getCurrentUserId()
    const closeDate = new Date()

    const errors: Array<{ tradeId: string; error: string }> = []
    let successCount = 0

    // Process each trade individually to handle validation
    for (const tradeId of tradeIds) {
      try {
        // Verify trade exists, belongs to user, and is OPEN
        const trade = await prisma.trade.findUnique({
          where: { id: tradeId },
          select: { userId: true, status: true },
        })

        if (!trade) {
          errors.push({ tradeId, error: 'Trade not found' })
          continue
        }

        if (trade.userId !== userId) {
          errors.push({ tradeId, error: 'Unauthorized' })
          continue
        }

        if (trade.status !== 'OPEN') {
          errors.push({
            tradeId,
            error: `Cannot assign ${trade.status.toLowerCase()} trade`,
          })
          continue
        }

        // Update trade status
        await prisma.trade.update({
          where: { id: tradeId },
          data: {
            status: 'ASSIGNED',
            closeDate,
          },
        })

        successCount++
      } catch (error) {
        console.error(`Error marking trade ${tradeId} as assigned:`, error)
        errors.push({
          tradeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath('/expirations')
    revalidatePath('/dashboard')
    revalidatePath('/positions')

    return {
      success: true,
      data: {
        successCount,
        failedCount: errors.length,
        errors,
      },
    }
  } catch (error) {
    console.error('Error in batch mark assigned:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to mark trades as assigned' }
  }
}

/**
 * Update multiple trade statuses in batch
 *
 * Generic batch update function that can update multiple trades to any valid status.
 * Validates each trade individually and provides detailed error reporting.
 *
 * @param tradeIds - Array of trade IDs to update
 * @param status - Target status for all trades
 * @returns Batch result with success/failure counts
 */
export async function batchUpdateTradeStatus(
  tradeIds: string[],
  status: TradeStatus
): Promise<ActionResult<BatchResult>> {
  try {
    const userId = await getCurrentUserId()
    const closeDate = status !== 'OPEN' ? new Date() : undefined

    const errors: Array<{ tradeId: string; error: string }> = []
    let successCount = 0

    // Valid status transitions
    const validTransitions: Record<string, string[]> = {
      OPEN: ['CLOSED', 'EXPIRED', 'ASSIGNED'],
      CLOSED: [],
      EXPIRED: [],
      ASSIGNED: [],
    }

    // Process each trade individually
    for (const tradeId of tradeIds) {
      try {
        // Verify trade exists and belongs to user
        const trade = await prisma.trade.findUnique({
          where: { id: tradeId },
          select: { userId: true, status: true },
        })

        if (!trade) {
          errors.push({ tradeId, error: 'Trade not found' })
          continue
        }

        if (trade.userId !== userId) {
          errors.push({ tradeId, error: 'Unauthorized' })
          continue
        }

        // Validate status transition
        const allowedStatuses = validTransitions[trade.status] || []
        if (!allowedStatuses.includes(status)) {
          errors.push({
            tradeId,
            error: `Cannot transition from ${trade.status} to ${status}`,
          })
          continue
        }

        // Update trade
        await prisma.trade.update({
          where: { id: tradeId },
          data: {
            status,
            closeDate,
          },
        })

        successCount++
      } catch (error) {
        console.error(`Error updating trade ${tradeId}:`, error)
        errors.push({
          tradeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath('/expirations')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        successCount,
        failedCount: errors.length,
        errors,
      },
    }
  } catch (error) {
    console.error('Error in batch update trade status:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to update trade statuses' }
  }
}

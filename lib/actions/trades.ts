'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import {
  CreateTradeSchema,
  UpdateTradeSchema,
  UpdateTradeStatusSchema,
  type CreateTradeInput,
  type UpdateTradeInput,
  type UpdateTradeStatusInput,
} from '@/lib/validations/trade'
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
export async function createTrade(
  input: CreateTradeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // Validate input
    const validated = CreateTradeSchema.parse(input)

    // Get current user
    const userId = await getCurrentUserId()

    // Calculate shares (contracts * 100)
    const shares = validated.contracts * 100

    // Create trade
    const trade = await prisma.trade.create({
      data: {
        userId,
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

    // If this is a covered CALL, update position status to COVERED
    if (validated.type === 'CALL' && validated.positionId) {
      await prisma.position.update({
        where: { id: validated.positionId },
        data: { status: 'COVERED' },
      })
    }

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath('/dashboard')
    revalidatePath('/positions')

    return { success: true, data: { id: trade.id } }
  } catch (error) {
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
export async function updateTrade(
  input: UpdateTradeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // Validate input
    const validated = UpdateTradeSchema.parse(input)
    const { id, ...updates } = validated

    // Get current user
    const userId = await getCurrentUserId()

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

    // Verify trade exists and belongs to user
    const existingTrade = await prisma.trade.findUnique({
      where: { id },
      select: {
        userId: true,
        status: true,
        expirationDate: true,
        type: true,
        positionId: true,
      },
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

    // If this is a covered CALL being closed/expired, update position status
    if (
      existingTrade.type === 'CALL' &&
      existingTrade.positionId &&
      (status === 'CLOSED' || status === 'EXPIRED')
    ) {
      // Check if position has any remaining OPEN calls
      const remainingOpenCalls = await prisma.trade.count({
        where: {
          positionId: existingTrade.positionId,
          type: 'CALL',
          status: 'OPEN',
        },
      })

      // If no more open calls, update position status back to OPEN
      if (remainingOpenCalls === 0) {
        await prisma.position.update({
          where: { id: existingTrade.positionId },
          data: { status: 'OPEN' },
        })
      }
    }

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath(`/trades/${id}`)
    revalidatePath('/dashboard')
    revalidatePath('/positions')

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

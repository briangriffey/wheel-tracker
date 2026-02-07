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
 * Create a new trade
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

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath('/dashboard')

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
 * Handles status transitions: OPEN → EXPIRED, OPEN → ASSIGNED, OPEN → CLOSED
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
 * Delete a trade
 * Only allows deletion of OPEN trades to prevent data loss
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

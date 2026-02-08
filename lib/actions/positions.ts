'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import {
  AssignPutSchema,
  AssignCallSchema,
  UpdatePositionSchema,
  type AssignPutInput,
  type AssignCallInput,
  type UpdatePositionInput,
} from '@/lib/validations/position'
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
 * Assign a PUT trade and create a stock position
 *
 * When a PUT option is assigned (exercised against you), you're obligated to buy
 * the underlying shares at the strike price. This function:
 * 1. Marks the PUT trade as ASSIGNED
 * 2. Creates a new position for the acquired shares
 * 3. Calculates cost basis including the premium collected
 *
 * Cost Basis Calculation:
 * - Cost per share = strike price - (premium / shares)
 * - Total cost = cost per share * shares
 * - The premium collected effectively reduces your purchase price
 *
 * @param input - Assignment data including trade ID
 * @returns Promise resolving to both position ID and trade ID on success
 *
 * @throws {Error} If trade not found, not a PUT, already assigned, or unauthorized
 *
 * @example
 * // Assign a PUT that was exercised
 * await assignPut({ tradeId: 'trade_123' });
 * // Creates position with cost basis = strike - premium/shares
 *
 * Edge Cases:
 * - Only OPEN PUT trades can be assigned
 * - Transaction ensures atomicity (both trade update and position creation succeed or fail together)
 * - Premium is included in position cost calculation for accurate P&L tracking
 */
export async function assignPut(
  input: AssignPutInput
): Promise<ActionResult<{ positionId: string; tradeId: string }>> {
  try {
    // Validate input
    const validated = AssignPutSchema.parse(input)
    const { tradeId } = validated

    // Get current user
    const userId = await getCurrentUserId()

    // Verify trade exists and get details
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        id: true,
        userId: true,
        ticker: true,
        type: true,
        status: true,
        strikePrice: true,
        premium: true,
        contracts: true,
        shares: true,
        openDate: true,
      },
    })

    if (!trade) {
      return { success: false, error: 'Trade not found' }
    }

    if (trade.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (trade.type !== 'PUT') {
      return { success: false, error: 'Trade must be a PUT to create a position' }
    }

    if (trade.status !== 'OPEN') {
      return {
        success: false,
        error: `Cannot assign ${trade.status.toLowerCase()} trade. Only OPEN trades can be assigned.`,
      }
    }

    // Calculate cost basis
    // When assigned on a PUT: buyer pays strike price but keeps the premium
    // Cost per share = strike price - (premium / shares)
    const strikePrice = Number(trade.strikePrice)
    const premium = Number(trade.premium)
    const shares = trade.shares
    const costBasisPerShare = strikePrice - premium / shares
    const totalCost = costBasisPerShare * shares

    // Create position and update trade in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update trade status to ASSIGNED
      await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: 'ASSIGNED',
          closeDate: new Date(),
        },
      })

      // Create position
      const position = await tx.position.create({
        data: {
          userId,
          ticker: trade.ticker,
          shares,
          costBasis: new Prisma.Decimal(costBasisPerShare),
          totalCost: new Prisma.Decimal(totalCost),
          status: 'OPEN',
          acquiredDate: new Date(),
          assignmentTradeId: tradeId,
        },
      })

      return { position, trade }
    })

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath(`/trades/${tradeId}`)
    revalidatePath('/positions')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        positionId: result.position.id,
        tradeId: result.trade.id,
      },
    }
  } catch (error) {
    console.error('Error assigning PUT:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to assign PUT' }
  }
}

/**
 * Assign a CALL trade and close a stock position
 *
 * When a covered CALL is assigned, the trader sells shares at the strike price.
 * Realized P&L = (strike price * shares) + call premium + put premium - total cost
 */
export async function assignCall(
  input: AssignCallInput
): Promise<ActionResult<{ positionId: string; tradeId: string; realizedGainLoss: number }>> {
  try {
    // Validate input
    const validated = AssignCallSchema.parse(input)
    const { tradeId } = validated

    // Get current user
    const userId = await getCurrentUserId()

    // Verify trade exists and get details with position
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        id: true,
        userId: true,
        ticker: true,
        type: true,
        status: true,
        strikePrice: true,
        premium: true,
        shares: true,
        positionId: true,
        position: {
          select: {
            id: true,
            status: true,
            totalCost: true,
            assignmentTrade: {
              select: {
                premium: true,
              },
            },
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

    if (trade.type !== 'CALL') {
      return { success: false, error: 'Trade must be a CALL to close a position' }
    }

    if (trade.status !== 'OPEN') {
      return {
        success: false,
        error: `Cannot assign ${trade.status.toLowerCase()} trade. Only OPEN trades can be assigned.`,
      }
    }

    if (!trade.positionId || !trade.position) {
      return {
        success: false,
        error: 'Trade is not linked to a position. CALL must be a covered call.',
      }
    }

    const position = trade.position

    if (position.status !== 'OPEN') {
      return {
        success: false,
        error: `Position is already ${position.status.toLowerCase()}`,
      }
    }

    // Calculate realized gain/loss
    // Sale proceeds = strike price * shares
    // Total premiums = PUT premium + CALL premium
    // Realized P&L = sale proceeds + total premiums - total cost
    const strikePrice = Number(trade.strikePrice)
    const shares = trade.shares
    const callPremium = Number(trade.premium)
    const putPremium = Number(position.assignmentTrade.premium)
    const totalCost = Number(position.totalCost)

    const saleProceeds = strikePrice * shares
    const totalPremiums = putPremium + callPremium
    const realizedGainLoss = saleProceeds + totalPremiums - totalCost

    // Close position and update trade in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update trade status to ASSIGNED
      await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: 'ASSIGNED',
          closeDate: new Date(),
        },
      })

      // Close position with realized gain/loss
      const updatedPosition = await tx.position.update({
        where: { id: position.id },
        data: {
          status: 'CLOSED',
          closedDate: new Date(),
          realizedGainLoss: new Prisma.Decimal(realizedGainLoss),
        },
      })

      return { position: updatedPosition, trade }
    })

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath(`/trades/${tradeId}`)
    revalidatePath('/positions')
    revalidatePath(`/positions/${position.id}`)
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        positionId: result.position.id,
        tradeId: result.trade.id,
        realizedGainLoss,
      },
    }
  } catch (error) {
    console.error('Error assigning CALL:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to assign CALL' }
  }
}

/**
 * Get all positions for the current user
 */
export async function getPositions(): Promise<
  ActionResult<
    Array<{
      id: string
      ticker: string
      shares: number
      costBasis: number
      totalCost: number
      currentValue: number | null
      realizedGainLoss: number | null
      status: string
      acquiredDate: Date
      closedDate: Date | null
      notes: string | null
    }>
  >
> {
  try {
    const userId = await getCurrentUserId()

    const positions = await prisma.position.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { acquiredDate: 'desc' }],
      select: {
        id: true,
        ticker: true,
        shares: true,
        costBasis: true,
        totalCost: true,
        currentValue: true,
        realizedGainLoss: true,
        status: true,
        acquiredDate: true,
        closedDate: true,
        notes: true,
      },
    })

    // Convert Decimal to number for JSON serialization
    const serialized = positions.map((pos) => ({
      ...pos,
      costBasis: Number(pos.costBasis),
      totalCost: Number(pos.totalCost),
      currentValue: pos.currentValue ? Number(pos.currentValue) : null,
      realizedGainLoss: pos.realizedGainLoss ? Number(pos.realizedGainLoss) : null,
    }))

    return { success: true, data: serialized }
  } catch (error) {
    console.error('Error fetching positions:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch positions' }
  }
}

/**
 * Get only active (OPEN) positions for the current user
 */
export async function getActivePositions(): Promise<
  ActionResult<
    Array<{
      id: string
      ticker: string
      shares: number
      costBasis: number
      totalCost: number
      currentValue: number | null
      acquiredDate: Date
      notes: string | null
    }>
  >
> {
  try {
    const userId = await getCurrentUserId()

    const positions = await prisma.position.findMany({
      where: {
        userId,
        status: 'OPEN',
      },
      orderBy: { acquiredDate: 'desc' },
      select: {
        id: true,
        ticker: true,
        shares: true,
        costBasis: true,
        totalCost: true,
        currentValue: true,
        acquiredDate: true,
        notes: true,
      },
    })

    // Convert Decimal to number for JSON serialization
    const serialized = positions.map((pos) => ({
      ...pos,
      costBasis: Number(pos.costBasis),
      totalCost: Number(pos.totalCost),
      currentValue: pos.currentValue ? Number(pos.currentValue) : null,
    }))

    return { success: true, data: serialized }
  } catch (error) {
    console.error('Error fetching active positions:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch active positions' }
  }
}

/**
 * Get a single position with full details including related trades
 */
export async function getPosition(id: string): Promise<
  ActionResult<{
    id: string
    ticker: string
    shares: number
    costBasis: number
    totalCost: number
    currentValue: number | null
    realizedGainLoss: number | null
    status: string
    acquiredDate: Date
    closedDate: Date | null
    notes: string | null
    assignmentTrade: {
      id: string
      type: string
      strikePrice: number
      premium: number
      expirationDate: Date
      openDate: Date
    }
    coveredCalls: Array<{
      id: string
      strikePrice: number
      premium: number
      status: string
      expirationDate: Date
      openDate: Date
      closeDate: Date | null
    }>
  }>
> {
  try {
    const userId = await getCurrentUserId()

    const position = await prisma.position.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        ticker: true,
        shares: true,
        costBasis: true,
        totalCost: true,
        currentValue: true,
        realizedGainLoss: true,
        status: true,
        acquiredDate: true,
        closedDate: true,
        notes: true,
        assignmentTrade: {
          select: {
            id: true,
            type: true,
            strikePrice: true,
            premium: true,
            expirationDate: true,
            openDate: true,
          },
        },
        coveredCalls: {
          select: {
            id: true,
            strikePrice: true,
            premium: true,
            status: true,
            expirationDate: true,
            openDate: true,
            closeDate: true,
          },
          orderBy: { openDate: 'desc' },
        },
      },
    })

    if (!position) {
      return { success: false, error: 'Position not found' }
    }

    if (position.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Convert Decimals to numbers
    const serialized = {
      id: position.id,
      ticker: position.ticker,
      shares: position.shares,
      costBasis: Number(position.costBasis),
      totalCost: Number(position.totalCost),
      currentValue: position.currentValue ? Number(position.currentValue) : null,
      realizedGainLoss: position.realizedGainLoss ? Number(position.realizedGainLoss) : null,
      status: position.status,
      acquiredDate: position.acquiredDate,
      closedDate: position.closedDate,
      notes: position.notes,
      assignmentTrade: {
        id: position.assignmentTrade.id,
        type: position.assignmentTrade.type,
        strikePrice: Number(position.assignmentTrade.strikePrice),
        premium: Number(position.assignmentTrade.premium),
        expirationDate: position.assignmentTrade.expirationDate,
        openDate: position.assignmentTrade.openDate,
      },
      coveredCalls: position.coveredCalls.map((call) => ({
        id: call.id,
        strikePrice: Number(call.strikePrice),
        premium: Number(call.premium),
        status: call.status,
        expirationDate: call.expirationDate,
        openDate: call.openDate,
        closeDate: call.closeDate,
      })),
    }

    return { success: true, data: serialized }
  } catch (error) {
    console.error('Error fetching position:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch position' }
  }
}

/**
 * Update a position (notes, current value)
 */
export async function updatePosition(
  input: UpdatePositionInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const validated = UpdatePositionSchema.parse(input)
    const { id, notes, currentValue } = validated

    const userId = await getCurrentUserId()

    // Verify position exists and belongs to user
    const existingPosition = await prisma.position.findUnique({
      where: { id },
      select: { userId: true, status: true },
    })

    if (!existingPosition) {
      return { success: false, error: 'Position not found' }
    }

    if (existingPosition.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (notes !== undefined) updateData.notes = notes
    if (currentValue !== undefined) updateData.currentValue = new Prisma.Decimal(currentValue)

    // Update position
    await prisma.position.update({
      where: { id },
      data: updateData,
    })

    // Revalidate relevant paths
    revalidatePath('/positions')
    revalidatePath(`/positions/${id}`)
    revalidatePath('/dashboard')

    return { success: true, data: { id } }
  } catch (error) {
    console.error('Error updating position:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to update position' }
  }
}

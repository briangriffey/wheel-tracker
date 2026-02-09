'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import {
  BatchExpireSchema,
  BatchAssignSchema,
  type BatchExpireInput,
  type BatchAssignInput,
} from '@/lib/validations/batch'
import { Prisma } from '@/lib/generated/prisma'

/**
 * Server action result type
 */
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

/**
 * Batch operation result summary
 */
interface BatchExpireResult {
  successCount: number
  failureCount: number
  expiredTrades: Array<{
    id: string
    ticker: string
    type: string
    strikePrice: number
  }>
  errors: Array<{
    tradeId: string
    error: string
  }>
}

interface BatchAssignResult {
  successCount: number
  failureCount: number
  assignedPuts: Array<{
    tradeId: string
    positionId: string
    ticker: string
    shares: number
    costBasis: number
  }>
  assignedCalls: Array<{
    tradeId: string
    positionId: string
    ticker: string
    realizedGainLoss: number
  }>
  errors: Array<{
    tradeId: string
    error: string
  }>
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
 * Batch expire multiple trades
 *
 * Marks multiple trades as EXPIRED in a single atomic transaction.
 * Only OPEN trades can be expired. Validates that all trades belong
 * to the current user before processing.
 *
 * @param input - Array of trade IDs to expire
 * @returns Promise resolving to batch result summary
 *
 * @example
 * const result = await batchExpire({
 *   tradeIds: ['trade_123', 'trade_456', 'trade_789']
 * });
 * // Returns: { successCount: 3, failureCount: 0, expiredTrades: [...], errors: [] }
 *
 * Use Cases:
 * - End-of-week expiration processing
 * - Marking multiple worthless options as expired
 * - Batch cleanup of expired trades
 *
 * Validation:
 * - All trades must exist and belong to current user
 * - Only OPEN trades can be expired
 * - Invalid trades are skipped and reported in errors array
 * - Successfully expired trades are returned in expiredTrades array
 */
export async function batchExpire(
  input: BatchExpireInput
): Promise<ActionResult<BatchExpireResult>> {
  try {
    // Validate input
    const validated = BatchExpireSchema.parse(input)
    const { tradeIds } = validated

    // Get current user
    const userId = await getCurrentUserId()

    // Fetch all trades with details
    const trades = await prisma.trade.findMany({
      where: {
        id: { in: tradeIds },
      },
      select: {
        id: true,
        userId: true,
        ticker: true,
        type: true,
        status: true,
        strikePrice: true,
      },
    })

    // Validate trades
    const validTrades: typeof trades = []
    const errors: BatchExpireResult['errors'] = []

    for (const tradeId of tradeIds) {
      const trade = trades.find((t) => t.id === tradeId)

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

      validTrades.push(trade)
    }

    // If no valid trades, return early
    if (validTrades.length === 0) {
      return {
        success: false,
        error: 'No valid trades to expire',
        details: { errors },
      }
    }

    // Process all valid trades in a transaction
    const expiredTrades = await prisma.$transaction(async (tx) => {
      const results: BatchExpireResult['expiredTrades'] = []

      for (const trade of validTrades) {
        await tx.trade.update({
          where: { id: trade.id },
          data: {
            status: 'EXPIRED',
            closeDate: new Date(),
          },
        })

        results.push({
          id: trade.id,
          ticker: trade.ticker,
          type: trade.type,
          strikePrice: Number(trade.strikePrice),
        })
      }

      return results
    })

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath('/dashboard')
    revalidatePath('/positions')
    revalidatePath('/expirations')

    const result: BatchExpireResult = {
      successCount: expiredTrades.length,
      failureCount: errors.length,
      expiredTrades,
      errors,
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('Error batch expiring trades:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to batch expire trades' }
  }
}

/**
 * Batch assign multiple trades
 *
 * Assigns multiple PUT and CALL trades in a single atomic transaction.
 * - PUTs: Creates stock positions with calculated cost basis
 * - CALLs: Closes positions with calculated realized P&L
 *
 * @param input - Array of trade IDs to assign
 * @returns Promise resolving to batch result summary
 *
 * @example
 * const result = await batchAssign({
 *   tradeIds: ['put_123', 'call_456']
 * });
 * // Returns: {
 * //   successCount: 2,
 * //   assignedPuts: [{ tradeId, positionId, ... }],
 * //   assignedCalls: [{ tradeId, positionId, realizedGainLoss, ... }],
 * //   errors: []
 * // }
 *
 * Business Logic:
 * - PUT Assignment:
 *   - Cost basis = strike price - (premium / shares)
 *   - Creates new position with calculated cost basis
 *   - Marks trade as ASSIGNED
 *
 * - CALL Assignment:
 *   - Realized P&L = sale proceeds + premiums - total cost
 *   - Closes position
 *   - Marks trade as ASSIGNED
 *
 * Validation:
 * - All trades must exist and belong to current user
 * - Only OPEN trades can be assigned
 * - CALLs must be linked to a valid position
 * - Positions must be OPEN to close
 * - Invalid trades are skipped and reported in errors array
 */
export async function batchAssign(
  input: BatchAssignInput
): Promise<ActionResult<BatchAssignResult>> {
  try {
    // Validate input
    const validated = BatchAssignSchema.parse(input)
    const { tradeIds } = validated

    // Get current user
    const userId = await getCurrentUserId()

    // Fetch all trades with full details needed for assignment
    const trades = await prisma.trade.findMany({
      where: {
        id: { in: tradeIds },
      },
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

    // Separate and validate PUTs and CALLs
    const validPuts: typeof trades = []
    const validCalls: typeof trades = []
    const errors: BatchAssignResult['errors'] = []

    for (const tradeId of tradeIds) {
      const trade = trades.find((t) => t.id === tradeId)

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

      // Validate trade type specific requirements
      if (trade.type === 'PUT') {
        validPuts.push(trade)
      } else if (trade.type === 'CALL') {
        if (!trade.positionId || !trade.position) {
          errors.push({
            tradeId,
            error: 'CALL must be linked to a position',
          })
          continue
        }

        if (trade.position.status !== 'OPEN') {
          errors.push({
            tradeId,
            error: `Position is already ${trade.position.status.toLowerCase()}`,
          })
          continue
        }

        validCalls.push(trade)
      }
    }

    // If no valid trades, return early
    if (validPuts.length === 0 && validCalls.length === 0) {
      return {
        success: false,
        error: 'No valid trades to assign',
        details: { errors },
      }
    }

    // Process all assignments in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const assignedPuts: BatchAssignResult['assignedPuts'] = []
      const assignedCalls: BatchAssignResult['assignedCalls'] = []

      // Process PUT assignments
      for (const trade of validPuts) {
        // Calculate cost basis for PUT assignment
        const strikePrice = Number(trade.strikePrice)
        const premium = Number(trade.premium)
        const shares = trade.shares
        const costBasisPerShare = strikePrice - premium / shares
        const totalCost = costBasisPerShare * shares

        // Update trade to ASSIGNED
        await tx.trade.update({
          where: { id: trade.id },
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
            assignmentTradeId: trade.id,
          },
        })

        assignedPuts.push({
          tradeId: trade.id,
          positionId: position.id,
          ticker: trade.ticker,
          shares,
          costBasis: costBasisPerShare,
        })
      }

      // Process CALL assignments
      for (const trade of validCalls) {
        if (!trade.position) continue // Type guard (already validated)

        // Calculate realized gain/loss for CALL assignment
        const strikePrice = Number(trade.strikePrice)
        const shares = trade.shares
        const callPremium = Number(trade.premium)
        const putPremium = Number(trade.position.assignmentTrade.premium)
        const totalCost = Number(trade.position.totalCost)

        const saleProceeds = strikePrice * shares
        const totalPremiums = putPremium + callPremium
        const realizedGainLoss = saleProceeds + totalPremiums - totalCost

        // Update trade to ASSIGNED
        await tx.trade.update({
          where: { id: trade.id },
          data: {
            status: 'ASSIGNED',
            closeDate: new Date(),
          },
        })

        // Close position
        await tx.position.update({
          where: { id: trade.position.id },
          data: {
            status: 'CLOSED',
            closedDate: new Date(),
            realizedGainLoss: new Prisma.Decimal(realizedGainLoss),
          },
        })

        assignedCalls.push({
          tradeId: trade.id,
          positionId: trade.position.id,
          ticker: trade.ticker,
          realizedGainLoss,
        })
      }

      return { assignedPuts, assignedCalls }
    })

    // Revalidate relevant paths
    revalidatePath('/trades')
    revalidatePath('/dashboard')
    revalidatePath('/positions')
    revalidatePath('/expirations')

    const batchResult: BatchAssignResult = {
      successCount: result.assignedPuts.length + result.assignedCalls.length,
      failureCount: errors.length,
      assignedPuts: result.assignedPuts,
      assignedCalls: result.assignedCalls,
      errors,
    }

    return { success: true, data: batchResult }
  } catch (error) {
    console.error('Error batch assigning trades:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to batch assign trades' }
  }
}

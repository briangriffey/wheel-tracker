'use server'

import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface OpenPositionForForm {
  id: string
  ticker: string
  shares: number
  costBasis: number
  acquiredDate: Date
  wheelId: string | null
  hasOpenCall: boolean
}

export interface ActiveWheelForForm {
  id: string
  ticker: string
  status: string
  cycleCount: number
  totalPremiums: number
}

/**
 * Get open positions for a specific ticker (used by trade entry form).
 * Returns all OPEN positions for the authenticated user matching the given ticker.
 * Includes a computed `hasOpenCall` flag indicating whether the position has an active covered call.
 */
export async function getOpenPositionsForTicker(
  ticker: string
): Promise<ActionResult<OpenPositionForForm[]>> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, error: 'Not authenticated' }
  }

  const normalizedTicker = ticker.trim().toUpperCase()
  if (!normalizedTicker) {
    return { success: false, error: 'Ticker is required' }
  }

  try {
    const positions = await prisma.position.findMany({
      where: {
        userId,
        ticker: normalizedTicker,
        status: 'OPEN',
      },
      orderBy: { acquiredDate: 'desc' },
      select: {
        id: true,
        ticker: true,
        shares: true,
        costBasis: true,
        acquiredDate: true,
        wheelId: true,
        coveredCalls: {
          where: { status: 'OPEN' },
          select: { id: true },
        },
      },
    })

    const data: OpenPositionForForm[] = positions.map((pos: typeof positions[number]) => ({
      id: pos.id,
      ticker: pos.ticker,
      shares: pos.shares,
      costBasis: Number(pos.costBasis),
      acquiredDate: pos.acquiredDate,
      wheelId: pos.wheelId,
      hasOpenCall: pos.coveredCalls.length > 0,
    }))

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching open positions for ticker:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch positions' }
  }
}

/**
 * Get the active or idle wheel for a specific ticker (used by trade entry form).
 * Returns the most recently active wheel for the authenticated user and given ticker,
 * or null if none exists.
 */
export async function getActiveWheelForTicker(
  ticker: string
): Promise<ActionResult<ActiveWheelForForm | null>> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return { success: false, error: 'Not authenticated' }
  }

  const normalizedTicker = ticker.trim().toUpperCase()
  if (!normalizedTicker) {
    return { success: false, error: 'Ticker is required' }
  }

  try {
    const wheel = await prisma.wheel.findFirst({
      where: {
        userId,
        ticker: normalizedTicker,
        status: { in: ['ACTIVE', 'IDLE'] },
      },
      orderBy: { lastActivityAt: 'desc' },
      select: {
        id: true,
        ticker: true,
        status: true,
        cycleCount: true,
        totalPremiums: true,
      },
    })

    if (!wheel) {
      return { success: true, data: null }
    }

    const data: ActiveWheelForForm = {
      id: wheel.id,
      ticker: wheel.ticker,
      status: wheel.status,
      cycleCount: wheel.cycleCount,
      totalPremiums: Number(wheel.totalPremiums),
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching active wheel for ticker:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch wheel' }
  }
}

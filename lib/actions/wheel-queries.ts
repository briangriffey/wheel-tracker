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
 * Get open positions for a specific ticker (used by trade entry form)
 */
export async function getOpenPositionsForTicker(
  ticker: string
): Promise<ActionResult<OpenPositionForForm[]>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    const normalizedTicker = ticker.trim().toUpperCase()
    if (!normalizedTicker) {
      return { success: false, error: 'Ticker is required' }
    }

    const positions = await prisma.position.findMany({
      where: {
        userId,
        ticker: normalizedTicker,
        status: 'OPEN',
      },
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
      orderBy: { acquiredDate: 'desc' },
    })

    const result: OpenPositionForForm[] = positions.map((pos) => ({
      id: pos.id,
      ticker: pos.ticker,
      shares: pos.shares,
      costBasis: Number(pos.costBasis),
      acquiredDate: pos.acquiredDate,
      wheelId: pos.wheelId,
      hasOpenCall: pos.coveredCalls.length > 0,
    }))

    return { success: true, data: result }
  } catch (error) {
    console.error('Error fetching open positions for ticker:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch positions' }
  }
}

/**
 * Get active/idle wheel for a specific ticker (used by trade entry form)
 */
export async function getActiveWheelForTicker(
  ticker: string
): Promise<ActionResult<ActiveWheelForForm | null>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    const normalizedTicker = ticker.trim().toUpperCase()
    if (!normalizedTicker) {
      return { success: false, error: 'Ticker is required' }
    }

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

    return {
      success: true,
      data: {
        id: wheel.id,
        ticker: wheel.ticker,
        status: wheel.status,
        cycleCount: wheel.cycleCount,
        totalPremiums: Number(wheel.totalPremiums),
      },
    }
  } catch (error) {
    console.error('Error fetching active wheel for ticker:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch wheel' }
  }
}

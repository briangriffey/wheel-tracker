import { prisma } from '@/lib/db'
import type { Position, PositionStatus } from '@/lib/generated/prisma'
import { Prisma } from '@/lib/generated/prisma'

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
 * Extended Position type with calculated fields and relations
 */
export interface PositionWithCalculations extends Position {
  assignmentTrade: {
    id: string
    ticker: string
    strikePrice: Prisma.Decimal
    premium: Prisma.Decimal
    expirationDate: Date
    openDate?: Date
  }
  coveredCalls: Array<{
    id: string
    premium: Prisma.Decimal
    strikePrice: Prisma.Decimal
    expirationDate: Date
    status: string
    openDate?: Date
  }>
  unrealizedPL?: number
  unrealizedPLPercent?: number
  daysHeld: number
  coveredCallsPremium: number
  netCostBasis: number
}

/**
 * Options for filtering positions
 */
export interface GetPositionsOptions {
  status?: PositionStatus | PositionStatus[]
  ticker?: string
  limit?: number
  offset?: number
  orderBy?: 'ticker' | 'acquiredDate' | 'unrealizedPL' | 'daysHeld'
  orderDirection?: 'asc' | 'desc'
}

/**
 * Calculate days held for a position
 */
function calculateDaysHeld(acquiredDate: Date, closedDate?: Date | null): number {
  const endDate = closedDate || new Date()
  const start = new Date(acquiredDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate total premium from covered calls
 */
function calculateCoveredCallsPremium(
  coveredCalls: Array<{ premium: Prisma.Decimal }>
): number {
  return coveredCalls.reduce((sum, call) => sum + call.premium.toNumber(), 0)
}

/**
 * Add calculated fields to a position
 */
function enrichPosition(
  position: Position & {
    assignmentTrade: {
      id: string
      ticker: string
      strikePrice: Prisma.Decimal
      premium: Prisma.Decimal
      expirationDate: Date
      openDate?: Date
    }
    coveredCalls: Array<{
      id: string
      premium: Prisma.Decimal
      strikePrice: Prisma.Decimal
      expirationDate: Date
      status: string
      openDate?: Date
    }>
  }
): PositionWithCalculations {
  const daysHeld = calculateDaysHeld(position.acquiredDate, position.closedDate)
  const coveredCallsPremium = calculateCoveredCallsPremium(position.coveredCalls)
  const netCostBasis = position.costBasis.toNumber() - coveredCallsPremium / position.shares

  let unrealizedPL: number | undefined
  let unrealizedPLPercent: number | undefined

  if (position.status === 'OPEN' && position.currentValue) {
    const currentValue = position.currentValue.toNumber()
    const totalCost = position.totalCost.toNumber()
    unrealizedPL = currentValue - totalCost + coveredCallsPremium
    unrealizedPLPercent = (unrealizedPL / totalCost) * 100
  }

  return {
    ...position,
    unrealizedPL,
    unrealizedPLPercent,
    daysHeld,
    coveredCallsPremium,
    netCostBasis,
  }
}

/**
 * Get all positions for the current user with optional filters
 */
export async function getPositions(
  options: GetPositionsOptions = {}
): Promise<PositionWithCalculations[]> {
  try {
    const userId = await getCurrentUserId()

    const {
      status,
      ticker,
      limit,
      offset,
      orderBy = 'acquiredDate',
      orderDirection = 'desc',
    } = options

    // Build where clause
    const where: Record<string, unknown> = { userId }

    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status }
      } else {
        where.status = status
      }
    }

    if (ticker) {
      where.ticker = ticker.toUpperCase()
    }

    // Determine Prisma orderBy based on custom fields
    let prismaOrderBy: Record<string, string> = {}
    if (orderBy === 'unrealizedPL' || orderBy === 'daysHeld') {
      // For calculated fields, we'll sort in memory after enriching
      prismaOrderBy = { acquiredDate: 'desc' }
    } else {
      prismaOrderBy = { [orderBy]: orderDirection }
    }

    // Fetch positions
    const positions = await prisma.position.findMany({
      where,
      orderBy: prismaOrderBy,
      take: limit,
      skip: offset,
      include: {
        assignmentTrade: {
          select: {
            id: true,
            ticker: true,
            strikePrice: true,
            premium: true,
            expirationDate: true,
          },
        },
        coveredCalls: {
          select: {
            id: true,
            premium: true,
            strikePrice: true,
            expirationDate: true,
            status: true,
          },
        },
      },
    })

    // Enrich positions with calculated fields
    const enrichedPositions = positions.map(enrichPosition)

    // Apply sorting for calculated fields
    if (orderBy === 'unrealizedPL') {
      enrichedPositions.sort((a, b) => {
        const aValue = a.unrealizedPL ?? 0
        const bValue = b.unrealizedPL ?? 0
        return orderDirection === 'asc' ? aValue - bValue : bValue - aValue
      })
    } else if (orderBy === 'daysHeld') {
      enrichedPositions.sort((a, b) => {
        return orderDirection === 'asc' ? a.daysHeld - b.daysHeld : b.daysHeld - a.daysHeld
      })
    }

    return enrichedPositions
  } catch (error) {
    console.error('Error fetching positions:', error)
    throw new Error('Failed to fetch positions')
  }
}

/**
 * Get a specific position by ID
 */
export async function getPosition(id: string): Promise<PositionWithCalculations | null> {
  try {
    const userId = await getCurrentUserId()

    const position = await prisma.position.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        assignmentTrade: {
          select: {
            id: true,
            ticker: true,
            strikePrice: true,
            premium: true,
            expirationDate: true,
            openDate: true,
          },
        },
        coveredCalls: {
          select: {
            id: true,
            premium: true,
            strikePrice: true,
            expirationDate: true,
            status: true,
            openDate: true,
          },
        },
      },
    })

    if (!position) {
      return null
    }

    return enrichPosition(position)
  } catch (error) {
    console.error('Error fetching position:', error)
    throw new Error('Failed to fetch position')
  }
}

/**
 * Get all open positions for the current user
 */
export async function getOpenPositions(): Promise<PositionWithCalculations[]> {
  return getPositions({ status: 'OPEN' })
}

/**
 * Get position statistics for the current user
 */
export async function getPositionStats() {
  try {
    const userId = await getCurrentUserId()

    const [totalPositions, openPositions, closedPositions, expiredPositions, totals, openWithValues] =
      await Promise.all([
        // Total positions
        prisma.position.count({ where: { userId } }),
        // Open positions
        prisma.position.count({ where: { userId, status: 'OPEN' } }),
        // Closed positions
        prisma.position.count({ where: { userId, status: 'CLOSED' } }),
        // Expired positions
        prisma.position.count({ where: { userId, status: 'EXPIRED' } }),
        // Aggregated totals
        prisma.position.aggregate({
          where: { userId },
          _sum: {
            totalCost: true,
            currentValue: true,
            realizedGainLoss: true,
          },
        }),
        // Get open positions for unrealized P&L calculation
        prisma.position.findMany({
          where: {
            userId,
            status: 'OPEN',
          },
          select: {
            totalCost: true,
            currentValue: true,
            coveredCalls: {
              select: {
                premium: true,
              },
            },
          },
        }),
      ])

    // Calculate total unrealized P&L for open positions
    const totalUnrealizedPL = openWithValues.reduce((sum: number, pos) => {
      if (!pos.currentValue) return sum
      const coveredCallsPremium = pos.coveredCalls.reduce(
        (callSum: number, call) => callSum + call.premium.toNumber(),
        0
      )
      const unrealizedPL =
        pos.currentValue.toNumber() - pos.totalCost.toNumber() + coveredCallsPremium
      return sum + unrealizedPL
    }, 0)

    // Calculate total capital deployed (open positions only)
    const totalCapitalDeployed = openWithValues.reduce((sum: number, pos) => {
      return sum + pos.totalCost.toNumber()
    }, 0)

    return {
      totalPositions,
      openPositions,
      closedPositions,
      expiredPositions,
      totalCapitalDeployed,
      totalUnrealizedPL,
      totalRealizedPL: totals._sum.realizedGainLoss?.toNumber() || 0,
      totalCurrentValue: totals._sum.currentValue?.toNumber() || 0,
    }
  } catch (error) {
    console.error('Error fetching position stats:', error)
    throw new Error('Failed to fetch position statistics')
  }
}

/**
 * Get positions grouped by ticker
 */
export async function getPositionsByTicker(): Promise<Map<string, PositionWithCalculations[]>> {
  try {
    const positions = await getPositions()

    const positionsByTicker = new Map<string, PositionWithCalculations[]>()

    for (const position of positions) {
      const existing = positionsByTicker.get(position.ticker) || []
      existing.push(position)
      positionsByTicker.set(position.ticker, existing)
    }

    return positionsByTicker
  } catch (error) {
    console.error('Error fetching positions by ticker:', error)
    throw new Error('Failed to fetch positions by ticker')
  }
}

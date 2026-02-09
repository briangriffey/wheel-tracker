import { prisma } from '@/lib/db'
import type { Trade, TradeStatus, TradeType } from '@/lib/generated/prisma'

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
 * Options for filtering trades
 */
export interface GetTradesOptions {
  status?: TradeStatus | TradeStatus[]
  type?: TradeType
  ticker?: string
  limit?: number
  offset?: number
  orderBy?: 'expirationDate' | 'openDate' | 'premium' | 'ticker'
  orderDirection?: 'asc' | 'desc'
}

/**
 * Get all trades for the current user with optional filters
 */
export async function getTrades(options: GetTradesOptions = {}): Promise<Trade[]> {
  try {
    const userId = await getCurrentUserId()

    const {
      status,
      type,
      ticker,
      limit,
      offset,
      orderBy = 'expirationDate',
      orderDirection = 'asc',
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

    if (type) {
      where.type = type
    }

    if (ticker) {
      where.ticker = ticker.toUpperCase()
    }

    // Fetch trades
    const trades = await prisma.trade.findMany({
      where,
      orderBy: { [orderBy]: orderDirection },
      take: limit,
      skip: offset,
      include: {
        position: {
          select: {
            id: true,
            ticker: true,
            shares: true,
            status: true,
          },
        },
      },
    })

    return trades
  } catch (error) {
    console.error('Error fetching trades:', error)
    throw new Error('Failed to fetch trades')
  }
}

/**
 * Get a specific trade by ID
 */
export async function getTrade(id: string) {
  try {
    const userId = await getCurrentUserId()

    const trade = await prisma.trade.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        position: {
          select: {
            id: true,
            ticker: true,
            shares: true,
            costBasis: true,
            status: true,
          },
        },
        createdPosition: {
          select: {
            id: true,
            ticker: true,
            shares: true,
            costBasis: true,
            status: true,
          },
        },
        wheel: {
          select: {
            id: true,
            ticker: true,
            status: true,
          },
        },
      },
    })

    return trade
  } catch (error) {
    console.error('Error fetching trade:', error)
    throw new Error('Failed to fetch trade')
  }
}

/**
 * Get all open trades for the current user
 */
export async function getOpenTrades(): Promise<Trade[]> {
  try {
    const userId = await getCurrentUserId()

    const trades = await prisma.trade.findMany({
      where: {
        userId,
        status: 'OPEN',
      },
      orderBy: {
        expirationDate: 'asc',
      },
      include: {
        position: {
          select: {
            id: true,
            ticker: true,
            shares: true,
            status: true,
          },
        },
      },
    })

    return trades
  } catch (error) {
    console.error('Error fetching open trades:', error)
    throw new Error('Failed to fetch open trades')
  }
}

/**
 * Get trades grouped by ticker
 */
export async function getTradesByTicker(): Promise<Map<string, Trade[]>> {
  try {
    const trades = await getTrades()

    const tradesByTicker = new Map<string, Trade[]>()

    for (const trade of trades) {
      const existing = tradesByTicker.get(trade.ticker) || []
      existing.push(trade)
      tradesByTicker.set(trade.ticker, existing)
    }

    return tradesByTicker
  } catch (error) {
    console.error('Error fetching trades by ticker:', error)
    throw new Error('Failed to fetch trades by ticker')
  }
}

/**
 * Get trade statistics for the current user
 */
export async function getTradeStats() {
  try {
    const userId = await getCurrentUserId()

    const [totalTrades, openTrades, closedTrades, expiredTrades, assignedTrades, totalPremium] =
      await Promise.all([
        // Total trades
        prisma.trade.count({ where: { userId } }),
        // Open trades
        prisma.trade.count({ where: { userId, status: 'OPEN' } }),
        // Closed trades
        prisma.trade.count({ where: { userId, status: 'CLOSED' } }),
        // Expired trades
        prisma.trade.count({ where: { userId, status: 'EXPIRED' } }),
        // Assigned trades
        prisma.trade.count({ where: { userId, status: 'ASSIGNED' } }),
        // Total premium collected
        prisma.trade.aggregate({
          where: { userId },
          _sum: { premium: true },
        }),
      ])

    return {
      totalTrades,
      openTrades,
      closedTrades,
      expiredTrades,
      assignedTrades,
      totalPremium: totalPremium._sum.premium?.toNumber() || 0,
    }
  } catch (error) {
    console.error('Error fetching trade stats:', error)
    throw new Error('Failed to fetch trade statistics')
  }
}

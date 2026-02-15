import { prisma } from '@/lib/db'
import type { Trade } from '@/lib/generated/prisma'

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
 * Get all OPEN trades grouped by expiration date
 *
 * Returns trades sorted by expiration date, useful for the expiration calendar.
 * Only includes OPEN trades since closed/expired/assigned trades don't need processing.
 *
 * @param daysAhead - Number of days ahead to look (default: 30)
 * @returns Array of trades sorted by expiration date
 */
export async function getExpiringTrades(daysAhead: number = 30): Promise<Trade[]> {
  try {
    const userId = await getCurrentUserId()
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + daysAhead)

    const trades = await prisma.trade.findMany({
      where: {
        userId,
        status: 'OPEN',
        expirationDate: {
          lte: futureDate,
        },
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
    console.error('Error fetching expiring trades:', error)
    throw new Error('Failed to fetch expiring trades')
  }
}

/**
 * Get trades expiring on a specific date
 *
 * @param date - The expiration date to filter by
 * @returns Array of trades expiring on that date
 */
export async function getTradesByExpirationDate(date: Date): Promise<Trade[]> {
  try {
    const userId = await getCurrentUserId()

    // Normalize date to midnight
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const trades = await prisma.trade.findMany({
      where: {
        userId,
        status: 'OPEN',
        expirationDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        ticker: 'asc',
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
    console.error('Error fetching trades by expiration date:', error)
    throw new Error('Failed to fetch trades by expiration date')
  }
}

/**
 * Group trades by expiration date
 *
 * @param trades - Array of trades to group
 * @returns Map of date string to array of trades
 */
export function groupTradesByExpiration(trades: Trade[]): Map<string, Trade[]> {
  const grouped = new Map<string, Trade[]>()

  for (const trade of trades) {
    // Format date as YYYY-MM-DD for consistent grouping
    const dateKey = trade.expirationDate.toISOString().split('T')[0]
    const existing = grouped.get(dateKey) || []
    existing.push(trade)
    grouped.set(dateKey, existing)
  }

  return grouped
}

/**
 * Get unique tickers from trades
 *
 * @param trades - Array of trades
 * @returns Array of unique ticker symbols
 */
export function getUniqueTickers(trades: Trade[]): string[] {
  const tickers = new Set<string>()
  for (const trade of trades) {
    tickers.add(trade.ticker)
  }
  return Array.from(tickers)
}

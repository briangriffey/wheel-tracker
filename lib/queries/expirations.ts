import { prisma } from '@/lib/db'
import type { Trade, TradeType } from '@/lib/generated/prisma'

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
 * Trade with additional calculated fields for expirations
 */
export interface ExpirationTrade extends Trade {
  daysUntil: number
  colorClass: string
}

/**
 * Grouped expirations by date
 */
export interface ExpirationsByDate {
  date: Date
  dateString: string
  trades: ExpirationTrade[]
  count: number
}

/**
 * Filter options for expirations
 */
export interface ExpirationFilters {
  ticker?: string
  type?: TradeType
  daysRange?: 'urgent' | 'soon' | 'later' // <7, 7-14, 14+
}

/**
 * Calculate days until expiration
 */
export function calculateDaysUntilExpiration(expirationDate: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Reset to start of day

  const expiration = new Date(expirationDate)
  expiration.setHours(0, 0, 0, 0) // Reset to start of day

  const diffTime = expiration.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Get color class based on days until expiration
 * Red: <7 days (urgent)
 * Yellow: 7-14 days (soon)
 * Green: 14+ days (later)
 */
export function getExpirationColorClass(daysUntil: number): string {
  if (daysUntil < 0) {
    return 'text-red-700 bg-red-50 border-red-300' // Past expiration
  } else if (daysUntil < 7) {
    return 'text-red-600 bg-red-50 border-red-200' // Urgent
  } else if (daysUntil < 14) {
    return 'text-yellow-600 bg-yellow-50 border-yellow-200' // Soon
  } else {
    return 'text-green-600 bg-green-50 border-green-200' // Later
  }
}

/**
 * Get urgency label based on days until expiration
 */
export function getExpirationUrgency(daysUntil: number): 'urgent' | 'soon' | 'later' {
  if (daysUntil < 7) return 'urgent'
  if (daysUntil < 14) return 'soon'
  return 'later'
}

/**
 * Enrich trade with expiration calculations
 */
function enrichTradeWithExpiration(trade: Trade): ExpirationTrade {
  const daysUntil = calculateDaysUntilExpiration(trade.expirationDate)
  const colorClass = getExpirationColorClass(daysUntil)

  return {
    ...trade,
    daysUntil,
    colorClass,
  }
}

/**
 * Get upcoming expirations (OPEN trades only)
 * @param days - Number of days to look ahead (default 30)
 * @param filters - Optional filters for ticker, type, etc.
 */
export async function getUpcomingExpirations(
  days: number = 30,
  filters?: ExpirationFilters
): Promise<ExpirationTrade[]> {
  try {
    const userId = await getCurrentUserId()

    // Calculate date range
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    // Build where clause
    const where: Record<string, unknown> = {
      userId,
      status: 'OPEN',
      expirationDate: {
        lte: futureDate,
      },
    }

    if (filters?.ticker) {
      where.ticker = filters.ticker.toUpperCase()
    }

    if (filters?.type) {
      where.type = filters.type
    }

    // Fetch trades
    const trades = await prisma.trade.findMany({
      where,
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

    // Enrich with expiration data and filter by days range if specified
    let enrichedTrades = trades.map(enrichTradeWithExpiration)

    if (filters?.daysRange) {
      enrichedTrades = enrichedTrades.filter((trade) => {
        const urgency = getExpirationUrgency(trade.daysUntil)
        return urgency === filters.daysRange
      })
    }

    return enrichedTrades
  } catch (error) {
    console.error('Error fetching upcoming expirations:', error)
    throw new Error('Failed to fetch upcoming expirations')
  }
}

/**
 * Get expirations grouped by date
 * Useful for calendar view
 */
export async function getExpirationsByDate(
  days: number = 30,
  filters?: ExpirationFilters
): Promise<ExpirationsByDate[]> {
  try {
    const trades = await getUpcomingExpirations(days, filters)

    // Group by date
    const groupedMap = new Map<string, ExpirationTrade[]>()

    for (const trade of trades) {
      const dateString = trade.expirationDate.toISOString().split('T')[0]

      if (!groupedMap.has(dateString)) {
        groupedMap.set(dateString, [])
      }

      groupedMap.get(dateString)!.push(trade)
    }

    // Convert to array and sort by date
    const grouped: ExpirationsByDate[] = Array.from(groupedMap.entries())
      .map(([dateString, trades]) => ({
        date: new Date(dateString),
        dateString,
        trades,
        count: trades.length,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    return grouped
  } catch (error) {
    console.error('Error fetching expirations by date:', error)
    throw new Error('Failed to fetch expirations by date')
  }
}

/**
 * Get next N upcoming expirations
 * Useful for dashboard widget
 */
export async function getNextExpirations(count: number = 5): Promise<ExpirationTrade[]> {
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
      take: count,
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

    return trades.map(enrichTradeWithExpiration)
  } catch (error) {
    console.error('Error fetching next expirations:', error)
    throw new Error('Failed to fetch next expirations')
  }
}

/**
 * Get expiration statistics
 */
export async function getExpirationStats() {
  try {
    const userId = await getCurrentUserId()

    const next7Days = new Date()
    next7Days.setDate(next7Days.getDate() + 7)

    const next14Days = new Date()
    next14Days.setDate(next14Days.getDate() + 14)

    const next30Days = new Date()
    next30Days.setDate(next30Days.getDate() + 30)

    const [urgent, soon, later, total] = await Promise.all([
      // Urgent (<7 days)
      prisma.trade.count({
        where: {
          userId,
          status: 'OPEN',
          expirationDate: {
            lte: next7Days,
          },
        },
      }),
      // Soon (7-14 days)
      prisma.trade.count({
        where: {
          userId,
          status: 'OPEN',
          expirationDate: {
            gt: next7Days,
            lte: next14Days,
          },
        },
      }),
      // Later (14-30 days)
      prisma.trade.count({
        where: {
          userId,
          status: 'OPEN',
          expirationDate: {
            gt: next14Days,
            lte: next30Days,
          },
        },
      }),
      // Total open trades
      prisma.trade.count({
        where: {
          userId,
          status: 'OPEN',
        },
      }),
    ])

    return {
      urgent,
      soon,
      later,
      total,
    }
  } catch (error) {
    console.error('Error fetching expiration stats:', error)
    throw new Error('Failed to fetch expiration statistics')
  }
}

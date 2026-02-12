import { cache } from 'react'
import { prisma } from '@/lib/db'
import type { Prisma } from '@/lib/generated/prisma'
import { getLatestPrice } from '@/lib/services/market-data'

/**
 * Get the current user ID
 * TODO: Replace with actual session-based authentication
 * Cached to avoid duplicate queries within the same request
 */
const getCurrentUserId = cache(async (): Promise<string> => {
  // This is a placeholder - in production, get this from NextAuth session
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found. Please create a user first.')
  }
  return user.id
})

/**
 * Time range type for filtering dashboard data
 */
export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All'

/**
 * Calculate date threshold for time range
 */
function getDateThreshold(timeRange: TimeRange): Date | null {
  if (timeRange === 'All') return null

  const now = new Date()
  const threshold = new Date(now)

  switch (timeRange) {
    case '1M':
      threshold.setMonth(now.getMonth() - 1)
      break
    case '3M':
      threshold.setMonth(now.getMonth() - 3)
      break
    case '6M':
      threshold.setMonth(now.getMonth() - 6)
      break
    case '1Y':
      threshold.setFullYear(now.getFullYear() - 1)
      break
  }

  return threshold
}

/**
 * Dashboard metrics type
 */
export interface DashboardMetrics {
  // Portfolio overview
  totalPortfolioValue: number
  spyComparisonValue: number
  cashDeposits: number

  // Stock metrics
  totalPL: number
  realizedPL: number
  unrealizedPL: number
  distinctStockCount: number

  // Options metrics
  totalPremiumCollected: number
  winRate: number
  assignmentRate: number
  openContracts: number
}

/**
 * P&L over time data point
 */
export interface PLOverTimeDataPoint {
  date: string // ISO date string
  realizedPL: number
  unrealizedPL: number
  totalPL: number
}

/**
 * P&L by ticker data point
 */
export interface PLByTickerDataPoint {
  ticker: string
  realizedPL: number
  unrealizedPL: number
  totalPL: number
}

/**
 * Win rate data
 */
export interface WinRateData {
  winners: number
  losers: number
  breakeven: number
  totalTrades: number
  winRate: number
}

/**
 * Get dashboard metrics for the current user
 * Cached to avoid duplicate queries within the same request
 */
export const getDashboardMetrics = cache(async (
  timeRange: TimeRange = 'All'
): Promise<DashboardMetrics> => {
  try {
    const userId = await getCurrentUserId()
    const dateThreshold = getDateThreshold(timeRange)

    // Build date filter
    const dateFilter = dateThreshold ? { gte: dateThreshold } : undefined

    // Fetch all data in parallel with optimized queries
    const [positionStats, trades, openPositions, closedPositions, cashDepositAgg, spyPrice, distinctStocks] = await Promise.all([
      // Position aggregates
      prisma.position.aggregate({
        where: {
          userId,
          ...(dateFilter && { acquiredDate: dateFilter }),
        },
        _sum: {
          realizedGainLoss: true,
          currentValue: true,
          totalCost: true,
        },
      }),
      // Trades for premium calculation, assignment rate, and open contracts count
      prisma.trade.findMany({
        where: {
          userId,
          ...(dateFilter && { openDate: dateFilter }),
        },
        select: {
          premium: true,
          contracts: true,
          status: true,
        },
      }),
      // Open positions for unrealized P&L (select only needed fields)
      prisma.position.findMany({
        where: {
          userId,
          status: 'OPEN',
          ...(dateFilter && { acquiredDate: dateFilter }),
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
      // Closed positions for win rate (select only needed field)
      prisma.position.findMany({
        where: {
          userId,
          status: 'CLOSED',
          ...(dateFilter && { closedDate: dateFilter }),
        },
        select: {
          realizedGainLoss: true,
        },
      }),
      // Cash deposits aggregate (net invested + total SPY shares)
      prisma.cashDeposit.aggregate({
        where: { userId },
        _sum: { amount: true, spyShares: true },
      }),
      // Current SPY price from cached DB data
      getLatestPrice('SPY'),
      // Distinct stock tickers in open positions
      prisma.position.findMany({
        where: { userId, status: 'OPEN' },
        select: { ticker: true },
        distinct: ['ticker'],
      }),
    ])

    // Calculate realized P&L
    const realizedPL = positionStats._sum.realizedGainLoss?.toNumber() || 0

    // Calculate unrealized P&L
    const unrealizedPL = openPositions.reduce(
      (sum: number, position: (typeof openPositions)[number]) => {
        if (!position.currentValue) return sum
        const coveredCallsPremium = position.coveredCalls.reduce(
          (callSum: number, call: { premium: Prisma.Decimal }) =>
            callSum + call.premium.toNumber(),
          0
        )
        const positionPL =
          position.currentValue.toNumber() - position.totalCost.toNumber() + coveredCallsPremium
        return sum + positionPL
      },
      0
    )

    // Calculate total P&L
    const totalPL = realizedPL + unrealizedPL

    // Calculate total premium collected: contracts × premium × 100 for each trade
    const totalPremiumCollected = trades.reduce((sum, trade) => {
      return sum + (trade.premium.toNumber() * trade.contracts * 100)
    }, 0)

    // Calculate win rate from already-fetched data
    const winners = closedPositions.filter(
      (p: { realizedGainLoss: Prisma.Decimal | null }) =>
        p.realizedGainLoss && p.realizedGainLoss.toNumber() > 0
    ).length
    const totalClosedTrades = closedPositions.length
    const winRate = totalClosedTrades > 0 ? (winners / totalClosedTrades) * 100 : 0

    // Calculate assignment rate from already-fetched data
    const assignedTradesCount = trades.filter(t => t.status === 'ASSIGNED').length
    const totalTradesForAssignment = trades.length
    const assignmentRate =
      totalTradesForAssignment > 0 ? (assignedTradesCount / totalTradesForAssignment) * 100 : 0

    // Calculate total open contracts from already-fetched trades
    const openContractsCount = trades
      .filter(t => t.status === 'OPEN')
      .reduce((sum, trade) => sum + trade.contracts, 0)

    // Calculate portfolio overview metrics
    const netInvested = cashDepositAgg._sum.amount?.toNumber() || 0
    const totalSpyShares = cashDepositAgg._sum.spyShares?.toNumber() || 0
    const currentSPYPrice = spyPrice?.price || 0
    const totalPortfolioValue = netInvested + totalPremiumCollected + unrealizedPL
    const spyComparisonValue = totalSpyShares * currentSPYPrice

    return {
      totalPortfolioValue,
      spyComparisonValue,
      cashDeposits: netInvested,
      totalPL,
      realizedPL,
      unrealizedPL,
      distinctStockCount: distinctStocks.length,
      totalPremiumCollected,
      winRate,
      assignmentRate,
      openContracts: openContractsCount,
    }
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    throw new Error('Failed to fetch dashboard metrics')
  }
})

/**
 * Get P&L over time data
 * Cached to avoid duplicate queries within the same request
 */
export const getPLOverTime = cache(async (timeRange: TimeRange = 'All'): Promise<PLOverTimeDataPoint[]> => {
  try {
    const userId = await getCurrentUserId()
    const dateThreshold = getDateThreshold(timeRange)

    // Build date filter
    const dateFilter = dateThreshold ? { gte: dateThreshold } : undefined

    // Fetch all positions (both open and closed) within time range
    const positions = await prisma.position.findMany({
      where: {
        userId,
        ...(dateFilter && { acquiredDate: dateFilter }),
      },
      select: {
        acquiredDate: true,
        closedDate: true,
        status: true,
        totalCost: true,
        currentValue: true,
        realizedGainLoss: true,
        coveredCalls: {
          select: {
            premium: true,
          },
        },
      },
      orderBy: {
        acquiredDate: 'asc',
      },
    })

    // Group P&L by date
    const plByDate = new Map<string, { realized: number; unrealized: number }>()

    // Process each position
    for (const position of positions) {
      const dateKey = position.acquiredDate.toISOString().split('T')[0]

      // Get or create entry for this date
      const entry = plByDate.get(dateKey) || { realized: 0, unrealized: 0 }

      if (position.status === 'CLOSED' && position.realizedGainLoss) {
        entry.realized += position.realizedGainLoss.toNumber()
      } else if (position.status === 'OPEN' && position.currentValue) {
        const coveredCallsPremium = position.coveredCalls.reduce(
          (sum: number, call: { premium: Prisma.Decimal }) => sum + call.premium.toNumber(),
          0
        )
        const unrealizedPL =
          position.currentValue.toNumber() - position.totalCost.toNumber() + coveredCallsPremium
        entry.unrealized += unrealizedPL
      }

      plByDate.set(dateKey, entry)
    }

    // Convert to array and calculate cumulative totals
    const dataPoints: PLOverTimeDataPoint[] = []
    let cumulativeRealized = 0
    let cumulativeUnrealized = 0

    for (const [date, values] of Array.from(plByDate.entries()).sort()) {
      cumulativeRealized += values.realized
      cumulativeUnrealized = values.unrealized // Unrealized is snapshot, not cumulative

      dataPoints.push({
        date,
        realizedPL: cumulativeRealized,
        unrealizedPL: cumulativeUnrealized,
        totalPL: cumulativeRealized + cumulativeUnrealized,
      })
    }

    // If no data, return empty array
    if (dataPoints.length === 0) {
      return []
    }

    // Fill in missing dates with last known values
    const filledDataPoints: PLOverTimeDataPoint[] = []
    const startDate = new Date(dataPoints[0].date)
    const endDate = new Date()

    let lastRealized = 0
    let lastUnrealized = 0

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0]
      const dataPoint = dataPoints.find((dp) => dp.date === dateKey)

      if (dataPoint) {
        lastRealized = dataPoint.realizedPL
        lastUnrealized = dataPoint.unrealizedPL
        filledDataPoints.push(dataPoint)
      } else {
        filledDataPoints.push({
          date: dateKey,
          realizedPL: lastRealized,
          unrealizedPL: lastUnrealized,
          totalPL: lastRealized + lastUnrealized,
        })
      }
    }

    return filledDataPoints
  } catch (error) {
    console.error('Error fetching P&L over time:', error)
    throw new Error('Failed to fetch P&L over time data')
  }
})

/**
 * Get P&L by ticker
 * Cached to avoid duplicate queries within the same request
 */
export const getPLByTicker = cache(async (timeRange: TimeRange = 'All'): Promise<PLByTickerDataPoint[]> => {
  try {
    const userId = await getCurrentUserId()
    const dateThreshold = getDateThreshold(timeRange)

    // Build date filter
    const dateFilter = dateThreshold ? { gte: dateThreshold } : undefined

    // Fetch all positions within time range
    const positions = await prisma.position.findMany({
      where: {
        userId,
        ...(dateFilter && { acquiredDate: dateFilter }),
      },
      select: {
        ticker: true,
        status: true,
        totalCost: true,
        currentValue: true,
        realizedGainLoss: true,
        coveredCalls: {
          select: {
            premium: true,
          },
        },
      },
    })

    // Group P&L by ticker
    const plByTicker = new Map<string, { realized: number; unrealized: number }>()

    for (const position of positions) {
      const entry = plByTicker.get(position.ticker) || { realized: 0, unrealized: 0 }

      if (position.status === 'CLOSED' && position.realizedGainLoss) {
        entry.realized += position.realizedGainLoss.toNumber()
      } else if (position.status === 'OPEN' && position.currentValue) {
        const coveredCallsPremium = position.coveredCalls.reduce(
          (sum: number, call: { premium: Prisma.Decimal }) => sum + call.premium.toNumber(),
          0
        )
        const unrealizedPL =
          position.currentValue.toNumber() - position.totalCost.toNumber() + coveredCallsPremium
        entry.unrealized += unrealizedPL
      }

      plByTicker.set(position.ticker, entry)
    }

    // Convert to array
    const dataPoints: PLByTickerDataPoint[] = Array.from(plByTicker.entries())
      .map(([ticker, values]) => ({
        ticker,
        realizedPL: values.realized,
        unrealizedPL: values.unrealized,
        totalPL: values.realized + values.unrealized,
      }))
      .sort((a, b) => b.totalPL - a.totalPL) // Sort by total P&L descending

    return dataPoints
  } catch (error) {
    console.error('Error fetching P&L by ticker:', error)
    throw new Error('Failed to fetch P&L by ticker data')
  }
})

/**
 * Get win rate data
 * Cached to avoid duplicate queries within the same request
 */
export const getWinRateData = cache(async (timeRange: TimeRange = 'All'): Promise<WinRateData> => {
  try {
    const userId = await getCurrentUserId()
    const dateThreshold = getDateThreshold(timeRange)

    // Build date filter
    const dateFilter = dateThreshold ? { gte: dateThreshold } : undefined

    // Fetch closed positions
    const closedPositions = await prisma.position.findMany({
      where: {
        userId,
        status: 'CLOSED',
        ...(dateFilter && { closedDate: dateFilter }),
      },
      select: {
        realizedGainLoss: true,
      },
    })

    // Categorize positions
    const winners = closedPositions.filter(
      (p: { realizedGainLoss: Prisma.Decimal | null }) =>
        p.realizedGainLoss && p.realizedGainLoss.toNumber() > 0
    ).length
    const losers = closedPositions.filter(
      (p: { realizedGainLoss: Prisma.Decimal | null }) =>
        p.realizedGainLoss && p.realizedGainLoss.toNumber() < 0
    ).length
    const breakeven = closedPositions.filter(
      (p: { realizedGainLoss: Prisma.Decimal | null }) =>
        p.realizedGainLoss && p.realizedGainLoss.toNumber() === 0
    ).length

    const totalTrades = closedPositions.length
    const winRate = totalTrades > 0 ? (winners / totalTrades) * 100 : 0

    return {
      winners,
      losers,
      breakeven,
      totalTrades,
      winRate,
    }
  } catch (error) {
    console.error('Error fetching win rate data:', error)
    throw new Error('Failed to fetch win rate data')
  }
})

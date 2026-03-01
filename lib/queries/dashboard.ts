import { cache } from 'react'
import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import type { Prisma } from '@/lib/generated/prisma'
import { getLatestPrice } from '@/lib/services/market-data'

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
  optionsWinRate: number
  assignmentRate: number
  openContracts: number

  // Deployed capital
  deployedCapitalAmount: number
  deployedCapitalPercent: number | null
  accountValue: number
}

/**
 * P&L over time data point
 */
export interface PLOverTimeDataPoint {
  date: string // ISO date string
  realizedPL: number
  unrealizedPL: number
  premiumPL: number
  totalPL: number
}

/**
 * P&L by ticker data point
 */
export interface PLByTickerDataPoint {
  ticker: string
  realizedPL: number
  unrealizedPL: number
  premiumPL: number
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
export const getDashboardMetrics = async (
  timeRange: TimeRange = 'All'
): Promise<DashboardMetrics> => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('Not authenticated')
    const dateThreshold = getDateThreshold(timeRange)

    // Build date filter
    const dateFilter = dateThreshold ? { gte: dateThreshold } : undefined

    // Fetch all data in parallel with optimized queries
    const [positionStats, trades, openPositions, , cashDepositAgg, spyPrice, distinctStocks] =
      await Promise.all([
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
          closePremium: true,
          type: true,
          strikePrice: true,
          shares: true,
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
      // (placeholder resolved below — closed positions no longer needed for win rate)
      Promise.resolve([]),
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
          (callSum: number, call: { premium: Prisma.Decimal }) => callSum + call.premium.toNumber(),
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

    // Calculate total premium collected: contracts × (premium - closedPremium) × 100 for each trade
    const totalPremiumCollected = trades.reduce((sum, trade) => {
      const closePremium = trade.closePremium?.toNumber() ?? 0
      return sum + (trade.premium.toNumber() - closePremium) * trade.contracts * 100
    }, 0)

    // Calculate options win rate from trades (EXPIRED and CLOSED)
    const closedOrExpiredTrades = trades.filter(
      (t) => t.status === 'EXPIRED' || t.status === 'CLOSED'
    )
    const optionWinners = closedOrExpiredTrades.filter((t) => {
      if (t.status === 'EXPIRED') return true // kept full premium
      const closePremium = t.closePremium?.toNumber() ?? 0
      return t.premium.toNumber() - closePremium > 0
    }).length
    const totalClosedTrades = closedOrExpiredTrades.length
    const optionsWinRate = totalClosedTrades > 0 ? (optionWinners / totalClosedTrades) * 100 : 0

    // Calculate assignment rate from already-fetched data
    const assignedTradesCount = trades.filter((t) => t.status === 'ASSIGNED').length
    const totalTradesForAssignment = trades.length
    const assignmentRate =
      totalTradesForAssignment > 0 ? (assignedTradesCount / totalTradesForAssignment) * 100 : 0

    // Calculate total open contracts from already-fetched trades
    const openContractsCount = trades
      .filter((t) => t.status === 'OPEN')
      .reduce((sum, trade) => sum + trade.contracts, 0)

    // Calculate portfolio overview metrics
    const netInvested = cashDepositAgg._sum.amount?.toNumber() || 0
    const totalSpyShares = cashDepositAgg._sum.spyShares?.toNumber() || 0
    const currentSPYPrice = spyPrice?.price || 0
    const totalPortfolioValue = netInvested + totalPremiumCollected + unrealizedPL
    const spyComparisonValue = totalSpyShares * currentSPYPrice

    // Calculate deployed capital
    const openPutCapital = trades
      .filter((t) => t.status === 'OPEN' && t.type === 'PUT')
      .reduce((sum, trade) => sum + trade.strikePrice.toNumber() * trade.shares, 0)

    const openPositionCapital = openPositions.reduce(
      (sum, position) => sum + position.totalCost.toNumber(),
      0
    )

    const deployedCapitalAmount = openPutCapital + openPositionCapital
    const deployedCapitalPercent = netInvested > 0
      ? (deployedCapitalAmount / netInvested) * 100
      : null

    return {
      totalPortfolioValue,
      spyComparisonValue,
      cashDeposits: netInvested,
      totalPL,
      realizedPL,
      unrealizedPL,
      distinctStockCount: distinctStocks.length,
      totalPremiumCollected,
      optionsWinRate,
      assignmentRate,
      openContracts: openContractsCount,
      deployedCapitalAmount,
      deployedCapitalPercent,
      accountValue: netInvested,
    }
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    throw new Error('Failed to fetch dashboard metrics')
  }
}

/**
 * Get P&L over time data
 * Cached to avoid duplicate queries within the same request
 */
export const getPLOverTime = cache(
  async (timeRange: TimeRange = 'All'): Promise<PLOverTimeDataPoint[]> => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Not authenticated')
      const dateThreshold = getDateThreshold(timeRange)

      // Build date filter
      const dateFilter = dateThreshold ? { gte: dateThreshold } : undefined

      // Fetch positions and non-ASSIGNED trades in parallel
      const [positions, trades] = await Promise.all([
        prisma.position.findMany({
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
        }),
        prisma.trade.findMany({
          where: {
            userId,
            status: { not: 'ASSIGNED' },
            ...(dateFilter && { openDate: dateFilter }),
          },
          select: {
            openDate: true,
            closeDate: true,
            status: true,
            premium: true,
            closePremium: true,
            contracts: true,
            positionId: true,
          },
        }),
      ])

      // Group P&L by date
      const plByDate = new Map<
        string,
        { realized: number; unrealized: number; premium: number; standalonePremium: number }
      >()

      // Process each position
      for (const position of positions) {
        const dateKey = position.acquiredDate.toISOString().split('T')[0]

        const entry = plByDate.get(dateKey) || {
          realized: 0,
          unrealized: 0,
          premium: 0,
          standalonePremium: 0,
        }

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

      // Process trades for premium
      // Premium fields are per-share; multiply by contracts * 100 for total dollar amount
      for (const trade of trades) {
        const multiplier = trade.contracts * 100

        // Premium collected on open date
        const openDateKey = trade.openDate.toISOString().split('T')[0]
        const openEntry = plByDate.get(openDateKey) || {
          realized: 0,
          unrealized: 0,
          premium: 0,
          standalonePremium: 0,
        }
        const premiumAmount = trade.premium.toNumber() * multiplier
        openEntry.premium += premiumAmount
        if (!trade.positionId) {
          openEntry.standalonePremium += premiumAmount
        }
        plByDate.set(openDateKey, openEntry)

        // Cost to close on close date (CLOSED trades only)
        if (trade.status === 'CLOSED' && trade.closeDate && trade.closePremium) {
          const closeDateKey = trade.closeDate.toISOString().split('T')[0]
          const closeEntry = plByDate.get(closeDateKey) || {
            realized: 0,
            unrealized: 0,
            premium: 0,
            standalonePremium: 0,
          }
          const closePremiumAmount = trade.closePremium.toNumber() * multiplier
          closeEntry.premium -= closePremiumAmount
          if (!trade.positionId) {
            closeEntry.standalonePremium -= closePremiumAmount
          }
          plByDate.set(closeDateKey, closeEntry)
        }
      }

      // Convert to array and calculate cumulative totals
      const dataPoints: PLOverTimeDataPoint[] = []
      let cumulativeRealized = 0
      let cumulativeUnrealized = 0
      let cumulativePremium = 0
      let cumulativeStandalonePremium = 0

      for (const [date, values] of Array.from(plByDate.entries()).sort()) {
        cumulativeRealized += values.realized
        cumulativeUnrealized = values.unrealized // Unrealized is snapshot, not cumulative
        cumulativePremium += values.premium
        cumulativeStandalonePremium += values.standalonePremium

        dataPoints.push({
          date,
          realizedPL: cumulativeRealized,
          unrealizedPL: cumulativeUnrealized,
          premiumPL: cumulativePremium,
          totalPL: cumulativeRealized + cumulativeUnrealized + cumulativeStandalonePremium,
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
      let lastPremium = 0
      let lastStandalonePremium = 0

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0]
        const dataPoint = dataPoints.find((dp) => dp.date === dateKey)

        if (dataPoint) {
          lastRealized = dataPoint.realizedPL
          lastUnrealized = dataPoint.unrealizedPL
          lastPremium = dataPoint.premiumPL
          // Recalculate lastStandalonePremium from the totalPL formula
          lastStandalonePremium = dataPoint.totalPL - lastRealized - lastUnrealized
          filledDataPoints.push(dataPoint)
        } else {
          filledDataPoints.push({
            date: dateKey,
            realizedPL: lastRealized,
            unrealizedPL: lastUnrealized,
            premiumPL: lastPremium,
            totalPL: lastRealized + lastUnrealized + lastStandalonePremium,
          })
        }
      }

      return filledDataPoints
    } catch (error) {
      console.error('Error fetching P&L over time:', error)
      throw new Error('Failed to fetch P&L over time data')
    }
  }
)

/**
 * Get P&L by ticker
 * Cached to avoid duplicate queries within the same request
 */
export const getPLByTicker = cache(
  async (timeRange: TimeRange = 'All'): Promise<PLByTickerDataPoint[]> => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Not authenticated')
      const dateThreshold = getDateThreshold(timeRange)

      // Build date filter
      const dateFilter = dateThreshold ? { gte: dateThreshold } : undefined

      // Fetch positions and non-ASSIGNED trades in parallel
      const [positions, trades] = await Promise.all([
        prisma.position.findMany({
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
        }),
        prisma.trade.findMany({
          where: {
            userId,
            status: { not: 'ASSIGNED' },
            ...(dateFilter && { openDate: dateFilter }),
          },
          select: {
            ticker: true,
            premium: true,
            closePremium: true,
            contracts: true,
            positionId: true,
          },
        }),
      ])

      // Group P&L by ticker
      const plByTicker = new Map<
        string,
        { realized: number; unrealized: number; premium: number; standalonePremium: number }
      >()

      for (const position of positions) {
        const entry = plByTicker.get(position.ticker) || {
          realized: 0,
          unrealized: 0,
          premium: 0,
          standalonePremium: 0,
        }

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

      // Process trades for premium by ticker
      // Premium fields are per-share; multiply by contracts * 100 for total dollar amount
      for (const trade of trades) {
        const entry = plByTicker.get(trade.ticker) || {
          realized: 0,
          unrealized: 0,
          premium: 0,
          standalonePremium: 0,
        }

        const multiplier = trade.contracts * 100
        const netPremium =
          (trade.premium.toNumber() - (trade.closePremium?.toNumber() || 0)) * multiplier
        entry.premium += netPremium
        if (!trade.positionId) {
          entry.standalonePremium += netPremium
        }

        plByTicker.set(trade.ticker, entry)
      }

      // Convert to array
      const dataPoints: PLByTickerDataPoint[] = Array.from(plByTicker.entries())
        .map(([ticker, values]) => ({
          ticker,
          realizedPL: values.realized,
          unrealizedPL: values.unrealized,
          premiumPL: values.premium,
          totalPL: values.realized + values.unrealized + values.standalonePremium,
        }))
        .sort((a, b) => b.totalPL - a.totalPL) // Sort by total P&L descending

      return dataPoints
    } catch (error) {
      console.error('Error fetching P&L by ticker:', error)
      throw new Error('Failed to fetch P&L by ticker data')
    }
  }
)

/**
 * Get win rate data
 * Cached to avoid duplicate queries within the same request
 */
export const getWinRateData = cache(async (timeRange: TimeRange = 'All'): Promise<WinRateData> => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) throw new Error('Not authenticated')
    const dateThreshold = getDateThreshold(timeRange)

    // Build date filter
    const dateFilter = dateThreshold ? { gte: dateThreshold } : undefined

    // Fetch closed positions and closed/expired trades in parallel
    const [closedPositions, closedTrades] = await Promise.all([
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
      prisma.trade.findMany({
        where: {
          userId,
          status: { in: ['EXPIRED', 'CLOSED'] },
          ...(dateFilter && { closeDate: dateFilter }),
        },
        select: {
          status: true,
          realizedGainLoss: true,
        },
      }),
    ])

    // Categorize positions
    let winners = closedPositions.filter(
      (p: { realizedGainLoss: Prisma.Decimal | null }) =>
        p.realizedGainLoss && p.realizedGainLoss.toNumber() > 0
    ).length
    let losers = closedPositions.filter(
      (p: { realizedGainLoss: Prisma.Decimal | null }) =>
        p.realizedGainLoss && p.realizedGainLoss.toNumber() < 0
    ).length
    let breakeven = closedPositions.filter(
      (p: { realizedGainLoss: Prisma.Decimal | null }) =>
        p.realizedGainLoss && p.realizedGainLoss.toNumber() === 0
    ).length

    // Categorize trades
    for (const trade of closedTrades) {
      if (trade.status === 'EXPIRED') {
        // Expired trades kept full premium - always winners
        winners++
      } else {
        // CLOSED trades - check realizedGainLoss
        const gl = trade.realizedGainLoss?.toNumber() ?? 0
        if (gl > 0) winners++
        else if (gl < 0) losers++
        else breakeven++
      }
    }

    const totalTrades = closedPositions.length + closedTrades.length
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

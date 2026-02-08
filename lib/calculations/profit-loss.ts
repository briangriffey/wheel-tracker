/**
 * Profit & Loss (P&L) Calculation Service
 *
 * Provides comprehensive P&L calculations for the Wheel Tracker application including:
 * - Realized P&L from closed positions and trades
 * - Unrealized P&L from open positions
 * - Per-ticker aggregations
 * - Time-based aggregations (daily, weekly, monthly, YTD, all-time)
 * - Portfolio-level statistics
 */

import { prisma } from '@/lib/db'
import { getLatestPrices } from '@/lib/services/market-data'

/**
 * Time period options for P&L calculations
 */
export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'ytd' | 'all'

/**
 * Options for filtering P&L calculations
 */
export interface PnLCalculationOptions {
  ticker?: string // Filter by specific ticker
  startDate?: Date // Start date for time range
  endDate?: Date // End date for time range
}

/**
 * Per-ticker P&L breakdown
 */
export interface TickerPnL {
  ticker: string
  realizedPnL: number
  unrealizedPnL: number
  totalPnL: number
  unrealizedPnLPercent: number
  currentValue: number
  costBasis: number
}

/**
 * Time-based P&L breakdown
 */
export interface TimeframePnL {
  daily: number
  weekly: number
  monthly: number
  ytd: number
  allTime: number
}

/**
 * Realized P&L result
 */
export interface RealizedPnL {
  total: number
  byTicker: Map<string, number>
  count: number // Number of closed positions/trades
}

/**
 * Unrealized P&L result
 */
export interface UnrealizedPnL {
  total: number
  totalPercent: number
  currentValue: number
  costBasis: number
  byTicker: Map<string, {
    pnl: number
    pnlPercent: number
    currentValue: number
    costBasis: number
  }>
}

/**
 * Portfolio-level statistics
 */
export interface PortfolioStats {
  capitalDeployed: number // Total cost of open positions
  totalPnL: number // Realized + unrealized P&L
  realizedPnL: number
  unrealizedPnL: number
  returnPercent: number // Total P&L / (Capital + realized P&L that was deployed)
  premiumCollected: number // Total premiums from all trades
  winRate: number // Percentage of profitable closed positions
  assignmentRate: number // Percentage of trades assigned
  totalTrades: number
  closedPositions: number
  openPositions: number
  currentValue: number // Current market value of open positions
}

/**
 * Complete P&L analysis result
 */
export interface CompletePnL {
  realized: RealizedPnL
  unrealized: UnrealizedPnL
  byTicker: TickerPnL[]
  byTimeframe: TimeframePnL
  portfolio: PortfolioStats
}

/**
 * Calculate date ranges for different timeframes
 */
function getTimeframeDate(timeframe: Timeframe): Date {
  const now = new Date()

  switch (timeframe) {
    case 'daily':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'weekly':
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return weekAgo
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1)
    case 'all':
      return new Date(0) // Beginning of time
  }
}

/**
 * Calculate realized P&L from closed positions and trades
 *
 * Includes:
 * - Realized gain/loss from closed positions
 * - Premiums from expired/closed trades
 *
 * @param userId - User ID to calculate for
 * @param options - Optional filtering options
 * @returns Realized P&L breakdown
 */
export async function calculateRealizedPnL(
  userId: string,
  options: PnLCalculationOptions = {}
): Promise<RealizedPnL> {
  const { ticker, startDate, endDate } = options

  // Build where clause for filtering
  const positionWhere: Record<string, unknown> = {
    userId,
    status: 'CLOSED',
  }

  if (ticker) {
    positionWhere.ticker = ticker
  }

  if (startDate || endDate) {
    positionWhere.closedDate = {}
    if (startDate) {
      (positionWhere.closedDate as Record<string, unknown>).gte = startDate
    }
    if (endDate) {
      (positionWhere.closedDate as Record<string, unknown>).lte = endDate
    }
  }

  // Query closed positions with realized gains/losses
  const closedPositions = await prisma.position.findMany({
    where: positionWhere,
    select: {
      ticker: true,
      realizedGainLoss: true,
    },
  })

  // Aggregate by ticker
  const byTicker = new Map<string, number>()
  let total = 0

  for (const position of closedPositions) {
    const pnl = position.realizedGainLoss ? Number(position.realizedGainLoss) : 0
    total += pnl

    const current = byTicker.get(position.ticker) || 0
    byTicker.set(position.ticker, current + pnl)
  }

  return {
    total,
    byTicker,
    count: closedPositions.length,
  }
}

/**
 * Calculate unrealized P&L from open positions using current market prices
 *
 * @param userId - User ID to calculate for
 * @param options - Optional filtering options
 * @returns Unrealized P&L breakdown
 */
export async function calculateUnrealizedPnL(
  userId: string,
  options: PnLCalculationOptions = {}
): Promise<UnrealizedPnL> {
  const { ticker } = options

  // Build where clause
  const where: Record<string, unknown> = {
    userId,
    status: 'OPEN',
  }

  if (ticker) {
    where.ticker = ticker
  }

  // Query open positions
  const openPositions = await prisma.position.findMany({
    where,
    select: {
      ticker: true,
      shares: true,
      totalCost: true,
      costBasis: true,
    },
  })

  if (openPositions.length === 0) {
    return {
      total: 0,
      totalPercent: 0,
      currentValue: 0,
      costBasis: 0,
      byTicker: new Map(),
    }
  }

  // Get current prices for all tickers
  const tickers = [...new Set(openPositions.map(p => p.ticker))]
  const priceMap = await getLatestPrices(tickers)

  // Calculate unrealized P&L
  const byTicker = new Map<string, {
    pnl: number
    pnlPercent: number
    currentValue: number
    costBasis: number
  }>()

  let totalPnL = 0
  let totalCurrentValue = 0
  let totalCostBasis = 0

  for (const position of openPositions) {
    const priceData = priceMap.get(position.ticker)

    // Skip if no price available
    if (!priceData || !priceData.success) {
      continue
    }

    const currentPrice = priceData.price
    const shares = position.shares
    const totalCost = Number(position.totalCost)

    const currentValue = currentPrice * shares
    const pnl = currentValue - totalCost
    const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0

    // Aggregate by ticker
    const existing = byTicker.get(position.ticker)
    if (existing) {
      byTicker.set(position.ticker, {
        pnl: existing.pnl + pnl,
        pnlPercent: existing.costBasis > 0
          ? ((existing.currentValue + currentValue - existing.costBasis - totalCost) / (existing.costBasis + totalCost)) * 100
          : 0,
        currentValue: existing.currentValue + currentValue,
        costBasis: existing.costBasis + totalCost,
      })
    } else {
      byTicker.set(position.ticker, {
        pnl,
        pnlPercent,
        currentValue,
        costBasis: totalCost,
      })
    }

    totalPnL += pnl
    totalCurrentValue += currentValue
    totalCostBasis += totalCost
  }

  const totalPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0

  return {
    total: totalPnL,
    totalPercent,
    currentValue: totalCurrentValue,
    costBasis: totalCostBasis,
    byTicker,
  }
}

/**
 * Calculate P&L for a specific timeframe
 *
 * @param userId - User ID to calculate for
 * @param timeframe - Time period to calculate for
 * @returns Total P&L for the timeframe
 */
export async function calculatePnLByTimeframe(
  userId: string,
  timeframe: Timeframe
): Promise<number> {
  const startDate = getTimeframeDate(timeframe)

  // Get realized P&L for the timeframe
  const realized = await calculateRealizedPnL(userId, { startDate })

  // For unrealized, we always use current values (no date filter)
  // Only include in "all" timeframe
  if (timeframe === 'all') {
    const unrealized = await calculateUnrealizedPnL(userId)
    return realized.total + unrealized.total
  }

  return realized.total
}

/**
 * Calculate P&L by all timeframes
 *
 * @param userId - User ID to calculate for
 * @returns P&L for each timeframe
 */
export async function calculateAllTimeframes(userId: string): Promise<TimeframePnL> {
  const [daily, weekly, monthly, ytd, allTime] = await Promise.all([
    calculatePnLByTimeframe(userId, 'daily'),
    calculatePnLByTimeframe(userId, 'weekly'),
    calculatePnLByTimeframe(userId, 'monthly'),
    calculatePnLByTimeframe(userId, 'ytd'),
    calculatePnLByTimeframe(userId, 'all'),
  ])

  return {
    daily,
    weekly,
    monthly,
    ytd,
    allTime,
  }
}

/**
 * Calculate P&L grouped by ticker
 *
 * @param userId - User ID to calculate for
 * @returns Array of per-ticker P&L breakdowns
 */
export async function calculatePnLByTicker(userId: string): Promise<TickerPnL[]> {
  // Get both realized and unrealized P&L
  const [realized, unrealized] = await Promise.all([
    calculateRealizedPnL(userId),
    calculateUnrealizedPnL(userId),
  ])

  // Combine by ticker
  const tickerMap = new Map<string, TickerPnL>()

  // Add realized P&L
  for (const [ticker, realizedPnL] of realized.byTicker.entries()) {
    tickerMap.set(ticker, {
      ticker,
      realizedPnL,
      unrealizedPnL: 0,
      totalPnL: realizedPnL,
      unrealizedPnLPercent: 0,
      currentValue: 0,
      costBasis: 0,
    })
  }

  // Add unrealized P&L
  for (const [ticker, data] of unrealized.byTicker.entries()) {
    const existing = tickerMap.get(ticker)
    if (existing) {
      existing.unrealizedPnL = data.pnl
      existing.totalPnL = existing.realizedPnL + data.pnl
      existing.unrealizedPnLPercent = data.pnlPercent
      existing.currentValue = data.currentValue
      existing.costBasis = data.costBasis
    } else {
      tickerMap.set(ticker, {
        ticker,
        realizedPnL: 0,
        unrealizedPnL: data.pnl,
        totalPnL: data.pnl,
        unrealizedPnLPercent: data.pnlPercent,
        currentValue: data.currentValue,
        costBasis: data.costBasis,
      })
    }
  }

  // Convert to array and sort by total P&L descending
  return Array.from(tickerMap.values()).sort((a, b) => b.totalPnL - a.totalPnL)
}

/**
 * Calculate portfolio-level statistics
 *
 * @param userId - User ID to calculate for
 * @returns Complete portfolio statistics
 */
export async function calculatePortfolioStats(userId: string): Promise<PortfolioStats> {
  // Run queries in parallel for performance
  const [
    realized,
    unrealized,
    allTrades,
    closedPositions,
    openPositions,
  ] = await Promise.all([
    calculateRealizedPnL(userId),
    calculateUnrealizedPnL(userId),
    prisma.trade.findMany({
      where: { userId },
      select: {
        premium: true,
        status: true,
      },
    }),
    prisma.position.findMany({
      where: { userId, status: 'CLOSED' },
      select: {
        realizedGainLoss: true,
      },
    }),
    prisma.position.findMany({
      where: { userId, status: 'OPEN' },
      select: {
        totalCost: true,
      },
    }),
  ])

  // Calculate capital deployed (total cost of open positions)
  const capitalDeployed = openPositions.reduce(
    (sum, pos) => sum + Number(pos.totalCost),
    0
  )

  // Calculate total premium collected
  const premiumCollected = allTrades.reduce(
    (sum, trade) => sum + Number(trade.premium),
    0
  )

  // Calculate win rate (profitable closed positions / total closed positions)
  const profitablePositions = closedPositions.filter(
    (pos) => pos.realizedGainLoss && Number(pos.realizedGainLoss) > 0
  ).length
  const winRate = closedPositions.length > 0
    ? (profitablePositions / closedPositions.length) * 100
    : 0

  // Calculate assignment rate (assigned trades / total trades)
  const assignedTrades = allTrades.filter((t) => t.status === 'ASSIGNED').length
  const assignmentRate = allTrades.length > 0
    ? (assignedTrades / allTrades.length) * 100
    : 0

  // Calculate total P&L
  const totalPnL = realized.total + unrealized.total

  // Calculate return percentage
  // Return % = Total P&L / (Capital Deployed + Total Capital that was deployed for realized P&L)
  // For simplicity, use: (Realized + Unrealized) / (Capital Deployed + |Realized if positive|)
  const totalCapitalBase = capitalDeployed + Math.abs(realized.total)
  const returnPercent = totalCapitalBase > 0 ? (totalPnL / totalCapitalBase) * 100 : 0

  return {
    capitalDeployed,
    totalPnL,
    realizedPnL: realized.total,
    unrealizedPnL: unrealized.total,
    returnPercent,
    premiumCollected,
    winRate,
    assignmentRate,
    totalTrades: allTrades.length,
    closedPositions: closedPositions.length,
    openPositions: openPositions.length,
    currentValue: unrealized.currentValue,
  }
}

/**
 * Calculate complete P&L analysis with all metrics
 *
 * This is the main function that aggregates all P&L calculations:
 * - Realized and unrealized P&L
 * - Per-ticker breakdown
 * - Time-based breakdown
 * - Portfolio-level statistics
 *
 * @param userId - User ID to calculate for
 * @returns Complete P&L analysis
 */
export async function calculateCompletePnL(userId: string): Promise<CompletePnL> {
  // Run all calculations in parallel for optimal performance
  const [realized, unrealized, byTicker, byTimeframe, portfolio] = await Promise.all([
    calculateRealizedPnL(userId),
    calculateUnrealizedPnL(userId),
    calculatePnLByTicker(userId),
    calculateAllTimeframes(userId),
    calculatePortfolioStats(userId),
  ])

  return {
    realized,
    unrealized,
    byTicker,
    byTimeframe,
    portfolio,
  }
}

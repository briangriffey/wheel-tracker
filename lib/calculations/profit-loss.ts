/**
 * Comprehensive Profit & Loss Calculation Service
 *
 * Calculates realized and unrealized P&L for options trading using the wheel strategy.
 * Includes per-ticker aggregations, time-based aggregations, and portfolio-level statistics.
 */

import { prisma } from '@/lib/db'
import { TradeStatus, TradeAction, PositionStatus, TradeType, Prisma } from '@/lib/generated/prisma'
import { getLatestPrices } from '@/lib/services/market-data'

type Decimal = Prisma.Decimal

/**
 * Type definitions
 */

export interface TimePeriod {
  startDate: Date
  endDate: Date
}

export interface RealizedPnL {
  totalRealizedPnL: number
  closedPositionsPnL: number
  expiredOptionsPnL: number
  closedOptionsPnL: number
  tradeCount: number
  winningTrades: number
  losingTrades: number
}

export interface UnrealizedPnL {
  totalUnrealizedPnL: number
  openPositionsPnL: number
  openOptionsPnL: number
  currentValue: number
  totalCost: number
}

export interface TickerPnL {
  ticker: string
  realizedPnL: number
  unrealizedPnL: number
  totalPnL: number
  premiumCollected: number
  capitalDeployed: number
  returnPercent: number
  tradeCount: number
  winRate: number
}

export interface PortfolioStats {
  totalCapitalDeployed: number
  totalPremiumCollected: number
  totalRealizedPnL: number
  totalUnrealizedPnL: number
  totalPnL: number
  returnOnCapital: number
  winRate: number
  assignmentRate: number
  totalTrades: number
  activeTrades: number
  assignedTrades: number
}

export interface CompletePnL {
  realized: RealizedPnL
  unrealized: UnrealizedPnL
  total: number
  byTicker: TickerPnL[]
  portfolio: PortfolioStats
}

/**
 * Date range helpers
 */

export function getDateRanges() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return {
    daily: {
      startDate: today,
      endDate: now,
    },
    weekly: {
      startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: now,
    },
    monthly: {
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      endDate: now,
    },
    ytd: {
      startDate: new Date(today.getFullYear(), 0, 1),
      endDate: now,
    },
    allTime: {
      startDate: new Date(0),
      endDate: now,
    },
  }
}

/**
 * Calculate realized P&L from closed positions
 */
async function calculateClosedPositionsPnL(
  userId: string,
  period?: TimePeriod
): Promise<{ total: number; count: number; winning: number; losing: number }> {
  const where: Prisma.PositionWhereInput = {
    userId,
    status: PositionStatus.CLOSED,
    realizedGainLoss: { not: null },
    ...(period && {
      closedDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
    }),
  }

  const positions = await prisma.position.findMany({
    where,
    select: {
      realizedGainLoss: true,
    },
  })

  const total = positions.reduce((sum, pos) => {
    const value = pos.realizedGainLoss ? (pos.realizedGainLoss as Decimal).toNumber() : 0
    return sum + value
  }, 0)

  const winning = positions.filter((pos) => {
    const value = pos.realizedGainLoss ? (pos.realizedGainLoss as Decimal).toNumber() : 0
    return value > 0
  }).length

  const losing = positions.filter((pos) => {
    const value = pos.realizedGainLoss ? (pos.realizedGainLoss as Decimal).toNumber() : 0
    return value < 0
  }).length

  return { total, count: positions.length, winning, losing }
}

/**
 * Calculate realized P&L from expired worthless options
 */
async function calculateExpiredOptionsPnL(
  userId: string,
  period?: TimePeriod
): Promise<{ total: number; count: number }> {
  const where: Prisma.TradeWhereInput = {
    userId,
    status: TradeStatus.EXPIRED,
    action: TradeAction.SELL_TO_OPEN,
    ...(period && {
      closeDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
    }),
  }

  const trades = await prisma.trade.findMany({
    where,
    select: {
      premium: true,
    },
  })

  const total = trades.reduce((sum, trade) => sum + (trade.premium as Decimal).toNumber(), 0)

  return { total, count: trades.length }
}

/**
 * Calculate realized P&L from closed options (bought back)
 */
async function calculateClosedOptionsPnL(
  userId: string,
  period?: TimePeriod
): Promise<{ total: number; count: number; winning: number; losing: number }> {
  const where: Prisma.TradeWhereInput = {
    userId,
    status: TradeStatus.CLOSED,
    action: TradeAction.SELL_TO_OPEN,
    ...(period && {
      closeDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
    }),
  }

  // Get the opening trades (SELL_TO_OPEN)
  const openTrades = await prisma.trade.findMany({
    where,
    select: {
      id: true,
      premium: true,
      ticker: true,
      closeDate: true,
    },
  })

  let total = 0
  let winning = 0
  let losing = 0

  // For each opening trade, find the corresponding closing trade
  for (const openTrade of openTrades) {
    // Skip if closeDate is null (shouldn't happen for CLOSED trades, but type safety)
    if (!openTrade.closeDate) continue

    const closeTrade = await prisma.trade.findFirst({
      where: {
        userId,
        ticker: openTrade.ticker,
        action: TradeAction.BUY_TO_CLOSE,
        openDate: openTrade.closeDate,
      },
      select: {
        premium: true,
      },
    })

    const premiumCollected = (openTrade.premium as Decimal).toNumber()
    const premiumPaid = closeTrade ? (closeTrade.premium as Decimal).toNumber() : 0
    const pnl = premiumCollected - premiumPaid

    total += pnl

    if (pnl > 0) winning++
    else if (pnl < 0) losing++
  }

  return { total, count: openTrades.length, winning, losing }
}

/**
 * Calculate total realized P&L
 */
export async function calculateRealizedPnL(
  userId: string,
  period?: TimePeriod
): Promise<RealizedPnL> {
  const [closedPositions, expiredOptions, closedOptions] = await Promise.all([
    calculateClosedPositionsPnL(userId, period),
    calculateExpiredOptionsPnL(userId, period),
    calculateClosedOptionsPnL(userId, period),
  ])

  return {
    totalRealizedPnL:
      closedPositions.total + expiredOptions.total + closedOptions.total,
    closedPositionsPnL: closedPositions.total,
    expiredOptionsPnL: expiredOptions.total,
    closedOptionsPnL: closedOptions.total,
    tradeCount:
      closedPositions.count + expiredOptions.count + closedOptions.count,
    winningTrades:
      closedPositions.winning + expiredOptions.count + closedOptions.winning,
    losingTrades: closedPositions.losing + closedOptions.losing,
  }
}

/**
 * Calculate unrealized P&L from open positions
 */
async function calculateOpenPositionsPnL(
  userId: string,
  currentPrices: Map<string, number>
): Promise<{ total: number; currentValue: number; totalCost: number }> {
  const positions = await prisma.position.findMany({
    where: {
      userId,
      status: PositionStatus.OPEN,
    },
    select: {
      ticker: true,
      shares: true,
      totalCost: true,
    },
  })

  let total = 0
  let currentValue = 0
  let totalCost = 0

  for (const position of positions) {
    const price = currentPrices.get(position.ticker) || 0
    const posValue = price * position.shares
    const posCost = (position.totalCost as Decimal).toNumber()

    currentValue += posValue
    totalCost += posCost
    total += posValue - posCost
  }

  return { total, currentValue, totalCost }
}

/**
 * Calculate unrealized P&L from open options
 */
async function calculateOpenOptionsPnL(
  userId: string,
  currentPrices: Map<string, number>
): Promise<{ total: number; currentValue: number; totalCost: number }> {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      status: TradeStatus.OPEN,
      action: TradeAction.SELL_TO_OPEN,
    },
    select: {
      ticker: true,
      type: true,
      strikePrice: true,
      premium: true,
      shares: true,
      expirationDate: true,
    },
  })

  let total = 0
  let currentValue = 0
  let totalCost = 0

  for (const trade of trades) {
    const price = currentPrices.get(trade.ticker) || 0
    const strike = (trade.strikePrice as Decimal).toNumber()
    const premium = (trade.premium as Decimal).toNumber()

    // Estimate option value based on intrinsic value
    let optionValue = 0
    if (trade.type === TradeType.PUT && price < strike) {
      // PUT is in the money
      optionValue = (strike - price) * trade.shares
    } else if (trade.type === TradeType.CALL && price > strike) {
      // CALL is in the money
      optionValue = (price - strike) * trade.shares
    }
    // If out of the money, option value stays at 0 (simplified - ignoring time value)

    currentValue += optionValue
    totalCost += premium
    total += premium - optionValue // Positive if option decreased in value (good for seller)
  }

  return { total, currentValue, totalCost }
}

/**
 * Calculate total unrealized P&L
 */
export async function calculateUnrealizedPnL(
  userId: string
): Promise<UnrealizedPnL> {
  // Get all unique tickers for open positions and trades
  const [positions, trades] = await Promise.all([
    prisma.position.findMany({
      where: { userId, status: PositionStatus.OPEN },
      select: { ticker: true },
      distinct: ['ticker'],
    }),
    prisma.trade.findMany({
      where: { userId, status: TradeStatus.OPEN },
      select: { ticker: true },
      distinct: ['ticker'],
    }),
  ])

  const tickers = [
    ...new Set([
      ...positions.map((p) => p.ticker),
      ...trades.map((t) => t.ticker),
    ]),
  ]

  // Fetch current prices
  const pricesMap = await getLatestPrices(tickers)
  const currentPrices = new Map<string, number>()
  pricesMap.forEach((result, ticker) => {
    currentPrices.set(ticker, result.price)
  })

  const [openPositions, openOptions] = await Promise.all([
    calculateOpenPositionsPnL(userId, currentPrices),
    calculateOpenOptionsPnL(userId, currentPrices),
  ])

  return {
    totalUnrealizedPnL: openPositions.total + openOptions.total,
    openPositionsPnL: openPositions.total,
    openOptionsPnL: openOptions.total,
    currentValue: openPositions.currentValue + openOptions.currentValue,
    totalCost: openPositions.totalCost + openOptions.totalCost,
  }
}

/**
 * Calculate P&L aggregated by ticker
 */
export async function calculatePnLByTicker(
  userId: string,
  period?: TimePeriod
): Promise<TickerPnL[]> {
  // Get all unique tickers
  const [positions, trades] = await Promise.all([
    prisma.position.findMany({
      where: { userId },
      select: { ticker: true },
      distinct: ['ticker'],
    }),
    prisma.trade.findMany({
      where: { userId },
      select: { ticker: true },
      distinct: ['ticker'],
    }),
  ])

  const tickers = [
    ...new Set([
      ...positions.map((p) => p.ticker),
      ...trades.map((t) => t.ticker),
    ]),
  ]

  // Fetch current prices for unrealized P&L
  const pricesMap = await getLatestPrices(tickers)
  const currentPrices = new Map<string, number>()
  pricesMap.forEach((result, ticker) => {
    currentPrices.set(ticker, result.price)
  })

  const tickerPnLs: TickerPnL[] = []

  for (const ticker of tickers) {
    // Realized P&L from closed positions
    const closedPositionsWhere: Prisma.PositionWhereInput = {
      userId,
      ticker,
      status: PositionStatus.CLOSED,
      realizedGainLoss: { not: null },
      ...(period && {
        closedDate: {
          gte: period.startDate,
          lte: period.endDate,
        },
      }),
    }

    const closedPositions = await prisma.position.findMany({
      where: closedPositionsWhere,
      select: { realizedGainLoss: true },
    })

    const closedPositionsPnL = closedPositions.reduce((sum, pos) => {
      return sum + ((pos.realizedGainLoss as Decimal) || new Prisma.Decimal(0)).toNumber()
    }, 0)

    // Realized P&L from expired options
    const expiredWhere: Prisma.TradeWhereInput = {
      userId,
      ticker,
      status: TradeStatus.EXPIRED,
      action: TradeAction.SELL_TO_OPEN,
      ...(period && {
        closeDate: {
          gte: period.startDate,
          lte: period.endDate,
        },
      }),
    }

    const expiredTrades = await prisma.trade.findMany({
      where: expiredWhere,
      select: { premium: true },
    })

    const expiredPnL = expiredTrades.reduce((sum, trade) => {
      return sum + (trade.premium as Decimal).toNumber()
    }, 0)

    // Unrealized P&L from open positions
    const openPositions = await prisma.position.findMany({
      where: {
        userId,
        ticker,
        status: PositionStatus.OPEN,
      },
      select: {
        shares: true,
        totalCost: true,
      },
    })

    const currentPrice = currentPrices.get(ticker) || 0
    const unrealizedPositionPnL = openPositions.reduce((sum, pos) => {
      const currentValue = currentPrice * pos.shares
      const cost = (pos.totalCost as Decimal).toNumber()
      return sum + (currentValue - cost)
    }, 0)

    // Premium collected
    const allTrades = await prisma.trade.findMany({
      where: {
        userId,
        ticker,
        action: TradeAction.SELL_TO_OPEN,
        ...(period && {
          openDate: {
            gte: period.startDate,
            lte: period.endDate,
          },
        }),
      },
      select: { premium: true, status: true },
    })

    const premiumCollected = allTrades.reduce((sum, trade) => {
      return sum + (trade.premium as Decimal).toNumber()
    }, 0)

    // Capital deployed (from open positions)
    const capitalDeployed = openPositions.reduce((sum, pos) => {
      return sum + (pos.totalCost as Decimal).toNumber()
    }, 0)

    // Win rate
    const winningTrades = closedPositions.filter((pos) => {
      return ((pos.realizedGainLoss as Decimal) || new Prisma.Decimal(0)).toNumber() > 0
    }).length + expiredTrades.length

    const totalTrades = closedPositions.length + expiredTrades.length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

    const realizedPnL = closedPositionsPnL + expiredPnL
    const unrealizedPnL = unrealizedPositionPnL
    const totalPnL = realizedPnL + unrealizedPnL
    const returnPercent =
      capitalDeployed > 0 ? (totalPnL / capitalDeployed) * 100 : 0

    tickerPnLs.push({
      ticker,
      realizedPnL,
      unrealizedPnL,
      totalPnL,
      premiumCollected,
      capitalDeployed,
      returnPercent,
      tradeCount: allTrades.length,
      winRate,
    })
  }

  // Sort by total P&L descending
  return tickerPnLs.sort((a, b) => b.totalPnL - a.totalPnL)
}

/**
 * Calculate portfolio-level statistics
 */
export async function calculatePortfolioStats(
  userId: string,
  period?: TimePeriod
): Promise<PortfolioStats> {
  const [realized, unrealized] = await Promise.all([
    calculateRealizedPnL(userId, period),
    calculateUnrealizedPnL(userId),
  ])

  // Total premium collected
  const premiumWhere: Prisma.TradeWhereInput = {
    userId,
    action: TradeAction.SELL_TO_OPEN,
    ...(period && {
      openDate: {
        gte: period.startDate,
        lte: period.endDate,
      },
    }),
  }

  const allTrades = await prisma.trade.findMany({
    where: premiumWhere,
    select: {
      premium: true,
      status: true,
    },
  })

  const totalPremiumCollected = allTrades.reduce((sum, trade) => {
    return sum + (trade.premium as Decimal).toNumber()
  }, 0)

  // Capital deployed (current open positions)
  const openPositions = await prisma.position.findMany({
    where: {
      userId,
      status: PositionStatus.OPEN,
    },
    select: {
      totalCost: true,
    },
  })

  const totalCapitalDeployed = openPositions.reduce((sum, pos) => {
    return sum + (pos.totalCost as Decimal).toNumber()
  }, 0)

  // Assignment rate
  const totalTradesCount = allTrades.length
  const assignedTrades = allTrades.filter(
    (t) => t.status === TradeStatus.ASSIGNED
  ).length
  const assignmentRate =
    totalTradesCount > 0 ? (assignedTrades / totalTradesCount) * 100 : 0

  // Win rate
  const winRate =
    realized.tradeCount > 0
      ? (realized.winningTrades / realized.tradeCount) * 100
      : 0

  // Return on capital
  const totalPnL = realized.totalRealizedPnL + unrealized.totalUnrealizedPnL
  const returnOnCapital =
    totalCapitalDeployed > 0 ? (totalPnL / totalCapitalDeployed) * 100 : 0

  // Active trades
  const activeTrades = await prisma.trade.count({
    where: {
      userId,
      status: TradeStatus.OPEN,
    },
  })

  return {
    totalCapitalDeployed,
    totalPremiumCollected,
    totalRealizedPnL: realized.totalRealizedPnL,
    totalUnrealizedPnL: unrealized.totalUnrealizedPnL,
    totalPnL,
    returnOnCapital,
    winRate,
    assignmentRate,
    totalTrades: totalTradesCount,
    activeTrades,
    assignedTrades,
  }
}

/**
 * Calculate complete P&L analysis
 */
export async function calculateCompletePnL(
  userId: string,
  period?: TimePeriod
): Promise<CompletePnL> {
  const [realized, unrealized, byTicker, portfolio] = await Promise.all([
    calculateRealizedPnL(userId, period),
    calculateUnrealizedPnL(userId),
    calculatePnLByTicker(userId, period),
    calculatePortfolioStats(userId, period),
  ])

  return {
    realized,
    unrealized,
    total: realized.totalRealizedPnL + unrealized.totalUnrealizedPnL,
    byTicker,
    portfolio,
  }
}

/**
 * Calculate P&L for specific time periods
 */
export async function calculatePnLByPeriod(userId: string) {
  const ranges = getDateRanges()

  const [daily, weekly, monthly, ytd, allTime] = await Promise.all([
    calculateCompletePnL(userId, ranges.daily),
    calculateCompletePnL(userId, ranges.weekly),
    calculateCompletePnL(userId, ranges.monthly),
    calculateCompletePnL(userId, ranges.ytd),
    calculateCompletePnL(userId, ranges.allTime),
  ])

  return {
    daily,
    weekly,
    monthly,
    ytd,
    allTime,
  }
}

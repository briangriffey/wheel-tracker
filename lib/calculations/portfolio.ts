/**
 * Portfolio Analytics Calculation Utilities
 *
 * Provides calculation functions for portfolio-wide metrics including:
 * - Total wheels by status (active/idle/completed)
 * - Total capital deployed
 * - Total premiums collected
 * - Total realized P&L
 * - Overall win rate
 * - Best/worst performing tickers
 */

import { prisma } from '@/lib/db'

/**
 * Portfolio-wide metrics
 */
export interface PortfolioMetrics {
  totalWheels: {
    active: number
    idle: number
    paused: number
    completed: number
    total: number
  }
  totalCapitalDeployed: number
  totalPremiumsCollected: number
  totalRealizedPL: number
  overallWinRate: number
  bestPerformingTickers: TickerPerformance[]
  worstPerformingTickers: TickerPerformance[]
}

/**
 * Per-ticker performance metrics
 */
export interface TickerPerformance {
  ticker: string
  wheelId: string
  cycleCount: number
  totalPremiums: number
  totalRealizedPL: number
  winRate: number
  status: string
}

/**
 * Simplified wheel data for calculations
 */
export interface WheelData {
  id: string
  ticker: string
  status: string
  cycleCount: number
  totalPremiums: number
  totalRealizedPL: number
}

/**
 * Simplified position data for capital calculations
 */
export interface PositionData {
  totalCost: number
  status: string
}

/**
 * Calculate portfolio-wide metrics
 *
 * Aggregates data across all wheels to provide a comprehensive view of
 * portfolio performance including capital deployment, premiums collected,
 * realized P&L, and win rates.
 *
 * @param userId - User ID to calculate metrics for
 * @returns Promise resolving to portfolio metrics
 *
 * @example
 * const metrics = await getPortfolioMetrics('user_123');
 * console.log(`Total P&L: $${metrics.totalRealizedPL}`);
 */
export async function getPortfolioMetrics(userId: string): Promise<PortfolioMetrics> {
  // Fetch all wheels for user
  const wheels = await prisma.wheel.findMany({
    where: { userId },
    select: {
      id: true,
      ticker: true,
      status: true,
      cycleCount: true,
      totalPremiums: true,
      totalRealizedPL: true,
    },
  })

  // Fetch all open positions for capital deployment calculation
  const openPositions = await prisma.position.findMany({
    where: {
      userId,
      status: 'OPEN',
    },
    select: {
      totalCost: true,
    },
  })

  // Convert Prisma Decimals to numbers
  const wheelData: WheelData[] = wheels.map((wheel) => ({
    id: wheel.id,
    ticker: wheel.ticker,
    status: wheel.status,
    cycleCount: wheel.cycleCount,
    totalPremiums: Number(wheel.totalPremiums),
    totalRealizedPL: Number(wheel.totalRealizedPL),
  }))

  const positionData: PositionData[] = openPositions.map((position) => ({
    totalCost: Number(position.totalCost),
    status: 'OPEN',
  }))

  return calculatePortfolioMetrics(wheelData, positionData)
}

/**
 * Calculate portfolio metrics from wheel and position data
 *
 * This is a pure calculation function that doesn't touch the database,
 * making it easy to test.
 *
 * @param wheels - Array of wheel data
 * @param positions - Array of position data
 * @returns Portfolio metrics
 */
export function calculatePortfolioMetrics(
  wheels: WheelData[],
  positions: PositionData[]
): PortfolioMetrics {
  // Count wheels by status
  const wheelCounts = wheels.reduce(
    (acc, wheel) => {
      const status = wheel.status.toLowerCase()
      if (status === 'active') acc.active++
      else if (status === 'idle') acc.idle++
      else if (status === 'paused') acc.paused++
      else if (status === 'completed') acc.completed++
      return acc
    },
    { active: 0, idle: 0, paused: 0, completed: 0 }
  )

  // Calculate total capital deployed (sum of open position costs)
  const totalCapitalDeployed = positions.reduce((sum, position) => sum + position.totalCost, 0)

  // Calculate total premiums collected (sum across all wheels)
  const totalPremiumsCollected = wheels.reduce((sum, wheel) => sum + wheel.totalPremiums, 0)

  // Calculate total realized P&L (sum across all wheels)
  const totalRealizedPL = wheels.reduce((sum, wheel) => sum + wheel.totalRealizedPL, 0)

  // Calculate overall win rate
  const overallWinRate = calculateOverallWinRate(wheels)

  // Get ticker performance for best/worst analysis
  const tickerPerformances = calculateTickerPerformances(wheels)

  // Sort by total realized P&L for best/worst
  const sortedByPL = [...tickerPerformances].sort((a, b) => b.totalRealizedPL - a.totalRealizedPL)

  // Get top 5 best and worst (or fewer if not enough data)
  const bestPerformingTickers = sortedByPL.slice(0, 5)
  const worstPerformingTickers = sortedByPL.slice(-5).reverse()

  return {
    totalWheels: {
      ...wheelCounts,
      total: wheels.length,
    },
    totalCapitalDeployed,
    totalPremiumsCollected,
    totalRealizedPL,
    overallWinRate,
    bestPerformingTickers,
    worstPerformingTickers,
  }
}

/**
 * Calculate overall portfolio win rate
 *
 * Win rate is the percentage of completed cycles across all wheels that
 * were profitable. Only considers wheels with at least one completed cycle.
 *
 * Formula: (Total profitable cycles / Total completed cycles) * 100
 *
 * Note: This is a simplified calculation that assumes each cycle in a wheel
 * is tracked via the cycleCount. A more accurate calculation would require
 * detailed cycle history with individual P&L per cycle.
 *
 * @param wheels - Array of wheel data
 * @returns Win rate as a percentage (0-100), or 0 if no completed cycles
 *
 * @example
 * const wheels = [
 *   { cycleCount: 3, totalRealizedPL: 1200 },  // profitable
 *   { cycleCount: 2, totalRealizedPL: -300 },  // unprofitable
 *   { cycleCount: 0, totalRealizedPL: 0 },     // no cycles, ignored
 * ]
 * calculateOverallWinRate(wheels) // Returns 50% (3 cycles profitable out of 5 total)
 */
export function calculateOverallWinRate(wheels: WheelData[]): number {
  // Filter wheels with completed cycles
  const wheelsWithCycles = wheels.filter((wheel) => wheel.cycleCount > 0)

  if (wheelsWithCycles.length === 0) {
    return 0
  }

  // Calculate total cycles across all wheels
  const totalCycles = wheelsWithCycles.reduce((sum, wheel) => sum + wheel.cycleCount, 0)

  if (totalCycles === 0) {
    return 0
  }

  // Count profitable wheels (assuming all cycles in a profitable wheel are profitable)
  // Note: This is a simplification. A more accurate calculation would track
  // individual cycle profitability, but that requires detailed cycle history.
  const profitableWheels = wheelsWithCycles.filter((wheel) => wheel.totalRealizedPL > 0)

  // Calculate approximate profitable cycles
  // This assumes profit is distributed evenly across cycles
  const profitableCycles = profitableWheels.reduce((sum, wheel) => sum + wheel.cycleCount, 0)

  const winRate = (profitableCycles / totalCycles) * 100

  return winRate
}

/**
 * Calculate per-ticker performance metrics
 *
 * Creates a performance summary for each ticker, including cycle count,
 * premiums, P&L, and win rate.
 *
 * @param wheels - Array of wheel data
 * @returns Array of ticker performance metrics
 */
export function calculateTickerPerformances(wheels: WheelData[]): TickerPerformance[] {
  return wheels.map((wheel) => ({
    ticker: wheel.ticker,
    wheelId: wheel.id,
    cycleCount: wheel.cycleCount,
    totalPremiums: wheel.totalPremiums,
    totalRealizedPL: wheel.totalRealizedPL,
    winRate: wheel.cycleCount > 0 && wheel.totalRealizedPL > 0 ? 100 : 0, // Simplified
    status: wheel.status,
  }))
}

/**
 * Format currency for display
 *
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format percentage for display
 *
 * @param percentage - Percentage to format (0-100)
 * @returns Formatted percentage string
 */
export function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`
}

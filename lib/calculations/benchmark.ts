/**
 * Market Benchmark Calculation Service
 *
 * Provides calculations for comparing wheel strategy performance against market indexes:
 * - Calculate benchmark P&L (current value, gain/loss, return %)
 * - Compare wheel strategy performance vs benchmarks
 * - Support multiple benchmarks (SPY, QQQ, VTI, etc.)
 */

import { prisma } from '@/lib/db'
import { getLatestPrice } from '@/lib/services/market-data'
import { calculatePortfolioStats } from './profit-loss'

/**
 * Market benchmark data with calculated metrics
 */
export interface BenchmarkMetrics {
  ticker: string
  initialCapital: number
  setupDate: Date
  initialPrice: number
  shares: number
  currentPrice: number
  currentValue: number
  gainLoss: number
  returnPercent: number
  lastUpdated: Date
}

/**
 * Comparison between wheel strategy and benchmark
 */
export interface BenchmarkComparison {
  wheelStrategy: {
    totalPnL: number
    returnPercent: number
    capitalDeployed: number
  }
  benchmark: BenchmarkMetrics
  difference: {
    pnlDifference: number // Wheel P&L - Benchmark P&L
    returnDifference: number // Wheel Return% - Benchmark Return%
    outperforming: boolean // True if wheel is better
  }
}

/**
 * Multiple benchmark comparison
 */
export interface MultiBenchmarkComparison {
  wheelStrategy: {
    totalPnL: number
    returnPercent: number
    capitalDeployed: number
  }
  benchmarks: BenchmarkMetrics[]
  bestBenchmark: BenchmarkMetrics | null
  worstBenchmark: BenchmarkMetrics | null
}

/**
 * Calculate benchmark shares from initial capital and price
 *
 * @param initialCapital - Amount invested
 * @param initialPrice - Price at purchase
 * @returns Number of shares purchased
 */
export function calculateBenchmarkShares(
  initialCapital: number,
  initialPrice: number
): number {
  if (initialPrice <= 0) {
    throw new Error('Initial price must be positive')
  }

  return initialCapital / initialPrice
}

/**
 * Calculate current benchmark value
 *
 * @param shares - Number of shares owned
 * @param currentPrice - Current market price
 * @returns Current market value
 */
export function calculateBenchmarkValue(
  shares: number,
  currentPrice: number
): number {
  return shares * currentPrice
}

/**
 * Calculate benchmark gain/loss
 *
 * @param currentValue - Current market value
 * @param initialCapital - Initial investment
 * @returns Gain or loss amount
 */
export function calculateBenchmarkGainLoss(
  currentValue: number,
  initialCapital: number
): number {
  return currentValue - initialCapital
}

/**
 * Calculate benchmark return percentage
 *
 * @param gainLoss - Gain or loss amount
 * @param initialCapital - Initial investment
 * @returns Return percentage
 */
export function calculateBenchmarkReturn(
  gainLoss: number,
  initialCapital: number
): number {
  if (initialCapital <= 0) {
    return 0
  }

  return (gainLoss / initialCapital) * 100
}

/**
 * Get benchmark metrics with current price
 *
 * @param userId - User ID
 * @param ticker - Benchmark ticker (SPY, QQQ, VTI, etc.)
 * @returns Benchmark metrics with current calculations
 */
export async function getBenchmarkMetrics(
  userId: string,
  ticker: string
): Promise<BenchmarkMetrics | null> {
  // Get benchmark from database
  const benchmark = await prisma.marketBenchmark.findUnique({
    where: {
      userId_ticker: {
        userId,
        ticker: ticker.toUpperCase(),
      },
    },
  })

  if (!benchmark) {
    return null
  }

  // Fetch current price
  const priceData = await getLatestPrice(ticker)

  if (!priceData || !priceData.success) {
    throw new Error(`Failed to fetch current price for ${ticker}`)
  }

  const currentPrice = priceData.price
  const shares = Number(benchmark.shares)
  const initialCapital = Number(benchmark.initialCapital)

  // Calculate metrics
  const currentValue = calculateBenchmarkValue(shares, currentPrice)
  const gainLoss = calculateBenchmarkGainLoss(currentValue, initialCapital)
  const returnPercent = calculateBenchmarkReturn(gainLoss, initialCapital)

  return {
    ticker: benchmark.ticker,
    initialCapital,
    setupDate: benchmark.setupDate,
    initialPrice: Number(benchmark.initialPrice),
    shares,
    currentPrice,
    currentValue,
    gainLoss,
    returnPercent,
    lastUpdated: priceData.date,
  }
}

/**
 * Get all benchmarks for a user
 *
 * @param userId - User ID
 * @returns Array of benchmark metrics
 */
export async function getAllBenchmarkMetrics(
  userId: string
): Promise<BenchmarkMetrics[]> {
  const benchmarks = await prisma.marketBenchmark.findMany({
    where: { userId },
    orderBy: { ticker: 'asc' },
  })

  const metrics: BenchmarkMetrics[] = []

  for (const benchmark of benchmarks) {
    try {
      const metric = await getBenchmarkMetrics(userId, benchmark.ticker)
      if (metric) {
        metrics.push(metric)
      }
    } catch (error) {
      console.error(`Error calculating metrics for ${benchmark.ticker}:`, error)
      // Skip benchmarks with errors
    }
  }

  return metrics
}

/**
 * Compare wheel strategy performance vs a benchmark
 *
 * @param userId - User ID
 * @param benchmarkTicker - Benchmark ticker to compare against
 * @returns Comparison metrics
 */
export async function compareToBenchmark(
  userId: string,
  benchmarkTicker: string
): Promise<BenchmarkComparison | null> {
  // Get wheel strategy stats
  const portfolioStats = await calculatePortfolioStats(userId)

  // Get benchmark metrics
  const benchmarkMetrics = await getBenchmarkMetrics(userId, benchmarkTicker)

  if (!benchmarkMetrics) {
    return null
  }

  // Calculate differences
  const pnlDifference = portfolioStats.totalPnL - benchmarkMetrics.gainLoss
  const returnDifference = portfolioStats.returnPercent - benchmarkMetrics.returnPercent
  const outperforming = returnDifference > 0

  return {
    wheelStrategy: {
      totalPnL: portfolioStats.totalPnL,
      returnPercent: portfolioStats.returnPercent,
      capitalDeployed: portfolioStats.capitalDeployed,
    },
    benchmark: benchmarkMetrics,
    difference: {
      pnlDifference,
      returnDifference,
      outperforming,
    },
  }
}

/**
 * Compare wheel strategy vs all benchmarks
 *
 * @param userId - User ID
 * @returns Multi-benchmark comparison
 */
export async function compareToAllBenchmarks(
  userId: string
): Promise<MultiBenchmarkComparison> {
  // Get wheel strategy stats
  const portfolioStats = await calculatePortfolioStats(userId)

  // Get all benchmarks
  const benchmarks = await getAllBenchmarkMetrics(userId)

  // Find best and worst benchmarks by return %
  let bestBenchmark: BenchmarkMetrics | null = null
  let worstBenchmark: BenchmarkMetrics | null = null

  for (const benchmark of benchmarks) {
    if (!bestBenchmark || benchmark.returnPercent > bestBenchmark.returnPercent) {
      bestBenchmark = benchmark
    }
    if (!worstBenchmark || benchmark.returnPercent < worstBenchmark.returnPercent) {
      worstBenchmark = benchmark
    }
  }

  return {
    wheelStrategy: {
      totalPnL: portfolioStats.totalPnL,
      returnPercent: portfolioStats.returnPercent,
      capitalDeployed: portfolioStats.capitalDeployed,
    },
    benchmarks,
    bestBenchmark,
    worstBenchmark,
  }
}

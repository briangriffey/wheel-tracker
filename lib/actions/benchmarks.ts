'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'
import { fetchStockPrice } from '@/lib/services/market-data'
import {
  calculateBenchmarkShares,
  getBenchmarkMetrics,
  getAllBenchmarkMetrics,
  compareToBenchmark,
  compareToAllBenchmarks,
  type BenchmarkMetrics,
  type BenchmarkComparison,
  type MultiBenchmarkComparison,
} from '@/lib/calculations/benchmark'
import {
  SetupBenchmarkSchema,
  UpdateBenchmarkSchema,
  DeleteBenchmarkSchema,
  GetComparisonSchema,
  type SetupBenchmarkInput,
  type UpdateBenchmarkInput,
  type DeleteBenchmarkInput,
  type GetComparisonInput,
} from '@/lib/validations/benchmark'

/**
 * Server action result type
 */
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

/**
 * Get the current user ID
 * TODO: Replace with actual session-based authentication
 */
async function getCurrentUserId(): Promise<string> {
  // This is a placeholder - in production, get this from NextAuth session
  // For now, return a test user ID
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found. Please create a user first.')
  }
  return user.id
}

/**
 * Set up a new market benchmark
 *
 * Creates a hypothetical investment in a market index (SPY, QQQ, etc.)
 * to compare against wheel strategy performance.
 *
 * @param input - Benchmark setup data
 * @returns Action result with benchmark ID
 */
export async function setupBenchmark(
  input: SetupBenchmarkInput
): Promise<ActionResult<{ id: string; ticker: string }>> {
  try {
    // Validate input
    const validated = SetupBenchmarkSchema.parse(input)
    const { ticker, initialCapital, setupDate } = validated

    // Get current user
    const userId = await getCurrentUserId()

    // Check if benchmark already exists
    const existing = await prisma.marketBenchmark.findUnique({
      where: {
        userId_ticker: {
          userId,
          ticker,
        },
      },
    })

    if (existing) {
      return {
        success: false,
        error: `Benchmark for ${ticker} already exists. Delete it first to create a new one.`,
      }
    }

    // Fetch the price at setup date
    // Note: For historical dates, we would need a different API endpoint
    // For now, we'll use the latest price as a placeholder
    const priceResult = await fetchStockPrice(ticker)

    if (!priceResult.success) {
      return {
        success: false,
        error: `Failed to fetch price for ${ticker}: ${priceResult.error}`,
      }
    }

    const initialPrice = priceResult.price

    // Calculate shares
    const shares = calculateBenchmarkShares(initialCapital, initialPrice)

    // Create benchmark
    const benchmark = await prisma.marketBenchmark.create({
      data: {
        userId,
        ticker,
        initialCapital: new Prisma.Decimal(initialCapital),
        setupDate,
        initialPrice: new Prisma.Decimal(initialPrice),
        shares: new Prisma.Decimal(shares),
        lastUpdated: priceResult.date,
      },
    })

    // Revalidate relevant pages
    revalidatePath('/dashboard')
    revalidatePath('/benchmarks')

    return {
      success: true,
      data: {
        id: benchmark.id,
        ticker: benchmark.ticker,
      },
    }
  } catch (error) {
    console.error('Error setting up benchmark:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to set up benchmark' }
  }
}

/**
 * Update benchmark with latest market price
 *
 * Fetches the current price and updates the benchmark's last updated timestamp.
 *
 * @param input - Benchmark ticker to update
 * @returns Action result with updated metrics
 */
export async function updateBenchmark(
  input: UpdateBenchmarkInput
): Promise<ActionResult<BenchmarkMetrics>> {
  try {
    // Validate input
    const validated = UpdateBenchmarkSchema.parse(input)
    const { ticker } = validated

    // Get current user
    const userId = await getCurrentUserId()

    // Verify benchmark exists
    const benchmark = await prisma.marketBenchmark.findUnique({
      where: {
        userId_ticker: {
          userId,
          ticker,
        },
      },
    })

    if (!benchmark) {
      return {
        success: false,
        error: `Benchmark for ${ticker} not found`,
      }
    }

    // Fetch latest price
    const priceResult = await fetchStockPrice(ticker)

    if (!priceResult.success) {
      return {
        success: false,
        error: `Failed to fetch price for ${ticker}: ${priceResult.error}`,
      }
    }

    // Update last updated timestamp
    await prisma.marketBenchmark.update({
      where: {
        userId_ticker: {
          userId,
          ticker,
        },
      },
      data: {
        lastUpdated: priceResult.date,
      },
    })

    // Get updated metrics
    const metrics = await getBenchmarkMetrics(userId, ticker)

    if (!metrics) {
      return {
        success: false,
        error: 'Failed to calculate benchmark metrics',
      }
    }

    // Revalidate relevant pages
    revalidatePath('/dashboard')
    revalidatePath('/benchmarks')

    return {
      success: true,
      data: metrics,
    }
  } catch (error) {
    console.error('Error updating benchmark:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to update benchmark' }
  }
}

/**
 * Delete a benchmark
 *
 * @param input - Benchmark ticker to delete
 * @returns Action result
 */
export async function deleteBenchmark(
  input: DeleteBenchmarkInput
): Promise<ActionResult<{ ticker: string }>> {
  try {
    // Validate input
    const validated = DeleteBenchmarkSchema.parse(input)
    const { ticker } = validated

    // Get current user
    const userId = await getCurrentUserId()

    // Delete benchmark
    await prisma.marketBenchmark.delete({
      where: {
        userId_ticker: {
          userId,
          ticker,
        },
      },
    })

    // Revalidate relevant pages
    revalidatePath('/dashboard')
    revalidatePath('/benchmarks')

    return {
      success: true,
      data: { ticker },
    }
  } catch (error) {
    console.error('Error deleting benchmark:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to delete benchmark' }
  }
}

/**
 * Get all benchmarks for the current user
 *
 * @returns Action result with array of benchmark metrics
 */
export async function getBenchmarks(): Promise<ActionResult<BenchmarkMetrics[]>> {
  try {
    // Get current user
    const userId = await getCurrentUserId()

    // Get all benchmarks
    const benchmarks = await getAllBenchmarkMetrics(userId)

    return {
      success: true,
      data: benchmarks,
    }
  } catch (error) {
    console.error('Error getting benchmarks:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to get benchmarks' }
  }
}

/**
 * Get comparison between wheel strategy and benchmark(s)
 *
 * If ticker is provided, compares against that specific benchmark.
 * If ticker is not provided, compares against all benchmarks.
 *
 * @param input - Optional ticker to compare against
 * @returns Action result with comparison data
 */
export async function getComparison(
  input: GetComparisonInput = {}
): Promise<ActionResult<BenchmarkComparison | MultiBenchmarkComparison>> {
  try {
    // Validate input
    const validated = GetComparisonSchema.parse(input)
    const { ticker } = validated

    // Get current user
    const userId = await getCurrentUserId()

    if (ticker) {
      // Compare against specific benchmark
      const comparison = await compareToBenchmark(userId, ticker)

      if (!comparison) {
        return {
          success: false,
          error: `Benchmark for ${ticker} not found`,
        }
      }

      return {
        success: true,
        data: comparison,
      }
    } else {
      // Compare against all benchmarks
      const comparison = await compareToAllBenchmarks(userId)

      return {
        success: true,
        data: comparison,
      }
    }
  } catch (error) {
    console.error('Error getting comparison:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to get comparison' }
  }
}

/**
 * Update all benchmarks with latest prices
 *
 * Batch updates all benchmarks for the current user.
 *
 * @returns Action result with updated metrics
 */
export async function updateAllBenchmarks(): Promise<
  ActionResult<BenchmarkMetrics[]>
> {
  try {
    // Get current user
    const userId = await getCurrentUserId()

    // Get all benchmarks
    const benchmarks = await prisma.marketBenchmark.findMany({
      where: { userId },
    })

    // Update each benchmark
    const results: BenchmarkMetrics[] = []

    for (const benchmark of benchmarks) {
      const result = await updateBenchmark({
        ticker: benchmark.ticker as 'SPY' | 'QQQ' | 'VTI' | 'DIA' | 'IWM'
      })

      if (result.success) {
        results.push(result.data)
      }
    }

    return {
      success: true,
      data: results,
    }
  } catch (error) {
    console.error('Error updating all benchmarks:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to update all benchmarks' }
  }
}

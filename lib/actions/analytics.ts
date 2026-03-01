'use server'

import { getPortfolioMetrics, type PortfolioMetrics } from '@/lib/calculations/portfolio'
import { getCurrentUserId } from '@/lib/auth'

/**
 * Server action result type
 */
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

/**
 * Get portfolio-wide analytics and metrics
 *
 * Calculates comprehensive portfolio metrics including:
 * - Total wheels by status (active/idle/paused/completed)
 * - Total capital currently deployed in open positions
 * - Total premiums collected across all wheels
 * - Total realized profit/loss across all wheels
 * - Overall win rate (percentage of profitable cycles)
 * - Best and worst performing tickers
 *
 * This provides a high-level view of the entire wheel strategy portfolio
 * to help traders assess overall performance and identify areas for improvement.
 *
 * @returns Promise resolving to portfolio metrics
 *
 * @example
 * const result = await getPortfolioAnalytics();
 * if (result.success) {
 *   console.log(`Total P&L: $${result.data.totalRealizedPL}`);
 *   console.log(`Win Rate: ${result.data.overallWinRate}%`);
 * }
 */
export async function getPortfolioAnalytics(): Promise<ActionResult<PortfolioMetrics>> {
  try {
    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Calculate portfolio metrics
    const metrics = await getPortfolioMetrics(userId)

    return {
      success: true,
      data: metrics,
    }
  } catch (error) {
    console.error('Error getting portfolio analytics:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to get portfolio analytics' }
  }
}

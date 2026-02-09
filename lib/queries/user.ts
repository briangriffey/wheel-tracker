import { cache } from 'react'
import { prisma } from '@/lib/db'

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
 * Get the user's current cash balance from the most recent benchmark
 *
 * Queries the most recent Benchmark record for the current user to retrieve
 * their available cash balance. This is used for validating cash-secured PUT
 * requirements and displaying account balance information.
 *
 * @returns Promise resolving to cash balance as number, or null if no benchmark exists
 *
 * @example
 * const balance = await getCashBalance();
 * if (balance && balance < requiredCash) {
 *   console.log('Insufficient cash for this trade');
 * }
 *
 * @throws {Error} If user not found or database query fails
 */
export async function getCashBalance(): Promise<number | null> {
  try {
    const userId = await getCurrentUserId()

    // Get the most recent benchmark record for this user
    const latestBenchmark = await prisma.benchmark.findFirst({
      where: {
        userId,
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        cashBalance: true,
      },
    })

    if (!latestBenchmark) {
      return null
    }

    return Number(latestBenchmark.cashBalance)
  } catch (error) {
    console.error('Error fetching cash balance:', error)
    throw error
  }
}

/**
 * Get comprehensive user account information
 *
 * Retrieves the user's account details including cash balance, total value,
 * and P&L from the most recent benchmark.
 *
 * @returns Promise resolving to user account data or null if no benchmark exists
 *
 * @example
 * const account = await getUserAccount();
 * console.log(`Cash: ${account.cashBalance}, Total: ${account.totalValue}`);
 */
export async function getUserAccount(): Promise<{
  cashBalance: number
  totalValue: number
  totalGainLoss: number
  lastUpdated: Date
} | null> {
  try {
    const userId = await getCurrentUserId()

    const latestBenchmark = await prisma.benchmark.findFirst({
      where: {
        userId,
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        cashBalance: true,
        totalValue: true,
        totalGainLoss: true,
        date: true,
      },
    })

    if (!latestBenchmark) {
      return null
    }

    return {
      cashBalance: Number(latestBenchmark.cashBalance),
      totalValue: Number(latestBenchmark.totalValue),
      totalGainLoss: Number(latestBenchmark.totalGainLoss),
      lastUpdated: latestBenchmark.date,
    }
  } catch (error) {
    console.error('Error fetching user account:', error)
    throw error
  }
}

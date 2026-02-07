'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'

/**
 * Server action result type
 */
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

/**
 * Price data with staleness information
 */
export interface PriceData {
  ticker: string
  price: number
  date: Date
  source: string
  isStale: boolean
  ageInHours: number
}

/**
 * Get the current user ID
 * TODO: Replace with actual session-based authentication
 */
async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found. Please create a user first.')
  }
  return user.id
}

/**
 * Calculate price age in hours
 */
function calculatePriceAge(priceDate: Date): number {
  const now = new Date()
  const diff = now.getTime() - priceDate.getTime()
  return diff / (1000 * 60 * 60) // Convert ms to hours
}

/**
 * Get the latest stock price for a ticker
 */
export async function getLatestPrice(ticker: string): Promise<ActionResult<PriceData>> {
  try {
    const normalizedTicker = ticker.toUpperCase()

    // Get the most recent price for this ticker
    const latestPrice = await prisma.stockPrice.findFirst({
      where: { ticker: normalizedTicker },
      orderBy: { date: 'desc' },
    })

    if (!latestPrice) {
      return {
        success: false,
        error: `No price data found for ${normalizedTicker}`,
      }
    }

    const ageInHours = calculatePriceAge(latestPrice.date)
    const isStale = ageInHours > 1 // Price is stale if older than 1 hour

    return {
      success: true,
      data: {
        ticker: latestPrice.ticker,
        price: latestPrice.price.toNumber(),
        date: latestPrice.date,
        source: latestPrice.source,
        isStale,
        ageInHours,
      },
    }
  } catch (error) {
    console.error(`Error fetching price for ${ticker}:`, error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch price' }
  }
}

/**
 * Get latest prices for multiple tickers
 */
export async function getLatestPrices(
  tickers: string[]
): Promise<ActionResult<Record<string, PriceData>>> {
  try {
    const normalizedTickers = tickers.map((t) => t.toUpperCase())

    // Get the latest price for each ticker
    const prices = await Promise.all(
      normalizedTickers.map(async (ticker) => {
        const result = await getLatestPrice(ticker)
        return { ticker, result }
      })
    )

    // Build result map
    const priceMap: Record<string, PriceData> = {}
    const errors: string[] = []

    for (const { ticker, result } of prices) {
      if (result.success) {
        priceMap[ticker] = result.data
      } else {
        errors.push(`${ticker}: ${result.error}`)
      }
    }

    // If all failed, return error
    if (Object.keys(priceMap).length === 0) {
      return {
        success: false,
        error: 'Failed to fetch any prices',
        details: errors,
      }
    }

    // Return partial success if some succeeded
    return { success: true, data: priceMap }
  } catch (error) {
    console.error('Error fetching multiple prices:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch prices' }
  }
}

/**
 * Refresh position prices with latest stock prices
 * Updates the currentValue field for all OPEN positions
 */
export async function refreshPositionPrices(): Promise<
  ActionResult<{
    updatedCount: number
    failedTickers: string[]
  }>
> {
  try {
    const userId = await getCurrentUserId()

    // Get all open positions
    const openPositions = await prisma.position.findMany({
      where: {
        userId,
        status: 'OPEN',
      },
      select: {
        id: true,
        ticker: true,
        shares: true,
      },
    })

    if (openPositions.length === 0) {
      return {
        success: true,
        data: {
          updatedCount: 0,
          failedTickers: [],
        },
      }
    }

    // Get unique tickers
    const uniqueTickers = [...new Set(openPositions.map((p) => p.ticker))]

    // Fetch latest prices for all tickers
    const pricesResult = await getLatestPrices(uniqueTickers)

    if (!pricesResult.success) {
      return {
        success: false,
        error: 'Failed to fetch latest prices',
        details: pricesResult.details,
      }
    }

    const prices = pricesResult.data
    const failedTickers: string[] = []
    let updatedCount = 0

    // Update each position with the latest price
    for (const position of openPositions) {
      const priceData = prices[position.ticker]

      if (!priceData) {
        failedTickers.push(position.ticker)
        continue
      }

      const currentValue = priceData.price * position.shares

      await prisma.position.update({
        where: { id: position.id },
        data: {
          currentValue: new Prisma.Decimal(currentValue),
        },
      })

      updatedCount++
    }

    // Revalidate relevant paths
    revalidatePath('/positions')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        updatedCount,
        failedTickers,
      },
    }
  } catch (error) {
    console.error('Error refreshing position prices:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to refresh position prices' }
  }
}

/**
 * Refresh price for a single position
 */
export async function refreshSinglePositionPrice(
  positionId: string
): Promise<ActionResult<{ currentValue: number; priceData: PriceData }>> {
  try {
    const userId = await getCurrentUserId()

    // Get the position
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: {
        id: true,
        userId: true,
        ticker: true,
        shares: true,
        status: true,
      },
    })

    if (!position) {
      return { success: false, error: 'Position not found' }
    }

    if (position.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (position.status !== 'OPEN') {
      return {
        success: false,
        error: 'Cannot refresh price for closed position',
      }
    }

    // Get latest price
    const priceResult = await getLatestPrice(position.ticker)

    if (!priceResult.success) {
      return {
        success: false,
        error: priceResult.error,
      }
    }

    const priceData = priceResult.data
    const currentValue = priceData.price * position.shares

    // Update position
    await prisma.position.update({
      where: { id: positionId },
      data: {
        currentValue: new Prisma.Decimal(currentValue),
      },
    })

    // Revalidate relevant paths
    revalidatePath('/positions')
    revalidatePath(`/positions/${positionId}`)
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        currentValue,
        priceData,
      },
    }
  } catch (error) {
    console.error(`Error refreshing position price for ${positionId}:`, error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to refresh position price' }
  }
}

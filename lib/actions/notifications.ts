'use server'

import { prisma } from '@/lib/db'
import { getLatestPrice } from './prices'

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
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found. Please create a user first.')
  }
  return user.id
}

/**
 * Notification for an upcoming expiration
 */
export interface ExpirationNotification {
  id: string
  ticker: string
  type: 'PUT' | 'CALL'
  strikePrice: number
  expirationDate: Date
  daysUntilExpiration: number
  premium: number
  contracts: number
}

/**
 * Notification for an in-the-money option
 */
export interface ITMNotification {
  id: string
  ticker: string
  type: 'PUT' | 'CALL'
  strikePrice: number
  currentPrice: number
  expirationDate: Date
  premium: number
  contracts: number
  intrinsicValue: number
}

/**
 * Notification for a position without covered calls
 */
export interface PositionWithoutCallNotification {
  id: string
  ticker: string
  shares: number
  costBasis: number
  currentValue: number | null
  acquiredDate: Date
}

/**
 * Get trades expiring within the next N days
 *
 * Returns OPEN trades that are approaching expiration. Useful for
 * alerting users to take action before options expire.
 *
 * @param daysAhead - Number of days to look ahead (default: 7)
 * @returns Promise resolving to array of expiration notifications
 *
 * @example
 * const result = await getUpcomingExpirations(7);
 * if (result.success) {
 *   console.log(`${result.data.length} options expiring soon`);
 * }
 */
export async function getUpcomingExpirations(
  daysAhead: number = 7
): Promise<ActionResult<ExpirationNotification[]>> {
  try {
    const userId = await getCurrentUserId()

    // Calculate date range
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(now.getDate() + daysAhead)

    // Query trades expiring within the date range
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        status: 'OPEN',
        expirationDate: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: {
        expirationDate: 'asc',
      },
      select: {
        id: true,
        ticker: true,
        type: true,
        strikePrice: true,
        expirationDate: true,
        premium: true,
        contracts: true,
      },
    })

    // Transform to notifications with days until expiration
    const notifications: ExpirationNotification[] = trades.map((trade) => {
      const daysUntilExpiration = Math.ceil(
        (trade.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: trade.id,
        ticker: trade.ticker,
        type: trade.type,
        strikePrice: trade.strikePrice.toNumber(),
        expirationDate: trade.expirationDate,
        daysUntilExpiration,
        premium: trade.premium.toNumber(),
        contracts: trade.contracts,
      }
    })

    return { success: true, data: notifications }
  } catch (error) {
    console.error('Error fetching upcoming expirations:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch upcoming expirations' }
  }
}

/**
 * Get in-the-money (ITM) options
 *
 * Returns OPEN options that are currently in-the-money based on
 * the latest stock prices. For PUTs, ITM means stock price < strike price.
 * For CALLs, ITM means stock price > strike price.
 *
 * @returns Promise resolving to array of ITM option notifications
 *
 * @example
 * const result = await getITMOptions();
 * if (result.success) {
 *   result.data.forEach(option => {
 *     console.log(`${option.ticker} ${option.type} is ITM`);
 *   });
 * }
 */
export async function getITMOptions(): Promise<ActionResult<ITMNotification[]>> {
  try {
    const userId = await getCurrentUserId()

    // Get all OPEN trades
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        status: 'OPEN',
      },
      select: {
        id: true,
        ticker: true,
        type: true,
        strikePrice: true,
        expirationDate: true,
        premium: true,
        contracts: true,
      },
    })

    if (trades.length === 0) {
      return { success: true, data: [] }
    }

    // Get unique tickers
    const uniqueTickers = [...new Set(trades.map((t) => t.ticker))]

    // Fetch latest prices for all tickers
    const prices: Record<string, number> = {}
    const priceErrors: string[] = []

    for (const ticker of uniqueTickers) {
      const priceResult = await getLatestPrice(ticker)
      if (priceResult.success) {
        prices[ticker] = priceResult.data.price
      } else {
        priceErrors.push(ticker)
      }
    }

    // Filter to ITM options
    const itmNotifications: ITMNotification[] = []

    for (const trade of trades) {
      const currentPrice = prices[trade.ticker]

      // Skip if we don't have price data
      if (currentPrice === undefined) {
        continue
      }

      const strikePrice = trade.strikePrice.toNumber()
      let isITM = false

      // Determine if option is ITM based on type
      if (trade.type === 'PUT') {
        // PUT is ITM if stock price < strike price
        isITM = currentPrice < strikePrice
      } else if (trade.type === 'CALL') {
        // CALL is ITM if stock price > strike price
        isITM = currentPrice > strikePrice
      }

      if (isITM) {
        const intrinsicValue = Math.abs(currentPrice - strikePrice) * trade.contracts * 100

        itmNotifications.push({
          id: trade.id,
          ticker: trade.ticker,
          type: trade.type,
          strikePrice,
          currentPrice,
          expirationDate: trade.expirationDate,
          premium: trade.premium.toNumber(),
          contracts: trade.contracts,
          intrinsicValue,
        })
      }
    }

    return { success: true, data: itmNotifications }
  } catch (error) {
    console.error('Error fetching ITM options:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch ITM options' }
  }
}

/**
 * Get positions without covered calls
 *
 * Returns OPEN stock positions that don't have any OPEN covered calls
 * against them. This is useful for identifying opportunities to sell
 * covered calls and generate additional premium income.
 *
 * @returns Promise resolving to array of position notifications
 *
 * @example
 * const result = await getPositionsWithoutCalls();
 * if (result.success) {
 *   console.log(`${result.data.length} positions available for covered calls`);
 * }
 */
export async function getPositionsWithoutCalls(): Promise<
  ActionResult<PositionWithoutCallNotification[]>
> {
  try {
    const userId = await getCurrentUserId()

    // Get all OPEN positions with their covered calls
    const positions = await prisma.position.findMany({
      where: {
        userId,
        status: 'OPEN',
      },
      include: {
        coveredCalls: {
          where: {
            status: 'OPEN',
          },
        },
      },
      orderBy: {
        acquiredDate: 'desc',
      },
    })

    // Filter to positions without any OPEN covered calls
    const positionsWithoutCalls = positions.filter(
      (position) => position.coveredCalls.length === 0
    )

    // Transform to notifications
    const notifications: PositionWithoutCallNotification[] = positionsWithoutCalls.map(
      (position) => ({
        id: position.id,
        ticker: position.ticker,
        shares: position.shares,
        costBasis: position.costBasis.toNumber(),
        currentValue: position.currentValue ? position.currentValue.toNumber() : null,
        acquiredDate: position.acquiredDate,
      })
    )

    return { success: true, data: notifications }
  } catch (error) {
    console.error('Error fetching positions without calls:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch positions without calls' }
  }
}

import { prisma } from '@/lib/db'

/**
 * Market trading hours
 */
const MARKET_OPEN_HOUR = 9 // 9:30 AM ET
const MARKET_OPEN_MINUTE = 30
const MARKET_CLOSE_HOUR = 16 // 4:00 PM ET
const MARKET_CLOSE_MINUTE = 0

/**
 * US market holidays for 2026 (will need to be updated annually)
 * Format: YYYY-MM-DD
 */
const MARKET_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-01-19', // Martin Luther King Jr. Day
  '2026-02-16', // Presidents' Day
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-07-03', // Independence Day (observed)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
]

/**
 * Check if the US stock market is currently open
 * Market hours: Monday-Friday, 9:30 AM - 4:00 PM ET (excluding holidays)
 */
export function isMarketOpen(date: Date = new Date()): boolean {
  // Convert to ET timezone
  const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))

  // Check if it's a weekend
  const dayOfWeek = etDate.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false // Sunday = 0, Saturday = 6
  }

  // Check if it's a holiday
  const dateString = etDate.toISOString().split('T')[0]
  if (MARKET_HOLIDAYS_2026.includes(dateString)) {
    return false
  }

  // Check market hours (9:30 AM - 4:00 PM ET)
  const hours = etDate.getHours()
  const minutes = etDate.getMinutes()

  // Before market open
  if (hours < MARKET_OPEN_HOUR) {
    return false
  }
  if (hours === MARKET_OPEN_HOUR && minutes < MARKET_OPEN_MINUTE) {
    return false
  }

  // After market close
  if (hours > MARKET_CLOSE_HOUR) {
    return false
  }
  if (hours === MARKET_CLOSE_HOUR && minutes >= MARKET_CLOSE_MINUTE) {
    return false
  }

  return true
}

/**
 * Get the next market open time
 */
export function getNextMarketOpen(date: Date = new Date()): Date {
  const etDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))

  // Start with tomorrow
  const nextOpen = new Date(etDate)
  nextOpen.setDate(nextOpen.getDate() + 1)
  nextOpen.setHours(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0, 0)

  // Keep checking until we find a valid market day
  let attempts = 0
  while (!isMarketOpen(nextOpen) && attempts < 10) {
    nextOpen.setDate(nextOpen.getDate() + 1)
    attempts++
  }

  return nextOpen
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
 * Get all active tickers from user's open positions and trades
 * Returns unique, uppercase ticker symbols
 */
export async function getActiveTickers(userId?: string): Promise<string[]> {
  try {
    const actualUserId = userId || (await getCurrentUserId())

    // Get tickers from open positions
    const positions = await prisma.position.findMany({
      where: {
        userId: actualUserId,
        status: 'OPEN',
      },
      select: {
        ticker: true,
      },
      distinct: ['ticker'],
    })

    // Get tickers from open trades
    const trades = await prisma.trade.findMany({
      where: {
        userId: actualUserId,
        status: 'OPEN',
      },
      select: {
        ticker: true,
      },
      distinct: ['ticker'],
    })

    // Combine and deduplicate, always include SPY for benchmark tracking
    const tickerSet = new Set<string>(['SPY'])

    for (const position of positions) {
      tickerSet.add(position.ticker.toUpperCase())
    }

    for (const trade of trades) {
      tickerSet.add(trade.ticker.toUpperCase())
    }

    return Array.from(tickerSet).sort()
  } catch (error) {
    console.error('Error getting active tickers:', error)
    throw new Error('Failed to fetch active tickers')
  }
}

/**
 * Get all unique tickers from user's portfolio (including closed positions)
 */
export async function getAllTickers(userId?: string): Promise<string[]> {
  try {
    const actualUserId = userId || (await getCurrentUserId())

    // Get all tickers from positions
    const positions = await prisma.position.findMany({
      where: {
        userId: actualUserId,
      },
      select: {
        ticker: true,
      },
      distinct: ['ticker'],
    })

    // Get all tickers from trades
    const trades = await prisma.trade.findMany({
      where: {
        userId: actualUserId,
      },
      select: {
        ticker: true,
      },
      distinct: ['ticker'],
    })

    // Combine and deduplicate
    const tickerSet = new Set<string>()

    for (const position of positions) {
      tickerSet.add(position.ticker.toUpperCase())
    }

    for (const trade of trades) {
      tickerSet.add(trade.ticker.toUpperCase())
    }

    return Array.from(tickerSet).sort()
  } catch (error) {
    console.error('Error getting all tickers:', error)
    throw new Error('Failed to fetch all tickers')
  }
}

/**
 * Format a date to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Check if a date is a US market holiday
 */
export function isMarketHoliday(date: Date): boolean {
  const dateString = formatDateString(date)
  return MARKET_HOLIDAYS_2026.includes(dateString)
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

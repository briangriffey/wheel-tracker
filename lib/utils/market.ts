import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

/**
 * Market trading hours in Central Time (America/Chicago)
 */
const MARKET_TIMEZONE = 'America/Chicago'
const MARKET_OPEN_HOUR = 8 // 8:30 AM CT
const MARKET_OPEN_MINUTE = 30
const MARKET_CLOSE_HOUR = 15 // 3:30 PM CT (was 3:00 PM CT = 4:00 PM ET, now 3:30 PM CT)
const MARKET_CLOSE_MINUTE = 30

/** Refresh cooldown during market hours (4 hours) */
const REFRESH_COOLDOWN_MS = 4 * 60 * 60 * 1000

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
 * Refresh eligibility result
 */
export interface RefreshEligibility {
  canRefresh: boolean
  lastUpdated: Date
  nextRefreshAt: Date | null
  reason: string
}

/**
 * Convert a UTC Date to Central Time components
 */
function toCentralTime(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: MARKET_TIMEZONE }))
}

/**
 * Check if a date (in CT) falls on a trading day (not weekend, not holiday)
 */
function isTradingDay(ctDate: Date): boolean {
  const dayOfWeek = ctDate.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) return false

  const dateString = ctDate.toISOString().split('T')[0]
  if (MARKET_HOLIDAYS_2026.includes(dateString)) return false

  return true
}

/**
 * Check if the US stock market is currently open
 * Market hours: Monday-Friday, 8:30 AM - 3:30 PM CT (excluding holidays)
 */
export function isMarketOpen(date: Date = new Date()): boolean {
  const ctDate = toCentralTime(date)

  if (!isTradingDay(ctDate)) return false

  const hours = ctDate.getHours()
  const minutes = ctDate.getMinutes()

  // Before market open
  if (hours < MARKET_OPEN_HOUR) return false
  if (hours === MARKET_OPEN_HOUR && minutes < MARKET_OPEN_MINUTE) return false

  // After market close
  if (hours > MARKET_CLOSE_HOUR) return false
  if (hours === MARKET_CLOSE_HOUR && minutes >= MARKET_CLOSE_MINUTE) return false

  return true
}

/**
 * Get the most recent market close time (walks backward from `now`)
 * Returns a UTC Date representing when the market last closed.
 */
export function getLastMarketClose(now: Date = new Date()): Date {
  const ctNow = toCentralTime(now)

  // Start with today's close
  const candidate = new Date(ctNow)
  candidate.setHours(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE, 0, 0)

  // If today is a trading day and we're past close, today's close is the answer
  if (isTradingDay(ctNow) && ctNow >= candidate) {
    // Convert CT close time back to UTC by computing offset
    return ctCloseToUtc(candidate, now)
  }

  // Otherwise, walk backward to find the most recent trading day
  const walker = new Date(ctNow)
  // If we haven't passed close today (or today isn't a trading day), start from yesterday
  walker.setDate(walker.getDate() - 1)
  let attempts = 0
  while (attempts < 10) {
    if (isTradingDay(walker)) {
      walker.setHours(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE, 0, 0)
      return ctCloseToUtc(walker, now)
    }
    walker.setDate(walker.getDate() - 1)
    attempts++
  }

  // Fallback: return a week ago
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
}

/**
 * Convert a CT close time back to a UTC Date.
 * We compute the offset by comparing the CT representation with the original UTC date.
 */
function ctCloseToUtc(ctClose: Date, referenceUtc: Date): Date {
  // Get the CT offset by comparing reference dates
  const refCt = toCentralTime(referenceUtc)
  const offsetMs = refCt.getTime() - referenceUtc.getTime()

  // Subtract the offset to go from CT back to UTC
  return new Date(ctClose.getTime() - offsetMs)
}

/**
 * Get the next market open time
 */
export function getNextMarketOpen(date: Date = new Date()): Date {
  const ctDate = toCentralTime(date)

  // Start with today if before open, otherwise tomorrow
  const candidate = new Date(ctDate)

  // If today is a trading day and we're before open, use today
  if (isTradingDay(ctDate)) {
    const todayOpen = new Date(ctDate)
    todayOpen.setHours(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0, 0)
    if (ctDate < todayOpen) {
      return ctCloseToUtc(todayOpen, date)
    }
  }

  // Otherwise start from tomorrow
  candidate.setDate(candidate.getDate() + 1)
  candidate.setHours(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0, 0)

  let attempts = 0
  while (!isTradingDay(candidate) && attempts < 10) {
    candidate.setDate(candidate.getDate() + 1)
    attempts++
  }

  return ctCloseToUtc(candidate, date)
}

/**
 * Determine if a price can be refreshed and when the next refresh is available
 *
 * Rules:
 * - Market open: can refresh if updatedAt > 4 hours ago; nextRefreshAt = updatedAt + 4h
 * - Market closed: can refresh only if updatedAt < last market close; nextRefreshAt = next market open
 */
export function canRefreshPrice(updatedAt: Date, now: Date = new Date()): RefreshEligibility {
  const marketOpen = isMarketOpen(now)
  const lastClose = getLastMarketClose(now)

  if (marketOpen) {
    const timeSinceUpdate = now.getTime() - new Date(updatedAt).getTime()
    if (timeSinceUpdate >= REFRESH_COOLDOWN_MS) {
      return {
        canRefresh: true,
        lastUpdated: updatedAt,
        nextRefreshAt: null,
        reason: 'Price is older than 4 hours',
      }
    }
    const nextRefreshAt = new Date(new Date(updatedAt).getTime() + REFRESH_COOLDOWN_MS)
    return {
      canRefresh: false,
      lastUpdated: updatedAt,
      nextRefreshAt,
      reason: 'Recently updated during market hours',
    }
  }

  // Market is closed
  if (new Date(updatedAt) < lastClose) {
    return {
      canRefresh: true,
      lastUpdated: updatedAt,
      nextRefreshAt: null,
      reason: 'Not yet updated since last market close',
    }
  }

  const nextOpen = getNextMarketOpen(now)
  return {
    canRefresh: false,
    lastUpdated: updatedAt,
    nextRefreshAt: nextOpen,
    reason: 'Already updated since last close',
  }
}

/**
 * Get all active tickers from user's open positions and trades
 * Returns unique, uppercase ticker symbols
 */
export async function getActiveTickers(userId?: string): Promise<string[]> {
  try {
    const resolvedId = userId ?? (await getCurrentUserId())
    if (!resolvedId) throw new Error('Not authenticated')
    const actualUserId = resolvedId

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
    const resolvedId = userId ?? (await getCurrentUserId())
    if (!resolvedId) throw new Error('Not authenticated')
    const actualUserId = resolvedId

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

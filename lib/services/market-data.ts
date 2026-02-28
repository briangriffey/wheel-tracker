import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'
import { canRefreshPrice, type RefreshEligibility } from '@/lib/utils/market'
import { fetchFromAlphaVantage } from './alpha-vantage'
import { apiRateLimiter } from './rate-limiter'

/**
 * FinancialData.net API response type
 */
interface FinancialDataPriceRecord {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/**
 * Result type for fetch operations
 */
export interface StockPriceResult {
  ticker: string
  price: number
  date: Date
  success: boolean
  error?: string
}

/**
 * Validate API key is configured
 */
function validateApiKey(): void {
  if (!process.env.FINANCIAL_DATA_API_KEY) {
    throw new Error('FINANCIAL_DATA_API_KEY is not configured in environment variables')
  }
}

/**
 * Fetch stock price from FinancialData.net API
 */
async function fetchFromFinancialData(ticker: string): Promise<StockPriceResult> {
  validateApiKey()

  const apiKey = process.env.FINANCIAL_DATA_API_KEY
  const url = `https://financialdata.net/api/v1/stock-prices?identifier=${ticker.toUpperCase()}&key=${apiKey}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 401) {
        return {
          ticker,
          price: 0,
          date: new Date(),
          success: false,
          error: 'API authentication failed. Check FINANCIAL_DATA_API_KEY.',
        }
      }
      if (response.status === 404) {
        return {
          ticker,
          price: 0,
          date: new Date(),
          success: false,
          error: 'No data received from API. Ticker may not exist.',
        }
      }
      if (response.status === 429) {
        return {
          ticker,
          price: 0,
          date: new Date(),
          success: false,
          error: 'API rate limit exceeded. Please try again later.',
        }
      }
      return {
        ticker,
        price: 0,
        date: new Date(),
        success: false,
        error: `API server error: ${response.status} ${response.statusText}`,
      }
    }

    const data = (await response.json()) as FinancialDataPriceRecord[]

    // Empty array means unknown ticker
    if (!Array.isArray(data) || data.length === 0) {
      return {
        ticker,
        price: 0,
        date: new Date(),
        success: false,
        error: 'No data received from API. Ticker may not exist.',
      }
    }

    const latest = data[0]
    const price = latest.close

    if (!price || isNaN(price)) {
      return {
        ticker,
        price: 0,
        date: new Date(),
        success: false,
        error: 'Invalid price data received from API',
      }
    }

    return {
      ticker: ticker.toUpperCase(),
      price,
      date: new Date(latest.date),
      success: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error fetching price for ${ticker}:`, message)

    return {
      ticker,
      price: 0,
      date: new Date(),
      success: false,
      error: `Failed to fetch price: ${message}`,
    }
  }
}

/**
 * Save stock price to database
 * Updates the existing row for the ticker or creates a new one
 */
async function saveStockPrice(result: StockPriceResult, source = 'financial_data'): Promise<void> {
  if (!result.success) {
    return
  }

  try {
    await prisma.stockPrice.upsert({
      where: {
        ticker: result.ticker,
      },
      update: {
        price: new Prisma.Decimal(result.price),
        createdAt: new Date(),
      },
      create: {
        ticker: result.ticker,
        price: new Prisma.Decimal(result.price),
        source,
      },
    })
  } catch (error) {
    console.error(`Error saving price for ${result.ticker}:`, error)
    throw new Error(`Failed to save price to database: ${error}`)
  }
}

/**
 * Fetch stock price for a single ticker with rate limiting
 */
export async function fetchStockPrice(ticker: string): Promise<StockPriceResult> {
  let result: StockPriceResult

  if (ticker.toUpperCase() === 'SPY') {
    result = await fetchFromAlphaVantage(ticker)
  } else {
    result = await apiRateLimiter.enqueue(() => fetchFromFinancialData(ticker))
  }

  if (!result.success) {
    console.error(`Could not fetch ticker result: ${JSON.stringify(result)}`)
  }

  if (result.success) {
    await saveStockPrice(result, ticker.toUpperCase() === 'SPY' ? 'alpha_vantage' : 'financial_data')
  }

  return result
}

/**
 * Batch fetch stock prices for multiple tickers with rate limiting
 */
export async function batchFetchPrices(tickers: string[]): Promise<StockPriceResult[]> {
  // Remove duplicates and uppercase
  const uniqueTickers = [...new Set(tickers.map((t) => t.toUpperCase()))]

  // Fetch all prices (rate limiter will handle the timing)
  const promises = uniqueTickers.map((ticker) => fetchStockPrice(ticker))

  // Wait for all to complete
  const results = await Promise.all(promises)

  return results
}

/**
 * Get the latest cached price for a ticker from the database
 */
export async function getLatestPrice(ticker: string): Promise<StockPriceResult | null> {
  try {
    const stockPrice = await prisma.stockPrice.findUnique({
      where: {
        ticker: ticker.toUpperCase(),
      },
    })

    if (!stockPrice) {
      return null
    }

    return {
      ticker: stockPrice.ticker,
      price: stockPrice.price.toNumber(),
      date: stockPrice.updatedAt,
      success: true,
    }
  } catch (error) {
    console.error(`Error getting latest price for ${ticker}:`, error)
    return null
  }
}

/**
 * Get the latest cached prices for multiple tickers from the database
 */
export async function getLatestPrices(tickers: string[]): Promise<Map<string, StockPriceResult>> {
  const uniqueTickers = [...new Set(tickers.map((t) => t.toUpperCase()))]
  const priceMap = new Map<string, StockPriceResult>()

  try {
    // Get the price for each ticker (only one per ticker now)
    const prices = await prisma.stockPrice.findMany({
      where: {
        ticker: {
          in: uniqueTickers,
        },
      },
    })

    // Map results
    for (const price of prices) {
      priceMap.set(price.ticker, {
        ticker: price.ticker,
        price: price.price.toNumber(),
        date: price.updatedAt,
        success: true,
      })
    }

    return priceMap
  } catch (error) {
    console.error('Error getting latest prices:', error)
    return priceMap
  }
}

/**
 * Smart batch refresh: only fetches prices for tickers that are eligible for refresh.
 * Returns both refreshed results and skipped tickers with their eligibility info.
 */
export async function smartBatchRefresh(tickers: string[]): Promise<{
  refreshed: StockPriceResult[]
  skipped: { ticker: string; eligibility: RefreshEligibility }[]
}> {
  const uniqueTickers = [...new Set(tickers.map((t) => t.toUpperCase()))]

  //Make sure we're always adding SPY
  uniqueTickers.push('SPY')

  const cachedPrices = await getLatestPrices(uniqueTickers)
  const now = new Date()

  const eligible: string[] = []
  const skipped: { ticker: string; eligibility: RefreshEligibility }[] = []

  for (const ticker of uniqueTickers) {
    const cached = cachedPrices.get(ticker)
    if (!cached) {
      // No cached price at all — always fetch
      eligible.push(ticker)
      continue
    }

    const eligibility = canRefreshPrice(cached.date, now)
    if (eligibility.canRefresh) {
      eligible.push(ticker)
    } else {
      skipped.push({ ticker, eligibility })
    }
  }

  const refreshed = eligible.length > 0 ? await batchFetchPrices(eligible) : []

  return { refreshed, skipped }
}

/**
 * Get rate limiter status (for monitoring/debugging)
 */
export function getRateLimiterStatus() {
  return {
    queueLength: apiRateLimiter.getQueueLength(),
  }
}

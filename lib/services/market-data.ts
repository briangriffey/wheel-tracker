import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'

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
 * Rate limiter implementation for FinancialData.net API
 */
class RateLimiter {
  private queue: Array<() => Promise<void>> = []
  private requestTimes: number[] = []
  private readonly maxRequestsPerMinute: number = 10
  private readonly minIntervalMs: number = 6000 // 6 seconds between requests (10 per minute)
  private processing: boolean = false

  /**
   * Add a request to the queue and process it with rate limiting
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  /**
   * Process the queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      // Clean up old request times (older than 1 minute)
      const now = Date.now()
      this.requestTimes = this.requestTimes.filter((time) => now - time < 60000)

      // Check if we need to wait
      if (this.requestTimes.length >= this.maxRequestsPerMinute) {
        const oldestRequest = this.requestTimes[0]
        const waitTime = 60000 - (now - oldestRequest)
        if (waitTime > 0) {
          await this.sleep(waitTime)
          continue
        }
      }

      // Get the next request
      const request = this.queue.shift()
      if (!request) break

      // Execute the request
      this.requestTimes.push(Date.now())
      await request()

      // Wait minimum interval before next request
      if (this.queue.length > 0) {
        await this.sleep(this.minIntervalMs)
      }
    }

    this.processing = false
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter()

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
async function saveStockPrice(result: StockPriceResult): Promise<void> {
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
        source: 'financial_data',
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
  const result = await rateLimiter.enqueue(() => fetchFromFinancialData(ticker))

  if (result.success) {
    await saveStockPrice(result)
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
 * Get rate limiter status (for monitoring/debugging)
 */
export function getRateLimiterStatus() {
  return {
    queueLength: rateLimiter.getQueueLength(),
  }
}

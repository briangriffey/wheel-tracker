import { NextRequest, NextResponse } from 'next/server'
import { batchFetchPrices, fetchStockPrice } from '@/lib/services/market-data'
import { getActiveTickers } from '@/lib/utils/market'

/**
 * POST /api/market-data/refresh
 * Manually refresh stock prices for active tickers or specified tickers
 *
 * Body (optional):
 * {
 *   "tickers": ["AAPL", "MSFT"] // Optional: specific tickers to refresh
 * }
 *
 * If no tickers specified, refreshes all active tickers
 */
export async function POST(request: NextRequest) {
  try {
    let tickersToRefresh: string[]

    // Check if specific tickers were provided in the request body
    const body = await request.json().catch(() => null)

    if (body && Array.isArray(body.tickers) && body.tickers.length > 0) {
      // Use provided tickers
      tickersToRefresh = body.tickers.map((t: string) => t.toUpperCase())
    } else {
      // Get all active tickers from database
      tickersToRefresh = await getActiveTickers()

      if (tickersToRefresh.length === 0) {
        return NextResponse.json(
          {
            success: true,
            message: 'No active tickers to refresh',
            results: [],
          },
          { status: 200 }
        )
      }
    }

    // Fetch prices with rate limiting
    const results = await batchFetchPrices(tickersToRefresh)

    // Separate successful and failed results
    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    return NextResponse.json(
      {
        success: true,
        message: `Refreshed ${successful.length} of ${results.length} tickers`,
        results: {
          successful: successful.map((r) => ({
            ticker: r.ticker,
            price: r.price,
            date: r.date,
          })),
          failed: failed.map((r) => ({
            ticker: r.ticker,
            error: r.error,
          })),
        },
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error refreshing market data:', error)

    const message = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh market data',
        details: message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/market-data/refresh?ticker=AAPL
 * Refresh a single ticker
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')

    if (!ticker) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing ticker parameter',
        },
        { status: 400 }
      )
    }

    // Fetch the price
    const result = await fetchStockPrice(ticker)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch price',
          ticker: result.ticker,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        ticker: result.ticker,
        price: result.price,
        date: result.date,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching stock price:', error)

    const message = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stock price',
        details: message,
      },
      { status: 500 }
    )
  }
}

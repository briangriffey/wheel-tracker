import { NextRequest, NextResponse } from 'next/server'
import { batchFetchPrices } from '@/lib/services/market-data'
import { getActiveTickers, isMarketOpen } from '@/lib/utils/market'

/**
 * POST /api/cron/update-prices
 * Automated cron job to update stock prices during market hours
 *
 * Authentication: Requires CRON_SECRET header matching environment variable
 * Schedule: Every 15 minutes during market hours - cron: "* /15 9-16 * * 1-5" (spaces removed)
 *
 * This endpoint is called automatically by Vercel Cron and should not be
 * called manually unless testing. For manual price updates, use the
 * /api/market-data/refresh endpoint instead.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Authenticate the request
    const authHeader = request.headers.get('authorization')

    if (!process.env.CRON_SECRET) {
      console.error('[CRON] CRON_SECRET not configured in environment')
      return NextResponse.json(
        {
          success: false,
          error: 'Cron job not configured properly',
        },
        { status: 500 }
      )
    }

    // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    if (authHeader !== expectedAuth) {
      console.warn('[CRON] Unauthorized cron request attempt')
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting automated price update job')

    // 2. Check if market is open
    const marketOpen = isMarketOpen()
    if (!marketOpen) {
      const duration = Date.now() - startTime
      console.log('[CRON] Market is closed, skipping price updates')
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          reason: 'Market is closed',
          timestamp: new Date().toISOString(),
          duration: `${duration}ms`,
        },
        { status: 200 }
      )
    }

    console.log('[CRON] Market is open, proceeding with price updates')

    // 3. Get all active tickers
    const tickers = await getActiveTickers()

    if (tickers.length === 0) {
      const duration = Date.now() - startTime
      console.log('[CRON] No active tickers found, nothing to update')
      return NextResponse.json(
        {
          success: true,
          message: 'No active tickers to update',
          timestamp: new Date().toISOString(),
          duration: `${duration}ms`,
        },
        { status: 200 }
      )
    }

    console.log(`[CRON] Found ${tickers.length} active tickers:`, tickers.join(', '))

    // 4. Fetch and update prices with rate limiting
    const results = await batchFetchPrices(tickers)

    // 5. Separate successful and failed results
    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    const duration = Date.now() - startTime

    // 6. Log results
    console.log(
      `[CRON] Price update complete: ${successful.length}/${results.length} successful (${duration}ms)`
    )

    if (successful.length > 0) {
      console.log(
        '[CRON] Successfully updated:',
        successful.map((r) => `${r.ticker}=$${r.price}`).join(', ')
      )
    }

    if (failed.length > 0) {
      console.warn(
        '[CRON] Failed to update:',
        failed.map((r) => `${r.ticker}: ${r.error}`).join(', ')
      )
    }

    // 7. Return comprehensive response
    return NextResponse.json(
      {
        success: true,
        message: `Updated ${successful.length} of ${results.length} tickers`,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
        },
        results: {
          successful: successful.map((r) => ({
            ticker: r.ticker,
            price: r.price,
            date: r.date.toISOString(),
          })),
          failed: failed.map((r) => ({
            ticker: r.ticker,
            error: r.error,
          })),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[CRON] Fatal error in price update job:', error)

    const message = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        details: message,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/update-prices
 * Health check endpoint - does not perform updates
 */
export async function GET() {
  const marketOpen = isMarketOpen()

  return NextResponse.json(
    {
      status: 'ready',
      marketOpen,
      timestamp: new Date().toISOString(),
      message: 'Cron job endpoint is operational. Use POST to trigger updates.',
    },
    { status: 200 }
  )
}

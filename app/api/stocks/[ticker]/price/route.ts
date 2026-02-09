import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/stocks/[ticker]/price
 *
 * Returns the most recent cached price for a given ticker
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { ticker } = params

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
    }

    // Get the most recent price from StockPrice table
    const stockPrice = await prisma.stockPrice.findFirst({
      where: {
        ticker: ticker.toUpperCase(),
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        price: true,
        date: true,
      },
    })

    if (!stockPrice) {
      return NextResponse.json(
        {
          error: `No price data available for ${ticker}. Price data will be fetched during the next scheduled update.`,
        },
        { status: 404 }
      )
    }

    // Check if price is stale (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const isStale = new Date(stockPrice.date) < oneHourAgo

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      price: Number(stockPrice.price),
      fetchedAt: stockPrice.date,
      isStale,
    })
  } catch (error) {
    console.error('Error fetching stock price:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock price' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import {
  getDashboardMetrics,
  getPLOverTime,
  getPLByTicker,
  getWinRateData,
  type TimeRange,
} from '@/lib/queries/dashboard'

// Cache for 60 seconds, revalidate in background
export const revalidate = 60

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = (searchParams.get('timeRange') as TimeRange) || 'All'

    // Validate time range
    const validTimeRanges: TimeRange[] = ['1M', '3M', '6M', '1Y', 'All']
    if (!validTimeRanges.includes(timeRange)) {
      return NextResponse.json({ error: 'Invalid time range' }, { status: 400 })
    }

    // Fetch all dashboard data in parallel
    const [metrics, plOverTime, plByTicker, winRateData] = await Promise.all([
      getDashboardMetrics(timeRange),
      getPLOverTime(timeRange),
      getPLByTicker(timeRange),
      getWinRateData(timeRange),
    ])

    const response = NextResponse.json({
      metrics,
      plOverTime,
      plByTicker,
      winRateData,
    })

    // Add cache headers: cache for 60s, allow stale for 300s while revalidating
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

    return response
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}

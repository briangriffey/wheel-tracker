import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getConversionFunnelMetrics,
  getSubscriptionMetrics,
  getWebhookHealthMetrics,
} from '@/lib/analytics-server'

/**
 * GET /api/admin/analytics
 * Returns conversion funnel, subscription, and webhook health metrics.
 *
 * Query params:
 * - days: number of days to look back (default 30)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') ?? '30', 10)

    const [funnel, subscriptions, webhookHealth] = await Promise.all([
      getConversionFunnelMetrics(days),
      getSubscriptionMetrics(),
      getWebhookHealthMetrics(days),
    ])

    return NextResponse.json({
      funnel,
      subscriptions,
      webhookHealth,
    })
  } catch (error) {
    console.error('[ADMIN] Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

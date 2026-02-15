import { NextRequest, NextResponse } from 'next/server'
import { getWebhookHealthMetrics } from '@/lib/analytics-server'

/**
 * POST /api/cron/webhook-health
 * Checks for failed webhooks in the last hour and logs alerts.
 *
 * Authentication: Requires CRON_SECRET header
 * Schedule: Every hour - cron: "0 * * * *"
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check last 1 day of webhook health
    const health = await getWebhookHealthMetrics(1)

    if (health.failures > 0) {
      console.error(
        `[WEBHOOK-ALERT] ${health.failures} failed webhook(s) in the last 24h. ` +
          `Success rate: ${(health.successRate * 100).toFixed(1)}%`
      )
    }

    return NextResponse.json({
      status: health.failures > 0 ? 'alert' : 'healthy',
      ...health,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[WEBHOOK-HEALTH] Error checking webhook health:', error)
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 })
  }
}

/**
 * GET /api/cron/webhook-health
 * Health check endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    message: 'Webhook health check endpoint is operational. Use POST to check.',
  })
}

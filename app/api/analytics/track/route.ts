import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { recordAnalyticsEvent } from '@/lib/analytics-server'
import type { AnalyticsEvent } from '@/lib/analytics'

const VALID_EVENTS: AnalyticsEvent[] = [
  'trade_limit_reached',
  'upgrade_prompt_shown',
  'checkout_started',
  'subscription_activated',
]

/**
 * POST /api/analytics/track
 * Records a client-side analytics event. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { event, properties } = body

    if (!event || !VALID_EVENTS.includes(event)) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    await recordAnalyticsEvent(event, session.user.id, properties)

    return NextResponse.json({ recorded: true })
  } catch {
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
  }
}

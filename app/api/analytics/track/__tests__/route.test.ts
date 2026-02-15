import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/analytics-server', () => ({
  recordAnalyticsEvent: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { recordAnalyticsEvent } from '@/lib/analytics-server'

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/analytics/track', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/analytics/track', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)

    const response = await POST(makeRequest({ event: 'checkout_started' }))

    expect(response.status).toBe(401)
    expect(recordAnalyticsEvent).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid event name', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user1' },
    } as never)

    const response = await POST(makeRequest({ event: 'invalid_event' }))

    expect(response.status).toBe(400)
    expect(recordAnalyticsEvent).not.toHaveBeenCalled()
  })

  it('records a valid event', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user1' },
    } as never)
    vi.mocked(recordAnalyticsEvent).mockResolvedValue(undefined)

    const response = await POST(
      makeRequest({
        event: 'trade_limit_reached',
        properties: { tradesUsed: 20 },
      })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.recorded).toBe(true)
    expect(recordAnalyticsEvent).toHaveBeenCalledWith('trade_limit_reached', 'user1', {
      tradesUsed: 20,
    })
  })

  it('accepts all valid event types', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user1' },
    } as never)
    vi.mocked(recordAnalyticsEvent).mockResolvedValue(undefined)

    const validEvents = [
      'trade_limit_reached',
      'upgrade_prompt_shown',
      'checkout_started',
      'subscription_activated',
    ]

    for (const event of validEvents) {
      const response = await POST(makeRequest({ event }))
      expect(response.status).toBe(200)
    }

    expect(recordAnalyticsEvent).toHaveBeenCalledTimes(validEvents.length)
  })
})

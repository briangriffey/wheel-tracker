import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trackEvent } from '../analytics'

describe('Analytics - trackEvent', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn>
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sendBeaconSpy = vi.fn().mockReturnValue(true)
    fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeaconSpy,
      writable: true,
      configurable: true,
    })
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses sendBeacon when available', () => {
    trackEvent('trade_limit_reached', { tradesUsed: 20 })

    expect(sendBeaconSpy).toHaveBeenCalledOnce()
    expect(sendBeaconSpy).toHaveBeenCalledWith('/api/analytics/track', expect.any(String))

    const payload = JSON.parse(sendBeaconSpy.mock.calls[0][1])
    expect(payload.event).toBe('trade_limit_reached')
    expect(payload.properties.tradesUsed).toBe(20)
    expect(payload.timestamp).toBeDefined()
  })

  it('falls back to fetch when sendBeacon is not available', () => {
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    trackEvent('upgrade_prompt_shown')

    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(fetchSpy).toHaveBeenCalledWith('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.any(String),
      keepalive: true,
    })

    const payload = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(payload.event).toBe('upgrade_prompt_shown')
  })

  it('includes correct event name and properties', () => {
    trackEvent('checkout_started', { plan: 'monthly', source: 'pricing_page' })

    const payload = JSON.parse(sendBeaconSpy.mock.calls[0][1])
    expect(payload.event).toBe('checkout_started')
    expect(payload.properties).toEqual({
      plan: 'monthly',
      source: 'pricing_page',
    })
  })

  it('works without properties', () => {
    trackEvent('subscription_activated')

    const payload = JSON.parse(sendBeaconSpy.mock.calls[0][1])
    expect(payload.event).toBe('subscription_activated')
    expect(payload.properties).toBeUndefined()
  })
})

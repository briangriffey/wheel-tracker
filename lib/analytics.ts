/**
 * Analytics event tracking for conversion funnel monitoring.
 *
 * Events tracked:
 * - trade_limit_reached: User hits the 20-trade free tier limit
 * - upgrade_prompt_shown: Upgrade prompt is displayed to a user
 * - checkout_started: User initiates Stripe checkout
 * - subscription_activated: User's PRO subscription is activated
 *
 * Server-side events are logged to the analytics_events table.
 * Client-side events call the /api/analytics/track endpoint.
 */

export type AnalyticsEvent =
  | 'trade_limit_reached'
  | 'upgrade_prompt_shown'
  | 'checkout_started'
  | 'subscription_activated'

export interface AnalyticsEventData {
  event: AnalyticsEvent
  userId?: string
  properties?: Record<string, string | number | boolean>
  timestamp?: string
}

/**
 * Track an analytics event from a client component.
 * Sends a beacon to /api/analytics/track to avoid blocking the UI.
 */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>
): void {
  const payload: AnalyticsEventData = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  }

  // Use sendBeacon for non-blocking tracking (falls back to fetch)
  const body = JSON.stringify(payload)
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/track', body)
  } else if (typeof fetch !== 'undefined') {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Silently fail — analytics should never break the app
    })
  }
}

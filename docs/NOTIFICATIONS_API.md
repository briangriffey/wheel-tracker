# Notification System API Documentation

**Version:** 1.0.0
**Last Updated:** February 2026
**Module:** `lib/actions/notifications.ts`

## Overview

The Notification System provides server actions for monitoring trades and positions to alert users about important events and opportunities. It consists of three main notification types that help users manage their wheel strategy effectively.

## Table of Contents

1. [Server Actions](#server-actions)
2. [Data Types](#data-types)
3. [Usage Examples](#usage-examples)
4. [Integration Guide](#integration-guide)
5. [Error Handling](#error-handling)
6. [Testing](#testing)

---

## Server Actions

### `getUpcomingExpirations(daysAhead?: number)`

Returns OPEN trades that are expiring within the specified number of days.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `daysAhead` | `number` | `7` | Number of days to look ahead |

#### Returns

```typescript
Promise<ActionResult<ExpirationNotification[]>>
```

Returns success with array of expiration notifications, or error with message.

#### Response Structure

**Success:**
```typescript
{
  success: true,
  data: [
    {
      id: string,           // Trade ID
      ticker: string,       // Stock symbol
      type: 'PUT' | 'CALL', // Option type
      strikePrice: number,  // Strike price
      expirationDate: Date, // Expiration date
      daysUntilExpiration: number, // Days remaining
      premium: number,      // Premium collected
      contracts: number     // Number of contracts
    },
    // ... more notifications
  ]
}
```

**Error:**
```typescript
{
  success: false,
  error: string  // Error message
}
```

#### Use Cases

- Dashboard expiration calendar widget
- Daily notification emails
- Mobile push notifications
- Expiration alert banner

#### Example

```typescript
import { getUpcomingExpirations } from '@/lib/actions/notifications'

// Get options expiring in next 7 days
const result = await getUpcomingExpirations(7)

if (result.success) {
  console.log(`${result.data.length} options expiring soon`)
  result.data.forEach(notification => {
    console.log(`${notification.ticker} ${notification.type} expires in ${notification.daysUntilExpiration} days`)
  })
} else {
  console.error('Error:', result.error)
}
```

#### Performance

- Query time: ~50-100ms (depends on number of trades)
- Indexes used: `userId`, `status`, `expirationDate`
- Recommended caching: 5-15 minutes

---

### `getITMOptions()`

Returns OPEN options that are currently in-the-money (ITM) based on latest stock prices.

#### Parameters

None

#### Returns

```typescript
Promise<ActionResult<ITMNotification[]>>
```

Returns success with array of ITM notifications, or error with message.

#### Response Structure

**Success:**
```typescript
{
  success: true,
  data: [
    {
      id: string,           // Trade ID
      ticker: string,       // Stock symbol
      type: 'PUT' | 'CALL', // Option type
      strikePrice: number,  // Strike price
      currentPrice: number, // Current stock price
      expirationDate: Date, // Expiration date
      premium: number,      // Premium collected
      contracts: number,    // Number of contracts
      intrinsicValue: number // How much the option is ITM (in dollars)
    },
    // ... more notifications
  ]
}
```

**Error:**
```typescript
{
  success: false,
  error: string  // Error message
}
```

#### ITM Logic

**PUT Options:**
- ITM when: `currentPrice < strikePrice`
- Example: Stock at $145, PUT strike $150 → ITM by $5

**CALL Options:**
- ITM when: `currentPrice > strikePrice`
- Example: Stock at $155, CALL strike $150 → ITM by $5

**Intrinsic Value Calculation:**
```typescript
intrinsicValue = Math.abs(currentPrice - strikePrice) × contracts × 100
```

#### Use Cases

- Assignment probability alerts
- Risk management dashboard
- Daily ITM check notifications
- Action needed banner

#### Example

```typescript
import { getITMOptions } from '@/lib/actions/notifications'

const result = await getITMOptions()

if (result.success) {
  const itmPuts = result.data.filter(n => n.type === 'PUT')
  const itmCalls = result.data.filter(n => n.type === 'CALL')

  console.log(`${itmPuts.length} ITM PUTs (prepare for assignment)`)
  console.log(`${itmCalls.length} ITM CALLs (shares may be called away)`)

  result.data.forEach(notification => {
    const direction = notification.type === 'PUT' ? 'below' : 'above'
    console.log(
      `${notification.ticker} ${notification.type} @ $${notification.strikePrice} ` +
      `is $${Math.abs(notification.currentPrice - notification.strikePrice).toFixed(2)} ${direction} strike`
    )
  })
}
```

#### Performance

- Query time: ~100-500ms (depends on number of trades and API calls)
- External API: Alpha Vantage (rate limit: 5 calls/minute on free tier)
- Recommended caching: 15-60 minutes
- Note: Makes one price API call per unique ticker

#### Dependencies

- `getLatestPrice(ticker)` from `lib/actions/prices`
- Alpha Vantage API key in environment variables

---

### `getPositionsWithoutCalls()`

Returns OPEN stock positions that don't have any OPEN covered calls against them.

#### Parameters

None

#### Returns

```typescript
Promise<ActionResult<PositionWithoutCallNotification[]>>
```

Returns success with array of position notifications, or error with message.

#### Response Structure

**Success:**
```typescript
{
  success: true,
  data: [
    {
      id: string,              // Position ID
      ticker: string,          // Stock symbol
      shares: number,          // Number of shares owned
      costBasis: number,       // Cost basis per share
      currentValue: number | null, // Current market value (total)
      acquiredDate: Date       // Date position acquired
    },
    // ... more notifications
  ]
}
```

**Error:**
```typescript
{
  success: false,
  error: string  // Error message
}
```

#### Logic

Position is included if:
1. Position status is `OPEN`
2. Position has ZERO covered calls with status `OPEN`

Position is excluded if:
- Position is `CLOSED`
- Position has one or more `OPEN` covered calls

#### Use Cases

- Premium opportunity alerts
- Weekly position review
- Naked position warnings
- Income optimization suggestions

#### Example

```typescript
import { getPositionsWithoutCalls } from '@/lib/actions/notifications'

const result = await getPositionsWithoutCalls()

if (result.success) {
  console.log(`${result.data.length} positions available for covered calls`)

  result.data.forEach(notification => {
    const daysHeld = Math.floor(
      (Date.now() - notification.acquiredDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    console.log(
      `${notification.ticker}: ${notification.shares} shares @ ` +
      `$${notification.costBasis} (held ${daysHeld} days)`
    )

    // Suggest strike price (5% above cost basis)
    const suggestedStrike = notification.costBasis * 1.05
    console.log(`  Suggested CALL strike: $${suggestedStrike.toFixed(2)}`)
  })
}
```

#### Performance

- Query time: ~50-100ms (depends on number of positions)
- Indexes used: `userId`, `status`
- Includes: `coveredCalls` relation
- Recommended caching: 30-60 minutes

---

## Data Types

### `ActionResult<T>`

Generic result type for all server actions.

```typescript
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }
```

### `ExpirationNotification`

Notification data for an expiring option.

```typescript
interface ExpirationNotification {
  id: string                  // Unique trade ID
  ticker: string              // Stock symbol (e.g., "AAPL")
  type: 'PUT' | 'CALL'       // Option type
  strikePrice: number         // Strike price
  expirationDate: Date        // Expiration date
  daysUntilExpiration: number // Calculated days remaining
  premium: number             // Total premium collected
  contracts: number           // Number of contracts
}
```

### `ITMNotification`

Notification data for an in-the-money option.

```typescript
interface ITMNotification {
  id: string                  // Unique trade ID
  ticker: string              // Stock symbol (e.g., "AAPL")
  type: 'PUT' | 'CALL'       // Option type
  strikePrice: number         // Strike price
  currentPrice: number        // Current stock price
  expirationDate: Date        // Expiration date
  premium: number             // Total premium collected
  contracts: number           // Number of contracts
  intrinsicValue: number      // Total intrinsic value in dollars
}
```

### `PositionWithoutCallNotification`

Notification data for a position without covered calls.

```typescript
interface PositionWithoutCallNotification {
  id: string                  // Unique position ID
  ticker: string              // Stock symbol (e.g., "AAPL")
  shares: number              // Number of shares owned
  costBasis: number           // Cost basis per share
  currentValue: number | null // Current total value (null if no price data)
  acquiredDate: Date          // Date position was acquired
}
```

---

## Usage Examples

### React Server Component

```typescript
// app/notifications/page.tsx
import {
  getUpcomingExpirations,
  getITMOptions,
  getPositionsWithoutCalls
} from '@/lib/actions/notifications'

export default async function NotificationsPage() {
  // Fetch all notifications in parallel
  const [expirationsResult, itmResult, positionsResult] = await Promise.all([
    getUpcomingExpirations(7),
    getITMOptions(),
    getPositionsWithoutCalls()
  ])

  const expirations = expirationsResult.success ? expirationsResult.data : []
  const itmOptions = itmResult.success ? itmResult.data : []
  const nakedPositions = positionsResult.success ? positionsResult.data : []

  return (
    <div>
      <h1>Notifications</h1>

      {/* Expiring Soon */}
      <section>
        <h2>Expiring in Next 7 Days ({expirations.length})</h2>
        {expirations.map(notification => (
          <ExpirationCard key={notification.id} notification={notification} />
        ))}
      </section>

      {/* ITM Options */}
      <section>
        <h2>In-The-Money Options ({itmOptions.length})</h2>
        {itmOptions.map(notification => (
          <ITMCard key={notification.id} notification={notification} />
        ))}
      </section>

      {/* Naked Positions */}
      <section>
        <h2>Positions Without Covered Calls ({nakedPositions.length})</h2>
        {nakedPositions.map(notification => (
          <PositionCard key={notification.id} notification={notification} />
        ))}
      </section>
    </div>
  )
}
```

### Client Component with Refresh

```typescript
// components/notifications/notification-center.tsx
'use client'

import { useState, useEffect } from 'react'
import { getUpcomingExpirations, getITMOptions, getPositionsWithoutCalls } from '@/lib/actions/notifications'

export function NotificationCenter() {
  const [notifications, setNotifications] = useState({
    expirations: [],
    itm: [],
    positions: []
  })
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    setLoading(true)
    const [exp, itm, pos] = await Promise.all([
      getUpcomingExpirations(7),
      getITMOptions(),
      getPositionsWithoutCalls()
    ])

    setNotifications({
      expirations: exp.success ? exp.data : [],
      itm: itm.success ? itm.data : [],
      positions: pos.success ? pos.data : []
    })
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()

    // Refresh every 15 minutes
    const interval = setInterval(fetchNotifications, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const totalCount =
    notifications.expirations.length +
    notifications.itm.length +
    notifications.positions.length

  if (loading) return <NotificationSkeleton />

  return (
    <div>
      <NotificationBadge count={totalCount} />
      {/* Render notifications... */}
    </div>
  )
}
```

### API Route Handler

```typescript
// app/api/notifications/route.ts
import { NextResponse } from 'next/server'
import { getUpcomingExpirations, getITMOptions, getPositionsWithoutCalls } from '@/lib/actions/notifications'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'expirations' | 'itm' | 'positions' | 'all'
  const daysAhead = parseInt(searchParams.get('days') || '7')

  try {
    if (type === 'expirations') {
      const result = await getUpcomingExpirations(daysAhead)
      return NextResponse.json(result)
    }

    if (type === 'itm') {
      const result = await getITMOptions()
      return NextResponse.json(result)
    }

    if (type === 'positions') {
      const result = await getPositionsWithoutCalls()
      return NextResponse.json(result)
    }

    // Default: return all
    const [exp, itm, pos] = await Promise.all([
      getUpcomingExpirations(daysAhead),
      getITMOptions(),
      getPositionsWithoutCalls()
    ])

    return NextResponse.json({
      expirations: exp.success ? exp.data : [],
      itm: itm.success ? itm.data : [],
      positions: pos.success ? pos.data : []
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// Usage:
// GET /api/notifications?type=expirations&days=7
// GET /api/notifications?type=itm
// GET /api/notifications?type=positions
// GET /api/notifications (returns all)
```

---

## Integration Guide

### Step 1: Import Server Actions

```typescript
import {
  getUpcomingExpirations,
  getITMOptions,
  getPositionsWithoutCalls,
  type ExpirationNotification,
  type ITMNotification,
  type PositionWithoutCallNotification
} from '@/lib/actions/notifications'
```

### Step 2: Fetch Notifications

**In Server Components:**
```typescript
const result = await getUpcomingExpirations(7)
if (result.success) {
  // Use result.data
}
```

**In Client Components:**
```typescript
useEffect(() => {
  getUpcomingExpirations(7).then(result => {
    if (result.success) {
      // Update state with result.data
    }
  })
}, [])
```

### Step 3: Handle Errors

```typescript
const result = await getUpcomingExpirations(7)

if (!result.success) {
  // Show error to user
  toast.error(result.error)
  return
}

// Use result.data safely
const notifications = result.data
```

### Step 4: Display Notifications

Create presentational components for each notification type:

```typescript
// ExpirationNotificationCard.tsx
export function ExpirationNotificationCard({ notification }: { notification: ExpirationNotification }) {
  const urgency = notification.daysUntilExpiration <= 3 ? 'urgent' : 'normal'

  return (
    <div className={`notification-card ${urgency}`}>
      <h3>{notification.ticker} {notification.type}</h3>
      <p>Strike: ${notification.strikePrice}</p>
      <p>Expires in {notification.daysUntilExpiration} days</p>
      <p>Premium: ${notification.premium}</p>
      {urgency === 'urgent' && <Badge variant="error">Action Needed</Badge>}
    </div>
  )
}
```

### Step 5: Add Notification Badge

```typescript
export async function NotificationBadge() {
  const [exp, itm, pos] = await Promise.all([
    getUpcomingExpirations(3), // Next 3 days only
    getITMOptions(),
    getPositionsWithoutCalls()
  ])

  const count =
    (exp.success ? exp.data.length : 0) +
    (itm.success ? itm.data.length : 0) +
    (pos.success ? pos.data.length : 0)

  if (count === 0) return null

  return (
    <div className="notification-badge">
      {count}
    </div>
  )
}
```

---

## Error Handling

### Common Errors

**1. No User Found**
```typescript
{
  success: false,
  error: "No user found. Please create a user first."
}
```
- Occurs when database has no users
- Solution: Create a user or implement proper authentication

**2. Database Query Failed**
```typescript
{
  success: false,
  error: "Failed to fetch upcoming expirations"
}
```
- Occurs when Prisma query fails
- Check database connection
- Verify schema matches code

**3. Price API Failed (ITM only)**
```typescript
{
  success: false,
  error: "Failed to fetch ITM options"
}
```
- Occurs when Alpha Vantage API fails
- Check API key in environment variables
- Check rate limits (5 calls/minute on free tier)
- Consider implementing fallback or retry logic

### Error Handling Best Practices

**1. Always Check Success**
```typescript
const result = await getUpcomingExpirations(7)
if (!result.success) {
  console.error('Error:', result.error)
  return <ErrorState message={result.error} />
}
// Use result.data
```

**2. Provide User-Friendly Messages**
```typescript
const result = await getITMOptions()
if (!result.success) {
  toast.error('Unable to load ITM options. Please try again.')
  console.error('Debug:', result.error)
  return
}
```

**3. Graceful Degradation**
```typescript
const [exp, itm, pos] = await Promise.all([
  getUpcomingExpirations(7),
  getITMOptions(),
  getPositionsWithoutCalls()
])

// Show partial results even if some fail
return (
  <>
    {exp.success && <ExpirationsList data={exp.data} />}
    {itm.success && <ITMList data={itm.data} />}
    {pos.success && <PositionsList data={pos.data} />}
  </>
)
```

---

## Testing

### Unit Tests

```typescript
// lib/actions/__tests__/notifications.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getUpcomingExpirations, getITMOptions, getPositionsWithoutCalls } from '../notifications'

describe('getUpcomingExpirations', () => {
  it('should return trades expiring within specified days', async () => {
    const result = await getUpcomingExpirations(7)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(Array.isArray(result.data)).toBe(true)
      result.data.forEach(notification => {
        expect(notification.daysUntilExpiration).toBeLessThanOrEqual(7)
        expect(notification.daysUntilExpiration).toBeGreaterThanOrEqual(0)
      })
    }
  })

  it('should only return OPEN trades', async () => {
    const result = await getUpcomingExpirations(30)

    if (result.success) {
      // Verify by checking database directly
      const tradeIds = result.data.map(n => n.id)
      const trades = await prisma.trade.findMany({
        where: { id: { in: tradeIds } }
      })
      trades.forEach(trade => {
        expect(trade.status).toBe('OPEN')
      })
    }
  })
})

describe('getITMOptions', () => {
  it('should identify ITM PUTs correctly', async () => {
    // Create test data: PUT @ $150 strike, stock at $145
    // ... test setup

    const result = await getITMOptions()

    if (result.success) {
      const putNotification = result.data.find(n => n.type === 'PUT')
      expect(putNotification).toBeDefined()
      expect(putNotification.currentPrice).toBeLessThan(putNotification.strikePrice)
    }
  })

  it('should calculate intrinsic value correctly', async () => {
    const result = await getITMOptions()

    if (result.success) {
      result.data.forEach(notification => {
        const expectedValue =
          Math.abs(notification.currentPrice - notification.strikePrice) *
          notification.contracts *
          100

        expect(notification.intrinsicValue).toBe(expectedValue)
      })
    }
  })
})

describe('getPositionsWithoutCalls', () => {
  it('should only return OPEN positions', async () => {
    const result = await getPositionsWithoutCalls()

    if (result.success) {
      const positionIds = result.data.map(n => n.id)
      const positions = await prisma.position.findMany({
        where: { id: { in: positionIds } }
      })
      positions.forEach(position => {
        expect(position.status).toBe('OPEN')
      })
    }
  })

  it('should exclude positions with OPEN covered calls', async () => {
    // Create position with OPEN covered call
    // ... test setup

    const result = await getPositionsWithoutCalls()

    if (result.success) {
      const positionIds = result.data.map(n => n.id)
      expect(positionIds).not.toContain(positionWithCallId)
    }
  })
})
```

### Integration Tests

Test with realistic data scenarios:

```typescript
describe('Notification System Integration', () => {
  beforeEach(async () => {
    // Seed test database with realistic data
    await seedTestData()
  })

  it('should handle mixed notification scenarios', async () => {
    const [exp, itm, pos] = await Promise.all([
      getUpcomingExpirations(7),
      getITMOptions(),
      getPositionsWithoutCalls()
    ])

    // All should succeed
    expect(exp.success).toBe(true)
    expect(itm.success).toBe(true)
    expect(pos.success).toBe(true)

    // Verify data consistency
    if (exp.success && itm.success) {
      // Trades in both lists should not conflict
      const expIds = new Set(exp.data.map(n => n.id))
      const itmIds = new Set(itm.data.map(n => n.id))
      // ITM trades could also be expiring, but that's okay
    }
  })
})
```

---

## Performance Optimization

### Caching Strategy

```typescript
import { unstable_cache } from 'next/cache'

// Cache expensive ITM check for 15 minutes
export const getCachedITMOptions = unstable_cache(
  async () => getITMOptions(),
  ['itm-options'],
  { revalidate: 900 } // 15 minutes
)

// Cache expiration check for 5 minutes
export const getCachedExpirations = unstable_cache(
  async (days: number) => getUpcomingExpirations(days),
  ['upcoming-expirations'],
  { revalidate: 300 } // 5 minutes
)
```

### Database Optimization

Ensure proper indexes exist:

```prisma
// prisma/schema.prisma

model Trade {
  // ...

  @@index([userId, status, expirationDate]) // For expiration queries
  @@index([userId, status]) // For ITM queries
}

model Position {
  // ...

  @@index([userId, status]) // For naked position queries
}
```

### Rate Limiting (for ITM)

Since `getITMOptions` calls external API:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '60 s'), // 5 calls per minute
})

export async function getITMOptionsRateLimited() {
  const { success } = await ratelimit.limit('itm-options')

  if (!success) {
    return {
      success: false,
      error: 'Rate limit exceeded. Please try again in a minute.'
    }
  }

  return getITMOptions()
}
```

---

## Changelog

### Version 1.0.0 (February 2026)
- Initial release of notification system
- Three notification types: expirations, ITM, positions
- Full TypeScript support
- Comprehensive error handling
- Test coverage

---

## Support

For questions or issues:
- Review this documentation
- Check test files: `lib/actions/__tests__/notifications.test.ts`
- See usage in: `app/notifications/*`
- Contact: support@wheeltracker.com

---

**Built with ❤️ for the Wheel Strategy community**

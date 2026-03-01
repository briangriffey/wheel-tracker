# Execution Plan: Deployed Capital Percentage

**Source PRD:** `prds/2026-02-28-deployed-capital-percentage.md`
**Date:** 2026-02-28
**Author:** Architect Agent
**Selected Approach:** Option B -- Dashboard Metric Card + Per-Wheel Deployment on Wheels Pages

## Overview

This feature computes and displays the percentage of a trader's deposited capital that is currently tied up in open positions (cash-secured puts and stock holdings). The implementation adds a new "Deployed Capital" MetricCard to the P&L Dashboard's Portfolio Overview row, extends the `DashboardMetrics` interface with three new fields, and surfaces per-wheel capital deployment on both the Wheels List and Wheel Detail pages. No database schema changes are required -- all computation uses existing `CashDeposit`, `Trade`, and `Position` data.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Computation location | Server-side in `getDashboardMetrics()` and `getWheelDetail()` / `getWheels()` | Keeps computation co-located with existing queries; data is already fetched in these functions. No new API endpoints needed. |
| Component type for MetricCard | Existing `MetricCard` (rendered inside Client Component `PLDashboard`) | The MetricCard is already used in PLDashboard which is a Client Component. No new component boundary needed. |
| Color logic for deployment % | Custom color function in `lib/design/colors.ts` | The existing `colorize` prop on MetricCard uses P&L logic (positive=green, negative=red). Deployment uses inverted thresholds (low=green, high=red), so a new color utility is needed. |
| Per-wheel deployment data | Extend existing `getWheelDetail()` return type and add fields to `getWheels()` | Avoids creating new queries. The existing queries already fetch trades and positions per wheel. |
| Denominator (account value) | `netInvested` from `CashDeposit` aggregate (sum of all deposit amounts) | Already computed in `getDashboardMetrics`. For wheel pages, fetch via a lightweight `CashDeposit.aggregate()`. |
| Dashboard grid layout | Change Portfolio Overview from `md:grid-cols-3` to `md:grid-cols-2 lg:grid-cols-4` | Adding a 4th card to the row. 2-col on medium screens provides better readability; 4-col on large screens fits naturally. |
| Deployed capital and time range | Always show current snapshot regardless of time range | Deployed capital is a "right now" metric. Filtering by time range would be misleading. |

## Phase 1: Data Layer and Utilities

### Task 1.1: Add deployment color utility function

**Parallel:** Yes -- can run alongside Task 1.2
**Depends on:** None
**Assigned to:** frontend
**Files:**
- `lib/design/colors.ts` -- modify -- add `getDeploymentColorClass()` function

**Details:**

Add a new exported function that returns a Tailwind text color class based on deployment percentage thresholds:

```typescript
/**
 * Get color class for deployed capital percentage.
 * Lower deployment = healthier (green), higher = riskier (red).
 *
 * Thresholds:
 * - < 50%: green (conservative)
 * - 50-70%: gray (moderate, acceptable)
 * - 70-85%: yellow/amber (getting aggressive)
 * - > 85%: red (over-deployed)
 *
 * @param percent - The deployed capital percentage (0-100+)
 * @returns Tailwind text color class
 */
export function getDeploymentColorClass(percent: number): string {
  if (percent < 50) return 'text-green-600'
  if (percent < 70) return 'text-gray-900'
  if (percent < 85) return 'text-yellow-600'
  return 'text-red-600'
}
```

**Acceptance criteria:**
- [ ] Function exported from `lib/design/colors.ts`
- [ ] Returns `text-green-600` for values below 50
- [ ] Returns `text-gray-900` for values 50 to 69.99
- [ ] Returns `text-yellow-600` for values 70 to 84.99
- [ ] Returns `text-red-600` for values 85 and above
- [ ] Works for values above 100% (over-deployed edge case)

---

### Task 1.2: Extend DashboardMetrics interface and getDashboardMetrics query

**Parallel:** Yes -- can run alongside Task 1.1
**Depends on:** None
**Assigned to:** frontend
**Files:**
- `lib/queries/dashboard.ts` -- modify -- extend `DashboardMetrics` interface and `getDashboardMetrics()` function

**Details:**

1. Add three new fields to the `DashboardMetrics` interface:

```typescript
export interface DashboardMetrics {
  // ... existing fields ...

  // Deployed capital
  deployedCapitalAmount: number  // Dollar amount of capital currently deployed
  deployedCapitalPercent: number | null  // Percentage of account value deployed (null if no deposits)
  accountValue: number  // Net invested (deposits minus withdrawals)
}
```

2. In the `getDashboardMetrics()` function, add computation logic after the existing data fetches. The function already fetches:
   - `trades` (line 137-148) -- includes all trades with `premium`, `contracts`, `status`
   - `cashDepositAgg` (line 169-172) -- includes `_sum.amount`

   However, the current `trades` query does not select `strikePrice`, `type`, or `shares`. The select clause must be extended:

```typescript
// Existing select (line 142-146):
select: {
  premium: true,
  contracts: true,
  status: true,
  closePremium: true,
},

// Change to:
select: {
  premium: true,
  contracts: true,
  status: true,
  closePremium: true,
  type: true,         // NEW: needed to filter PUTs
  strikePrice: true,  // NEW: needed for PUT capital calculation
  shares: true,       // NEW: needed for PUT capital calculation
},
```

3. Add computation logic before the return statement (after line 237, `const netInvested = ...`):

```typescript
// Calculate deployed capital
// Open PUT capital = sum of (strikePrice * shares) for OPEN PUT trades
const openPutCapital = trades
  .filter((t) => t.status === 'OPEN' && t.type === 'PUT')
  .reduce((sum, trade) => sum + trade.strikePrice.toNumber() * trade.shares, 0)

// Open position capital = sum of totalCost for OPEN positions
// openPositions is already fetched above (line 150-165)
const openPositionCapital = openPositions.reduce(
  (sum, position) => sum + position.totalCost.toNumber(),
  0
)

const deployedCapitalAmount = openPutCapital + openPositionCapital
const deployedCapitalPercent = netInvested > 0
  ? (deployedCapitalAmount / netInvested) * 100
  : null
```

4. Add to return statement:

```typescript
return {
  // ... existing fields ...
  deployedCapitalAmount,
  deployedCapitalPercent,
  accountValue: netInvested,
}
```

Note: The `trades` variable type annotation will need to be updated since the select clause now includes additional fields. The `trade.strikePrice` is a `Prisma.Decimal` and must be converted via `.toNumber()`. The `trade.shares` is an `Int` and does not need conversion.

**Acceptance criteria:**
- [ ] `DashboardMetrics` interface includes `deployedCapitalAmount`, `deployedCapitalPercent`, and `accountValue`
- [ ] `getDashboardMetrics()` computes deployed capital from open PUTs (`status=OPEN`, `type=PUT`) using `strikePrice * shares`
- [ ] Open CALL trades are excluded from the numerator
- [ ] Open position `totalCost` is included in the numerator
- [ ] `deployedCapitalPercent` is `null` when `netInvested` is 0 (avoids division by zero)
- [ ] `accountValue` equals `netInvested` (from `cashDepositAgg._sum.amount`)
- [ ] The existing trades query select clause is extended with `type`, `strikePrice`, `shares`
- [ ] All existing metrics continue to work correctly (no regressions)

---

## Phase 2: Dashboard UI

### Task 2.1: Add Deployed Capital MetricCard to PLDashboard

**Parallel:** No
**Depends on:** Task 1.1, Task 1.2
**Assigned to:** frontend
**Files:**
- `components/dashboard/pl-dashboard.tsx` -- modify -- add MetricCard to Portfolio Overview grid
- `components/dashboard/metric-card.tsx` -- modify -- support custom color function

**Details:**

**Step A: Update MetricCard to support custom color logic**

The current `MetricCard` `colorize` prop uses `getPnLColorClass(val)` which applies green for positive, red for negative. For deployed capital, the color logic is inverted (lower is better). Add an optional `colorClassName` prop that overrides the default colorize behavior:

```typescript
interface MetricCardProps {
  title: string
  value: number | null
  formatAs?: 'currency' | 'percentage' | 'number'
  colorize?: boolean
  colorClassName?: string  // NEW: override color class (takes precedence over colorize)
  subtitle?: string
  loading?: boolean
}
```

Update the `getColorClass` function inside MetricCard:

```typescript
const getColorClass = (val: number | null): string => {
  if (colorClassName) return colorClassName
  if (!colorize || val === null) return 'text-gray-900'
  return getPnLColorClass(val)
}
```

**Step B: Add deployed capital card to Portfolio Overview**

In `PLDashboard`, import the new color function:

```typescript
import { getDeploymentColorClass } from '@/lib/design/colors'
```

Change the Portfolio Overview grid from `md:grid-cols-3` to `md:grid-cols-2 lg:grid-cols-4`:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
```

Add the new MetricCard after the "vs SPY" card:

```tsx
<MetricCard
  title="Deployed Capital"
  value={metrics.deployedCapitalPercent}
  formatAs="percentage"
  colorClassName={
    metrics.deployedCapitalPercent !== null
      ? getDeploymentColorClass(metrics.deployedCapitalPercent)
      : undefined
  }
  subtitle={
    metrics.deployedCapitalPercent !== null
      ? `${formatCurrency(metrics.deployedCapitalAmount)} of ${formatCurrency(metrics.accountValue)}`
      : 'Record deposits to track'
  }
  loading={loading}
/>
```

Import `formatCurrency` at the top of the file:

```typescript
import { formatCurrency } from '@/lib/utils/format'
```

**Acceptance criteria:**
- [ ] MetricCard accepts optional `colorClassName` prop that overrides `colorize` behavior
- [ ] Portfolio Overview grid shows 4 cards in a row on large screens, 2 on medium, 1 on small
- [ ] Deployed Capital card shows percentage value (e.g., "62.50%")
- [ ] Subtitle shows dollar breakdown (e.g., "$31,250.00 of $50,000.00")
- [ ] When `deployedCapitalPercent` is null (no deposits), card shows "N/A" with subtitle "Record deposits to track"
- [ ] Color coding follows thresholds: green (<50%), gray (50-70%), yellow (70-85%), red (>85%)
- [ ] Loading state shows skeleton animation like other MetricCards
- [ ] Metric persists across time range changes (always shows current snapshot)

---

## Phase 3: Wheel Pages

### Task 3.1: Add deployed capital to Wheel Detail page (WheelOverview)

**Parallel:** Yes -- can run alongside Task 3.2
**Depends on:** Task 1.2
**Assigned to:** frontend
**Files:**
- `lib/actions/wheels.ts` -- modify -- extend `getWheelDetail()` to return per-wheel deployment data
- `components/wheels/wheel-overview.tsx` -- modify -- add Capital Deployed stat to metrics grid
- `app/wheels/[id]/page.tsx` -- modify -- pass `accountValue` to WheelOverview

**Details:**

**Step A: Extend getWheelDetail() to include deployment data**

The `getWheelDetail()` function already fetches all trades and positions for a wheel. We need to:

1. Add `type` and `shares` to the trade select clause (line 266-278):

```typescript
trades: {
  select: {
    id: true,
    type: true,
    action: true,
    status: true,
    strikePrice: true,
    premium: true,
    contracts: true,
    shares: true,        // NEW
    expirationDate: true,
    openDate: true,
    closeDate: true,
  },
  orderBy: { openDate: 'desc' },
},
```

2. After serializing the wheel data, compute per-wheel deployment:

```typescript
// Calculate per-wheel deployed capital
const wheelOpenPutCapital = wheel.trades
  .filter((t) => t.status === 'OPEN' && t.type === 'PUT')
  .reduce((sum, t) => sum + t.strikePrice.toNumber() * t.shares, 0)

const wheelOpenPositionCapital = wheel.positions
  .filter((p) => p.status === 'OPEN')
  .reduce((sum, p) => sum + p.totalCost.toNumber(), 0)

const wheelDeployedCapital = wheelOpenPutCapital + wheelOpenPositionCapital
```

3. Add `deployedCapital` to the return type and the serialized output:

Update the return type to include `deployedCapital: number`:

```typescript
export async function getWheelDetail(wheelId: string): Promise<
  ActionResult<{
    // ... existing fields ...
    deployedCapital: number  // NEW
    trades: Array<{
      // ... existing fields ...
      shares: number  // NEW
    }>
    // ...
  }>
>
```

Add `shares: trade.shares` to the trades serialization map (line 316-327), and `deployedCapital: wheelDeployedCapital` to the serialized output.

**Step B: Fetch account value in the Wheel Detail page**

In `app/wheels/[id]/page.tsx`, fetch the deposit summary to get `netInvested`:

```typescript
import { getDepositSummary } from '@/lib/actions/deposits'

// Inside the component, add to the existing data fetch:
const [result, depositResult] = await Promise.all([
  getWheelDetail(id),
  getDepositSummary(),
])

const accountValue = depositResult.success ? depositResult.data.netInvested : 0
```

Pass `accountValue` to `WheelOverview`:

```tsx
<WheelOverview wheel={wheel} accountValue={accountValue} />
```

**Step C: Update WheelOverview component**

Update `WheelOverviewProps` to include deployment data:

```typescript
interface WheelOverviewProps {
  wheel: {
    // ... existing fields ...
    deployedCapital: number  // NEW
  }
  accountValue: number  // NEW
}
```

Update the component signature:

```typescript
export function WheelOverview({ wheel, accountValue }: WheelOverviewProps)
```

Change the metrics grid from `md:grid-cols-4` to `md:grid-cols-5` (line 135):

```tsx
<div className="grid grid-cols-2 md:grid-cols-5 gap-6 px-6 py-5">
```

Add a new stat after the existing 4 stats (after the "Avg Cycle P&L" block ending at line 190):

```tsx
{/* Capital Deployed */}
<div>
  <dt className="text-sm font-medium text-gray-500">Capital Deployed</dt>
  <dd className="mt-1 text-2xl font-semibold text-gray-900">
    {accountValue > 0 ? (
      <>
        {formatCurrency(wheel.deployedCapital)}
        <span className="text-sm font-normal text-gray-500 ml-1">
          ({((wheel.deployedCapital / accountValue) * 100).toFixed(1)}%)
        </span>
      </>
    ) : (
      <span className="text-gray-400">N/A</span>
    )}
  </dd>
</div>
```

Import `formatCurrency` at the top:

```typescript
import { formatCurrency } from '@/lib/utils/format'
```

**Acceptance criteria:**
- [ ] `getWheelDetail()` returns `deployedCapital` (sum of open PUT `strikePrice * shares` + open position `totalCost` for that wheel)
- [ ] `getWheelDetail()` trade select includes `shares` field
- [ ] Wheel Detail page fetches `accountValue` via `getDepositSummary()`
- [ ] WheelOverview shows "Capital Deployed" as a 5th metric in the grid
- [ ] Shows dollar amount and percentage (e.g., "$15,000.00 (30.0%)")
- [ ] Shows "N/A" when accountValue is 0

---

### Task 3.2: Add deployed capital percentage to Wheel Cards on Wheels List page

**Parallel:** Yes -- can run alongside Task 3.1
**Depends on:** Task 1.2
**Assigned to:** frontend
**Files:**
- `lib/actions/wheels.ts` -- modify -- extend `getWheels()` to return per-wheel deployment data
- `components/wheels/wheel-card.tsx` -- modify -- add capital % line to metrics
- `components/wheels/wheels-list.tsx` -- modify -- accept and pass `accountValue`
- `app/wheels/page.tsx` -- modify -- fetch deposit summary and pass `accountValue`

**Details:**

**Step A: Extend getWheels() to compute per-wheel deployment**

The `getWheels()` function currently uses `_count` for trades/positions. To compute per-wheel deployment, we need the actual open PUT trade data and open position costs. Extend the select clause (line 154-171):

Add to the select clause within `prisma.wheel.findMany`:

```typescript
select: {
  // ... existing fields ...
  trades: {
    where: { status: 'OPEN', type: 'PUT' },
    select: {
      strikePrice: true,
      shares: true,
    },
  },
  positions: {
    where: { status: 'OPEN' },
    select: {
      totalCost: true,
    },
  },
  _count: {
    select: {
      trades: true,
      positions: true,
    },
  },
},
```

Update the serialization (line 175-188) to include `deployedCapital`:

```typescript
const serialized = wheels.map((wheel) => {
  const openPutCapital = wheel.trades.reduce(
    (sum, t) => sum + t.strikePrice.toNumber() * t.shares,
    0
  )
  const openPositionCapital = wheel.positions.reduce(
    (sum, p) => sum + p.totalCost.toNumber(),
    0
  )

  return {
    // ... existing fields ...
    deployedCapital: openPutCapital + openPositionCapital,
    tradeCount: wheel._count.trades,
    positionCount: wheel._count.positions,
  }
})
```

Update the return type to include `deployedCapital: number` in each wheel object.

Note: The `trades` and `positions` fields here are the filtered subsets used for computation. The `_count` still provides the full counts. The type of the `wheel` variable in the map callback will need to account for the new `trades` and `positions` shapes from the select.

**Step B: Fetch account value on Wheels List page**

In `app/wheels/page.tsx`:

```typescript
import { getDepositSummary } from '@/lib/actions/deposits'

// Fetch wheels and deposit summary in parallel
const [result, depositResult] = await Promise.all([
  getWheels(),
  getDepositSummary(),
])

const accountValue = depositResult.success ? depositResult.data.netInvested : 0
```

Pass `accountValue` to `WheelsList`:

```tsx
<WheelsList initialWheels={wheels} accountValue={accountValue} />
```

**Step C: Update WheelsList to pass accountValue to WheelCard**

Update `WheelsListProps`:

```typescript
interface WheelsListProps {
  initialWheels: Wheel[]
  accountValue: number  // NEW
}
```

Update the `Wheel` interface to include `deployedCapital: number`.

Pass `accountValue` to each `WheelCard`:

```tsx
<WheelCard key={wheel.id} wheel={wheel} accountValue={accountValue} />
```

**Step D: Update WheelCard to display capital percentage**

Update `WheelCardProps`:

```typescript
interface WheelCardProps {
  wheel: Wheel  // Wheel interface now includes deployedCapital
  accountValue: number
}
```

Add a new metric line in the metrics section (after the "Total Premiums" block, around line 175-180):

```tsx
{/* Capital Deployed */}
{accountValue > 0 && wheel.deployedCapital > 0 && (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-600">Capital Deployed</span>
    <span className="text-sm font-semibold text-gray-900">
      {((wheel.deployedCapital / accountValue) * 100).toFixed(1)}%
    </span>
  </div>
)}
```

**Acceptance criteria:**
- [ ] `getWheels()` returns `deployedCapital` for each wheel
- [ ] Wheels List page fetches `accountValue` via `getDepositSummary()`
- [ ] `accountValue` is passed through `WheelsList` to each `WheelCard`
- [ ] Each wheel card shows "Capital Deployed: X.X%" when the wheel has deployed capital and the user has recorded deposits
- [ ] When `accountValue` is 0 or wheel has no deployed capital, the line is hidden (not "N/A")
- [ ] The new data does not break the existing summary stats or filter behavior in WheelsList

---

## Phase 4: Tests

### Task 4.1: Add unit tests for deployment color utility and dashboard metrics

**Parallel:** No
**Depends on:** Task 1.1, Task 1.2, Task 2.1
**Assigned to:** frontend
**Files:**
- `lib/design/__tests__/colors.test.ts` -- create -- tests for `getDeploymentColorClass()`
- `components/dashboard/__tests__/metric-card.test.tsx` -- modify -- add tests for `colorClassName` prop

**Details:**

**Colors test file (`lib/design/__tests__/colors.test.ts`):**

```typescript
import { describe, it, expect } from 'vitest'
import { getDeploymentColorClass } from '../colors'

describe('getDeploymentColorClass', () => {
  it('returns green for deployment under 50%', () => {
    expect(getDeploymentColorClass(0)).toBe('text-green-600')
    expect(getDeploymentColorClass(25)).toBe('text-green-600')
    expect(getDeploymentColorClass(49.99)).toBe('text-green-600')
  })

  it('returns gray for deployment 50-70%', () => {
    expect(getDeploymentColorClass(50)).toBe('text-gray-900')
    expect(getDeploymentColorClass(60)).toBe('text-gray-900')
    expect(getDeploymentColorClass(69.99)).toBe('text-gray-900')
  })

  it('returns yellow for deployment 70-85%', () => {
    expect(getDeploymentColorClass(70)).toBe('text-yellow-600')
    expect(getDeploymentColorClass(80)).toBe('text-yellow-600')
    expect(getDeploymentColorClass(84.99)).toBe('text-yellow-600')
  })

  it('returns red for deployment over 85%', () => {
    expect(getDeploymentColorClass(85)).toBe('text-red-600')
    expect(getDeploymentColorClass(100)).toBe('text-red-600')
    expect(getDeploymentColorClass(112.5)).toBe('text-red-600')
  })
})
```

**MetricCard test additions (add to existing test file):**

```typescript
it('applies custom colorClassName when provided', () => {
  render(
    <MetricCard
      title="Deployed"
      value={75}
      formatAs="percentage"
      colorClassName="text-yellow-600"
    />
  )
  const valueElement = screen.getByText('75.00%')
  expect(valueElement).toHaveClass('text-yellow-600')
})

it('colorClassName takes precedence over colorize', () => {
  render(
    <MetricCard
      title="Test"
      value={100}
      formatAs="currency"
      colorize
      colorClassName="text-red-600"
    />
  )
  const valueElement = screen.getByText('$100.00')
  expect(valueElement).toHaveClass('text-red-600')
  expect(valueElement).not.toHaveClass('text-green-600')
})
```

**Acceptance criteria:**
- [ ] `getDeploymentColorClass` has tests covering all 4 threshold ranges and boundary values
- [ ] MetricCard `colorClassName` prop has tests verifying it applies the class and overrides `colorize`
- [ ] All tests pass with `vitest`

---

## QA Strategy

### Unit Tests
- `lib/design/__tests__/colors.test.ts` -- test `getDeploymentColorClass()` with boundary values (0, 49.99, 50, 69.99, 70, 84.99, 85, 100, 112.5)
- `components/dashboard/__tests__/metric-card.test.tsx` -- test `colorClassName` prop behavior (applies class, overrides colorize, works with null value)

### Integration Tests
- Verify `getDashboardMetrics()` returns correct `deployedCapitalAmount`, `deployedCapitalPercent`, and `accountValue` with test data
- Verify `getWheelDetail()` returns correct `deployedCapital` per wheel
- Verify `getWheels()` returns correct `deployedCapital` per wheel in the list

### UI / Visual Tests
- Dashboard page with deployed capital card at various thresholds (0%, 45%, 62%, 78%, 92%, null)
- Wheels list page with capital percentage badges
- Wheel detail page with capital deployed metric
- Mobile viewport (375px) to verify responsive grid collapse
- Tablet viewport (768px) to verify 2-column layout

### E2E Tests
- Navigate to dashboard, verify "Deployed Capital" card is visible with correct value
- Navigate to wheels list, verify capital % appears on wheel cards
- Navigate to wheel detail, verify "Capital Deployed" appears in metrics grid
- Change time range on dashboard, verify deployed capital remains consistent (current snapshot)

## Dependency Graph

```
Phase 1:  [1.1 Color Util] ──────────┐
          [1.2 Dashboard Metrics] ────┤
                                      |
                                      v
Phase 2:  [2.1 Dashboard UI] ────────┤
                                      |
                                      v
Phase 3:  [3.1 Wheel Detail] ────┬── (parallel)
          [3.2 Wheels List]  ─────┘
                                  |
                                  v
Phase 4:  [4.1 Tests] ───────────┘
```

- Tasks 1.1 and 1.2 can run in parallel (no dependencies between them)
- Task 2.1 depends on both 1.1 and 1.2 (needs color function and metrics interface)
- Tasks 3.1 and 3.2 can run in parallel with each other, but both depend on 1.2 (need to understand the metrics pattern). They can also run in parallel with 2.1 since they touch different files.
- Task 4.1 depends on 1.1, 1.2, and 2.1 (tests the code written in those tasks)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing trades query type changes break downstream code | Medium | The trades query select in `getDashboardMetrics` is extended with 3 new fields. All existing field references remain unchanged. Type inference from Prisma will automatically pick up the new fields. |
| getWheels() performance with additional trade/position subqueries | Low | The new select fetches only `strikePrice` and `shares` for OPEN PUT trades and `totalCost` for OPEN positions per wheel. These are small, filtered subsets with existing indexes (`status`, `wheelId`). |
| Division by zero when netInvested is 0 | High | Explicitly handled: `deployedCapitalPercent` returns `null` when `netInvested` is 0. UI shows "N/A" with a prompt to record deposits. |
| Over 100% deployment confuses users | Low | PRD explicitly states to show the value (e.g., "112.5%") without capping. The red color at >85% already signals concern. No additional handling needed. |
| getWheels() return type change breaks WheelsList/WheelCard | Medium | The new `deployedCapital` field is additive. Existing fields are unchanged. TypeScript will catch any type mismatches at compile time. |

## Migration Notes

No database migrations required. All changes are application-layer only:
- Extended TypeScript interfaces
- Additional computation in existing query functions
- New UI elements using existing component patterns

Rollback strategy: Revert the commits. No data to clean up, no schema changes to undo.

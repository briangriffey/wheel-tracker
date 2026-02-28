# Wheel Scanner: EMA8 & Rolling VWAP Mean Reversion Scoring — PRD

**dispatched_by: mayor**
**Document Version:** 1.0
**Last Updated:** 2026-02-28
**Status:** Draft
**Strategy Reference:** `docs/wheel-strategy-modification-moving-average.md`

---

## Executive Summary

Add a `meanReversionScore` component to the scanner's Phase 4 composite scoring. This score measures how close the current stock price is to its 8-day EMA and 20-day rolling VWAP — stocks trading below these levels in an uptrend are ideal put-selling entries (high reversion probability, elevated premium), while stocks far above them are poor entries (likely to pull back).

Key principles:
- **No new API calls**: EMA8 and rolling VWAP are computed from the daily OHLCV data already fetched in Phase 1 via `fetchStockPriceHistory()`
- **Additive change**: The 5-phase pipeline structure is unchanged — this only modifies Phase 4 scoring and the data passed into it
- **Full transparency**: EMA8, VWAP, and the mean reversion score are persisted to the database and displayed in the UI alongside existing component scores

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Step 1: Scanner Constants](#step-1-scanner-constants)
3. [Step 2: Pure Calculation Functions](#step-2-pure-calculation-functions)
4. [Step 3: Update Scoring Logic](#step-3-update-scoring-logic)
5. [Step 4: Wire Into scanTicker](#step-4-wire-into-scanticker)
6. [Step 5: Prisma Schema Migration](#step-5-prisma-schema-migration)
7. [Step 6: Persist New Fields in runFullScan](#step-6-persist-new-fields-in-runfullscan)
8. [Step 7: Query Layer](#step-7-query-layer)
9. [Step 8: Scanner UI](#step-8-scanner-ui)
10. [Step 9: Tests](#step-9-tests)
11. [Files Summary](#files-summary)
12. [Verification](#verification)

---

## Architecture Overview

This change is vertically contained within the scanner pipeline. No new services, no new API calls, no new pages.

```
fetchStockPriceHistory() ──► Phase 1 (existing, unchanged)
        │                         │
        │                         ▼
        │                    Phase 2 (existing, unchanged)
        │                         │
        │                         ▼
        │                    Phase 3 (existing, unchanged)
        │                         │
        ▼                         ▼
  ┌──────────────┐          Phase 4 (MODIFIED)
  │ Compute EMA8 │────────►  - New: computeMeanReversionScore()
  │ Compute VWAP │────────►  - Updated weights
  └──────────────┘           - New field in Phase4Scores
                                  │
                                  ▼
                             Phase 5 (existing, unchanged)
                                  │
                                  ▼
                             Save to DB (3 new columns)
                                  │
                                  ▼
                             Display in UI (new score bar + stock data rows)
```

All data flows through existing types (`ScanTickerResult`, `Phase4Scores`, `ScanResultData`). The only new code is pure calculation functions and plumbing to persist/display results.

---

## Step 1: Scanner Constants

**File:** `lib/services/scanner-constants.ts`

Add new constants for EMA and VWAP calculation, and update the scoring weights.

Add after the existing constants (before the `WEIGHTS` block):

```typescript
// Mean Reversion scoring
EMA_PERIOD: 8,
VWAP_PERIOD: 20,              // rolling VWAP window in trading days
EMA8_DISTANCE_BEST: -2.0,     // 2% below EMA8 = score 100
EMA8_DISTANCE_WORST: 5.0,     // 5% above EMA8 = score 0
VWAP_DISTANCE_BEST: -1.0,     // 1% below VWAP = score 100
VWAP_DISTANCE_WORST: 3.0,     // 3% above VWAP = score 0
EMA8_WEIGHT: 0.60,            // EMA8 weight within mean reversion sub-score
VWAP_WEIGHT: 0.40,            // VWAP weight within mean reversion sub-score
```

Replace the existing `WEIGHTS` object:

```typescript
// Phase 4: Scoring Weights (must sum to 1.0)
WEIGHTS: {
  yield: 0.25,         // was 0.30
  iv: 0.20,            // was 0.25
  delta: 0.15,         // unchanged
  liquidity: 0.10,     // was 0.15
  trend: 0.10,         // was 0.15
  meanReversion: 0.20, // NEW
},
```

---

## Step 2: Pure Calculation Functions

**File:** `lib/services/scanner.ts`

Add three new exported functions alongside the existing pure helpers (`computeSMA`, `computeIVRank`, etc.). These are pure functions with no side effects — they take numbers in and return numbers out.

### `computeEMA`

```typescript
/**
 * Compute Exponential Moving Average from an array of closes.
 * Closes are sorted newest-first (same order as our price history data).
 * Returns null if insufficient data.
 */
export function computeEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  // Reverse to chronological order for EMA calculation
  const chronological = [...closes].reverse()
  const multiplier = 2 / (period + 1)
  // Seed with SMA of the first `period` values
  let ema = chronological.slice(0, period).reduce((s, v) => s + v, 0) / period
  for (let i = period; i < chronological.length; i++) {
    ema = (chronological[i] - ema) * multiplier + ema
  }
  return ema
}
```

### `computeRollingVWAP`

```typescript
/**
 * Compute a rolling Volume-Weighted Average Price over the most recent `period` days.
 * Each record must have high, low, close, and volume fields.
 * Records are sorted newest-first (same order as our price history data).
 * Returns null if insufficient data or zero total volume.
 *
 * Formula: VWAP = Σ(typicalPrice_i * volume_i) / Σ(volume_i)
 * where typicalPrice = (high + low + close) / 3
 */
export function computeRollingVWAP(
  records: { high: number; low: number; close: number; volume: number }[],
  period: number
): number | null {
  if (records.length < period) return null
  const window = records.slice(0, period)
  let sumTPxV = 0
  let sumV = 0
  for (const r of window) {
    const typicalPrice = (r.high + r.low + r.close) / 3
    sumTPxV += typicalPrice * r.volume
    sumV += r.volume
  }
  if (sumV === 0) return null
  return sumTPxV / sumV
}
```

### `computeMeanReversionScore`

```typescript
/**
 * Compute mean reversion score (0-100) from price distance to EMA8 and VWAP.
 * Below EMA8/VWAP = high score (good put-selling entry).
 * Far above EMA8/VWAP = low score (overextended, bad entry).
 * If VWAP is null, uses only the EMA8 sub-score.
 */
export function computeMeanReversionScore(
  stockPrice: number,
  ema8: number,
  vwap: number | null
): number {
  const ema8Distance = ((stockPrice - ema8) / ema8) * 100
  // linearScore maps: BEST → 100, WORST → 0
  // Negate the distance so "below" (negative distance) maps to higher scores
  const ema8SubScore = linearScore(
    -ema8Distance,
    -SCANNER.EMA8_DISTANCE_WORST,
    -SCANNER.EMA8_DISTANCE_BEST
  )

  if (vwap === null) {
    return ema8SubScore
  }

  const vwapDistance = ((stockPrice - vwap) / vwap) * 100
  const vwapSubScore = linearScore(
    -vwapDistance,
    -SCANNER.VWAP_DISTANCE_WORST,
    -SCANNER.VWAP_DISTANCE_BEST
  )

  return ema8SubScore * SCANNER.EMA8_WEIGHT + vwapSubScore * SCANNER.VWAP_WEIGHT
}
```

---

## Step 3: Update Scoring Logic

**File:** `lib/services/scanner.ts`

### Update `Phase4Scores` interface

Add `meanReversionScore` to the interface (around line 442):

```typescript
export interface Phase4Scores {
  yieldScore: number
  ivScore: number
  deltaScore: number
  liquidityScore: number
  trendScore: number
  meanReversionScore: number  // NEW
  compositeScore: number
}
```

### Update `computeScores` function

Add `ema8` and `vwap` parameters and compute the new score. The current signature (around line 451) is:

```typescript
export function computeScores(
  premiumYield: number,
  ivRank: number,
  delta: number,
  openInterest: number,
  stockPrice: number,
  sma200: number
): Phase4Scores {
```

Change to:

```typescript
export function computeScores(
  premiumYield: number,
  ivRank: number,
  delta: number,
  openInterest: number,
  stockPrice: number,
  sma200: number,
  ema8: number | null,
  vwap: number | null
): Phase4Scores {
```

Inside the function body, after computing the existing five scores and before computing `compositeScore`, add:

```typescript
const meanReversionScore = ema8 !== null
  ? computeMeanReversionScore(stockPrice, ema8, vwap)
  : 50 // neutral default if EMA8 can't be computed (insufficient history)
```

Replace the existing composite calculation with:

```typescript
const compositeScore =
  yieldScore * SCANNER.WEIGHTS.yield +
  ivScore * SCANNER.WEIGHTS.iv +
  deltaScore * SCANNER.WEIGHTS.delta +
  liquidityScore * SCANNER.WEIGHTS.liquidity +
  trendScore * SCANNER.WEIGHTS.trend +
  meanReversionScore * SCANNER.WEIGHTS.meanReversion
```

Update the log statement's `scores` object to include `meanReversionScore`.

Update the return to include `meanReversionScore`.

### Update `ScanTickerResult` interface

Add three new optional fields (around line 80):

```typescript
ema8?: number
vwap?: number
meanReversionScore?: number
```

---

## Step 4: Wire Into scanTicker

**File:** `lib/services/scanner.ts`

In `scanTicker()`, after Phase 1 passes and we have `priceHistory.records`, compute EMA8 and VWAP from the same data. The records are already sorted newest-first by `runPhase1`.

After the Phase 1 pass block (around line 613, after the `'Phase 1: PASSED'` log), add:

```typescript
// Compute EMA8 and rolling VWAP for mean reversion scoring (Phase 4)
const sortedRecords = [...priceHistory.records].sort((a, b) => b.date.localeCompare(a.date))
const closes = sortedRecords.map((r) => r.close)
const ema8 = computeEMA(closes, SCANNER.EMA_PERIOD)
const vwap = computeRollingVWAP(sortedRecords, SCANNER.VWAP_PERIOD)

result.ema8 = ema8 ?? undefined
result.vwap = vwap ?? undefined

log.debug(
  { ticker, ema8, vwap, stockPrice: p1.stockPrice },
  'Mean reversion indicators computed'
)
```

Then update the `computeScores` call in Phase 4 (around line 843) to pass the new parameters:

```typescript
const scores = computeScores(
  sel.premiumYield,
  p2.ivRank,
  sel.delta,
  sel.openInterest,
  p1.stockPrice,
  p1.sma200!,
  ema8,    // NEW
  vwap     // NEW
)
```

After the existing score assignments, add:

```typescript
result.meanReversionScore = scores.meanReversionScore
```

---

## Step 5: Prisma Schema Migration

**File:** `prisma/schema.prisma`

Add three new columns to the `ScanResult` model. Place them in the Phase 4 scores section, after `trendScore` and before `compositeScore`:

```prisma
  // Phase 4: Scores (populated if passed Phase 3)
  yieldScore         Decimal? @db.Decimal(6, 2)
  ivScore            Decimal? @db.Decimal(6, 2)
  deltaScore         Decimal? @db.Decimal(6, 2)
  liquidityScore     Decimal? @db.Decimal(6, 2)
  trendScore         Decimal? @db.Decimal(6, 2)
  ema8               Decimal? @db.Decimal(10, 2)   // NEW
  vwap               Decimal? @db.Decimal(10, 2)   // NEW
  meanReversionScore Decimal? @db.Decimal(6, 2)    // NEW
  compositeScore     Decimal? @db.Decimal(6, 2)
```

Run migration:

```bash
pnpm prisma migrate dev --name add_ema8_vwap_mean_reversion_score
```

---

## Step 6: Persist New Fields in runFullScan

**File:** `lib/services/scanner.ts`

In `runFullScan()`, update the `prisma.scanResult.createMany()` data mapping (around line 950). Add three fields to the mapped object, alongside the existing score fields:

```typescript
ema8: r.ema8,
vwap: r.vwap,
meanReversionScore: r.meanReversionScore,
```

Place them after `trendScore` and before `compositeScore` to match the schema column order.

---

## Step 7: Query Layer

**File:** `lib/queries/scanner.ts`

### Update `ScanResultData` interface

Add three new fields to the interface (around line 48, in the Phase 4 section):

```typescript
// Phase 4
yieldScore: number | null
ivScore: number | null
deltaScore: number | null
liquidityScore: number | null
trendScore: number | null
ema8: number | null               // NEW
vwap: number | null               // NEW
meanReversionScore: number | null // NEW
compositeScore: number | null
```

### Update `getLatestScanResults` mapping

In the `results.map()` callback (around line 130), add three new lines alongside the other score mappings:

```typescript
ema8: decimalToNumber(r.ema8),
vwap: decimalToNumber(r.vwap),
meanReversionScore: decimalToNumber(r.meanReversionScore),
```

---

## Step 8: Scanner UI

**File:** `app/scanner/scanner-client.tsx`

### 8a. Update the "How does this work?" scoring table

In the scoring breakdown table (around line 206), update the weights for existing rows and add a new row for Mean Reversion:

```tsx
<tr className="border-b border-gray-100">
  <td className="py-1.5 pr-4">Yield</td>
  <td className="py-1.5 pr-4">25%</td>
  <td className="py-1.5">Annualized premium yield (8–24% range)</td>
</tr>
<tr className="border-b border-gray-100">
  <td className="py-1.5 pr-4">IV Rank</td>
  <td className="py-1.5 pr-4">20%</td>
  <td className="py-1.5">Where current IV sits in its 52-week range (20–70)</td>
</tr>
<tr className="border-b border-gray-100">
  <td className="py-1.5 pr-4">Delta</td>
  <td className="py-1.5 pr-4">15%</td>
  <td className="py-1.5">Proximity to the sweet spot (-0.22 to -0.25)</td>
</tr>
<tr className="border-b border-gray-100">
  <td className="py-1.5 pr-4">Liquidity</td>
  <td className="py-1.5 pr-4">10%</td>
  <td className="py-1.5">Open interest relative to 500 preferred</td>
</tr>
<tr className="border-b border-gray-100">
  <td className="py-1.5 pr-4">Trend</td>
  <td className="py-1.5 pr-4">10%</td>
  <td className="py-1.5">How far price is above the 200-day SMA</td>
</tr>
<tr>
  <td className="py-1.5 pr-4">Mean Reversion</td>
  <td className="py-1.5 pr-4">20%</td>
  <td className="py-1.5">Distance below EMA8 and 20-day VWAP (below = better entry for selling puts)</td>
</tr>
```

### 8b. Update expanded row: Component Scores section

In the `TickerRow` component's expanded detail panel (around line 564), update the `ScoreBar` labels to match the new weights and add the mean reversion score bar:

```tsx
<div>
  <h4 className="text-sm font-semibold text-gray-700 mb-2">Component Scores</h4>
  <div className="space-y-1.5">
    <ScoreBar label="Yield (25%)" score={result.yieldScore} />
    <ScoreBar label="IV Rank (20%)" score={result.ivScore} />
    <ScoreBar label="Delta (15%)" score={result.deltaScore} />
    <ScoreBar label="Liquidity (10%)" score={result.liquidityScore} />
    <ScoreBar label="Trend (10%)" score={result.trendScore} />
    <ScoreBar label="Mean Reversion (20%)" score={result.meanReversionScore} />
    <div className="pt-1 border-t border-gray-200">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-gray-700">Composite</span>
        <span className="font-bold">{result.compositeScore?.toFixed(1) ?? '-'}</span>
      </div>
    </div>
  </div>
</div>
```

### 8c. Update expanded row: Stock Data section

In the Stock Data column (around line 582), add EMA8 and VWAP rows after the 50-day SMA row:

```tsx
<div className="flex justify-between">
  <dt className="text-gray-500">50-day SMA</dt>
  <dd className="text-gray-900">{formatCurrency(result.sma50)}</dd>
</div>
<div className="flex justify-between">
  <dt className="text-gray-500">EMA8</dt>
  <dd className="text-gray-900">{formatCurrency(result.ema8)}</dd>
</div>
<div className="flex justify-between">
  <dt className="text-gray-500">20-day VWAP</dt>
  <dd className="text-gray-900">{formatCurrency(result.vwap)}</dd>
</div>
```

---

## Step 9: Tests

**File:** `lib/services/scanner.test.ts`

### 9a. `computeEMA` tests

```typescript
describe('computeEMA', () => {
  it('returns null when insufficient data', () => {
    expect(computeEMA([100, 101, 102], 8)).toBeNull()
  })

  it('computes EMA correctly for a known sequence', () => {
    // 10 values, newest-first: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    // Chronological: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    // SMA seed (first 8): (1+2+3+4+5+6+7+8)/8 = 4.5
    // multiplier = 2/(8+1) = 0.2222
    // EMA after 9th: (9 - 4.5) * 0.2222 + 4.5 = 5.5
    // EMA after 10th: (10 - 5.5) * 0.2222 + 5.5 = 6.5
    const closes = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    const result = computeEMA(closes, 8)
    expect(result).toBeCloseTo(6.5, 1)
  })

  it('equals SMA when period equals data length', () => {
    const closes = [5, 4, 3, 2, 1] // chronological: [1,2,3,4,5], SMA = 3
    const result = computeEMA(closes, 5)
    expect(result).toBeCloseTo(3, 5)
  })
})
```

### 9b. `computeRollingVWAP` tests

```typescript
describe('computeRollingVWAP', () => {
  it('returns null when insufficient data', () => {
    const records = [{ high: 10, low: 8, close: 9, volume: 100 }]
    expect(computeRollingVWAP(records, 20)).toBeNull()
  })

  it('returns null when total volume is zero', () => {
    const records = Array.from({ length: 20 }, () => ({
      high: 10, low: 8, close: 9, volume: 0,
    }))
    expect(computeRollingVWAP(records, 20)).toBeNull()
  })

  it('weights by volume correctly', () => {
    // Day 1 (newest): typical = (12+8+10)/3 = 10, volume = 1000
    // Day 2: typical = (22+18+20)/3 = 20, volume = 100
    // VWAP = (10*1000 + 20*100) / (1000+100) = 12000/1100 ≈ 10.909
    const records = [
      { high: 12, low: 8, close: 10, volume: 1000 },
      { high: 22, low: 18, close: 20, volume: 100 },
    ]
    const result = computeRollingVWAP(records, 2)
    expect(result).toBeCloseTo(10.909, 2)
  })

  it('high-volume days dominate the result', () => {
    // One high-volume day at $50, many low-volume days at $100
    const records = [
      { high: 52, low: 48, close: 50, volume: 10_000_000 },
      ...Array.from({ length: 19 }, () => ({
        high: 102, low: 98, close: 100, volume: 1000,
      })),
    ]
    const result = computeRollingVWAP(records, 20)!
    // Should be much closer to $50 than $100
    expect(result).toBeLessThan(55)
  })
})
```

### 9c. `computeMeanReversionScore` tests

```typescript
describe('computeMeanReversionScore', () => {
  it('returns ~100 when price is well below EMA8 and VWAP', () => {
    // Price 3% below EMA8, 2% below VWAP
    const score = computeMeanReversionScore(97, 100, 99)
    expect(score).toBeGreaterThan(90)
  })

  it('returns ~0 when price is far above EMA8 and VWAP', () => {
    // Price 6% above EMA8, 4% above VWAP
    const score = computeMeanReversionScore(106, 100, 102)
    expect(score).toBeLessThan(10)
  })

  it('returns mid-range when price is near averages', () => {
    // Price 1% above EMA8, 0.5% above VWAP
    const score = computeMeanReversionScore(101, 100, 100.5)
    expect(score).toBeGreaterThan(30)
    expect(score).toBeLessThan(80)
  })

  it('uses only EMA8 when VWAP is null', () => {
    const withVwap = computeMeanReversionScore(98, 100, 99)
    const withoutVwap = computeMeanReversionScore(98, 100, null)
    // Without VWAP should use only EMA8 sub-score (not averaged)
    expect(withoutVwap).toBeGreaterThan(0)
    expect(withoutVwap).not.toEqual(withVwap)
  })
})
```

### 9d. Update existing `computeScores` tests

All existing tests that call `computeScores` need two new trailing arguments: `ema8` and `vwap`. For existing tests that don't care about mean reversion, pass `null, null` — this gives a neutral default of 50 for the mean reversion component.

Update every call site from:

```typescript
computeScores(premiumYield, ivRank, delta, oi, stockPrice, sma200)
```

To:

```typescript
computeScores(premiumYield, ivRank, delta, oi, stockPrice, sma200, null, null)
```

Also update any assertions on `compositeScore` values since the weights have changed. The `Phase4Scores` type now includes `meanReversionScore`, so any spread/destructure of the return value will automatically include it.

---

## Files Summary

### Modified Files

| Step | File | Change |
|------|------|--------|
| 1 | `lib/services/scanner-constants.ts` | Add `EMA_PERIOD`, `VWAP_PERIOD`, distance thresholds, sub-score weights; update `WEIGHTS` to include `meanReversion: 0.20` and redistribute existing weights |
| 2, 3, 4, 6 | `lib/services/scanner.ts` | Add `computeEMA`, `computeRollingVWAP`, `computeMeanReversionScore`; add `ema8`, `vwap`, `meanReversionScore` to `ScanTickerResult` and `Phase4Scores`; update `computeScores` signature + composite formula; compute EMA8/VWAP in `scanTicker`; persist new fields in `runFullScan` |
| 5 | `prisma/schema.prisma` | Add `ema8`, `vwap`, `meanReversionScore` columns to `ScanResult` model |
| 7 | `lib/queries/scanner.ts` | Add `ema8`, `vwap`, `meanReversionScore` to `ScanResultData` interface and `getLatestScanResults` mapping |
| 8 | `app/scanner/scanner-client.tsx` | Update weight labels in help table and `ScoreBar` components; add `Mean Reversion (20%)` score bar; add EMA8 and 20-day VWAP rows to expanded Stock Data section |
| 9 | `lib/services/scanner.test.ts` | Add tests for `computeEMA`, `computeRollingVWAP`, `computeMeanReversionScore`; update existing `computeScores` call sites with new params |

### New Files

None.

---

## Verification

### Unit Tests
- `pnpm test` passes — all new and updated tests green
- `computeEMA` returns correct values for known sequences, null for insufficient data
- `computeRollingVWAP` correctly weights by volume, returns null for zero volume or insufficient data
- `computeMeanReversionScore` returns high scores for prices below EMA8/VWAP, low scores for prices above, handles null VWAP

### Type Check
- `npx tsc --noEmit` passes with no errors

### Database
- Migration runs cleanly: `pnpm prisma migrate dev --name add_ema8_vwap_mean_reversion_score`
- After a scan, `ScanResult` rows for candidates have non-null `ema8`, `vwap`, and `meanReversionScore` values
- Rows for tickers that failed before Phase 4 have null values for these fields (as expected)

### Scanner Execution
- Run a manual scan from the UI or via `scripts/run-scanner.ts`
- Candidates show updated composite scores reflecting the new weight distribution
- A ticker trading below its EMA8/VWAP scores higher than one trading above (all else equal)
- Existing tickers that passed before still pass (the funnel phases 1-3 are unchanged)

### UI
- Expanded row shows 6 score bars: Yield (25%), IV Rank (20%), Delta (15%), Liquidity (10%), Trend (10%), Mean Reversion (20%)
- Expanded Stock Data section shows EMA8 and 20-day VWAP values
- "How does this work?" table shows updated weights and the new Mean Reversion row
- Composite score in the main table matches the sum of weighted component scores

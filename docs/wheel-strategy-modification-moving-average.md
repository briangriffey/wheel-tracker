# Wheel Scanner Modification: EMA8 & VWAP Mean Reversion Scoring

**Date:** 2026-02-28
**Status:** Proposed
**Modifies:** Phase 4 scoring in `lib/services/scanner.ts` and `lib/services/scanner-constants.ts`
**Strategy Reference:** `docs/wheel-scanner-strategy.md`

---

## Rationale

The current scanner scores trend strength purely by distance above the 200-day SMA. This misses a critical short-term timing signal: **where is the stock relative to its 1-day EMA8 and 1-day VWAP?**

When selling cash-secured puts, the ideal entry is when the stock is **temporarily below** the EMA8 and VWAP but still in an overall uptrend (Phase 1 already confirms this via the 200-day SMA). In this scenario:

- The stock is likely to **revert upward** toward the EMA8 and VWAP, which means the put we sell will lose value faster (good for us as sellers).
- We are selling the put when IV is slightly elevated due to the short-term dip, collecting **more premium** than we would if the stock were sitting right on or above the EMA8.
- The risk of assignment is lower because mean reversion acts as a natural buffer.

Conversely, when a stock is **far above** the EMA8 and VWAP, it is extended and likely to pull back. Selling a put in this condition means we are entering when the stock has a higher probability of declining toward (or through) our strike.

---

## What Are EMA8 and VWAP?

**EMA8 (8-period Exponential Moving Average on daily candles):** A fast-moving average that weighs recent prices more heavily than older ones. The EMA8 closely tracks price action and acts as a short-term dynamic support/resistance level. Stocks in a healthy uptrend tend to bounce off the EMA8 repeatedly.

**Rolling VWAP (Volume-Weighted Average Price over N days):** The average price weighted by volume over a rolling window of recent trading days. While intraday VWAP resets daily, a rolling VWAP over multiple days gives us a volume-anchored "fair value" that smooths out single-day noise. Institutional traders use VWAP as a benchmark — a stock below its rolling VWAP means the bulk of recent trading volume occurred at higher prices, implying the current price is at a short-term discount.

For our purposes, we compute a **rolling VWAP over the most recent 20 trading days** using the typical price `(High + Low + Close) / 3` for each day, weighted by that day's volume. We compare the latest close against this rolling VWAP. The 20-day window roughly corresponds to one calendar month of trading and gives a stable volume-weighted anchor.

---

## Scoring Design

### New Score Component: `meanReversionScore` (0–100)

This score rewards stocks that are slightly below the EMA8 and VWAP (mean reversion opportunity) and penalizes stocks that are far above them (overextended, likely to pull back).

#### EMA8 Distance Sub-Score (0–100)

Computed as the percentage distance from the current price to the EMA8:

```
ema8Distance = ((stockPrice - ema8) / ema8) * 100
```

| Price vs EMA8 | ema8Distance | Sub-Score | Reasoning |
|---|---|---|---|
| 2%+ below EMA8 | ≤ -2.0% | 100 | Deep discount — strong reversion expected |
| At or just below EMA8 | -2.0% to 0% | 80–100 | Sweet spot — at the mean, about to bounce |
| 0% to 2% above | 0% to +2.0% | 50–80 | Acceptable — close to mean |
| 2% to 5% above | +2.0% to +5.0% | 10–50 | Extended — reversion risk increases |
| 5%+ above | > +5.0% | 0 | Overextended — high reversion risk, bad entry |

The score scales linearly within each band.

Simplified as a single linear mapping:

```
ema8SubScore = linearScore(-ema8Distance, -2.0, 5.0)
```

This maps -2% distance (2% below EMA8) → score 100 and +5% distance (5% above) → score 0.

#### VWAP Distance Sub-Score (0–100)

Same logic as EMA8 but with tighter bands since the rolling VWAP is a volume-anchored mean:

```
vwapDistance = ((stockPrice - vwap) / vwap) * 100
```

| Price vs VWAP | vwapDistance | Sub-Score | Reasoning |
|---|---|---|---|
| Below VWAP | ≤ 0% | 100 | Below fair value — discount |
| 0% to 1% above | 0% to +1.0% | 50–100 | Near fair value |
| 1% to 3% above | +1.0% to +3.0% | 0–50 | Above fair value |
| 3%+ above | > +3.0% | 0 | Significant premium over fair value |

```
vwapSubScore = linearScore(-vwapDistance, -1.0, 3.0)
```

#### Combined Mean Reversion Score

```
meanReversionScore = (ema8SubScore * 0.60) + (vwapSubScore * 0.40)
```

EMA8 is weighted more heavily because it represents a multi-day trend anchor, while VWAP resets daily and is noisier.

**Fallback:** If VWAP data is unavailable (e.g., the API doesn't return it for a given ticker), use the EMA8 sub-score alone as the full `meanReversionScore`.

---

## Changes to Composite Score Weights

The new `meanReversionScore` gets its own weight in the composite. To make room, reduce the existing `trend` weight (which overlaps conceptually — both measure price-to-moving-average relationships):

### Current Weights

| Component | Weight |
|---|---|
| Premium yield | 30% |
| IV Rank | 25% |
| Delta sweet spot | 15% |
| Options liquidity | 15% |
| Trend strength (200-SMA distance) | 15% |

### Proposed Weights

| Component | Weight | Change |
|---|---|---|
| Premium yield | 25% | -5% |
| IV Rank | 20% | -5% |
| Delta sweet spot | 15% | unchanged |
| Options liquidity | 10% | -5% |
| Trend strength (200-SMA distance) | 10% | -5% |
| **Mean reversion (EMA8 + VWAP)** | **20%** | **new** |

The mean reversion score gets 20% because it is the **primary timing signal** for put-selling entry. The 200-day SMA trend score remains at 10% as a sanity check on the macro trend (which Phase 1 already gates on). Premium yield and IV rank lose a small amount each since the mean reversion score partly captures the same "good entry point" signal they do (stocks below EMA8 tend to have slightly elevated IV and thus better yields).

```
compositeScore = (yieldScore * 0.25) + (ivScore * 0.20) + (deltaScore * 0.15)
               + (liquidityScore * 0.10) + (trendScore * 0.10)
               + (meanReversionScore * 0.20)
```

---

## Data Requirements

### EMA8

The EMA8 is computed from the daily close data that **we already fetch** in Phase 1 via `fetchStockPriceHistory()`. No additional API calls are needed.

**Computation:**

```typescript
function computeEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  // closes are sorted newest-first; reverse for chronological calculation
  const chronological = [...closes].reverse()
  const multiplier = 2 / (period + 1)
  // Seed with SMA of first `period` values
  let ema = chronological.slice(0, period).reduce((s, v) => s + v, 0) / period
  for (let i = period; i < chronological.length; i++) {
    ema = (chronological[i] - ema) * multiplier + ema
  }
  return ema
}
```

### Rolling VWAP

We don't have intraday tick data, but we **do** have daily OHLCV from `fetchStockPriceHistory()` — including volume. We compute a rolling VWAP over the most recent N days using the typical price for each day weighted by that day's volume:

```
typicalPrice_i = (high_i + low_i + close_i) / 3
rollingVWAP = Σ(typicalPrice_i * volume_i) / Σ(volume_i)    for i = 1..N
```

This gives a true volume-weighted average — days with heavy volume pull the VWAP toward their price range, while low-volume days have less influence. This is a much more meaningful anchor than a simple average because it reflects where actual trading activity was concentrated.

**Window:** 20 trading days (~1 calendar month). Configurable via `VWAP_PERIOD` in constants.

No additional API calls are needed — the OHLCV data is already fetched in Phase 1.

---

## Implementation Plan

### 1. Add constants to `scanner-constants.ts`

```typescript
// scanner-constants.ts additions
export const SCANNER = {
  // ... existing constants ...

  // Mean Reversion scoring
  EMA_PERIOD: 8,
  VWAP_PERIOD: 20,             // rolling VWAP window in trading days
  EMA8_DISTANCE_BEST: -2.0,    // 2% below EMA8 = score 100
  EMA8_DISTANCE_WORST: 5.0,    // 5% above EMA8 = score 0
  VWAP_DISTANCE_BEST: -1.0,    // 1% below VWAP = score 100
  VWAP_DISTANCE_WORST: 3.0,    // 3% above VWAP = score 0
  EMA8_WEIGHT: 0.60,           // within mean reversion sub-score
  VWAP_WEIGHT: 0.40,

  // Updated scoring weights
  WEIGHTS: {
    yield: 0.25,
    iv: 0.20,
    delta: 0.15,
    liquidity: 0.10,
    trend: 0.10,
    meanReversion: 0.20,
  },
}
```

### 2. Add calculation functions to `scanner.ts`

New pure functions (unit-testable, no side effects):

- **`computeEMA(closes: number[], period: number): number | null`** — Computes the exponential moving average from an array of closes (sorted newest-first, same as our existing data).

- **`computeRollingVWAP(records: {high: number, low: number, close: number, volume: number}[], period: number): number | null`** — Computes a volume-weighted average price over the most recent `period` days. For each day, calculates the typical price `(high + low + close) / 3`, multiplies by volume, sums those products, and divides by total volume. Returns null if fewer than `period` records are available.

- **`computeMeanReversionScore(stockPrice: number, ema8: number, vwap: number | null): number`** — Combines the EMA8 distance and VWAP distance sub-scores using the configured weights. If VWAP is null, uses only EMA8.

### 3. Update `computeScores()` signature and logic

Add `ema8` and `vwap` parameters. Compute `meanReversionScore` and include it in the weighted composite.

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
  // ... existing scores ...
  const meanReversionScore = ema8 !== null
    ? computeMeanReversionScore(stockPrice, ema8, vwap)
    : 50 // neutral default if EMA8 can't be computed

  const compositeScore =
    yieldScore * SCANNER.WEIGHTS.yield +
    ivScore * SCANNER.WEIGHTS.iv +
    deltaScore * SCANNER.WEIGHTS.delta +
    liquidityScore * SCANNER.WEIGHTS.liquidity +
    trendScore * SCANNER.WEIGHTS.trend +
    meanReversionScore * SCANNER.WEIGHTS.meanReversion

  return { yieldScore, ivScore, deltaScore, liquidityScore, trendScore, meanReversionScore, compositeScore }
}
```

### 4. Compute EMA8 and VWAP in `scanTicker()` during Phase 1

After `runPhase1()` succeeds, compute EMA8 and VWAP from the same price history data:

```typescript
// After Phase 1 passes, inside scanTicker():
const sorted = [...priceHistory.records].sort((a, b) => b.date.localeCompare(a.date))
const closes = sorted.map((r) => r.close)
const ema8 = computeEMA(closes, SCANNER.EMA_PERIOD)
const vwap = computeRollingVWAP(sorted, SCANNER.VWAP_PERIOD)
```

Pass `ema8` and `vwap` through to Phase 4's `computeScores()`.

### 5. Update `Phase4Scores` interface and `ScanTickerResult`

Add to `Phase4Scores`:
- `meanReversionScore: number`

Add to `ScanTickerResult`:
- `ema8?: number`
- `vwap?: number`
- `meanReversionScore?: number`

### 6. Prisma schema migration

Add three new columns to the `ScanResult` model:

```prisma
// Inside model ScanResult, in the Phase 4 scores section:
ema8               Decimal? @db.Decimal(10, 2)
vwap               Decimal? @db.Decimal(10, 2)
meanReversionScore Decimal? @db.Decimal(6, 2)
```

Run: `pnpm prisma migrate dev --name add_ema8_vwap_mean_reversion`

### 7. Update `runFullScan()` to persist new fields

In the `prisma.scanResult.createMany()` data mapping, add:

```typescript
ema8: r.ema8,
vwap: r.vwap,
meanReversionScore: r.meanReversionScore,
```

### 8. Update scanner UI (if built)

Add EMA8 and VWAP columns to the scan results table. Show the mean reversion score as a component in the expanded row detail alongside the existing yield/IV/delta/liquidity/trend scores.

### 9. Update tests

Add to `scanner.test.ts`:
- Unit tests for `computeEMA` with known sequences
- Unit tests for `computeRollingVWAP` — verifies volume weighting (high-volume days dominate), handles edge cases (zero total volume, insufficient records)
- Unit tests for `computeMeanReversionScore` across all bands (below EMA8, at EMA8, above EMA8, overextended)
- Update `computeScores` tests to include the new parameters and verify the new weight distribution

---

## Files Summary

| Action | File | Change |
|--------|------|--------|
| Modify | `lib/services/scanner-constants.ts` | Add EMA/VWAP constants, update weight distribution |
| Modify | `lib/services/scanner.ts` | Add `computeEMA`, `computeRollingVWAP`, `computeMeanReversionScore`; update `computeScores` and `scanTicker` |
| Modify | `prisma/schema.prisma` | Add `ema8`, `vwap`, `meanReversionScore` columns to `ScanResult` |
| Modify | `lib/services/scanner.test.ts` | Add tests for new functions, update existing score tests |
| Modify | `app/scanner/scanner-client.tsx` | Display EMA8, VWAP, and mean reversion score (if page is built) |

---

## Example Scenarios

### Scenario A: Ideal Entry (Score ~90)

- **AAPL** at $178.50, EMA8 at $180.20, 20-day rolling VWAP at $179.80
- Price is 0.9% below EMA8 and 0.7% below VWAP
- ema8SubScore ≈ 90, vwapSubScore ≈ 93
- meanReversionScore ≈ 91
- Stock is in an uptrend (above 200-SMA) but dipped below its short-term averages — textbook put-selling entry. The rolling VWAP confirms most recent volume was transacted at higher prices.

### Scenario B: Acceptable Entry (Score ~60)

- **MSFT** at $412.00, EMA8 at $410.50, 20-day rolling VWAP at $411.20
- Price is 0.4% above EMA8 and 0.2% above VWAP
- ema8SubScore ≈ 66, vwapSubScore ≈ 70
- meanReversionScore ≈ 68
- Stock is near its averages — decent entry, not ideal

### Scenario C: Poor Entry (Score ~15)

- **NVDA** at $142.00, EMA8 at $135.00, 20-day rolling VWAP at $137.50
- Price is 5.2% above EMA8 and 3.3% above VWAP
- ema8SubScore ≈ 0, vwapSubScore ≈ 0
- meanReversionScore ≈ 0
- Stock is overextended above both the EMA8 and the volume-weighted mean — high probability of pulling back, bad time to sell a put

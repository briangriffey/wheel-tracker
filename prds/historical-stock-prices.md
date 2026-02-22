# Historical Stock Price Storage & Candlestick Charts — PRD

**dispatched_by: mayor**
**Document Version:** 1.0
**Last Updated:** 2026-02-22
**Status:** Draft
**Depends on:** `prds/wheel-scanner.md` (all phases complete)

---

## Executive Summary

The scanner already fetches full daily OHLCV price history from FinancialData.net during Phase 1 (`fetchStockPriceHistory` at `lib/services/scanner.ts:558`) but discards it after computing SMAs. This PRD adds persistence of the most recent 60 days of that data and renders a candlestick chart with a strike-price overlay in the expanded scanner candidate row.

Key principles:
- **Zero additional API calls**: Price data is already fetched — we just stop throwing it away
- **Global data**: Historical prices are per-ticker, not per-user — one copy serves everyone
- **Visual context**: A candlestick chart with strike overlay gives instant intuition about where the recommended put sits relative to recent price action

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Phase Dependency Map](#phase-dependency-map)
3. [Phase A: Database Schema + Scanner Persistence](#phase-a-database-schema--scanner-persistence)
4. [Phase B: Query Layer + Server Component Wiring](#phase-b-query-layer--server-component-wiring)
5. [Phase C: Candlestick Chart Component](#phase-c-candlestick-chart-component)
6. [Phase D: UI Integration](#phase-d-ui-integration)
7. [Files Summary](#files-summary)
8. [Verification](#verification)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Scanner Cron / Manual Scan                  │
│                                                             │
│  scanTicker()                                               │
│    │                                                        │
│    ├─ fetchStockPriceHistory(ticker)                        │
│    │    └─ returns ~200 daily OHLCV records                 │
│    │                                                        │
│    ├─ runPhase1(records)  ← existing: compute SMAs, filter  │
│    │                                                        │
│    └─ NEW: persist 60 most recent records                   │
│         └─ prisma.historicalStockPrice.createMany()         │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                              │
│                                                             │
│  HistoricalStockPrice                                       │
│  ┌──────────────────────────────────────────┐               │
│  │ id | ticker | date | open | high | low   │               │
│  │    | close  | volume                     │               │
│  │    @@unique([ticker, date])              │               │
│  └──────────────────────────────────────────┘               │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    /scanner Page                             │
│                                                             │
│  page.tsx (server)                                          │
│    └─ getHistoricalPricesForTickers(passedTickers)          │
│         └─ Map<ticker, PriceRecord[]>                       │
│                                                             │
│  scanner-client.tsx (client)                                │
│    └─ Expanded TickerRow                                    │
│         └─ <CandlestickChart data={...} strikePrice={...}/> │
│              └─ lightweight-charts (TradingView)            │
│                  ├─ addCandlestickSeries()                  │
│                  └─ series.createPriceLine() ← strike       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Price data flows top-down: the scanner persists it during its existing run, the server component queries it at page load, and the client component renders it as a candlestick chart.

---

## Phase Dependency Map

```
Phase A: DB Schema + Scanner Persistence
         │
         │  (MUST be first — creates the table and populates it)
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
Phase B: Query Layer +              Phase C: Chart Component
         Server Wiring              (install lightweight-charts,
         (DEPENDS ON A)              build component)
         │                                  │
         │    (can run in PARALLEL)          │
         │                                  │
         └──────────────┬───────────────────┘
                        │
                        ▼
              Phase D: UI Integration
              (DEPENDS ON B + C)
```

**Phase A** must land first — it creates the `HistoricalStockPrice` table and adds persistence logic to the scanner. **Phase B** (query + server wiring) and **Phase C** (chart component) have no dependency on each other and can be built in parallel. **Phase D** brings them together in the scanner UI.

---

## Phase A: Database Schema + Scanner Persistence

### A1. Prisma Schema — New Model

**File**: `prisma/schema.prisma`

Add a new model. This is **global data** (not per-user) — the same price history applies to all users scanning the same ticker.

```prisma
model HistoricalStockPrice {
  id     String   @id @default(cuid())
  ticker String
  date   DateTime
  open   Decimal  @db.Decimal(10, 4)
  high   Decimal  @db.Decimal(10, 4)
  low    Decimal  @db.Decimal(10, 4)
  close  Decimal  @db.Decimal(10, 4)
  volume BigInt

  @@unique([ticker, date])
  @@index([ticker])
}
```

Design decisions:
- **No `userId`**: Stock prices are facts, not user-specific. This avoids duplicating rows across users scanning the same ticker.
- **`Decimal(10, 4)`**: Matches price precision (e.g., $178.5025). More precision than `ScanResult`'s `Decimal(10, 2)` since OHLCV data can have sub-penny values.
- **`BigInt` for volume**: Some tickers (SPY, AAPL) regularly exceed `Int` max (~2.1B).
- **`@@unique([ticker, date])`**: Prevents duplicate rows — the delete-and-reinsert pattern in A2 handles freshness.

Run: `pnpm prisma migrate dev --name add_historical_stock_prices`

### A2. Scanner Persistence Logic

**File**: `lib/services/scanner.ts`

In `scanTicker()`, after `fetchStockPriceHistory` succeeds and before Phase 1 filtering (~line 558-568), persist the price data. This runs for **every ticker**, even ones that fail Phase 1 — we still have their price data and it's useful for charting.

Insert this block after line 567 (`log.debug({ ticker, recordCount: ... })`), before `const p1 = runPhase1(...)`:

```typescript
// Persist the 60 most recent OHLCV records for charting
try {
  const recentRecords = priceHistory.records.slice(-60)
  await prisma.historicalStockPrice.deleteMany({
    where: { ticker },
  })
  await prisma.historicalStockPrice.createMany({
    data: recentRecords.map((r) => ({
      ticker,
      date: new Date(r.date),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    })),
  })
  log.debug({ ticker, count: recentRecords.length }, 'Persisted historical price data')
} catch (err) {
  // Non-fatal — price persistence failing shouldn't block the scan
  log.warn({ ticker, error: err }, 'Failed to persist historical price data')
}
```

Key details:
- **Delete-then-insert pattern**: Simpler than upsert for bulk data. The `@@unique([ticker, date])` constraint ensures no dups if the delete somehow fails partially.
- **`slice(-60)`**: Takes the 60 most recent records from the array (which is sorted by date ascending from the API).
- **Try/catch**: Price persistence is non-critical — scanner should continue even if this fails.
- **Runs for all tickers**: Even if a ticker fails Phase 1 (price too low, below SMA, etc.), the price data is still valid and useful for charting context.

### A3. Import Prisma Client

**File**: `lib/services/scanner.ts`

Verify that `prisma` is already imported. Looking at the existing code, `scanTicker` already writes `ScanResult` rows via Prisma, so the import should exist. If not, add:

```typescript
import { prisma } from '@/lib/db'
```

---

## Phase B: Query Layer + Server Component Wiring

**Depends on**: Phase A (table must exist and be populated).

### B1. New Query Function

**File**: `lib/queries/scanner.ts`

Add a new exported function below the existing `getScanMetadata`:

```typescript
export interface HistoricalPriceData {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/**
 * Fetch historical price data for multiple tickers.
 * Returns a Map keyed by ticker symbol, with each value being
 * an array of daily OHLCV records sorted by date ascending.
 */
export const getHistoricalPricesForTickers = cache(
  async (tickers: string[]): Promise<Map<string, HistoricalPriceData[]>> => {
    if (tickers.length === 0) return new Map()

    const rows = await prisma.historicalStockPrice.findMany({
      where: { ticker: { in: tickers } },
      orderBy: [{ ticker: 'asc' }, { date: 'asc' }],
    })

    const result = new Map<string, HistoricalPriceData[]>()
    for (const row of rows) {
      const entry: HistoricalPriceData = {
        date: row.date,
        open: row.open.toNumber(),
        high: row.high.toNumber(),
        low: row.low.toNumber(),
        close: row.close.toNumber(),
        volume: Number(row.volume),
      }
      const existing = result.get(row.ticker)
      if (existing) {
        existing.push(entry)
      } else {
        result.set(row.ticker, [entry])
      }
    }

    return result
  }
)
```

Design decisions:
- **Batched query**: Single `findMany` with `IN` clause instead of N separate queries — efficient for 30+ tickers.
- **`cache()` wrapper**: Matches the existing pattern in this file (`getLatestScanResults`, `getScanMetadata`) for React request deduplication.
- **Convert `Decimal` to `number`**: lightweight-charts expects plain numbers, not Prisma `Decimal` objects. Uses the same `toNumber()` pattern as `decimalToNumber` above.
- **Convert `BigInt` to `number`**: Volume values are safe as regular numbers for display purposes.

### B2. Server Component — Pass Price Data as Prop

**File**: `app/scanner/page.tsx`

Update the server component to fetch price data for passed candidates and pass it down.

```typescript
import {
  getLatestScanResults,
  getScanMetadata,
  getHistoricalPricesForTickers,
} from '@/lib/queries/scanner'
```

In `ScannerPage()`, after fetching scan results, extract the tickers that passed (have price data worth charting) and fetch their history:

```typescript
const [watchlistResult, scanResults, scanMetadata] = await Promise.all([
  getWatchlistTickers(),
  getLatestScanResults(),
  getScanMetadata(),
])

const watchlist = watchlistResult.success ? watchlistResult.data : []

// Fetch price history for passed candidates (chart data)
const passedTickers = scanResults
  .filter((r) => r.passed)
  .map((r) => r.ticker)
const priceHistoryMap = await getHistoricalPricesForTickers(passedTickers)

// Convert Map to serializable object for client component
const priceHistory: Record<string, HistoricalPriceData[]> = {}
for (const [ticker, data] of priceHistoryMap) {
  priceHistory[ticker] = data
}

return (
  <ScannerClient
    initialWatchlist={watchlist}
    initialScanResults={scanResults}
    initialMetadata={scanMetadata}
    priceHistory={priceHistory}
  />
)
```

Note: `Map` is not serializable across the server/client boundary, so convert to a plain `Record` before passing as a prop.

### B3. Update Client Props Interface

**File**: `app/scanner/scanner-client.tsx`

Add the new prop to `ScannerClientProps`:

```typescript
import type {
  ScanResultData,
  ScanMetadata,
  HistoricalPriceData,
} from '@/lib/queries/scanner'

interface ScannerClientProps {
  initialWatchlist: WatchlistTickerData[]
  initialScanResults: ScanResultData[]
  initialMetadata: ScanMetadata
  priceHistory: Record<string, HistoricalPriceData[]>
}
```

---

## Phase C: Candlestick Chart Component

**No dependencies** — can run in parallel with Phase B.

### C1. Install lightweight-charts

```bash
pnpm add lightweight-charts
```

[lightweight-charts](https://github.com/nickvdyck/lightweight-charts) is TradingView's open-source charting library. It is purpose-built for financial charts, renders via HTML Canvas (fast), and has first-class candlestick support with price lines.

### C2. Chart Component

**New file**: `components/charts/candlestick-chart.tsx`

```typescript
'use client'

import { useEffect, useRef } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  ColorType,
  LineStyle,
} from 'lightweight-charts'

interface CandlestickChartProps {
  data: { date: Date; open: number; high: number; low: number; close: number }[]
  strikePrice: number | null
  height?: number
}

export function CandlestickChart({
  data,
  strikePrice,
  height = 300,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af', // gray-400 — works on both light and dark
      },
      grid: {
        vertLines: { color: 'rgba(156, 163, 175, 0.1)' },
        horzLines: { color: 'rgba(156, 163, 175, 0.1)' },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
      },
    })

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',      // green-500
      downColor: '#ef4444',    // red-500
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    })

    // Convert dates to lightweight-charts Time format (YYYY-MM-DD string)
    const chartData: CandlestickData<Time>[] = data.map((d) => ({
      time: d.date.toISOString().split('T')[0] as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    series.setData(chartData)

    // Strike price overlay — horizontal dashed line
    if (strikePrice !== null) {
      series.createPriceLine({
        price: strikePrice,
        color: '#f59e0b',      // amber-500
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Strike $${strikePrice}`,
      })
    }

    chart.timeScale().fitContent()
    chartRef.current = chart

    // Responsive resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        chart.applyOptions({ width })
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [data, strikePrice, height])

  if (data.length === 0) return null

  return <div ref={containerRef} className="w-full" />
}
```

Design decisions:
- **`'use client'`**: Required — `createChart` manipulates the DOM via Canvas.
- **`transparent` background**: Inherits the parent's background, working with both light and dark themes.
- **Green/red candles**: Standard financial convention. Colors match Tailwind's green-500/red-500.
- **Strike price as `createPriceLine`**: Built-in lightweight-charts feature — renders a labeled horizontal line on the price axis. Amber color distinguishes it from candles.
- **`ResizeObserver`**: Handles responsive width changes when the container resizes (e.g., window resize, sidebar toggle).
- **`fitContent()`**: Auto-zooms to show all 60 days of data.
- **Cleanup in `useEffect` return**: Removes chart and disconnects observer to prevent memory leaks.
- **Date conversion**: The `HistoricalPriceData.date` is a `Date` object; lightweight-charts expects `YYYY-MM-DD` strings for daily data.

---

## Phase D: UI Integration

**Depends on**: Phase B (price data available as prop) AND Phase C (chart component exists).

### D1. Render Chart in Expanded TickerRow

**File**: `app/scanner/scanner-client.tsx`

In the expanded row section (where the 3-column detail grid currently renders for passed candidates), add the candlestick chart **above** the existing grid:

```typescript
import { CandlestickChart } from '@/components/charts/candlestick-chart'

// Inside the expanded row render, for passed candidates:
{isExpanded && result.passed && priceHistory[result.ticker] && (
  <div className="px-4 pb-4">
    <CandlestickChart
      data={priceHistory[result.ticker]}
      strikePrice={result.strike}
    />
  </div>
)}
```

Key details:
- **Only for passed candidates**: Candidates that failed filtering don't have a strike price to overlay, and the chart is most useful for actionable results.
- **Guard on `priceHistory[result.ticker]`**: Gracefully handles missing data — no chart renders if the ticker somehow has no historical prices.
- **Full width of expanded row**: The chart's `w-full` class fills the available horizontal space.
- **300px default height**: Tall enough to show clear candle patterns without dominating the row.
- **Strike price from `result.strike`**: The selected put contract's strike price, already available on `ScanResultData`.

### D2. Pass priceHistory Through Component Tree

If the `ScannerClient` renders child components for individual ticker rows, ensure `priceHistory` is threaded down to wherever the expanded row content lives. The exact threading depends on the component structure — either pass the full `Record` and let each row look up its own ticker, or pass only the relevant array to each row component.

---

## Files Summary

### New Files

| Phase | File | Purpose |
|-------|------|---------|
| C | `components/charts/candlestick-chart.tsx` | `'use client'` candlestick chart using lightweight-charts with strike price overlay |

### Modified Files

| Phase | File | Change |
|-------|------|--------|
| A | `prisma/schema.prisma` | Add `HistoricalStockPrice` model |
| A | `lib/services/scanner.ts` | Persist 60 most recent OHLCV records after `fetchStockPriceHistory` (~line 567) |
| B | `lib/queries/scanner.ts` | Add `HistoricalPriceData` type + `getHistoricalPricesForTickers()` query |
| B | `app/scanner/page.tsx` | Fetch price history for passed tickers, pass as prop |
| B | `app/scanner/scanner-client.tsx` | Accept `priceHistory` prop, update `ScannerClientProps` |
| D | `app/scanner/scanner-client.tsx` | Import chart component, render in expanded row |

### New Dependencies

| Phase | Package | Purpose |
|-------|---------|---------|
| C | `lightweight-charts` | TradingView open-source charting library for candlestick rendering |

---

## Verification

### Phase A
- Migration runs successfully: `pnpm prisma migrate dev`
- Trigger a scan (manual or cron) — verify `HistoricalStockPrice` rows appear in the database
- Check row count: each scanned ticker should have up to 60 rows
- Re-run scan for same ticker — verify old rows are replaced (count stays at 60, dates update)
- Verify scan still completes normally — price persistence failure should not block scanning

### Phase B
- `getHistoricalPricesForTickers(['AAPL', 'MSFT'])` returns a Map with arrays of 60 records each
- Empty ticker array returns empty Map
- Ticker with no historical data returns empty Map (no crash)
- `/scanner` page loads without errors, `priceHistory` prop is populated

### Phase C
- `<CandlestickChart data={mockData} strikePrice={170} />` renders a canvas element
- Chart shows green candles for up days, red for down days
- Strike price line appears as a dashed amber horizontal line with label
- Chart resizes when window resizes
- `data={[]}` renders nothing (no empty chart frame)
- `strikePrice={null}` renders chart without the price line

### Phase D
- Click to expand a passed candidate row — candlestick chart appears above the detail grid
- Chart shows ~60 days of price action with the strike price overlaid
- Chart does not render for failed candidates
- Chart does not render for tickers without price history (graceful fallback)
- Existing expanded row content (3-column detail grid) is unaffected

# Nightly Wheel Strategy Options Scanner — PRD

**dispatched_by: mayor**
**Document Version:** 1.0
**Last Updated:** 2026-02-21
**Status:** Draft
**Strategy Reference:** `docs/wheel-scanner-strategy.md`

---

## Executive Summary

Build a nightly scanner that evaluates a user's curated watchlist against wheel strategy criteria and surfaces the top put-selling candidates. The scanner runs as a standalone cron container on Railway, stores results in the existing PostgreSQL database, and displays them on a new `/scanner` page in the app.

Key principles:
- **Full transparency**: Every ticker's journey through the filtering funnel is logged — we see exactly why each passed or failed at each phase
- **Low-risk focus**: Conservative defaults (20-25 delta, 30-45 DTE, quality stocks above 200-day SMA)
- **Existing patterns**: Reuses the app's Prisma models, server actions, design system, and Financial Data API integration

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Phase Dependency Map](#phase-dependency-map)
3. [Phase A: Database + Watchlist + Page Shell](#phase-a-database--watchlist--page-shell)
4. [Phase B: Options Data Service](#phase-b-options-data-service)
5. [Phase C: Scanner Logic](#phase-c-scanner-logic)
6. [Phase D: Cron Deployment + UI Polish](#phase-d-cron-deployment--ui-polish)
7. [Scan Report Format](#scan-report-format)
8. [Files Summary](#files-summary)
9. [Verification](#verification)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Railway Services                        │
│                                                            │
│  ┌──────────────┐    ┌──────────────────┐                 │
│  │  Web App      │    │  Scanner Cron     │                │
│  │  (Dockerfile) │    │  (Dockerfile.     │                │
│  │               │    │   scanner)        │                │
│  │  Next.js app  │    │  Node.js script   │                │
│  │  /scanner UI  │    │  Runs nightly     │                │
│  │               │    │  5 PM CT weekdays │                │
│  └──────┬───────┘    └────────┬─────────┘                 │
│         │                      │                           │
│         │    ┌─────────────┐   │                           │
│         └────┤ PostgreSQL  ├───┘                           │
│              │ (shared DB) │                                │
│              └──────┬──────┘                                │
│                     │                                      │
│              ┌──────┴──────┐                                │
│              │ Financial   │                                │
│              │ Data API    │                                │
│              │ (external)  │                                │
│              └─────────────┘                                │
└──────────────────────────────────────────────────────────┘
```

The scanner runs as a **separate Railway service** using its own Dockerfile. It shares the same `DATABASE_URL` and `FINANCIAL_DATA_API_KEY` as the web app. Railway's cron scheduling triggers it nightly after market close.

---

## Phase Dependency Map

```
Phase A: DB + Watchlist + Page Shell    Phase B: Options Data Service
         │                                        │
         │  (can run in PARALLEL)                  │
         │                                        │
         └──────────────┬─────────────────────────┘
                        │
                        ▼
              Phase C: Scanner Logic
              (DEPENDS ON both A and B)
                        │
                        ▼
              Phase D: Cron Deploy + UI Polish
              (DEPENDS ON C)
```

**Phase A** and **Phase B** have no dependencies on each other and can be built by separate developers simultaneously. Phase A creates the database models and UI shell; Phase B creates the API integration layer. Phase C brings them together with the scanning algorithm. Phase D wires it all up for production.

---

## Phase A: Database + Watchlist + Page Shell

### A1. Prisma Schema Changes

**File**: `prisma/schema.prisma`

Add two new models and update `User` relations.

**WatchlistTicker** — the user's curated list of tickers to scan:

```prisma
model WatchlistTicker {
  id        String   @id @default(cuid())
  userId    String
  ticker    String
  notes     String?
  addedAt   DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, ticker])
  @@index([userId])
}
```

**ScanResult** — one row per ticker per scan run, storing all data and every filtering decision:

```prisma
model ScanResult {
  id             String   @id @default(cuid())
  userId         String
  scanDate       DateTime // date of the scan run

  // Ticker identity
  ticker         String

  // Phase 1: Stock data (always populated)
  stockPrice     Decimal?  @db.Decimal(10, 2)
  sma200         Decimal?  @db.Decimal(10, 2)
  sma50          Decimal?  @db.Decimal(10, 2)
  avgVolume      Decimal?  @db.Decimal(15, 0)
  trendDirection String?   // "rising", "flat", "falling"

  // Phase 1 filter result
  passedPhase1   Boolean   @default(false)
  phase1Reason   String?   // null if passed, or "price_too_low", "below_sma200", etc.

  // Phase 2: IV data (populated if passed Phase 1)
  currentIV      Decimal?  @db.Decimal(8, 6)
  ivHigh52w      Decimal?  @db.Decimal(8, 6)
  ivLow52w       Decimal?  @db.Decimal(8, 6)
  ivRank         Decimal?  @db.Decimal(6, 2) // 0-100

  // Phase 2 filter result
  passedPhase2   Boolean   @default(false)
  phase2Reason   String?

  // Phase 3: Selected option contract (populated if passed Phase 2)
  contractName   String?
  strike         Decimal?  @db.Decimal(10, 2)
  expiration     DateTime?
  dte            Int?
  delta          Decimal?  @db.Decimal(8, 6)
  theta          Decimal?  @db.Decimal(8, 6)
  bid            Decimal?  @db.Decimal(10, 4)
  ask            Decimal?  @db.Decimal(10, 4)
  iv             Decimal?  @db.Decimal(8, 6)
  openInterest   Int?
  optionVolume   Int?
  premiumYield   Decimal?  @db.Decimal(8, 2) // annualized %

  // Phase 3 filter result
  passedPhase3   Boolean   @default(false)
  phase3Reason   String?

  // Phase 4: Scores (populated if passed Phase 3)
  yieldScore     Decimal?  @db.Decimal(6, 2)
  ivScore        Decimal?  @db.Decimal(6, 2)
  deltaScore     Decimal?  @db.Decimal(6, 2)
  liquidityScore Decimal?  @db.Decimal(6, 2)
  trendScore     Decimal?  @db.Decimal(6, 2)
  compositeScore Decimal?  @db.Decimal(6, 2) // 0-100

  // Phase 5: Portfolio checks
  hasOpenCSP     Boolean   @default(false)
  hasAssignedPos Boolean   @default(false)
  portfolioFlag  String?   // "existing_csp", "assigned_position", null

  // Overall
  passed         Boolean   @default(false) // passed all phases
  finalReason    String?   // summary of why it failed, or null if passed

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, scanDate])
  @@index([userId, scanDate, passed])
  @@index([scanDate])
  @@index([compositeScore])
}
```

Add to User model:
```prisma
  watchlistTickers WatchlistTicker[]
  scanResults      ScanResult[]
```

Run: `pnpm prisma migrate dev --name add_watchlist_and_scan_results`

### A2. Zod Validation Schemas

**New file**: `lib/validations/watchlist.ts`

```typescript
import { z } from 'zod'

export const AddWatchlistTickerSchema = z.object({
  ticker: z.string()
    .min(1, 'Ticker is required')
    .max(5, 'Max 5 characters')
    .transform(v => v.toUpperCase())
    .refine(v => /^[A-Z]+$/.test(v), 'Letters only'),
  notes: z.string().max(500).optional(),
})

export const RemoveWatchlistTickerSchema = z.object({
  id: z.string().cuid(),
})
```

### A3. Server Actions

**New file**: `lib/actions/watchlist.ts`

Follow the pattern from `lib/actions/trades.ts` (`'use server'`, `auth()`, `ActionResult<T>`, `revalidatePath`).

Functions:
- `addWatchlistTicker(input)` — validate, check dups, create, revalidatePath('/scanner')
- `removeWatchlistTicker(input)` — verify ownership, delete, revalidatePath('/scanner')
- `getWatchlistTickers()` — return all for current user, ordered by addedAt desc

### A4. Scanner Queries

**New file**: `lib/queries/scanner.ts`

- `getLatestScanResults()` — most recent scanDate's results, ordered by compositeScore desc. Returns ALL results (passed and failed) so the UI can show the full funnel.
- `getScanMetadata()` — last scan date, total tickers scanned, total passed each phase, total final candidates

### A5. Scanner Page Shell

**New file**: `app/scanner/page.tsx` — Server component (auth, fetch watchlist + results + metadata, pass to client).

**New file**: `app/scanner/scanner-client.tsx` — Client component with three sections:
1. Scan metadata header
2. Results area (placeholder until Phase D polishes it)
3. Watchlist management (add input + list with remove)

**New file**: `app/scanner/loading.tsx` — Skeleton state.

### A6. Navigation

**Modify**: `app/layout.tsx` — Add Scanner link between Deposits and Help.
**Modify**: `components/mobile-nav.tsx` — Add `{ href: '/scanner', label: 'Scanner' }` to links array.

---

## Phase B: Options Data Service

### B1. Extract Shared Rate Limiter

The `RateLimiter` class in `lib/services/market-data.ts` is a module-level singleton. Since the options API shares the same rate limit (10 req/min for the same API key), both services must share the same limiter instance.

**New file**: `lib/services/rate-limiter.ts`
- Move the `RateLimiter` class from market-data.ts
- Export singleton: `export const apiRateLimiter = new RateLimiter()`
- Export the class for testing

**Modify**: `lib/services/market-data.ts`
- Import `apiRateLimiter` from `./rate-limiter`
- Delete the local `RateLimiter` class and `rateLimiter` instance
- Replace all `rateLimiter.enqueue(...)` with `apiRateLimiter.enqueue(...)`
- No behavior change — existing tests should still pass

### B2. Options Data Service

**New file**: `lib/services/options-data.ts`

All functions use `apiRateLimiter` from `./rate-limiter`.

**Important**: The exact response format of the option endpoints has NOT been tested. Each function should include a validation step that logs the raw response on first use so we can verify the schema. The interfaces below are best guesses based on the API documentation — they may need adjustment.

```typescript
// === API Response Types (validate against actual API) ===

interface OptionChainRecord {
  identifier: string    // contract name, e.g., "AAPL250321P00170000"
  strike: number
  expiration: string    // "YYYY-MM-DD"
  type: string          // "put" or "call"
}

interface OptionPriceRecord {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  openInterest?: number  // may or may not be in this endpoint
}

interface OptionGreeksRecord {
  date: string
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
  impliedVolatility: number  // field name TBD — could be "iv" or "implied_volatility"
}
```

Functions:

- **`fetchStockPriceHistory(ticker): Promise<StockPriceHistoryResult>`**
  Calls `/api/v1/stock-prices?identifier={ticker}`. Unlike the existing `fetchFromFinancialData` which returns only the latest close, this returns the full array (~200+ daily records) for SMA calculation.

- **`fetchOptionChain(ticker): Promise<OptionChainResult>`**
  Calls `/api/v1/option-chain?identifier={ticker}`. Returns all available contracts. Caller filters to puts and target DTE range.

- **`fetchOptionGreeks(contractName): Promise<OptionGreeksResult>`**
  Calls `/api/v1/option-greeks?identifier={contractName}`. Returns historical greeks for a specific contract.

- **`fetchOptionPrices(contractName): Promise<OptionPriceResult>`**
  Calls `/api/v1/option-prices?identifier={contractName}`. Returns historical OHLCV + OI for a specific contract.

Error handling follows the existing pattern in `fetchFromFinancialData` (handle 401/404/429, return `{success, error?}` result types).

### B3. Tests

**New file**: `lib/services/options-data.test.ts`
Mock fetch, test success + error cases for each function. Follow `market-data.test.ts` patterns.

---

## Phase C: Scanner Logic

**Depends on**: Phase A (for database models) AND Phase B (for data fetching functions).

### C1. Scanner Constants

**New file**: `lib/services/scanner-constants.ts`

Centralized thresholds from `docs/wheel-scanner-strategy.md`:

```typescript
export const SCANNER = {
  // Phase 1: Stock filters
  MIN_PRICE: 20,
  MAX_PRICE: 150,
  MIN_AVG_VOLUME: 1_000_000,
  SMA_PERIOD: 200,
  SMA_SHORT_PERIOD: 50,
  SMA_TREND_LOOKBACK: 20,  // days to check if SMA is rising

  // Phase 2: IV screen
  MIN_IV_RANK: 20,

  // Phase 3: Option selection
  TARGET_MIN_DTE: 30,
  TARGET_MAX_DTE: 45,
  TARGET_MIN_DELTA: -0.30,
  TARGET_MAX_DELTA: -0.20,
  DELTA_SWEET_SPOT: { min: -0.25, max: -0.22 },
  MIN_PREMIUM_YIELD: 8,   // annualized %
  MIN_OPEN_INTEREST: 100,
  MAX_SPREAD_PCT: 0.10,   // 10% of mid-price

  // Phase 4: Scoring
  WEIGHTS: { yield: 0.30, iv: 0.25, delta: 0.15, liquidity: 0.15, trend: 0.15 },
  YIELD_RANGE: { min: 8, max: 24 },      // for 0-100 scoring
  IV_RANK_RANGE: { min: 20, max: 70 },
  MAX_TREND_DISTANCE_PCT: 20,
  PREFERRED_OI: 500,
} as const
```

### C2. Scanner Service

**New file**: `lib/services/scanner.ts`

#### Pure Calculation Helpers (unit-testable, no side effects)

- `computeSMA(closes: number[], period: number): number`
- `computeIVRank(currentIV: number, lowIV: number, highIV: number): number` — clamped 0-100
- `computePremiumYield(bid: number, strike: number, dte: number): number` — annualized %
- `linearScore(value: number, min: number, max: number): number` — generic 0-100 linear scaler
- `computeDeltaScore(delta: number): number` — 100 at sweet spot, scales down
- `computeLiquidityScore(oi: number, bid: number, ask: number): number` — OI + spread tightness
- `computeTrendScore(price: number, sma200: number): number` — % above SMA, capped

#### `scanTicker(ticker, config)` — Single Ticker Pipeline

Runs the 5-phase funnel. Returns a partial `ScanResult` object with all fields populated up to the phase where the ticker was filtered out.

**Phase 1 — Stock Filter:**
1. Call `fetchStockPriceHistory(ticker)` → get ~200 daily closes
2. Compute 200-day SMA and 50-day SMA
3. Check: stockPrice between MIN_PRICE and MAX_PRICE → if fail, set `passedPhase1=false`, `phase1Reason="price_out_of_range: $X"`, return early
4. Check: stockPrice > sma200 → if fail, `phase1Reason="below_sma200: price=$X, sma=$Y"`, return early
5. Check: SMA is rising (current SMA > SMA from 20 days ago) → if fail, `phase1Reason="sma200_declining"`, return early
6. Check: avg volume > MIN_AVG_VOLUME → if fail, `phase1Reason="low_volume: X"`, return early
7. Set `passedPhase1=true`

**Phase 2 — IV Screen:**
1. Call `fetchOptionChain(ticker)` → get all put contracts
2. Filter to contracts in TARGET_MIN_DTE to TARGET_MAX_DTE window
3. If no contracts in window, try nearest monthly (prefer longer) → if still none, `passedPhase2=false`, `phase2Reason="no_options_in_dte_window"`, return
4. Identify ATM put (strike closest to stock price)
5. Call `fetchOptionGreeks(atmContract)` → get IV history
6. Compute IV Rank from available history (use min/max IV from returned records as 52-week approximation)
7. Check: ivRank >= MIN_IV_RANK → if fail, `phase2Reason="iv_rank_too_low: X"`, return
8. Set `passedPhase2=true`

**Phase 3 — Option Selection:**
1. From put contracts in DTE window, fetch greeks for strikes near the target delta range
2. Select the contract with delta closest to the sweet spot (-0.22 to -0.25)
3. If no contracts have delta in TARGET_MIN_DELTA to TARGET_MAX_DELTA range → `passedPhase3=false`, `phase3Reason="no_contracts_in_delta_range"`, return
4. Call `fetchOptionPrices(selectedContract)` → get bid/ask/OI
5. Compute premium yield: `(bid / strike) * (365 / dte) * 100`
6. Check: premiumYield >= MIN_PREMIUM_YIELD → if fail, `phase3Reason="premium_yield_too_low: X%"`, return
7. Check: openInterest >= MIN_OPEN_INTEREST → if fail, `phase3Reason="low_open_interest: X"`, return
8. Check: spread <= MAX_SPREAD_PCT of mid → if fail, `phase3Reason="spread_too_wide: X%"`, return
9. Set `passedPhase3=true`

**Phase 4 — Scoring:**
1. Compute each component score (yield, IV, delta, liquidity, trend)
2. Compute weighted composite score
3. All scores are stored in the result

**Phase 5 — Portfolio Checks:**
1. Query Trade table: any open PUT with SELL_TO_OPEN for this ticker → set `hasOpenCSP`
2. Query Position table: any open position for this ticker → set `hasAssignedPos`
3. Set `portfolioFlag` if either is true
4. Set `passed=true` (portfolio flags are warnings, not hard filters)

#### `runFullScan(userId, config?)` — Orchestrator

1. Fetch user's watchlist from `WatchlistTicker`
2. Delete previous scan results for this user (keep only latest scan)
3. For each ticker (sequential — rate limiter handles timing):
   a. Call `scanTicker(ticker, config)`
   b. Run portfolio checks
   c. Save `ScanResult` row to database
4. Return summary: `{ totalScanned, passedPhase1, passedPhase2, passedPhase3, totalPassed, topScore, scanDate }`

### C3. Tests

**New file**: `lib/services/scanner.test.ts`
- Unit tests for every pure calculation function with known inputs/outputs
- Unit tests for phase filter logic with mock data
- Integration test for `scanTicker` with mocked API responses

---

## Phase D: Cron Deployment + UI Polish

**Depends on**: Phase C.

### D1. Scanner Entry Point Script

**New file**: `scripts/run-scanner.ts`

Standalone Node.js script that:
1. Initializes Prisma client
2. Finds all users with watchlist tickers
3. Calls `runFullScan(userId)` for each user
4. Logs results summary
5. Exits cleanly

```typescript
import { prisma } from '../lib/db'
import { runFullScan } from '../lib/services/scanner'

async function main() {
  console.log('[SCANNER] Starting nightly scan at', new Date().toISOString())

  const users = await prisma.watchlistTicker.findMany({
    select: { userId: true },
    distinct: ['userId'],
  })

  if (users.length === 0) {
    console.log('[SCANNER] No users with watchlists, exiting')
    process.exit(0)
  }

  for (const { userId } of users) {
    console.log(`[SCANNER] Scanning for user ${userId}`)
    const result = await runFullScan(userId)
    console.log(`[SCANNER] User ${userId}: ${result.totalScanned} scanned, ${result.totalPassed} candidates`)
  }

  console.log('[SCANNER] Scan complete')
  await prisma.$disconnect()
  process.exit(0)
}

main().catch((err) => {
  console.error('[SCANNER] Fatal error:', err)
  process.exit(1)
})
```

### D2. Scanner Dockerfile

**New file**: `Dockerfile.scanner`

Lightweight container that builds the TypeScript, then runs the scanner script on a cron.

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
# Compile TypeScript for the scanner script
RUN pnpm tsc --project tsconfig.scanner.json

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.6.5 --activate
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
RUN pnpm add -P prisma@7.3.0 @prisma/client@7.3.0
COPY --from=builder /app/prisma ./prisma
RUN pnpm prisma generate
COPY --from=builder /app/dist/scanner ./dist/scanner

CMD ["node", "dist/scanner/scripts/run-scanner.js"]
```

### D3. Scanner tsconfig

**New file**: `tsconfig.scanner.json`

A minimal tsconfig that compiles only the scanner script and its dependencies to `dist/scanner/`.

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist/scanner",
    "noEmit": false
  },
  "include": [
    "scripts/run-scanner.ts",
    "lib/services/scanner.ts",
    "lib/services/scanner-constants.ts",
    "lib/services/options-data.ts",
    "lib/services/rate-limiter.ts",
    "lib/services/market-data.ts",
    "lib/db/index.ts",
    "lib/generated/**/*"
  ]
}
```

### D4. Railway Cron Configuration

**New file**: `railway.scanner.json`

Railway supports cron services via their dashboard. The config for this service:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "dockerfile",
    "dockerfilePath": "Dockerfile.scanner"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "NEVER",
    "cronSchedule": "0 22 * * 1-5"
  }
}
```

Schedule: `0 22 * * 1-5` = 10 PM UTC = 5 PM CT, Monday-Friday (after market close).

**Environment variables** (shared with web app): `DATABASE_URL`, `FINANCIAL_DATA_API_KEY`.

### D5. Manual Scan Trigger

Add to `lib/actions/watchlist.ts`:

```typescript
export async function triggerManualScan(): Promise<ActionResult<ScanSummary>> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: 'Unauthorized' }
  const result = await runFullScan(userId)
  revalidatePath('/scanner')
  return { success: true, data: result }
}
```

Add a "Run Scan" button in the scanner UI with loading state (scan takes ~12-18 min for 30 tickers, so show a progress indicator).

### D6. Enhanced Scanner Client UI

Update `app/scanner/scanner-client.tsx` with full results display:

**Summary cards row**: Last Scan time, Tickers Scanned, Candidates Found, Top Score

**Funnel visualization**: Show how many tickers passed each phase:
```
30 watchlist tickers
  → 22 passed Phase 1 (stock filters)
    → 14 passed Phase 2 (IV screen)
      → 8 passed Phase 3 (option selection)
        → 8 scored and ranked
          → 3 actionable (no portfolio conflicts)
```

**Results table** (passed candidates):
Columns: Ticker, Price, Strike, Exp, DTE, Delta, Bid/Ask, IV Rank, Yield%, OI, Score
- Sortable by composite score (default), premium yield, IV rank
- Badge color: green (score > 70), yellow (40-70), neutral (< 40)
- Portfolio conflict badges (has open CSP, has assigned shares)
- Click row to expand: shows all component scores, phase-by-phase data

**Filtered tickers section** (collapsible):
Shows every ticker that was filtered out, grouped by phase, with the specific reason:
- Phase 1 rejections: "TSLA: price_out_of_range ($182.50 > $150)"
- Phase 2 rejections: "KO: iv_rank_too_low (14.2)"
- Phase 3 rejections: "MSFT: premium_yield_too_low (6.8%)"

This transparency lets the user understand and tune their watchlist.

**Watchlist section**:
- Input to add ticker + optional notes
- Current watchlist as removable chips/tags
- Count indicator: "12 / 50 tickers" (soft limit suggestion)

---

## Scan Report Format

Each scan run produces a complete report stored across ScanResult rows. Here is the logical structure of what's captured per ticker:

```
TICKER: AAPL
─────────────────────────────────────────────
Phase 1: Stock Filter                 ✅ PASSED
  Stock Price:    $178.50
  200-day SMA:    $165.20 (price is 8.1% above)
  50-day SMA:     $172.30
  SMA Trend:      Rising (was $163.80 twenty days ago)
  Avg Volume:     52.3M shares/day

Phase 2: IV Screen                    ✅ PASSED
  Current IV:     0.2850 (28.5%)
  52-week High:   0.4200
  52-week Low:    0.1800
  IV Rank:        44.2

Phase 3: Option Selection             ✅ PASSED
  Contract:       AAPL250321P00170000
  Strike:         $170.00
  Expiration:     2025-03-21
  DTE:            35
  Delta:          -0.2280
  Bid/Ask:        $2.15 / $2.25
  Spread:         4.5% of mid
  Open Interest:  2,847
  Premium Yield:  15.2% annualized

Phase 4: Scoring
  Yield Score:    45.0 (weight: 30%)
  IV Score:       48.4 (weight: 25%)
  Delta Score:    96.0 (weight: 15%)  ← near sweet spot
  Liquidity:      85.0 (weight: 15%)
  Trend Score:    40.5 (weight: 15%)
  ─────────────────────────────────
  Composite:      54.8

Phase 5: Portfolio Check
  Existing CSP:   No
  Assigned Pos:   No
  Flag:           None

RESULT: ✅ CANDIDATE (Score: 54.8)
```

For a filtered ticker:
```
TICKER: RIVN
─────────────────────────────────────────────
Phase 1: Stock Filter                 ❌ FAILED
  Stock Price:    $14.20
  Reason:         price_out_of_range ($14.20 < $20 minimum)

RESULT: ❌ FILTERED (Phase 1: price_out_of_range)
```

---

## Files Summary

### New Files

| Phase | File | Purpose |
|-------|------|---------|
| A | `lib/validations/watchlist.ts` | Zod schemas for watchlist CRUD |
| A | `lib/actions/watchlist.ts` | Server actions: add/remove/get watchlist, manual scan trigger |
| A | `lib/queries/scanner.ts` | Queries for scan results and metadata |
| A | `app/scanner/page.tsx` | Scanner page server component |
| A | `app/scanner/scanner-client.tsx` | Scanner page client component |
| A | `app/scanner/loading.tsx` | Loading skeleton |
| B | `lib/services/rate-limiter.ts` | Extracted shared RateLimiter |
| B | `lib/services/options-data.ts` | Option chain/prices/greeks API calls |
| B | `lib/services/options-data.test.ts` | Tests for options data service |
| C | `lib/services/scanner-constants.ts` | All thresholds and weights |
| C | `lib/services/scanner.ts` | Core scanning logic |
| C | `lib/services/scanner.test.ts` | Scanner calculation + integration tests |
| D | `scripts/run-scanner.ts` | Standalone scanner entry point |
| D | `Dockerfile.scanner` | Docker image for scanner cron service |
| D | `tsconfig.scanner.json` | TypeScript config for scanner build |
| D | `railway.scanner.json` | Railway cron service config |

### Modified Files

| Phase | File | Change |
|-------|------|--------|
| A | `prisma/schema.prisma` | Add WatchlistTicker + ScanResult models, User relations |
| A | `app/layout.tsx` | Add Scanner nav link |
| A | `components/mobile-nav.tsx` | Add Scanner to mobile links |
| B | `lib/services/market-data.ts` | Import shared rate limiter (no behavior change) |

---

## Verification

### Phase A
- Run migration successfully
- Visit `/scanner` — page loads with empty state
- Add a ticker to watchlist — appears in list
- Remove a ticker — disappears from list
- Add duplicate ticker — shows validation error
- Check nav: Scanner link visible in desktop and mobile nav

### Phase B
- Write a test script that calls `fetchOptionChain('AAPL')` and logs the raw response — validate our type assumptions against actual API
- Run `pnpm test` — options-data tests pass
- Verify existing market-data tests still pass after rate limiter extraction

### Phase C
- Run `pnpm test` — all scanner calculation tests pass
- Test `scanTicker` with a real ticker manually — verify each phase produces expected data
- Verify filtered tickers have correct failReason strings

### Phase D
- Build scanner Docker image: `docker build -f Dockerfile.scanner -t scanner .`
- Run locally: `docker run --env-file .env.local scanner` — verify it connects to DB and runs scan
- Trigger manual scan from UI — verify results populate the table
- Verify funnel visualization shows correct counts
- Verify filtered tickers section shows reasons
- Deploy to Railway as cron service — verify it runs on schedule

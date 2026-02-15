# Stock Price API Migration: Alpha Vantage to FinancialData.net

**dispatched_by: mayor**

## Executive Summary

This PRD covers the migration of GreekWheel's stock price data provider from Alpha Vantage to [FinancialData.net](https://financialdata.net). The primary endpoint we'll use is `/api/v1/stock-prices?identifier=<ticker>`, which is on their **Free tier**. The migration is scoped to the market data service layer, the cron job, the refresh API route, and their associated tests. The public `StockPriceResult` interface and database schema remain unchanged, so no downstream UI or query changes are required.

**Document Version:** 1.0
**Last Updated:** 2026-02-15
**Status:** Draft

---

## Table of Contents

1. [Background & Motivation](#background--motivation)
2. [FinancialData.net API Overview](#financialdatanet-api-overview)
3. [Architecture & Impact Analysis](#architecture--impact-analysis)
4. [Implementation Plan](#implementation-plan)
5. [Testing Strategy](#testing-strategy)
6. [Rollout & Rollback Plan](#rollout--rollback-plan)
7. [Future Opportunities](#future-opportunities)

---

## Background & Motivation

### Why We're Switching

Alpha Vantage has served us well, but it has meaningful operational friction:

| Pain Point | Detail |
|-----------|--------|
| **Aggressive rate limits** | 5 requests/minute, 500/day on the free tier. Our `RateLimiter` class enforces a 12-second minimum interval between requests, which means refreshing 10 tickers takes ~2 minutes. |
| **Unreliable response shapes** | Alpha Vantage returns three different top-level JSON shapes for the same endpoint: a `Global Quote` object on success, an `Error Message` string on invalid tickers, and a `Note` string when rate-limited. Our code has to branch on all three. |
| **Stale "latest trading day"** | The `GLOBAL_QUOTE` endpoint returns the last trading day's close, not an intraday price. For a tool that wants to show "current price," this is misleading during market hours. |
| **Cost at scale** | If we outgrow the free tier, Alpha Vantage Premium starts at $49.99/month for 75 requests/minute. |

### Why FinancialData.net

| Factor | Alpha Vantage | FinancialData.net |
|--------|--------------|-------------------|
| **Stock prices endpoint** | Free (5 req/min, 500/day) | Free tier (rate limits TBD per plan) |
| **Response format** | Nested, awkwardly-keyed JSON (`'05. price'`) | Flat JSON array with standard field names (`close`, `open`, `high`, `low`, `volume`, `date`) |
| **Authentication** | Query param `apikey=` | Query param `key=` |
| **Historical data** | Separate endpoint (`TIME_SERIES_DAILY`) | Same endpoint returns historical daily prices |
| **Options data** | Not available | Option chain, option prices, option Greeks (Standard tier) |
| **Batch support** | One ticker per request | One ticker per request (same) |

The key win is a cleaner API surface, a standard response shape, and access to options data endpoints if we ever want to show live Greeks or option chains.

---

## FinancialData.net API Overview

### Authentication

API key passed as a query parameter:

```
https://financialdata.net/api/v1/stock-prices?identifier=AAPL&key=YOUR_API_KEY
```

The API key will be read from the environment variable `FINANCIAL_DATA_API_KEY`.

### Primary Endpoint: Stock Prices

```
GET https://financialdata.net/api/v1/stock-prices?identifier={TICKER}&key={API_KEY}
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `identifier` | string | Yes | Stock ticker symbol (e.g., `AAPL`, `MSFT`, `SPY`) |
| `key` | string | Yes | API key |
| `offset` | integer | No | Pagination offset (default 0) |
| `format` | string | No | `json` (default) or `csv` |

**Response format:** JSON array of daily price records, most recent first.

```json
[
  {
    "date": "2026-02-14",
    "open": 152.30,
    "high": 154.10,
    "low": 151.85,
    "close": 153.45,
    "volume": 48293847
  },
  {
    "date": "2026-02-13",
    "open": 151.00,
    "high": 153.00,
    "low": 150.50,
    "close": 152.30,
    "volume": 52184723
  }
]
```

**What we use:** The `close` price from the first element (most recent trading day) and the `date` field for staleness tracking. This matches our current behavior with Alpha Vantage's `'05. price'` and `'07. latest trading day'`.

### Error Handling

| Scenario | Expected Response |
|----------|------------------|
| Invalid API key | HTTP 401 |
| Invalid/unknown ticker | Empty array `[]` or HTTP 404 |
| Rate limited | HTTP 429 |
| Server error | HTTP 5xx |

This is a significant improvement over Alpha Vantage, which returns HTTP 200 for all of the above and encodes errors in the JSON body.

### Other Useful Endpoints (Not In Scope)

These are available on FinancialData.net if we want them later:

| Endpoint | Tier | Potential Use |
|----------|------|---------------|
| `/stock-quotes` | Premium | Real-time quotes with change/percentage |
| `/option-chain` | Standard | Display option chain for a ticker |
| `/option-greeks` | Standard | Show live Greeks for tracked options |
| `/latest-prices` | Premium | Intraday prices (current week) |
| `/key-metrics` | Standard | P/E ratio, beta, EPS for position analysis |

---

## Architecture & Impact Analysis

### Current Data Flow

```
Alpha Vantage API  ──→  fetchFromAlphaVantage()  ──→  saveStockPrice()  ──→  PostgreSQL (StockPrice)
                           ↑                                                      ↓
                     RateLimiter                                          getLatestPrice(s)
                     (5 req/min)                                                  ↓
                                                                          Server Actions
                                                                          (prices.ts)
                                                                                  ↓
                                                                          UI Components
```

### What Changes

| Layer | File | Change Scope |
|-------|------|-------------|
| **Environment** | `.env`, `.env.example` | Replace `ALPHA_VANTAGE_API_KEY` with `FINANCIAL_DATA_API_KEY` |
| **Service layer** | `lib/services/market-data.ts` | Replace `fetchFromAlphaVantage()` with `fetchFromFinancialData()`. Update response types. Update `validateApiKey()`. Update `saveStockPrice()` source string. Revise `RateLimiter` settings (see below). |
| **Cron route** | `app/api/cron/update-prices/route.ts` | No code changes needed. Calls `batchFetchPrices()` which delegates to the service layer. |
| **Refresh route** | `app/api/market-data/refresh/route.ts` | No code changes needed. Same delegation pattern. |
| **Stock price action** | `lib/actions/stock-price.ts` | No code changes needed. Calls `fetchStockPrice()` from market-data service. |
| **Price actions** | `lib/actions/prices.ts` | No code changes needed. Reads from database via `getLatestPrice(s)`. |
| **Database schema** | `prisma/schema.prisma` | Update `StockPrice.source` default from `"alpha_vantage"` to `"financial_data"`. Optional, non-breaking. |
| **Tests** | `lib/services/market-data.test.ts` | Update mocked API responses to match FinancialData.net format. |
| **Tests** | `app/api/cron/update-prices/route.test.ts` | May need minor mock adjustments if they mock the fetch layer directly. |
| **Tests** | `app/api/market-data/__tests__/refresh.test.ts` | Same as above. |
| **Market utils** | `lib/utils/market.ts` | No changes. Market hours logic is provider-agnostic. |
| **UI components** | All components | **No changes.** They consume `StockPriceResult` from the database, not the API directly. |
| **Queries** | `lib/queries/dashboard.ts` | No changes. Uses `getLatestPrice()` which reads from DB. |

### What Does NOT Change

The migration boundary is clean because the `StockPriceResult` interface is the contract between the API fetch layer and everything downstream:

```typescript
export interface StockPriceResult {
  ticker: string
  price: number
  date: Date
  success: boolean
  error?: string
}
```

This interface stays exactly the same. Every consumer of stock prices (server actions, UI components, dashboard queries) operates on this type. Only the function that _populates_ this type changes.

### Rate Limiter Adjustments

FinancialData.net's rate limits will depend on the plan tier. Until we know the exact limits, we should:

1. Keep the `RateLimiter` class but make it configurable
2. Start with conservative defaults (e.g., 10 requests/minute, 100ms minimum interval)
3. Monitor for HTTP 429 responses and adjust
4. If FinancialData.net is more permissive than Alpha Vantage, we can relax the limiter for faster batch refreshes

---

## Implementation Plan

### Convoy 1: Service Layer Swap (Core Change)

**Owner:** 1 polecat (backend)
**Estimated effort:** Half a day

This is the only convoy that touches production logic. All other convoys are configuration or tests.

**Files modified:**
- `lib/services/market-data.ts`

**Tasks:**

- [ ] Define `FinancialDataPriceRecord` interface matching the API response shape:
  ```typescript
  interface FinancialDataPriceRecord {
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
  }
  ```
- [ ] Replace `fetchFromAlphaVantage()` with `fetchFromFinancialData()`:
  - URL: `https://financialdata.net/api/v1/stock-prices?identifier=${ticker}&key=${apiKey}`
  - Parse `close` from first array element as the price
  - Parse `date` from first array element as the price date
  - Handle HTTP error codes (401, 404, 429, 5xx) instead of parsing JSON error shapes
  - Handle empty array response (invalid ticker)
  - Return the same `StockPriceResult` shape
- [ ] Update `validateApiKey()` to check `FINANCIAL_DATA_API_KEY` instead of `ALPHA_VANTAGE_API_KEY`
- [ ] Update `saveStockPrice()` to set source to `'financial_data'` on new records
- [ ] Remove `AlphaVantageQuote`, `AlphaVantageError`, and `AlphaVantageNote` interfaces
- [ ] Update `RateLimiter` defaults: increase `maxRequestsPerMinute` to 10, reduce `minIntervalMs` to 6000 (adjust based on plan docs)

**Key design decision:** The function signature and return type of `fetchStockPrice()` and `batchFetchPrices()` must not change. They are the public API of this module.

### Convoy 2: Environment & Configuration

**Owner:** 1 polecat (any)
**Estimated effort:** 15 minutes

**Files modified:**
- `.env.example`
- `.env` (local)
- Deployment environment (Vercel dashboard or equivalent)

**Tasks:**

- [ ] Add `FINANCIAL_DATA_API_KEY` to `.env.example` with descriptive comment
- [ ] Remove `ALPHA_VANTAGE_API_KEY` from `.env.example`
- [ ] Set `FINANCIAL_DATA_API_KEY` in local `.env` with a real key
- [ ] Set `FINANCIAL_DATA_API_KEY` in production deployment environment
- [ ] Remove `ALPHA_VANTAGE_API_KEY` from production after cutover is verified

### Convoy 3: Schema Source Default (Optional)

**Owner:** 1 polecat (backend)
**Estimated effort:** 15 minutes

**Files modified:**
- `prisma/schema.prisma`

**Tasks:**

- [ ] Update `StockPrice.source` default from `"alpha_vantage"` to `"financial_data"`
- [ ] Run `npx prisma generate` to regenerate the client
- [ ] Note: existing rows with `source: "alpha_vantage"` can stay as-is. They'll be overwritten on next upsert with the new source value. No migration needed.

### Convoy 4: Test Updates

**Owner:** 1 polecat (backend)
**Estimated effort:** Half a day

**Files modified:**
- `lib/services/market-data.test.ts`
- `app/api/cron/update-prices/route.test.ts`
- `app/api/market-data/__tests__/refresh.test.ts`

**Tasks:**

- [ ] Update `market-data.test.ts`:
  - Replace Alpha Vantage mock responses with FinancialData.net format (JSON array of price records)
  - Update error case mocks to use HTTP status codes instead of JSON error bodies
  - Add test: successful response parses `close` and `date` from first element
  - Add test: empty array response returns `success: false` with appropriate error
  - Add test: HTTP 401 response returns `success: false` with auth error message
  - Add test: HTTP 429 response returns `success: false` with rate limit error message
  - Verify `StockPriceResult` output shape is unchanged
- [ ] Update `route.test.ts` (cron):
  - Adjust any mocks that reference Alpha Vantage response shapes
  - Verify cron flow still exercises the same `batchFetchPrices` path
- [ ] Update `refresh.test.ts`:
  - Adjust any mocks that reference Alpha Vantage response shapes
  - Verify refresh flow still works end-to-end with new mocks
- [ ] Run full test suite and confirm 0 failures

### Convoy 5: Verification & Cleanup

**Owner:** 1 polecat (any)
**Estimated effort:** 1 hour

**Tasks:**

- [ ] Run `pnpm type-check` and confirm 0 errors
- [ ] Run `pnpm test` and confirm 0 failures (excluding DB integration tests)
- [ ] Manually test price refresh with 3-5 tickers (AAPL, MSFT, SPY, TSLA, NVDA)
- [ ] Verify prices appear correctly in the trades list and position cards
- [ ] Verify the cron health check endpoint returns OK
- [ ] Trigger a manual cron run and verify prices update
- [ ] Grep the codebase for any remaining references to `alpha_vantage` or `ALPHA_VANTAGE` and remove them
- [ ] Verify no references to `alphavantage.co` remain in source code

---

## Testing Strategy

### Unit Tests (Convoy 4)

The test changes mirror the production changes exactly. Since only `fetchFromFinancialData()` (formerly `fetchFromAlphaVantage()`) is changing, tests that mock at the `fetchStockPrice` or `batchFetchPrices` level should not need changes. Tests that mock at the `fetch()` level (global fetch mock) will need their response fixtures updated.

**Test matrix for `fetchFromFinancialData()`:**

| Scenario | Input | Expected `StockPriceResult` |
|----------|-------|-----------------------------|
| Happy path | Valid ticker, API returns price array | `{ ticker: "AAPL", price: 153.45, date: 2026-02-14, success: true }` |
| Empty array | Unknown ticker, API returns `[]` | `{ ticker: "XYZ", price: 0, success: false, error: "No data..." }` |
| HTTP 401 | Invalid API key | `{ success: false, error: "...unauthorized..." }` |
| HTTP 429 | Rate limited | `{ success: false, error: "...rate limit..." }` |
| HTTP 500 | Server error | `{ success: false, error: "...server error..." }` |
| Network error | Fetch throws | `{ success: false, error: "Failed to fetch..." }` |
| Malformed JSON | Invalid response body | `{ success: false, error: "..." }` |
| Price is zero | API returns `close: 0` | `{ price: 0, success: false, error: "Invalid price..." }` |

### Integration Smoke Test (Convoy 5)

After deployment, manually hit the refresh endpoint with a real API key and verify prices populate in the database and render in the UI. This is a sanity check, not automated.

---

## Rollout & Rollback Plan

### Rollout

1. **Development:** Complete Convoys 1-4 on a feature branch. All tests green.
2. **Staging/Preview:** Deploy to Vercel preview. Set `FINANCIAL_DATA_API_KEY` in preview environment. Manually verify prices load.
3. **Production cutover:**
   - Set `FINANCIAL_DATA_API_KEY` in production environment
   - Deploy the feature branch to main
   - Monitor the next cron cycle (runs every 15 minutes during market hours)
   - Verify StockPrice records are updating with `source: "financial_data"`
4. **Cleanup:** Remove `ALPHA_VANTAGE_API_KEY` from production environment after 24 hours of stable operation.

### Rollback

If FinancialData.net has issues post-deploy:

1. **Quick fix:** Revert the commit. The Alpha Vantage code is restored. Set `ALPHA_VANTAGE_API_KEY` back in the environment. Deploy.
2. **Time to rollback:** < 5 minutes (revert + deploy)
3. **Data impact:** None. The `StockPrice` table is overwritten on each refresh regardless of source. No schema migration to reverse.

This is a low-risk migration because:
- The database schema doesn't change
- The public interface (`StockPriceResult`) doesn't change
- All downstream code is unaffected
- Rollback is a single git revert

---

## Future Opportunities

FinancialData.net gives us access to endpoints we might want later. These are **not in scope** for this PRD but worth noting:

| Feature Idea | Endpoint | Tier | Value |
|-------------|----------|------|-------|
| Show option chain for tracked tickers | `/option-chain` | Standard | Users could see available strikes/expirations when entering trades |
| Display live Greeks for open trades | `/option-greeks` | Standard | Show delta, theta, gamma, vega without manual calculation |
| Key metrics on position cards | `/key-metrics` | Standard | Show P/E, beta, EPS alongside positions |
| Company info in trade details | `/company-information` | Standard | Add company name, sector, market cap to trade detail views |
| Intraday pricing | `/latest-prices` | Premium | More current prices during market hours |
| ETF price support | `/etf-prices` | Premium | Support ETF tickers like SPY more accurately |

---

## Summary

| Item | Detail |
|------|--------|
| **Scope** | Replace Alpha Vantage fetch layer with FinancialData.net in `lib/services/market-data.ts` |
| **Risk** | Low. Clean interface boundary. No DB migration. Instant rollback. |
| **Convoys** | 5 (service layer, env config, schema default, tests, verification) |
| **Polecats needed** | 1-2 polecats, 1-2 days total |
| **Dependencies** | FinancialData.net API key (sign up at financialdata.net) |
| **Env variable** | `FINANCIAL_DATA_API_KEY` replaces `ALPHA_VANTAGE_API_KEY` |
| **Breaking changes** | None. `StockPriceResult` interface unchanged. All consumers unaffected. |

---

**Document Status:** DRAFT - Ready for Mayor Review
**Next Steps:** Convoy assignments and API key provisioning
**Priority:** MEDIUM - Operational improvement, no user-facing urgency
**Dependencies:** FinancialData.net account and API key

**Polecats Needed:**
- Backend: 1 polecat (service layer swap, schema default, test updates)
- Verification: 1 polecat (env config, smoke tests, cleanup)
- Total: 1-2 polecats for 1-2 day implementation

---

*End of PRD*

# Wheel Scanner: Nightly Screening Strategy

This document defines the criteria and process for our nightly scanner that identifies candidates for selling cash-secured puts (CSPs) as the entry point of the wheel strategy.

## Data Sources

All market data comes from [Financial Data API](https://financialdata.net/documentation#stock_prices), queried after market close each evening.

| Endpoint | What we use it for |
|---|---|
| `/api/v1/stock-prices` | Daily OHLCV, trend analysis (50/200-day MA), volume |
| `/api/v1/option-chain` | Available strikes, expirations, put/call type |
| `/api/v1/option-prices` | Bid/ask/last for each contract, open interest, volume |
| `/api/v1/option-greeks` | Delta, theta, vega, IV per contract |

---

## Phase 1: Stock Universe Filter

Before looking at any options data, filter the stock universe down to names we would genuinely want to own if assigned. A bad stock with great premium is still a bad trade.

### Hard Filters

| Criterion | Threshold | Rationale |
|---|---|---|
| Market cap | > $10B | Large-cap stability, institutional ownership, liquid options |
| Avg daily volume | > 1M shares | Ensures options market maker participation and tight spreads |
| Stock price | $20 - $150 | Below $20: low-quality risk. Above $150: too much capital per contract |
| Trend | Price > 200-day SMA | Avoid selling puts into a confirmed downtrend |
| Earnings | No report within option DTE window | Avoid binary event risk (check earnings calendar) |

### Calculating Trend from API Data

Pull 200 trading days of daily closes from `/api/v1/stock-prices`. Compute the simple moving average. Only pass stocks where the most recent close is above this average **and** the 200-day SMA is flat or rising (current SMA > SMA from 20 days ago).

Optionally also check the 50-day SMA. Stocks above both a rising 50-day and 200-day SMA are in the strongest trends.

### Qualitative Filters (Applied to Our Watchlist)

We should maintain a curated watchlist of tickers that pass these qualitative checks, reviewed periodically (not nightly):

- Profitable, growing business with positive free cash flow
- Understandable business model
- Reasonable debt levels (debt-to-equity < 1.0)
- No known binary catalysts (FDA decisions, merger votes, regulatory rulings)
- We would be comfortable holding 100+ shares for 3-6 months

The nightly scan runs against this watchlist, not the entire market.

---

## Phase 2: Implied Volatility Screen

High IV means richer premiums. But we want *relatively* high IV for that stock, not just high IV in absolute terms.

### IV Rank

For each stock that passes Phase 1, compute **IV Rank**:

```
IV Rank = (Current IV - 52-week Low IV) / (52-week High IV - 52-week Low IV) * 100
```

We can approximate current IV from the at-the-money put's IV (from `/api/v1/option-greeks`). For the 52-week range, query historical Greeks for the ATM put at ~30 DTE over the past year and track the IV values.

| IV Rank | Action |
|---|---|
| < 20 | Skip - premium too thin relative to history |
| 20 - 40 | Acceptable if other criteria are strong |
| 40 - 70 | Good - our target zone |
| > 70 | Investigate why - if no catalyst, excellent opportunity |

**Caution:** IV Rank > 80 without an obvious catalyst is rare. If it exists, verify there is no upcoming event we missed.

---

## Phase 3: Option Selection

For each stock passing Phases 1 and 2, evaluate the options chain.

### Target Expiration: 30-45 DTE

Query `/api/v1/option-chain` for available expirations. Select the nearest monthly expiration falling in the 30-45 DTE window.

Why 30-45 DTE:
- Theta decay accelerates most rapidly in this window
- Enough time to roll or adjust if the position moves against us
- Short enough that capital isn't locked up too long

If no expiration falls in this window, use the nearest available (preferring slightly longer over shorter).

### Target Strike: 0.20-0.30 Delta Put

Query `/api/v1/option-greeks` for put contracts at the chosen expiration. Select the strike where delta falls between **-0.20 and -0.30** (i.e., 70-80% probability of expiring OTM).

| Delta | Risk Profile |
|---|---|
| -0.15 to -0.20 | Conservative - lower premium, higher win rate (~80-85%) |
| -0.20 to -0.25 | Our primary target - balanced risk/reward (~75-80%) |
| -0.25 to -0.30 | Moderate - more premium, lower win rate (~70-75%) |
| > -0.30 | Aggressive - skip for our low-risk approach |

### Technical Support Confirmation

The selected strike should ideally sit at or below a **technical support level**. Using price history from `/api/v1/stock-prices`:

- Identify recent swing lows (lowest price in the last 20-60 trading days)
- The strike should be at or below this level
- This gives us both statistical (delta) and technical (chart-based) cushion

### Premium Yield Calculation

For the selected contract, compute the annualized return on capital:

```
Premium Yield = (Bid Price / Strike Price) * (365 / DTE) * 100
```

| Annualized Yield | Assessment |
|---|---|
| < 8% | Skip - not enough compensation for the risk |
| 8% - 12% | Acceptable on highest-quality names |
| 12% - 24% | Our target zone |
| > 24% | Investigate - may signal elevated risk |

### Liquidity Checks

From `/api/v1/option-prices` and the option chain data:

| Criterion | Minimum |
|---|---|
| Open interest at strike | > 100 contracts (500+ preferred) |
| Daily option volume | > 20 contracts |
| Bid-ask spread | < $0.10 or < 10% of mid-price |

If the spread is too wide, the stock has acceptable options liquidity only at more popular strikes. Check the nearest standard strike.

---

## Phase 4: Scoring and Ranking

Each candidate that passes all filters gets a composite score to rank the best opportunities.

### Scoring Components

| Component | Weight | How to score (0-100) |
|---|---|---|
| Premium yield (annualized) | 30% | Linear scale: 8% = 0, 24% = 100 |
| IV Rank | 25% | Linear scale: 20 = 0, 70 = 100 |
| Delta sweet spot | 15% | 100 if delta is -0.22 to -0.25, scale down toward edges |
| Options liquidity | 15% | Based on OI and spread tightness |
| Trend strength | 15% | Distance above 200-day SMA as % (capped at 20% = 100) |

```
Score = (yield_score * 0.30) + (iv_score * 0.25) + (delta_score * 0.15)
      + (liquidity_score * 0.15) + (trend_score * 0.15)
```

### Output: Nightly Candidates Report

The scanner should produce a ranked list with these columns:

| Field | Source |
|---|---|
| Ticker | Watchlist |
| Stock Price (close) | stock-prices |
| 200-day SMA | Computed from stock-prices |
| Strike | option-chain + option-greeks |
| Expiration | option-chain |
| DTE | Computed |
| Delta | option-greeks |
| Bid | option-prices |
| Ask | option-prices |
| IV | option-greeks |
| IV Rank | Computed from historical greeks |
| Premium Yield (ann.) | Computed |
| Open Interest | option-prices / option-chain |
| Composite Score | Computed |

---

## Phase 5: Portfolio-Level Checks

Before acting on any candidate, validate against our existing portfolio.

### Position Sizing Rules

| Rule | Limit |
|---|---|
| Max capital per single underlying | 10% of total portfolio |
| Max capital per sector | 20% of total portfolio |
| Total deployed capital | 50-70% of portfolio (keep 30-50% cash reserve) |
| New positions per week | 1-3 maximum |

### Existing Position Awareness

The scanner should check our existing trades (from the app's database) and:

- Skip tickers where we already have an open CSP
- Flag tickers where we hold assigned shares (we'd sell covered calls, not more puts)
- Warn if adding a candidate would breach sector concentration limits

---

## Trade Management Rules (Post-Entry)

These are not part of the nightly scan but should be tracked by the app once positions are opened.

| Event | Action |
|---|---|
| Position reaches 50% of max profit | Close the trade, free up capital |
| Position loss reaches 2x premium received | Close for a loss to limit damage |
| Delta reaches -0.40 to -0.50 (moving ITM) | Consider rolling down and/or out |
| 7-14 DTE remaining and position is profitable | Close rather than risk gamma acceleration |
| Stock breaks below 200-day SMA while we hold a put | Heightened alert - consider closing |

---

## API Call Sequence (Nightly)

For each ticker on our watchlist:

1. **`GET /api/v1/stock-prices?identifier={ticker}`** - fetch last 200+ trading days of daily close prices
2. Compute 50-day and 200-day SMA; check trend filter; skip if failing
3. **`GET /api/v1/option-chain?identifier={ticker}`** - get available put contracts
4. Filter to 30-45 DTE expiration window
5. **`GET /api/v1/option-greeks?identifier={contract}`** - for puts near the target delta range
6. Select the contract closest to -0.22 to -0.25 delta
7. **`GET /api/v1/option-prices?identifier={contract}`** - get bid/ask, open interest, volume
8. Compute premium yield, liquidity score, composite score
9. For IV Rank: query historical ATM put greeks (can be cached/computed weekly rather than nightly)

### Rate Limiting Considerations

Each API call returns up to 300 records. For a watchlist of ~50 stocks, expect roughly:
- 50 stock-prices calls
- 50 option-chain calls
- 50-150 option-greeks calls (multiple strikes per ticker)
- 50-150 option-prices calls

Batch and cache where possible. IV Rank historical data only needs weekly refresh.

---

## Summary

The scanner is a funnel:

```
Curated Watchlist (~50-100 tickers)
  -> Phase 1: Trend + Volume + Price filter (~30-50 pass)
    -> Phase 2: IV Rank filter (~10-25 pass)
      -> Phase 3: Option selection + yield + liquidity (~5-15 candidates)
        -> Phase 4: Score and rank (top 3-5 presented)
          -> Phase 5: Portfolio checks (1-3 actionable)
```

The goal is to surface 1-3 high-conviction opportunities each night where the premium adequately compensates for the risk of owning the stock, and where the stock itself is something we'd be happy to hold.

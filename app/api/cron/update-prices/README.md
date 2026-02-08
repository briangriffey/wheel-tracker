# Automated Price Update Cron Job

## Overview

This endpoint provides automated stock price updates for all active positions and trades during market hours. It runs every 15 minutes via Vercel Cron.

## Endpoint

```
POST /api/cron/update-prices
```

### Authentication

Requires `Authorization: Bearer <CRON_SECRET>` header matching the `CRON_SECRET` environment variable.

### Schedule

Runs every 15 minutes during market hours (Monday-Friday, 9:00 AM - 4:00 PM ET):

```
*/15 9-16 * * 1-5
```

Configured in `vercel.json`.

### Behavior

1. **Authentication Check** - Validates CRON_SECRET header
2. **Market Hours Check** - Skips if market is closed (weekends, holidays, outside trading hours)
3. **Ticker Discovery** - Fetches all active tickers from open positions and trades
4. **Price Updates** - Fetches current prices with rate limiting (5 requests/minute)
5. **Database Storage** - Saves prices to StockPrice table
6. **Logging** - Comprehensive logs for monitoring

### Response Format

#### Success (Market Open, Prices Updated)
```json
{
  "success": true,
  "message": "Updated 3 of 3 tickers",
  "timestamp": "2026-02-07T17:00:00.000Z",
  "duration": "45678ms",
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0
  },
  "results": {
    "successful": [
      {
        "ticker": "AAPL",
        "price": 180.5,
        "date": "2026-02-07T00:00:00.000Z"
      }
    ],
    "failed": []
  }
}
```

#### Market Closed
```json
{
  "success": true,
  "skipped": true,
  "reason": "Market is closed",
  "timestamp": "2026-02-07T17:00:00.000Z",
  "duration": "123ms"
}
```

## Configuration

### Environment Variables

```bash
# Required for production
CRON_SECRET="your-secret-key-here"

# Already configured
ALPHA_VANTAGE_API_KEY="your-api-key-here"
DATABASE_URL="postgresql://..."
```

### Vercel Cron Setup

1. Set `CRON_SECRET` in Vercel environment variables
2. Deploy - Vercel automatically configures cron from `vercel.json`
3. View cron logs in Vercel dashboard under "Cron Jobs"

## Testing

Run the comprehensive test suite:

```bash
pnpm test app/api/cron/update-prices/route.test.ts
```

Tests cover:
- Authentication (valid/invalid/missing)
- Market hours check (open/closed)
- Price updates (success/partial failure/complete failure)
- Error handling (database errors, API errors)
- Response format (timestamps, duration, structure)

## Rate Limiting

The endpoint respects Alpha Vantage API limits:
- 5 requests per minute
- 500 requests per day

Rate limiting is handled automatically by the `batchFetchPrices` function with a queue-based system (12-second intervals between requests).

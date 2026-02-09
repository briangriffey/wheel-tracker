# Expiration Calendar Implementation

## Overview
Built the expiration calendar page (`/expirations`) as specified in Phase 4 of the wheel strategy tracking system.

## Files Created

### Core Features
1. **`app/expirations/page.tsx`** - Server Component page
   - Fetches expiring trades (next 30 days)
   - Groups trades by expiration date
   - Fetches current stock prices for all tickers
   - Displays summary statistics
   - Renders ExpirationCalendar component

2. **`components/expirations/expiration-calendar.tsx`** - Client Component
   - Lists trades grouped by expiration date
   - Color-coded ITM/OTM/ATM status (Green/Yellow/Red)
   - Batch selection with checkboxes
   - Batch actions: "Mark as Expired" and "Mark as Assigned"
   - Responsive design (desktop table, mobile cards)
   - Sticky batch action bar when trades selected
   - Shows days until expiration for each group

3. **`components/expirations/index.ts`** - Export barrel

### Utilities

4. **`lib/calculations/option-moneyness.ts`** - ITM/OTM calculation
   - `calculatePutMoneyness()` - Determine PUT option moneyness
   - `calculateCallMoneyness()` - Determine CALL option moneyness
   - `calculateOptionMoneyness()` - Detailed moneyness with intrinsic value
   - `getMoneynessColor()` - Tailwind color classes for visual indication
   - Configurable ATM threshold (default 1%)

5. **`lib/calculations/option-moneyness.test.ts`** - Comprehensive tests
   - 14 test cases covering all moneyness scenarios
   - All tests passing ✓

6. **`lib/queries/expirations.ts`** - Database queries
   - `getExpiringTrades()` - Fetch trades expiring within X days
   - `getTradesByExpirationDate()` - Fetch trades for specific date
   - `groupTradesByExpiration()` - Group trades by date
   - `getUniqueTickers()` - Extract unique tickers

7. **`lib/actions/batch-trades.ts`** - Server actions for batch operations
   - `batchMarkExpired()` - Mark multiple trades as expired
   - `batchMarkAssigned()` - Mark multiple trades as assigned
   - `batchUpdateTradeStatus()` - Generic batch status updater
   - Returns detailed success/failure counts with errors

## Features Implemented

### ✅ Requirements from wh-3zxh

- [x] List all trades by expiration date
- [x] Color code: Green (OTM), Yellow (ATM), Red (ITM)
- [x] Group by expiration date
- [x] Show ITM/OTM status clearly
- [x] Link to batch actions

### ✅ Additional Features

- Summary statistics (total expiring, expiration dates, unique tickers)
- Checkbox selection (individual and group-level)
- Indeterminate checkbox for partial group selection
- Days until expiration display
- Current stock price display
- Sticky batch action bar
- Responsive mobile design
- Loading/processing states
- Error handling with detailed feedback
- Accessibility features (ARIA labels, semantic HTML)

## Technical Details

### Color Coding Logic

**OTM (Out-of-The-Money)** - Green
- PUT: Stock price > Strike price (expires worthless)
- CALL: Stock price < Strike price (expires worthless)

**ATM (At-The-Money)** - Yellow
- Within 1% of strike price (watch closely)

**ITM (In-The-Money)** - Red
- PUT: Stock price < Strike price (likely assigned)
- CALL: Stock price > Strike price (likely assigned)

### Data Flow

1. Server Component (`page.tsx`) fetches data at build/request time
2. Queries get trades expiring in next 30 days
3. Groups trades by expiration date
4. Fetches current prices for all unique tickers
5. Passes data as props to Client Component
6. Client Component calculates moneyness using current prices
7. User selections trigger server actions for batch updates
8. Page reloads to show updated state

### Performance Optimizations

- Server-side data fetching (no client waterfall)
- Batch price fetching (single query for all tickers)
- Optimistic UI updates with loading states
- Memoized trade filtering and sorting

## Testing

```bash
# Run tests
pnpm test lib/calculations/option-moneyness.test.ts
# ✓ All 14 tests passing

# Type check
pnpm type-check
# ✓ No errors in new code

# Build
pnpm build
# ✓ Build successful, /expirations page generated
```

## Usage

Navigate to `/expirations` to:
1. View all options expiring in the next 30 days
2. See which options are likely to be assigned (ITM - red)
3. Select multiple trades using checkboxes
4. Batch mark as expired or assigned
5. Manage weekly/monthly expirations efficiently

## Future Enhancements

- Filter by date range
- Filter by ITM/OTM/ATM status
- Filter by ticker
- Sort within groups
- Export to CSV
- Email notifications for upcoming expirations
- Auto-refresh prices button

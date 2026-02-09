# GAP-3 Implementation: Guided PUT Assignment Dialog

**Status:** ✅ COMPLETED
**Date:** 2026-02-08
**Bead:** wh-7s89

## Summary

Implemented a comprehensive guided PUT assignment dialog that shows cost breakdown, current market prices, unrealized P/L, and includes a prompt to sell covered calls after assignment.

## What Was Implemented

### 1. Core Dialog Component
**File:** `components/trades/assign-put-dialog.tsx`

Features:
- ✅ Displays PUT option details (ticker, strike, premium, contracts, shares, expiration)
- ✅ Shows cost breakdown:
  - Total cost (strike × shares)
  - Premium credit received
  - Net cost
  - Effective cost basis per share
- ✅ Fetches and displays current stock price
- ✅ Calculates unrealized P/L at current price
- ✅ Shows warning for significant unrealized losses (>10%)
- ✅ Loading states during assignment
- ✅ Error handling and display
- ✅ Post-assignment prompt: "Would you like to sell a covered call?"

### 2. Stock Price API
**File:** `app/api/stocks/[ticker]/price/route.ts`

Features:
- ✅ GET endpoint to fetch most recent cached price for a ticker
- ✅ Returns price, date, and staleness indicator
- ✅ Properly handles missing price data
- ✅ Uses existing StockPrice table from database

### 3. Trade Detail Page
**Files:**
- `app/trades/[id]/page.tsx` (Server Component)
- `app/trades/[id]/trade-detail-client.tsx` (Client Component)

Features:
- ✅ Full trade details display
- ✅ "Assign PUT" button for OPEN PUT trades
- ✅ Integration with AssignPutDialog
- ✅ Navigation back to trades list
- ✅ Responsive design (mobile and desktop)
- ✅ Status badges and color coding
- ✅ Link to related position (if exists)

### 4. Trade List Enhancement
**File:** `components/trades/trade-list.tsx`

Features:
- ✅ Added "View" link to each trade row (desktop table)
- ✅ Added "View" button to each trade card (mobile)
- ✅ Links navigate to `/trades/[id]` detail page

## Files Created

1. `components/trades/assign-put-dialog.tsx` - Main dialog component
2. `app/api/stocks/[ticker]/price/route.ts` - Stock price API endpoint
3. `app/trades/[id]/page.tsx` - Trade detail server page
4. `app/trades/[id]/trade-detail-client.tsx` - Trade detail client component
5. `GAP-3-IMPLEMENTATION.md` - This file

## Files Modified

1. `components/trades/trade-list.tsx` - Added view links

## Acceptance Criteria Status

### From PRD (lines 200-207)

- ✅ Dialog shows complete cost breakdown
- ✅ Current price fetched and unrealized P/L calculated
- ✅ After assignment, optional "Sell Call" prompt appears
- ⚠️ Wheel status updated if trade belongs to wheel (Deferred - wheels not implemented yet, part of GAP-5)
- ⚠️ Position correctly linked to both assignmentTrade and wheel (Partial - wheel linking deferred to GAP-5)
- ✅ Cannot assign non-PUT trades or already assigned trades (enforced in existing assignPut action)

### Additional Integration Points (Future Work)

These were mentioned in the PRD but are considered follow-up tasks:
- ⏳ Add "Assign" button to expiration calendar for ITM PUTs
- ⏳ Add "Assign" quick action to dashboard ITM PUT notifications

These integration points can be added when the expiration calendar and dashboard notification features are enhanced.

## Technical Details

### Component Architecture

```
AssignPutDialog (Client Component)
├── Uses Dialog UI component
├── Fetches current stock price via API
├── Calls assignPut() server action
├── Shows two states:
│   ├── Assignment form (before)
│   └── Sell call prompt (after success)
└── Handles loading, error states
```

### API Flow

```
1. Dialog opens
2. useEffect triggers price fetch: GET /api/stocks/[ticker]/price
3. User clicks "Assign PUT & Create Position"
4. Calls assignPut({ tradeId })
5. On success: Shows "Sell Covered Call?" prompt
6. User chooses:
   - "Sell Covered Call" → Navigate to /positions/[id]?action=sell-call
   - "Skip for Now" → Close dialog
```

### Database Operations

The assignPut() action (already existing) handles:
1. Updates Trade status to ASSIGNED
2. Creates Position with calculated cost basis
3. Links position to assignment trade
4. Atomic transaction (both succeed or both fail)

## Testing Checklist

Manual testing verified:
- ✅ Dialog opens for OPEN PUT trades
- ✅ Dialog does not open for CALL trades or non-OPEN trades
- ✅ Cost breakdown calculations are correct
- ✅ Current price fetches successfully (when available)
- ✅ Unrealized P/L calculates correctly
- ✅ Warning shows for >10% unrealized loss
- ✅ Assignment process completes successfully
- ✅ "Sell Call?" prompt appears after assignment
- ✅ Links navigate correctly
- ✅ Mobile layout works properly
- ✅ TypeScript compiles without errors

## Known Limitations

1. **Wheel Integration Deferred**: The dialog doesn't update wheel status because the Wheel model and lifecycle management aren't implemented yet (GAP-5).

2. **Position Status**: The dialog doesn't update position status to "COVERED" because enhanced position states aren't implemented yet (GAP-6).

3. **Sell Call Dialog Missing**: The prompt asks if user wants to sell a call, but the actual sell call dialog is part of GAP-4.

These limitations are expected and will be resolved by subsequent GAP implementations.

## Next Steps

1. **GAP-4**: Implement Guided "Sell Covered Call" Dialog
   - This will complete the flow started by the "Sell Call?" prompt
   - User can immediately sell a covered call after PUT assignment

2. **GAP-5**: Implement Automatic Wheel Lifecycle Management
   - Add wheel status updates to assignPut()
   - Link positions to wheels
   - Update wheel lastActivityAt

3. **GAP-6**: Implement Enhanced Position States
   - Add COVERED state
   - Update position status when call is sold

## Deployment Notes

- No database migrations required (uses existing schema)
- No environment variables required (uses existing ALPHA_VANTAGE_API_KEY)
- Compatible with existing assignPut() server action
- No breaking changes to existing functionality

---

**Implementation Complete: 2026-02-08**
**Ready for:** Testing, review, and merge

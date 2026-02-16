# Wheel Strategy Tracking System - Product Requirements Document

**dispatched_by: mayor**

## Executive Summary

This PRD defines the requirements for transforming the GreekWheel application into a complete, automated wheel strategy tracking system. The wheel strategy is a systematic options trading approach that involves selling cash-secured PUTs, acquiring stock if assigned, then selling covered CALLs until the stock is called away - repeating the cycle indefinitely.

**Document Version:** 1.0
**Last Updated:** 2026-02-08
**Status:** Draft

---

## Table of Contents

1. [Background: The Wheel Strategy](#background-the-wheel-strategy)
2. [Current State Analysis](#current-state-analysis)
3. [Target State Vision](#target-state-vision)
4. [User Flows & Stories](#user-flows--stories)
5. [Functional Requirements](#functional-requirements)
6. [Technical Specifications](#technical-specifications)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Success Metrics](#success-metrics)

---

## Background: The Wheel Strategy

### What is The Wheel?

The wheel strategy (also called "The Triple Income Wheel") is a popular options strategy that generates income through three mechanisms:

1. **PUT Premium Collection** - Sell cash-secured puts and collect premium
2. **CALL Premium Collection** - If assigned, sell covered calls on the acquired shares
3. **Capital Gains** - Profit from stock appreciation when shares are called away

### The Wheel Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                     THE WHEEL CYCLE                          │
└─────────────────────────────────────────────────────────────┘

Step 1: SELL CASH-SECURED PUT
  ↓
  ├─→ Expires Worthless → Keep Premium → Back to Step 1
  └─→ Gets Assigned → Acquire Stock → Go to Step 2

Step 2: HOLD STOCK POSITION
  ↓
  Go to Step 3

Step 3: SELL COVERED CALL
  ↓
  ├─→ Expires Worthless → Keep Premium → Back to Step 3
  ├─→ Bought Back → Keep Partial Premium → Back to Step 3
  └─→ Gets Assigned → Sell Stock → Keep All Premium → Back to Step 1

REPEAT INDEFINITELY
```

### Key Components

1. **Cash-Secured PUT** - You sell a put option and hold enough cash to buy 100 shares per contract if assigned
2. **Assignment** - When the stock price falls below the strike, you buy shares at the strike price
3. **Covered CALL** - You sell a call option against shares you own
4. **Call Assignment** - When the stock price rises above the strike, your shares are sold at the strike price

### Example Trade Sequence

```
1. Sell 1 PUT on AAPL @ $150 strike, collect $250 premium
   → Stock stays above $150 → Put expires worthless → Profit: $250

2. Sell 1 PUT on AAPL @ $150 strike, collect $250 premium
   → Stock drops to $145 → PUT assigned → Buy 100 shares @ $150
   → Effective cost basis: $147.50/share ($150 - $2.50 premium)

3. Hold 100 shares of AAPL (cost basis $147.50)
   → Sell 1 CALL @ $155 strike, collect $200 premium

4. CALL expires worthless → Keep $200 premium
   → Sell another CALL @ $155 strike, collect $200 premium

5. CALL gets assigned → Sell 100 shares @ $155
   → Total profit: $250 (PUT) + $200 (CALL 1) + $200 (CALL 2) + $750 (stock gain)
   → Total profit: $1,400 on $15,000 capital = 9.3% return

6. Start over with new PUT
```

### Risk Management

- **Downside Risk**: If stock price drops significantly, you're holding shares below your cost basis
- **Opportunity Cost**: If stock price soars, your shares get called away at the strike price
- **Best Market Conditions**: Range-bound or moderately bullish markets
- **Worst Market Conditions**: Sharp, sustained downtrends or parabolic moves up

### References
- [Charles Schwab: Three Things to Know About the Wheel Strategy](https://www.schwab.com/learn/story/three-things-to-know-about-wheel-strategy)
- [Option Alpha: How to Trade the Options Wheel Strategy](https://optionalpha.com/blog/wheel-strategy)
- [InsiderFinance: Complete Guide to Wheel Options Trading Strategy](https://www.insiderfinance.io/resources/complete-guide-to-wheel-options-trading-strategy)

---

## Current State Analysis

### What Exists Today

The current GreekWheel application provides:

✅ **Trade Entry**
- Manual entry of PUT and CALL trades
- Track ticker, strike price, premium, contracts, expiration
- Support for SELL_TO_OPEN and BUY_TO_CLOSE actions
- Trade status: OPEN, CLOSED, EXPIRED, ASSIGNED

✅ **Position Management**
- Manual assignment of PUT trades → creates stock positions
- Track cost basis (strike price - premium/shares)
- Link positions to the assignment trade
- Track covered calls linked to positions

✅ **Database Schema**
```typescript
Trade {
  type: PUT | CALL
  action: SELL_TO_OPEN | BUY_TO_CLOSE
  status: OPEN | CLOSED | EXPIRED | ASSIGNED
  positionId?: string  // Links CALL to position
}

Position {
  assignmentTradeId: string  // The PUT that created this
  coveredCalls: Trade[]      // CALLs sold against this
  status: OPEN | CLOSED
}
```

✅ **Server Actions**
- `createTrade()` - Add new PUT or CALL trade
- `updateTradeStatus()` - Mark trade as CLOSED, EXPIRED, or ASSIGNED
- `assignPut()` - Mark PUT as assigned and create position
- `assignCall()` - Mark CALL as assigned and close position
- `getPositions()` - Fetch all positions with related trades

✅ **P&L Tracking**
- Calculate realized gain/loss when position closes
- Track total premiums collected (PUT + all CALLs)
- Dashboard with charts and metrics
- Export to CSV for tax reporting

### Current User Flow

**Today's Process (Manual):**

1. User sells a PUT → manually creates trade with `createTrade()`
2. PUT expires → manually calls `updateTradeStatus({ status: 'EXPIRED' })`
3. OR PUT assigned → manually calls `assignPut({ tradeId })` → creates position
4. User wants to sell CALL → manually creates trade with `positionId` link
5. CALL expires → manually calls `updateTradeStatus({ status: 'EXPIRED' })`
6. OR CALL assigned → manually calls `assignCall({ tradeId })` → closes position
7. Repeat...

### Current Gaps

❌ **No Automated Workflows**
- No guided flow from PUT → Position → CALL → Assignment → New PUT
- Users must manually navigate between pages
- Easy to forget steps or make linking errors

❌ **No Contextual Actions**
- When viewing a position, no quick action to "Sell Covered Call"
- When PUT is assigned, no prompt to create position
- When CALL is assigned, no prompt to start new PUT

❌ **No Validation of Wheel Rules**
- Can sell multiple CALLs against same position (should only allow one OPEN at a time)
- No check that CALL strike > position cost basis
- No warning if selling PUT without sufficient cash

❌ **No Wheel Cycle Visualization**
- Can't see "where you are" in the wheel cycle for each ticker
- No summary of active wheels vs. idle wheels
- No tracking of cycle count (how many times the wheel has turned)

❌ **No Bulk/Batch Operations**
- Can't mark multiple trades as expired at once
- Can't process assignment of multiple PUTs simultaneously
- No "end of week" workflow to process expirations

❌ **No Alerts or Notifications**
- No reminder when options are expiring
- No alert when position is ready for a covered call
- No notification when PUT is in danger of assignment

❌ **Limited Position States**
- Position can only be OPEN or CLOSED
- No "HOLDING" (has position, no active CALL)
- No "COVERED" (has position, active CALL)
- No "PENDING_ASSIGNMENT" (CALL is ITM near expiration)

---

## Target State Vision

### The Ideal GreekWheel

**Vision Statement:**
> A wheel tracker that guides traders through every step of the wheel cycle, automates routine tasks, enforces best practices, and provides clear visibility into portfolio health and wheel efficiency.

### Key Principles

1. **Flow-Based Design** - The app should guide users through natural progressions
2. **Contextual Actions** - Show relevant next steps based on current state
3. **Validation & Safety** - Prevent errors and warn about risky actions
4. **Automation** - Reduce manual data entry and repetitive tasks
5. **Transparency** - Always show where you are in the cycle and why

### Enhanced User Experience

**Future Process (Guided):**

1. User sells PUT → creates trade
2. System monitors expiration → prompts "PUT expired, mark it?" or "PUT ITM, assign it?"
3. If assigned → guided flow: "Your PUT was assigned. Create position?"
4. Position created → immediate prompt: "Sell covered call on this position?"
5. CALL created → system monitors → prompts at expiration
6. CALL assigned → guided flow: "Position closed. Start new PUT on {ticker}?"
7. Repeat...

**Enhanced UI:**

```
DASHBOARD VIEW:

Active Wheels (3)
┌──────────────────────────────────────┐
│ AAPL - Collecting PUT Premium       │ ← Step 1
│ 1 PUT @ $150, exp 3/15, +$250       │
│ [Mark Assigned] [Mark Expired]       │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ MSFT - Holding Position (COVERED)   │ ← Step 3
│ 100 shares @ $380 cost basis         │
│ 1 CALL @ $390, exp 3/15, +$300      │
│ [Roll Call] [Mark Assigned]          │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ TSLA - Position Ready for Call      │ ← Step 2
│ 100 shares @ $210 cost basis         │
│ Current: $215 (+$500 unrealized)     │
│ [Sell Covered Call]                  │
└──────────────────────────────────────┘

Idle Wheels (2)
┌──────────────────────────────────────┐
│ NVDA - Last wheel completed 2/1      │
│ Total profit: $1,250 (3 cycles)      │
│ [Start New PUT]                      │
└──────────────────────────────────────┘
```

---

## User Flows & Stories

### User Story 1: Starting a New Wheel

**As a** trader
**I want to** start tracking a new wheel on a ticker
**So that** I can begin generating income from the wheel strategy

**Flow:**
1. Navigate to "Start New Wheel"
2. Enter ticker symbol (e.g., "AAPL")
3. System shows current stock price and suggests strike prices
4. Enter PUT details (strike, expiration, premium, contracts)
5. System validates:
   - ✓ Cash available to cover assignment (strike × shares)
   - ✓ Reasonable expiration date (7-45 days typical)
   - ✓ Premium makes sense for strike/expiration
6. Create PUT trade with `wheelId` (new concept)
7. System creates `Wheel` record to track the cycle
8. Redirect to wheel detail page showing active PUT

**Acceptance Criteria:**
- [ ] Can create new wheel from dashboard
- [ ] System validates cash requirement
- [ ] Wheel record created with cycle count = 0
- [ ] PUT trade linked to wheel
- [ ] Dashboard shows wheel in "Active - Collecting Premium" state

### User Story 2: PUT Assignment Flow

**As a** trader
**I want to** quickly assign a PUT and create a position
**So that** I can continue to the next step of the wheel

**Flow:**
1. System detects PUT is ITM near expiration
2. Shows notification: "AAPL PUT @ $150 is likely to be assigned"
3. User clicks "Assign PUT" from notification or trade detail
4. Confirmation dialog shows:
   - "You will acquire 100 shares of AAPL"
   - "Total cost: $14,750 ($150 strike - $2.50 premium credit)"
   - "Cost basis: $147.50/share"
   - "Current price: $145 (unrealized loss: -$250)"
5. User confirms
6. System executes `assignPut()`:
   - Marks trade as ASSIGNED
   - Creates position with calculated cost basis
   - Updates wheel status to "Holding Position"
7. Immediately prompts: "Sell covered call on AAPL?"
8. If yes → navigate to create CALL form (pre-filled with ticker, positionId)
9. If no → can access from position detail later

**Acceptance Criteria:**
- [ ] System identifies ITM PUTs approaching expiration
- [ ] Assignment dialog shows clear cost breakdown
- [ ] Position created with correct cost basis
- [ ] Wheel status updated
- [ ] Optional immediate CALL creation flow
- [ ] All changes in single transaction (atomic)

### User Story 3: Selling Covered Calls

**As a** trader
**I want to** sell a covered call against my position
**So that** I can generate additional premium income

**Flow:**
1. From position detail page, click "Sell Covered Call"
2. Pre-filled form shows:
   - Ticker: AAPL (locked)
   - Position: 100 shares @ $147.50 cost basis (locked)
   - Strike price: $155 (suggested above cost basis)
   - Premium: (user enters)
   - Expiration: (user selects)
   - Contracts: 1 (locked to position size)
3. System validates:
   - ✓ No other OPEN CALLs on this position
   - ⚠️ Strike price below cost basis → warning (will realize loss if assigned)
   - ✓ Strike price above cost basis → good (will realize gain if assigned)
   - ✓ Expiration is reasonable (7-60 days)
4. Create CALL with `positionId` link
5. Update wheel status to "Holding Position (COVERED)"
6. Redirect to position detail showing active CALL

**Acceptance Criteria:**
- [ ] Quick action button on position detail
- [ ] Form pre-filled with position data
- [ ] Validation prevents multiple open CALLs
- [ ] Warning if strike < cost basis
- [ ] CALL correctly linked to position
- [ ] Wheel status updated

### User Story 4: CALL Assignment & Cycle Completion

**As a** trader
**I want to** complete a wheel cycle when my CALL is assigned
**So that** I can realize profits and start the cycle again

**Flow:**
1. System detects CALL is ITM near expiration
2. Shows notification: "AAPL CALL @ $155 likely to be assigned"
3. User clicks "Assign CALL"
4. Confirmation dialog shows:
   - "You will sell 100 shares of AAPL @ $155"
   - "Sale proceeds: $15,500"
   - "Total premiums: $250 (PUT) + $200 (CALL) = $450"
   - "Stock gain: $750 ($155 - $147.50 cost basis)"
   - "**Total realized profit: $1,200**"
   - "Return: 8.1% on $14,750 capital"
   - "Duration: 45 days (65% annualized)"
5. User confirms
6. System executes `assignCall()`:
   - Marks CALL as ASSIGNED
   - Closes position with realized P&L
   - Increments wheel cycle count
   - Updates wheel status to "Cycle Complete"
7. Immediately prompts: "Start new PUT on AAPL?"
8. If yes → navigate to create PUT form (pre-filled with ticker, wheelId)
9. If no → wheel marked "Idle" until user starts new PUT

**Acceptance Criteria:**
- [ ] Clear profit summary before confirmation
- [ ] All P&L calculations accurate
- [ ] Wheel cycle count increments
- [ ] Position closed properly
- [ ] Optional immediate PUT creation
- [ ] Wheel history preserved

### User Story 5: Expiration Handling (Batch)

**As a** trader
**I want to** process expired options in bulk
**So that** I can efficiently manage weekly expirations

**Flow:**
1. Navigate to "Expirations" page
2. System shows all trades expiring this week/today
3. Group by expiration date:
   ```
   Expiring Today (3/15/2026)
   ┌────────────────────────────────────┐
   │ ☐ AAPL PUT $150 - OTM - Worthless │
   │ ☐ MSFT CALL $390 - OTM - Worthless│
   │ ☐ TSLA PUT $210 - ITM - Assign?   │
   └────────────────────────────────────┘

   [Mark Selected as Expired] [Assign Selected]
   ```
4. User selects trades and chooses action
5. System processes in batch:
   - Expired trades → status = EXPIRED
   - Assigned PUTs → create positions
   - Assigned CALLs → close positions
6. Shows summary of actions taken
7. Updates all affected wheels

**Acceptance Criteria:**
- [ ] Expirations page shows all upcoming expirations
- [ ] Can filter by date range
- [ ] Bulk selection and actions
- [ ] Clear ITM vs OTM indication
- [ ] Atomic batch processing
- [ ] Summary confirmation

### User Story 6: Wheel Performance Dashboard

**As a** trader
**I want to** see the performance of each wheel
**So that** I can identify my best and worst performing tickers

**Flow:**
1. Navigate to "Wheels" page
2. See list of all wheels (active and idle):
   ```
   WHEELS OVERVIEW

   Active (3) | Idle (2) | Completed (5)

   ┌─────────────────────────────────────────────┐
   │ AAPL - Active (Step 3/3 - Covered Position)│
   │ Cycles: 4 | Total P&L: +$4,200             │
   │ Win Rate: 100% | Avg Cycle: $1,050         │
   │ Current: 100 shares @ $147.50              │
   │          1 CALL @ $155 exp 3/15            │
   │ [View Details] [Actions ▼]                 │
   └─────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────┐
   │ TSLA - Active (Step 2/3 - Uncovered)       │
   │ Cycles: 2 | Total P&L: -$300               │
   │ Win Rate: 50% | Avg Cycle: -$150           │
   │ Current: 100 shares @ $210                 │
   │          No active CALL                    │
   │ [Sell Call] [View Details]                 │
   └─────────────────────────────────────────────┘
   ```
3. Click into wheel detail to see full history
4. View all cycles, trades, positions for that ticker
5. Charts showing P&L over time for that wheel

**Acceptance Criteria:**
- [ ] Wheels page lists all wheels
- [ ] Shows current step in wheel cycle
- [ ] Displays key metrics (cycles, P&L, win rate)
- [ ] Quick actions based on current state
- [ ] Detailed history view
- [ ] P&L chart per wheel

### User Story 7: Roll Options

**As a** trader
**I want to** roll an expiring option to a later date
**So that** I can extend my position without assignment

**Flow:**
1. From trade detail, click "Roll to Next Expiration"
2. System suggests:
   - Close current position (BUY_TO_CLOSE)
   - Open new position with same/different strike
   - Calculate net credit/debit
3. User confirms
4. System creates two trades:
   - BUY_TO_CLOSE for current strike/expiration
   - SELL_TO_OPEN for new strike/expiration
5. Net premium calculated and displayed
6. Wheel status unchanged (same step in cycle)

**Acceptance Criteria:**
- [ ] Roll button available on open trades
- [ ] Shows current vs. new position
- [ ] Calculates net credit/debit
- [ ] Creates linked trades
- [ ] Preserves wheel continuity

---

## Functional Requirements

### FR-1: Wheel Entity & Lifecycle

**Requirement:** Introduce a `Wheel` model to track the complete lifecycle of a wheel strategy on a ticker.

**Data Model:**
```typescript
model Wheel {
  id              String       @id @default(cuid())
  userId          String
  ticker          String
  status          WheelStatus  @default(ACTIVE)
  cycleCount      Int          @default(0)
  totalPremiums   Decimal      @default(0)
  totalRealizedPL Decimal      @default(0)
  startedAt       DateTime     @default(now())
  lastActivityAt  DateTime     @default(now())
  completedAt     DateTime?
  notes           String?

  user            User         @relation(fields: [userId], references: [id])
  trades          Trade[]      @relation("WheelTrades")
  positions       Position[]   @relation("WheelPositions")

  @@index([userId, ticker])
  @@index([status])
}

enum WheelStatus {
  ACTIVE           // Currently in a wheel cycle
  IDLE             // Completed cycle, waiting for new PUT
  PAUSED           // User paused the wheel
  COMPLETED        // User ended the wheel permanently
}
```

**Business Rules:**
- One active wheel per ticker per user
- Cycle count increments when CALL is assigned and position closed
- Total premiums = sum of all PUT and CALL premiums
- Total realized P/L includes stock gains/losses

**Acceptance Criteria:**
- [ ] `Wheel` table created in schema
- [ ] Migration to add wheel tracking to existing trades
- [ ] CRUD operations for wheels
- [ ] Automatic status transitions

### FR-2: Enhanced Trade Tracking

**Requirement:** Extend trade model to link to wheels and track option rolls.

**Data Model Changes:**
```typescript
model Trade {
  // ... existing fields ...
  wheelId         String?
  wheel           Wheel?      @relation("WheelTrades", fields: [wheelId], references: [id])

  // For rolling options
  rolledFromId    String?
  rolledToId      String?
  rolledFrom      Trade?      @relation("RollHistory", fields: [rolledFromId], references: [id])
  rolledTo        Trade?      @relation("RollHistory")
}
```

**Business Rules:**
- All trades in a wheel share the same `wheelId`
- When rolling, create two trades linked by `rolledFromId`/`rolledToId`
- Rolling preserves wheel continuity

**Acceptance Criteria:**
- [ ] Wheel relationship added
- [ ] Roll tracking implemented
- [ ] Queries support wheel filtering

### FR-3: Position States & Validation

**Requirement:** Add position states and validation rules for covered calls.

**Data Model Changes:**
```typescript
enum PositionStatus {
  OPEN             // Holding shares, no active CALL
  COVERED          // Holding shares, active CALL exists
  PENDING_CLOSE    // CALL assigned, waiting for confirmation
  CLOSED           // Position sold
}

model Position {
  // ... existing fields ...
  wheelId         String?
  wheel           Wheel?      @relation("WheelPositions", fields: [wheelId], references: [id])
}
```

**Business Rules:**
- Status = OPEN when no active CALLs
- Status = COVERED when one OPEN CALL exists
- Status = PENDING_CLOSE when CALL is ITM at expiration
- Cannot create new CALL if status = COVERED
- Warning if CALL strike < position cost basis

**Acceptance Criteria:**
- [ ] Position status transitions implemented
- [ ] Validation prevents multiple open CALLs
- [ ] UI shows warnings for risky strikes

### FR-4: Guided Action Flows

**Requirement:** Provide contextual, guided flows for each step of the wheel.

**Components:**
1. **Assign PUT Flow**
   - Triggered from: Trade detail, Notifications, Batch expirations
   - Shows: Cost breakdown, position preview
   - Creates: Position record
   - Offers: Immediate "Sell Call" option

2. **Sell Covered Call Flow**
   - Triggered from: Position detail, Wheel detail
   - Pre-fills: Ticker, position, shares
   - Validates: Strike vs cost basis, existing CALLs
   - Creates: CALL trade linked to position

3. **Assign CALL Flow**
   - Triggered from: Trade detail, Notifications
   - Shows: Profit summary, return %, annualized return
   - Creates: Closed position, incremented cycle
   - Offers: Immediate "Start New PUT" option

4. **Roll Option Flow**
   - Triggered from: Trade detail
   - Shows: Net credit/debit
   - Creates: Two linked trades (close + open)

**Acceptance Criteria:**
- [ ] All flows accessible from multiple entry points
- [ ] Clear confirmation dialogs
- [ ] Atomic transactions
- [ ] Optional next-step prompts

### FR-5: Expiration Calendar & Notifications

**Requirement:** Help users manage upcoming expirations and assignments.

**Features:**
1. **Expiration Calendar View**
   - List all trades by expiration date
   - Color code: Green (OTM), Yellow (ATM), Red (ITM)
   - Batch actions: Mark expired, Assign selected

2. **Notification System**
   - Email/In-app notifications for:
     - Options expiring in 3 days
     - Options ITM at expiration
     - Position ready for covered call (no active CALL)
   - Configurable notification preferences

3. **Dashboard Alerts**
   - Show count of expiring options
   - Show count of positions without CALLs
   - Show count of ITM options

**Acceptance Criteria:**
- [ ] Expiration calendar page
- [ ] Notification system implemented
- [ ] Dashboard shows actionable alerts
- [ ] Batch operations work correctly

### FR-6: Wheel Analytics & Reporting

**Requirement:** Provide insights into wheel performance and efficiency.

**Metrics:**
1. **Per-Wheel Metrics**
   - Total cycles completed
   - Average profit per cycle
   - Win rate (profitable cycles / total cycles)
   - Average cycle duration (days)
   - Annualized return
   - Current step in cycle

2. **Portfolio Metrics**
   - Total wheels (active/idle/completed)
   - Total capital deployed
   - Total premiums collected
   - Total realized P&L
   - Overall win rate
   - Best/worst performing tickers

3. **Visualizations**
   - P&L over time per wheel
   - Win rate by ticker
   - Premium collection by month
   - Cycle duration distribution

**Acceptance Criteria:**
- [ ] Wheels dashboard with metrics
- [ ] Per-wheel detail page
- [ ] Charts and visualizations
- [ ] Export wheel history to CSV

### FR-7: Validation & Safety

**Requirement:** Prevent common errors and warn about risky actions.

**Validations:**
1. **Cash-Secured PUT**
   - Verify user has cash to cover assignment
   - Formula: `cashRequired = strikePrice × shares`
   - Warning if cash < requirement

2. **Covered CALL**
   - Verify position has enough shares
   - Prevent multiple open CALLs on same position
   - Warning if strike < cost basis (guaranteed loss if assigned)
   - Suggestion: strike ≥ cost basis + (desired profit / shares)

3. **Assignment**
   - Confirm assignment creates/closes correct position
   - Show detailed profit/loss calculations
   - Require explicit confirmation

4. **Wheel Continuity**
   - Warn if creating trade outside active wheel
   - Suggest linking to existing wheel
   - Prevent closing position with active CALL

**Acceptance Criteria:**
- [ ] All validations implemented server-side
- [ ] Client-side validations for UX
- [ ] Clear warning messages
- [ ] Prevent invalid state transitions

---

## Technical Specifications

### Database Schema Changes

**New Tables:**

```sql
-- Wheel tracking
CREATE TABLE "Wheel" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "ticker" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "cycleCount" INTEGER NOT NULL DEFAULT 0,
  "totalPremiums" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalRealizedPL" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivityAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP,
  "notes" TEXT,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "Wheel_userId_ticker_idx" ON "Wheel"("userId", "ticker");
CREATE INDEX "Wheel_status_idx" ON "Wheel"("status");
CREATE UNIQUE INDEX "Wheel_userId_ticker_active_idx"
  ON "Wheel"("userId", "ticker")
  WHERE "status" = 'ACTIVE';
```

**Modified Tables:**

```sql
-- Add wheel tracking to trades
ALTER TABLE "Trade" ADD COLUMN "wheelId" TEXT;
ALTER TABLE "Trade" ADD COLUMN "rolledFromId" TEXT;
ALTER TABLE "Trade" ADD COLUMN "rolledToId" TEXT;
CREATE INDEX "Trade_wheelId_idx" ON "Trade"("wheelId");

-- Add wheel tracking to positions
ALTER TABLE "Position" ADD COLUMN "wheelId" TEXT;
CREATE INDEX "Position_wheelId_idx" ON "Position"("wheelId");

-- Update position status enum
-- (Requires migration to add new statuses)
```

### API Endpoints

**New Server Actions:**

```typescript
// Wheel management
async function createWheel(input: CreateWheelInput): Promise<ActionResult<Wheel>>
async function getWheels(filters?: WheelFilters): Promise<ActionResult<Wheel[]>>
async function getWheelDetail(wheelId: string): Promise<ActionResult<WheelDetail>>
async function updateWheel(wheelId: string, input: UpdateWheelInput): Promise<ActionResult<Wheel>>
async function pauseWheel(wheelId: string): Promise<ActionResult<void>>
async function completeWheel(wheelId: string): Promise<ActionResult<void>>

// Enhanced trade actions
async function rollOption(input: RollOptionInput): Promise<ActionResult<{ closedId: string, openedId: string }>>
async function batchExpire(tradeIds: string[]): Promise<ActionResult<BatchResult>>
async function batchAssign(tradeIds: string[]): Promise<ActionResult<BatchResult>>

// Notifications
async function getUpcomingExpirations(days: number): Promise<ActionResult<Trade[]>>
async function getITMOptions(): Promise<ActionResult<Trade[]>>
async function getPositionsWithoutCalls(): Promise<ActionResult<Position[]>>

// Analytics
async function getWheelMetrics(wheelId: string): Promise<ActionResult<WheelMetrics>>
async function getPortfolioMetrics(): Promise<ActionResult<PortfolioMetrics>>
```

### Type Definitions

```typescript
interface CreateWheelInput {
  ticker: string
  initialPutStrike?: number
  notes?: string
}

interface WheelDetail {
  wheel: Wheel
  currentTrades: Trade[]
  currentPosition?: Position
  cycleHistory: WheelCycle[]
  metrics: WheelMetrics
}

interface WheelCycle {
  cycleNumber: number
  putTrade: Trade
  position: Position
  callTrades: Trade[]
  totalPremiums: number
  realizedPL: number
  duration: number // days
  startDate: Date
  endDate: Date
}

interface WheelMetrics {
  cycleCount: number
  totalPremiums: number
  totalRealizedPL: number
  avgCyclePL: number
  avgCycleDuration: number
  winRate: number
  annualizedReturn: number
  currentStep: 'PUT' | 'HOLDING' | 'COVERED' | 'IDLE'
}

interface RollOptionInput {
  tradeId: string
  newStrike: number
  newExpiration: Date
  closePremium: number
  openPremium: number
}
```

### Component Architecture

**New Pages:**
- `/wheels` - List of all wheels with metrics
- `/wheels/[id]` - Detailed wheel view with cycle history
- `/wheels/new` - Create new wheel
- `/expirations` - Expiration calendar and batch actions
- `/notifications` - Notification center

**New Components:**
- `<WheelCard>` - Summary card showing wheel status and metrics
- `<WheelStatusBadge>` - Visual indicator of current wheel step
- `<AssignPutDialog>` - Guided PUT assignment flow
- `<SellCallDialog>` - Guided CALL creation flow
- `<AssignCallDialog>` - Guided CALL assignment flow
- `<RollOptionDialog>` - Option rolling interface
- `<ExpirationCalendar>` - Calendar view of expirations
- `<WheelMetricsChart>` - Performance visualization per wheel
- `<NotificationBell>` - Header notification icon
- `<ActionableAlerts>` - Dashboard alerts section

### Business Logic Modules

**New Calculation Utilities:**

```typescript
// lib/calculations/wheel.ts
export function calculateCyclePL(cycle: WheelCycle): number
export function calculateAnnualizedReturn(pl: number, duration: number, capital: number): number
export function calculateWinRate(cycles: WheelCycle[]): number
export function suggestCallStrike(position: Position, desiredReturn: number): number
export function validateCashRequirement(user: User, strikePrice: number, contracts: number): boolean
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Establish wheel tracking and data model

- [ ] Create `Wheel` database schema
- [ ] Add migration for wheel tracking
- [ ] Implement basic wheel CRUD actions
- [ ] Link existing trades/positions to wheels (migration)
- [ ] Create wheels list page
- [ ] Create wheel detail page
- [ ] Tests for wheel model and actions

**Deliverables:**
- Wheel entity fully functional
- UI to view existing wheels
- Migration script for existing data

### Phase 2: Guided Flows (Week 3-4)

**Goal:** Implement step-by-step guided flows

- [ ] Assign PUT dialog with position preview
- [ ] Sell Call dialog with pre-filled position data
- [ ] Assign CALL dialog with profit summary
- [ ] Optional next-step prompts after each action
- [ ] Roll option functionality
- [ ] Enhanced trade entry form (link to wheel)
- [ ] Tests for all flows

**Deliverables:**
- Complete guided flows from PUT → Assignment → CALL → Assignment
- Ability to roll options
- Improved UX with contextual actions

### Phase 3: Validation & Safety (Week 5)

**Goal:** Add validation rules and warnings

- [ ] Cash requirement validation for PUTs
- [ ] Multiple CALL prevention
- [ ] Strike price warnings (below cost basis)
- [ ] Position state validation
- [ ] Server-side validation in actions
- [ ] Client-side validation in forms
- [ ] Tests for all validations

**Deliverables:**
- Comprehensive validation system
- Clear user warnings
- Prevention of invalid states

### Phase 4: Expirations & Notifications (Week 6-7)

**Goal:** Help users manage expirations

- [ ] Expiration calendar page
- [ ] Batch expiration actions
- [ ] Batch assignment actions
- [ ] Notification system setup
- [ ] Email notifications (optional)
- [ ] In-app notification center
- [ ] Dashboard alerts widget
- [ ] Tests for notifications

**Deliverables:**
- Full expiration management
- Notification system
- Batch processing capabilities

### Phase 5: Analytics & Reporting (Week 8-9)

**Goal:** Provide wheel performance insights

- [ ] Wheel metrics calculations
- [ ] Portfolio metrics calculations
- [ ] Wheels dashboard with metrics
- [ ] Per-wheel charts (P&L over time)
- [ ] Cycle history view
- [ ] Win rate and return calculations
- [ ] Best/worst performers
- [ ] Export wheel history to CSV
- [ ] Tests for calculations

**Deliverables:**
- Complete analytics suite
- Visual performance tracking
- Data export capabilities

### Phase 6: Polish & Optimization (Week 10)

**Goal:** Refinement and performance

- [ ] Performance optimization (query efficiency)
- [ ] UI/UX refinements based on testing
- [ ] Mobile responsiveness
- [ ] Accessibility improvements
- [ ] Documentation updates
- [ ] Help guides for wheel strategy
- [ ] Video tutorials (optional)
- [ ] Final testing and bug fixes

**Deliverables:**
- Polished, production-ready system
- Complete documentation
- User guides

---

## Success Metrics

### User Engagement Metrics

1. **Wheel Adoption Rate**
   - Target: 80% of users have at least 1 active wheel
   - Measure: `(users with wheels / total users) × 100`

2. **Flow Completion Rate**
   - Target: 90% of PUT assignments lead to position creation
   - Target: 70% of positions have covered calls within 7 days
   - Measure: Funnel analysis through wheel steps

3. **Time to Action**
   - Target: < 2 minutes to assign PUT and create position
   - Target: < 1 minute to sell covered call
   - Measure: Time between assignment and position creation

### Trading Performance Metrics

1. **Average Wheel P&L**
   - Target: Positive P&L on 70% of completed cycles
   - Measure: `profitable_cycles / total_cycles`

2. **Premium Collection**
   - Target: Average 2% premium per PUT
   - Target: Average 1.5% premium per CALL
   - Measure: `premium / (strike × shares) × 100`

3. **Cycle Efficiency**
   - Target: Average cycle duration < 60 days
   - Target: Average annualized return > 20%
   - Measure: `(total_pl / capital / days) × 365 × 100`

### System Health Metrics

1. **Error Rate**
   - Target: < 1% of trade entries fail validation
   - Target: < 0.1% of assignments create incorrect positions

2. **Data Integrity**
   - Target: 100% of positions link to valid assignment trade
   - Target: 100% of CALLs link to valid positions
   - Target: 0 orphaned trades (trade without wheel)

3. **Performance**
   - Target: Wheels page loads < 1 second
   - Target: Wheel detail page loads < 2 seconds
   - Target: Assignment operation completes < 500ms

---

## Appendices

### Appendix A: Wheel State Machine

```
States: IDLE → COLLECTING_PREMIUM → HOLDING_POSITION → COVERED_POSITION → CYCLE_COMPLETE

Transitions:
  IDLE → COLLECTING_PREMIUM
    Trigger: Create new PUT trade

  COLLECTING_PREMIUM → HOLDING_POSITION
    Trigger: PUT assigned
    Action: Create position

  COLLECTING_PREMIUM → COLLECTING_PREMIUM
    Trigger: PUT expired
    Action: Create new PUT (optional)

  HOLDING_POSITION → COVERED_POSITION
    Trigger: Create CALL trade

  COVERED_POSITION → HOLDING_POSITION
    Trigger: CALL expired
    Action: Create new CALL (optional)

  COVERED_POSITION → CYCLE_COMPLETE
    Trigger: CALL assigned
    Action: Close position, increment cycle

  CYCLE_COMPLETE → COLLECTING_PREMIUM
    Trigger: Create new PUT

  CYCLE_COMPLETE → IDLE
    Trigger: User chooses not to continue

  * → PAUSED
    Trigger: User pauses wheel

  PAUSED → (previous state)
    Trigger: User resumes wheel

  * → COMPLETED
    Trigger: User ends wheel permanently
```

### Appendix B: Glossary

**Assignment**: When an option is exercised against you. For PUTs, you're forced to buy shares. For CALLs, you're forced to sell shares.

**Cash-Secured PUT**: Selling a put option while holding enough cash to buy the shares if assigned.

**Cost Basis**: The effective price per share you paid, accounting for premiums collected.

**Covered CALL**: Selling a call option while owning the underlying shares.

**Cycle**: One complete rotation of the wheel (PUT → Assignment → CALL → Assignment).

**ITM (In The Money)**: An option with intrinsic value. PUT is ITM when stock < strike. CALL is ITM when stock > strike.

**OTM (Out of The Money)**: An option with no intrinsic value. PUT is OTM when stock > strike. CALL is OTM when stock < strike.

**Premium**: The income collected from selling an option.

**Roll**: Closing an existing option and opening a new one with different strike/expiration.

**Strike Price**: The price at which the option can be exercised.

**Wheel Strategy**: A systematic strategy of selling PUTs, getting assigned, selling CALLs, and repeating.

### Appendix C: Comparison Matrix

| Feature | Current State | Target State | Gap |
|---------|---------------|--------------|-----|
| **Trade Entry** | Manual, independent | Linked to wheels, guided | Wheel linking |
| **PUT Assignment** | Manual action | Guided flow with preview | Assignment dialog |
| **Position Management** | Basic tracking | Full lifecycle states | Enhanced states |
| **CALL Creation** | Manual, from scratch | Pre-filled from position | Quick action flow |
| **CALL Assignment** | Manual action | Guided with P&L summary | Assignment dialog |
| **Cycle Tracking** | None | Automatic, per-ticker | Wheel entity |
| **Expirations** | Manual, one-by-one | Calendar view, batch | Expiration page |
| **Notifications** | None | Email/in-app alerts | Notification system |
| **Analytics** | Basic dashboard | Per-wheel metrics | Wheel analytics |
| **Validation** | Basic | Comprehensive safety | Enhanced validation |
| **Roll Options** | Manual close+open | Single roll action | Roll flow |
| **Multi-ticker** | Separate trades | Organized by wheels | Wheel grouping |

### Appendix D: Risk Mitigation

**Risk 1: Data Migration Complexity**
- **Impact**: Existing trades may not map cleanly to wheels
- **Mitigation**: Create migration script that groups trades by ticker and attempts to reconstruct cycles
- **Fallback**: Allow manual wheel assignment for ambiguous cases

**Risk 2: User Confusion with New Concepts**
- **Impact**: Users familiar with current system may resist new wheel concept
- **Mitigation**: Provide "classic mode" toggle for simple trade entry, gradual onboarding
- **Fallback**: Comprehensive help documentation and video tutorials

**Risk 3: Performance with Large Datasets**
- **Impact**: Users with hundreds of trades may see slow wheel calculations
- **Mitigation**: Add database indexes, cache wheel metrics, paginate history
- **Fallback**: Lazy load cycle history, show summary first

**Risk 4: Validation False Positives**
- **Impact**: Overly strict validation may block legitimate trades
- **Mitigation**: Use warnings instead of errors for non-critical validations
- **Fallback**: Admin override option for edge cases

---

## Questions for Product Review

1. **Should we support partial assignments?** (e.g., 1 PUT assigned out of 3 contracts)
2. **Should wheels automatically pause if not traded for X days?**
3. **Should we allow multiple wheels on the same ticker?** (e.g., different strike prices)
4. **Do we need integration with brokers for automatic expiration data?**
5. **Should we track "opportunity cost" for shares held?**
6. **Do we need mobile app support or is web sufficient?**
7. **Should we support other strategies (covered call only, put-only)?**
8. **What's the priority for broker integrations?** (TDA, IBKR, RobinHood)

---

**Document Status:** DRAFT - Awaiting Mayor Approval
**Next Review:** Pending stakeholder feedback
**Last Updated:** 2026-02-08

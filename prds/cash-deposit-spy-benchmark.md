# Cash Deposit & SPY Benchmark Tracking - Product Requirements Document

**dispatched_by: mayor**

## Executive Summary

This PRD defines the requirements for tracking cash deposits into the trading account and automatically maintaining a simulated SPY benchmark portfolio. This feature enables true apples-to-apples performance comparison by ensuring that every dollar invested in the wheel strategy is also virtually invested in SPY at the same time, providing a fair benchmark against passive index investing.

**Document Version:** 1.0
**Last Updated:** 2026-02-10
**Status:** Draft

---

## Table of Contents

1. [Background & Problem Statement](#background--problem-statement)
2. [Current State Analysis](#current-state-analysis)
3. [Target State Vision](#target-state-vision)
4. [User Flows & Stories](#user-flows--stories)
5. [Functional Requirements](#functional-requirements)
6. [Technical Specifications](#technical-specifications)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Success Metrics](#success-metrics)

---

## Background & Problem Statement

### The Core Question

**"Am I doing better with the wheel strategy than if I just bought and held SPY?"**

This is the fundamental question every wheel trader wants answered. However, the current benchmark system has a critical flaw: it assumes all capital was invested at once on a single date. In reality, traders add cash to their accounts over time, and each deposit represents a new investment decision point.

### The Fairness Problem

**Current Benchmark Limitation:**
```
User Setup:
- Created SPY benchmark on Jan 1 with $10,000
- SPY was at $450/share
- Virtual position: 22.22 shares

Reality:
- User deposited $5,000 on Jan 1
- User deposited $5,000 on Feb 1
- SPY moved from $450 → $480 in that month

Result: Benchmark shows incorrect comparison because it assumes all $10,000 was invested at $450
```

**The Fair Solution:**
Each cash deposit should trigger a proportional SPY share purchase at the market price at that time, just as if the user had a separate "buy SPY" account.

### Why This Matters

1. **Accurate Performance Attribution** - Know if your strategy is truly adding value
2. **Investment Decisions** - Should you keep doing the wheel or switch to passive investing?
3. **Psychological Confidence** - See real, fair comparisons that account for market timing
4. **Capital Allocation** - Understand opportunity cost of deployed vs. idle cash

### The Opportunity

By tracking cash deposits and automatically updating the SPY benchmark, we can:
- Provide the most accurate performance comparison in the options trading world
- Give users confidence in their strategy (or warn them if passive is better)
- Differentiate our product from competitors who don't handle this correctly
- Enable smart capital allocation decisions

---

## Current State Analysis

### What Exists Today

The current system has a `MarketBenchmark` model that tracks a simulated index investment:

✅ **Market Benchmark Features**
- Manual setup of SPY/QQQ/VTI benchmarks
- Single initial capital amount and setup date
- Automatic price fetching and P&L calculation
- Comparison UI showing wheel strategy vs. benchmark
- Return % and gain/loss metrics

**Database Schema:**
```typescript
MarketBenchmark {
  ticker: "SPY"
  initialCapital: $10000
  setupDate: 2026-01-01
  initialPrice: $450
  shares: 22.22
  lastUpdated: DateTime
}
```

**Calculation Logic:**
```typescript
// Current value = shares × current price
currentValue = 22.22 × $480 = $10,666
gainLoss = $10,666 - $10,000 = $666
returnPercent = ($666 / $10,000) × 100 = 6.66%
```

✅ **Comparison UI**
- `BenchmarkComparisonSection` component on dashboard
- Side-by-side metrics (Wheel vs. Benchmark)
- Performance difference calculations
- Visual chart showing growth over time
- Benchmark selector (SPY, QQQ, VTI, etc.)

### Current Gaps

❌ **No Cash Deposit Tracking**
- No way to record when cash is added to the account
- No historical log of capital inflows
- Can't distinguish between initial capital and additional deposits

❌ **Inaccurate Benchmark Calculations**
- Assumes all capital invested at once
- Doesn't account for dollar-cost averaging effect
- Can't handle multiple deposits over time
- Distorts comparisons when market has moved significantly

❌ **No Deposit-Triggered Benchmark Updates**
- Manual benchmark setup requires user to remember initial capital
- No automatic SPY share purchases when cash is deposited
- No link between real cash inflow and benchmark tracking

❌ **No Cash Flow History**
- Can't see when and how much cash was deposited
- Can't audit the benchmark calculations
- Can't answer "how much have I invested total?"

❌ **No Partial Withdrawals**
- No way to track cash taken out of the account
- Can't adjust benchmark when capital is removed
- Distorts comparisons if user withdraws profits

### Example of Current Problem

**Scenario:**
1. User deposits $5,000 on Jan 1 (SPY at $450)
2. User sets up SPY benchmark with $5,000
3. User deposits $5,000 on Mar 1 (SPY at $480)
4. User manually updates benchmark to $10,000... but how?
   - **Wrong:** Update initialCapital to $10,000 → shows benchmark as if all $10k was at $450
   - **Right:** Need to track both deposits separately and calculate weighted average

**The Math:**
```
Correct Benchmark Calculation:
Deposit 1: $5,000 @ $450 = 11.11 shares
Deposit 2: $5,000 @ $480 = 10.42 shares
Total: 21.53 shares (not 22.22!)

If SPY goes to $500:
Current System: 22.22 × $500 = $11,110 (wrong)
Correct System: 21.53 × $500 = $10,765 (right)
Difference: $345 error in benchmark!
```

---

## Target State Vision

### Vision Statement

> A cash deposit tracking system that automatically maintains a fair, accurate SPY benchmark by simulating real-time share purchases at market prices, enabling traders to definitively answer: "Am I beating SPY?"

### Key Principles

1. **Cash In = SPY In** - Every deposit triggers proportional SPY share purchase
2. **Market Timing Accuracy** - Use actual prices at deposit time
3. **Transparent Audit Trail** - Full history of deposits and SPY purchases
4. **Automatic Synchronization** - No manual benchmark updates needed
5. **Fair Comparison** - Dollar-cost averaging reflected in benchmark

### The Ideal User Experience

**Future Process (Automated):**

1. User deposits $5,000 cash into trading account
2. User logs into Wheel Tracker → "Record Cash Deposit"
3. Enter amount: $5,000, date: today
4. **System automatically:**
   - Fetches current SPY price ($480)
   - Calculates shares: $5,000 / $480 = 10.42 shares
   - Adds shares to existing SPY benchmark
   - Updates total invested capital
   - Recalculates all comparison metrics
5. User sees updated comparison on dashboard
6. Benchmark now accurately reflects dollar-cost averaging

**Enhanced Dashboard:**

```
BENCHMARK COMPARISON

Your Wheel Strategy
Total P&L: +$1,250
Return: 8.5%
Capital Deployed: $14,700

SPY Benchmark (Auto-Tracked)
Total P&L: +$875
Return: 6.1%
Total Invested: $14,300
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Performance Difference
You're outperforming SPY by: +$375 (+2.4%)
✅ Your wheel strategy is winning!

Cash Deposit History (5 total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jan 1:  $5,000 → 11.11 SPY shares @ $450
Feb 1:  $3,000 → 6.32 SPY shares @ $475
Mar 1:  $5,000 → 10.42 SPY shares @ $480
Apr 1:  $1,000 → 2.04 SPY shares @ $490
May 1:  $300   → 0.61 SPY shares @ $492
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total SPY Shares: 30.50
Current Value: $15,175 @ $497.54
```

---

## User Flows & Stories

### User Story 1: Recording First Cash Deposit

**As a** new user setting up the wheel tracker
**I want to** record my initial cash deposit
**So that** the system can start tracking my SPY benchmark automatically

**Flow:**
1. User navigates to "Cash Deposits" or sees prompt on dashboard
2. Click "Record Cash Deposit"
3. Form appears:
   - Amount: $5,000
   - Date: 2026-01-15 (defaults to today)
   - Notes: "Initial funding" (optional)
4. User submits
5. System:
   - Validates amount > 0
   - Fetches SPY price for that date ($450)
   - Calculates shares: 5000 / 450 = 11.11 shares
   - Creates `CashDeposit` record
   - Creates or updates `MarketBenchmark` for SPY
   - Adds 11.11 shares to SPY benchmark
6. Success message: "Deposited $5,000. Added 11.11 SPY shares @ $450"
7. Redirect to dashboard showing new benchmark comparison

**Acceptance Criteria:**
- [ ] Can record deposit amount and date
- [ ] System fetches SPY price for that date
- [ ] Shares calculated correctly
- [ ] CashDeposit record created
- [ ] MarketBenchmark updated with new shares
- [ ] Dashboard shows updated comparison
- [ ] Can add optional notes
- [ ] Error handling for invalid dates or amounts

### User Story 2: Recording Additional Deposit

**As a** user who has been trading for a while
**I want to** record a new cash deposit
**So that** my benchmark stays accurate as I add more capital

**Flow:**
1. User adds $3,000 to their brokerage account
2. Navigate to dashboard → "Record Deposit" button (prominent)
3. Quick deposit form:
   - Amount: $3,000
   - Date: Today (auto-filled)
   - Notes: (optional)
4. User submits
5. System shows preview:
   ```
   Deposit Summary
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   Amount: $3,000
   Date: 2026-02-10
   SPY Price: $475.50
   Shares to Add: 6.31 shares

   Your Benchmark After Deposit:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   Current SPY Shares: 11.11
   New SPY Shares: 17.42
   Total Invested: $8,000
   Current Value: $8,283

   [Confirm Deposit] [Cancel]
   ```
6. User confirms
7. Deposit recorded, benchmark updated
8. Dashboard refreshed with new comparison

**Acceptance Criteria:**
- [ ] Quick access from dashboard
- [ ] Preview shows deposit impact
- [ ] Adds to existing SPY shares
- [ ] Maintains deposit history
- [ ] All comparisons automatically update

### User Story 3: Viewing Deposit History

**As a** user tracking my investments over time
**I want to** see all my cash deposits and SPY purchases
**So that** I can audit my benchmark and understand my investment timeline

**Flow:**
1. Navigate to "Cash Deposits" page or "Benchmark Details"
2. See comprehensive table:
   ```
   CASH DEPOSIT HISTORY

   ┌──────────┬───────────┬──────────────┬──────────────┬─────────────┐
   │ Date     │ Amount    │ SPY Price    │ Shares Added │ Notes       │
   ├──────────┼───────────┼──────────────┼──────────────┼─────────────┤
   │ May 1    │ $300      │ $492.00      │ 0.61         │ Top-up      │
   │ Apr 1    │ $1,000    │ $490.00      │ 2.04         │             │
   │ Mar 1    │ $5,000    │ $480.00      │ 10.42        │ Bonus!      │
   │ Feb 1    │ $3,000    │ $475.00      │ 6.32         │             │
   │ Jan 1    │ $5,000    │ $450.00      │ 11.11        │ Initial     │
   └──────────┴───────────┴──────────────┴──────────────┴─────────────┘

   SUMMARY
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   Total Deposits: 5
   Total Cash Invested: $14,300
   Total SPY Shares: 30.50
   Average Cost Basis: $468.85/share
   Current SPY Price: $497.54
   Current Value: $15,175
   Unrealized Gain: +$875 (+6.1%)
   ```
3. Can filter by date range
4. Can export to CSV
5. Can edit/delete deposits (with warnings about affecting benchmark)

**Acceptance Criteria:**
- [ ] Shows all deposits in reverse chronological order
- [ ] Displays SPY price and shares for each deposit
- [ ] Shows summary metrics
- [ ] Can filter and sort
- [ ] Export functionality
- [ ] Edit/delete with warnings

### User Story 4: Dashboard Auto-Update with Deposit

**As a** trader monitoring my performance
**I want** the dashboard comparison to automatically reflect my deposits
**So that** I always see accurate benchmark comparisons without manual work

**Flow:**
1. User is on dashboard, sees current comparison
2. User records new $2,000 deposit
3. After deposit is recorded:
   - Dashboard comparison automatically refreshes
   - SPY benchmark metrics update
   - Performance difference recalculates
   - Chart updates to show new benchmark trajectory
4. User sees updated "Difference" section:
   - If wheel strategy still outperforming: ✅ "Still beating SPY by X%"
   - If now underperforming: ⚠️ "SPY is now ahead by X%"

**Acceptance Criteria:**
- [ ] Dashboard updates after deposit
- [ ] No page refresh needed
- [ ] All metrics recalculate correctly
- [ ] Chart reflects new data
- [ ] Performance status updates

### User Story 5: Handling Withdrawals

**As a** trader who occasionally withdraws profits
**I want to** record cash withdrawals
**So that** my benchmark accurately reflects reduced capital

**Flow:**
1. Navigate to "Record Withdrawal"
2. Form:
   - Amount: $1,000
   - Date: Today
   - Type: "Profit Withdrawal" or "Capital Withdrawal"
   - Notes: (optional)
3. System shows preview:
   ```
   Withdrawal Impact
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
   Withdrawal: $1,000

   SPY Benchmark Adjustment:
   Current SPY Price: $500
   Shares to Sell: 2.00 shares

   After Withdrawal:
   Remaining SPY Shares: 28.50
   Total Invested: $13,300
   ```
4. User confirms
5. Withdrawal recorded
6. SPY shares reduced proportionally
7. Benchmark and comparisons update

**Acceptance Criteria:**
- [ ] Can record withdrawals
- [ ] SPY shares reduced proportionally
- [ ] Total invested capital adjusted
- [ ] Benchmark stays accurate
- [ ] Withdrawal history tracked separately

### User Story 6: Migrating Existing User

**As an** existing user who already has a benchmark set up
**I want to** migrate to the new deposit-based system
**So that** my future deposits are tracked accurately

**Flow:**
1. User logs in, sees banner: "New Feature: Track your cash deposits for better benchmarks!"
2. Click "Learn More"
3. Migration wizard:
   ```
   Migrate Your Benchmark

   We found an existing SPY benchmark:
   - Initial Capital: $10,000
   - Setup Date: 2026-01-01
   - SPY Price: $450.00
   - Shares: 22.22

   Convert to Deposit-Based Tracking?

   This will create a single historical deposit:
   - Date: 2026-01-01
   - Amount: $10,000
   - SPY Shares: 22.22 @ $450

   [Migrate Now] [Keep Old System]
   ```
4. User clicks "Migrate Now"
5. System:
   - Creates `CashDeposit` record from existing benchmark
   - Preserves all existing calculations
   - Enables deposit tracking going forward
6. Success: "Migration complete! You can now track new deposits."

**Acceptance Criteria:**
- [ ] Detects existing benchmarks
- [ ] Offers migration wizard
- [ ] Converts existing benchmark to single deposit
- [ ] Preserves historical data
- [ ] Enables new deposit tracking
- [ ] Optional (can keep old system)

---

## Functional Requirements

### FR-1: Cash Deposit Model

**Requirement:** Create a `CashDeposit` model to track all cash inflows and outflows.

**Data Model:**
```typescript
model CashDeposit {
  id              String          @id @default(cuid())
  userId          String
  amount          Decimal         @db.Decimal(10, 2)
  type            DepositType     @default(DEPOSIT)
  depositDate     DateTime
  notes           String?

  // Benchmark tracking
  spyPrice        Decimal         @db.Decimal(10, 4) // SPY price at deposit time
  spyShares       Decimal         @db.Decimal(10, 4) // Shares purchased/sold

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([depositDate])
  @@index([userId, depositDate])
}

enum DepositType {
  DEPOSIT          // Cash added to account
  WITHDRAWAL       // Cash removed from account
}
```

**Business Rules:**
- Amount must be positive for DEPOSIT, negative internally for WITHDRAWAL
- depositDate cannot be in the future
- SPY price fetched automatically from market data API
- SPY shares calculated: amount / spyPrice
- For withdrawals, shares are negative (reducing total)

**Acceptance Criteria:**
- [ ] `CashDeposit` table created
- [ ] CRUD operations implemented
- [ ] SPY price fetched at deposit time
- [ ] SPY shares calculated automatically
- [ ] Validation prevents invalid data

### FR-2: Automatic Benchmark Updates

**Requirement:** Automatically update the SPY `MarketBenchmark` when deposits/withdrawals are recorded.

**Logic:**
```typescript
async function recordDeposit(userId: string, amount: number, date: Date): Promise<void> {
  // 1. Fetch SPY price for the date
  const spyPrice = await fetchSPYPrice(date)

  // 2. Calculate shares to add
  const shares = amount / spyPrice

  // 3. Create deposit record
  const deposit = await createCashDeposit({
    userId,
    amount,
    type: 'DEPOSIT',
    depositDate: date,
    spyPrice,
    spyShares: shares
  })

  // 4. Update or create SPY benchmark
  const benchmark = await getOrCreateBenchmark(userId, 'SPY')

  await updateBenchmark({
    shares: benchmark.shares + shares,
    initialCapital: benchmark.initialCapital + amount,
    // Recalculate weighted average setup date if needed
  })

  // 5. Recalculate all comparison metrics
  await recalculateComparisons(userId)
}
```

**Business Rules:**
- First deposit creates SPY benchmark if none exists
- Subsequent deposits add shares to existing benchmark
- Withdrawal reduces shares proportionally
- Total invested capital = sum of all deposits - withdrawals
- Use weighted average cost basis for display

**Acceptance Criteria:**
- [ ] Deposit triggers benchmark update
- [ ] Shares added correctly
- [ ] Capital totals updated
- [ ] Comparisons recalculate
- [ ] Atomic transaction (deposit + benchmark)

### FR-3: Deposit Management UI

**Requirement:** Provide user interface for recording and managing deposits.

**Components:**
1. **Record Deposit Button** (Dashboard)
   - Prominent button on dashboard
   - Opens modal/form
   - Quick entry for common case

2. **Deposit Form**
   - Amount input (required, positive)
   - Date picker (defaults to today)
   - Type selector (Deposit/Withdrawal)
   - Notes textarea (optional)
   - Submit with loading state

3. **Deposit Preview**
   - Shows SPY price at selected date
   - Shows shares to be added
   - Shows updated benchmark totals
   - Requires confirmation

4. **Deposit History Page**
   - Table of all deposits
   - Sortable columns
   - Filter by date range
   - Export to CSV
   - Edit/delete actions (with warnings)

5. **Dashboard Integration**
   - Show total deposits in comparison section
   - Link to deposit history
   - "Last deposit" indicator

**Acceptance Criteria:**
- [ ] Record deposit button on dashboard
- [ ] Deposit form with validation
- [ ] Preview before confirmation
- [ ] Deposit history page
- [ ] Edit/delete functionality
- [ ] CSV export

### FR-4: Enhanced Benchmark Calculations

**Requirement:** Update benchmark calculations to use deposit-based share totals.

**Changes to Calculations:**
```typescript
// Old calculation (single initial capital)
const shares = initialCapital / initialPrice
const currentValue = shares * currentPrice

// New calculation (sum of all deposits)
const totalShares = deposits.reduce((sum, d) => sum + d.spyShares, 0)
const totalInvested = deposits.reduce((sum, d) => sum + d.amount, 0)
const currentValue = totalShares * currentPrice
const gainLoss = currentValue - totalInvested
const returnPercent = (gainLoss / totalInvested) * 100

// Weighted average cost basis (for display)
const avgCostBasis = totalInvested / totalShares
```

**Enhanced Metrics:**
```typescript
interface EnhancedBenchmarkMetrics {
  // Existing fields
  ticker: string
  currentPrice: number
  currentValue: number
  gainLoss: number
  returnPercent: number

  // New fields
  totalDeposits: number       // Count of deposits
  totalInvested: number       // Sum of deposit amounts
  totalShares: number         // Sum of shares from all deposits
  avgCostBasis: number        // Weighted average cost per share
  firstDepositDate: Date      // Date of first deposit
  lastDepositDate: Date       // Date of most recent deposit
  timeWeightedReturn: number  // Optional: more accurate return calc
}
```

**Acceptance Criteria:**
- [ ] Calculations use deposit-based shares
- [ ] Total invested from deposit sum
- [ ] Average cost basis calculated
- [ ] All metrics accurate
- [ ] Tests verify calculations

### FR-5: Migration Tool for Existing Users

**Requirement:** Migrate existing single-entry benchmarks to deposit-based system.

**Migration Logic:**
```typescript
async function migrateBenchmark(userId: string, benchmarkId: string): Promise<void> {
  // 1. Get existing benchmark
  const benchmark = await getBenchmark(benchmarkId)

  // 2. Create a single historical deposit matching the benchmark
  await createCashDeposit({
    userId: benchmark.userId,
    amount: benchmark.initialCapital,
    type: 'DEPOSIT',
    depositDate: benchmark.setupDate,
    spyPrice: benchmark.initialPrice,
    spyShares: benchmark.shares,
    notes: 'Migrated from initial benchmark setup'
  })

  // 3. Mark benchmark as migrated (add flag)
  await updateBenchmark(benchmarkId, {
    migrated: true,
    migratedAt: new Date()
  })

  // 4. Verify totals match
  const depositTotal = await sumDeposits(userId)
  assert(depositTotal.shares === benchmark.shares)
  assert(depositTotal.capital === benchmark.initialCapital)
}
```

**UI:**
- Banner on dashboard for users with old benchmarks
- Migration wizard with preview
- One-click migration
- Optional (users can keep old system)
- Confirmation message after migration

**Acceptance Criteria:**
- [ ] Detects users with old benchmarks
- [ ] Migration wizard UI
- [ ] Creates equivalent deposit
- [ ] Preserves all data
- [ ] Verification checks pass
- [ ] Users can opt out

### FR-6: Deposit Analytics & Insights

**Requirement:** Provide insights into deposit patterns and timing.

**Analytics Features:**
1. **Deposit Summary Card**
   ```
   Your Investment History
   ━━━━━━━━━━━━━━━━━━━━━━━━
   Total Deposits: 12
   Total Invested: $45,000
   Average Deposit: $3,750
   First Deposit: Jan 1, 2026
   Most Recent: May 15, 2026
   Investing Frequency: ~2.4 deposits/month
   ```

2. **Dollar-Cost Averaging Visualization**
   - Chart showing deposits over time
   - SPY price at each deposit
   - Overlay showing if deposits were well-timed

3. **Deposit Timing Insights**
   - "You've invested more during market dips" ✅
   - "Consider more consistent deposit schedule" 💡
   - "Your average buy price is $X vs current $Y"

4. **Comparison with Lump Sum**
   - "If you had invested all $45k on Jan 1..."
   - "Your DCA approach saved/cost you $X"

**Acceptance Criteria:**
- [ ] Deposit summary metrics
- [ ] Visualization of deposits over time
- [ ] Dollar-cost averaging analysis
- [ ] Timing insights

### FR-7: Withdrawal Handling

**Requirement:** Track cash withdrawals and adjust benchmark accordingly.

**Withdrawal Logic:**
```typescript
async function recordWithdrawal(userId: string, amount: number, date: Date): Promise<void> {
  // 1. Fetch SPY price
  const spyPrice = await fetchSPYPrice(date)

  // 2. Calculate shares to remove (negative)
  const sharesToRemove = amount / spyPrice

  // 3. Create withdrawal record (negative amount internally)
  await createCashDeposit({
    userId,
    amount: -amount, // Store as negative
    type: 'WITHDRAWAL',
    depositDate: date,
    spyPrice,
    spyShares: -sharesToRemove // Negative shares
  })

  // 4. Update benchmark (reduce shares and capital)
  const benchmark = await getBenchmark(userId, 'SPY')
  await updateBenchmark({
    shares: benchmark.shares - sharesToRemove,
    initialCapital: benchmark.initialCapital - amount
  })

  // 5. Recalculate comparisons
  await recalculateComparisons(userId)
}
```

**Business Rules:**
- Withdrawals reduce SPY shares proportionally
- Total invested capital decreases
- Can't withdraw more than total invested
- Maintain separate list of withdrawals for audit

**Acceptance Criteria:**
- [ ] Can record withdrawals
- [ ] Shares reduced correctly
- [ ] Capital totals adjusted
- [ ] Validation prevents over-withdrawal
- [ ] Withdrawal history visible

---

## Technical Specifications

### Database Schema Changes

**New Table:**
```sql
CREATE TABLE "CashDeposit" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'DEPOSIT',
  "depositDate" TIMESTAMP NOT NULL,
  "notes" TEXT,
  "spyPrice" DECIMAL(10,4) NOT NULL,
  "spyShares" DECIMAL(10,4) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "CashDeposit_userId_idx" ON "CashDeposit"("userId");
CREATE INDEX "CashDeposit_depositDate_idx" ON "CashDeposit"("depositDate");
CREATE INDEX "CashDeposit_userId_depositDate_idx" ON "CashDeposit"("userId", "depositDate");
CREATE INDEX "CashDeposit_type_idx" ON "CashDeposit"("type");
```

**Modified Table:**
```sql
-- Add migration flag to MarketBenchmark
ALTER TABLE "MarketBenchmark" ADD COLUMN "migrated" BOOLEAN DEFAULT FALSE;
ALTER TABLE "MarketBenchmark" ADD COLUMN "migratedAt" TIMESTAMP;
CREATE INDEX "MarketBenchmark_migrated_idx" ON "MarketBenchmark"("migrated");
```

### API Endpoints

**New Server Actions:**
```typescript
// Deposit management
async function recordCashDeposit(input: RecordDepositInput): Promise<ActionResult<CashDeposit>>
async function recordCashWithdrawal(input: RecordWithdrawalInput): Promise<ActionResult<CashDeposit>>
async function getCashDeposits(userId: string): Promise<ActionResult<CashDeposit[]>>
async function getDepositHistory(filters?: DepositFilters): Promise<ActionResult<DepositHistory>>
async function updateCashDeposit(id: string, input: UpdateDepositInput): Promise<ActionResult<CashDeposit>>
async function deleteCashDeposit(id: string): Promise<ActionResult<void>>

// Enhanced benchmark queries
async function getDepositBasedBenchmark(userId: string, ticker: string): Promise<ActionResult<EnhancedBenchmarkMetrics>>
async function getDepositSummary(userId: string): Promise<ActionResult<DepositSummary>>
async function getDollarCostAveragingAnalysis(userId: string): Promise<ActionResult<DCAAnalysis>>

// Migration
async function migrateTradeBenchmark(benchmarkId: string): Promise<ActionResult<MigrationResult>>
async function checkMigrationStatus(userId: string): Promise<ActionResult<MigrationStatus>>
```

### Type Definitions

```typescript
interface RecordDepositInput {
  amount: number        // Positive number
  depositDate: Date     // Cannot be future
  notes?: string
}

interface RecordWithdrawalInput {
  amount: number        // Positive number (converted to negative internally)
  depositDate: Date
  notes?: string
}

interface CashDeposit {
  id: string
  userId: string
  amount: number
  type: 'DEPOSIT' | 'WITHDRAWAL'
  depositDate: Date
  notes?: string
  spyPrice: number
  spyShares: number
  createdAt: Date
  updatedAt: Date
}

interface EnhancedBenchmarkMetrics {
  // Base metrics
  ticker: string
  currentPrice: number
  currentValue: number
  gainLoss: number
  returnPercent: number

  // Deposit-based metrics
  totalDeposits: number
  totalInvested: number
  totalShares: number
  avgCostBasis: number
  firstDepositDate: Date
  lastDepositDate: Date

  // Insights
  dollarCostAveraging: {
    avgPurchasePrice: number
    currentPrice: number
    timingBenefit: number  // Positive if DCA was good
  }
}

interface DepositHistory {
  deposits: CashDeposit[]
  summary: {
    totalDeposits: number
    totalWithdrawals: number
    netInvested: number
    avgDepositAmount: number
    depositFrequency: string
  }
}

interface DCAAnalysis {
  deposits: Array<{
    date: Date
    amount: number
    spyPrice: number
    shares: number
  }>
  metrics: {
    avgPurchasePrice: number
    currentPrice: number
    vsLumpSum: {
      lumpSumValue: number
      dcaValue: number
      difference: number
      percentDiff: number
    }
  }
  insights: string[]
}

interface MigrationStatus {
  hasOldBenchmark: boolean
  needsMigration: boolean
  benchmarkDetails?: {
    ticker: string
    initialCapital: number
    setupDate: Date
    shares: number
  }
}
```

### Component Architecture

**New Pages:**
- `/deposits` - Cash deposit history and management
- `/deposits/new` - Record new deposit
- `/deposits/analytics` - Deposit analytics and DCA insights

**New Components:**
- `<RecordDepositButton>` - Quick deposit entry from dashboard
- `<DepositForm>` - Form for recording deposits/withdrawals
- `<DepositPreview>` - Shows impact before confirmation
- `<DepositHistoryTable>` - Table of all deposits
- `<DepositSummaryCard>` - Summary metrics
- `<DCAChart>` - Dollar-cost averaging visualization
- `<DepositTimeline>` - Timeline view of deposits
- `<MigrationWizard>` - Benchmark migration flow
- `<WithdrawalForm>` - Form for recording withdrawals

**Modified Components:**
- `<BenchmarkComparisonSection>` - Add deposit count, link to history
- `<BenchmarkSelector>` - Show "deposit-based" badge
- `<PLDashboard>` - Add deposit button, show last deposit

### Calculation Modules

**New Utilities:**
```typescript
// lib/calculations/deposits.ts
export function calculateDepositBasedBenchmark(deposits: CashDeposit[], currentPrice: number): EnhancedBenchmarkMetrics
export function calculateDollarCostAverage(deposits: CashDeposit[]): number
export function analyzeDCATiming(deposits: CashDeposit[], priceHistory: PricePoint[]): DCAAnalysis
export function calculateDepositFrequency(deposits: CashDeposit[]): number
export function compareToLumpSum(deposits: CashDeposit[], lumpSumDate: Date, currentPrice: number): LumpSumComparison

// lib/calculations/benchmark.ts (updates)
export function getBenchmarkFromDeposits(userId: string): Promise<EnhancedBenchmarkMetrics>
export function recalculateBenchmarkMetrics(userId: string): Promise<void>
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Goal:** Create deposit tracking infrastructure

**Convoy 1A: Database & Models**
- [ ] Create `CashDeposit` Prisma model
- [ ] Add migration fields to `MarketBenchmark`
- [ ] Generate Prisma migrations
- [ ] Create database indexes
- [ ] Test migrations on dev database

**Convoy 1B: Core Actions**
- [ ] Implement `recordCashDeposit()` action
- [ ] Implement `getCashDeposits()` query
- [ ] Add SPY price fetching logic
- [ ] Add automatic share calculation
- [ ] Write unit tests for deposit logic

**Convoy 1C: Benchmark Updates**
- [ ] Update `getBenchmarkMetrics()` to use deposits
- [ ] Implement deposit-based share totals
- [ ] Update total invested calculation
- [ ] Add average cost basis calculation
- [ ] Write tests for new calculations

**Deliverables:**
- Working deposit model
- Deposit CRUD operations
- Updated benchmark calculations
- All tests passing

### Phase 2: User Interface (Week 2)

**Goal:** Build deposit entry and history UI

**Convoy 2A: Deposit Form**
- [ ] Create `<DepositForm>` component
- [ ] Add amount validation
- [ ] Add date picker
- [ ] Implement preview calculation
- [ ] Add loading and error states
- [ ] Write component tests

**Convoy 2B: Dashboard Integration**
- [ ] Add "Record Deposit" button to dashboard
- [ ] Create deposit modal/drawer
- [ ] Update comparison section to show deposit count
- [ ] Add link to deposit history
- [ ] Show "last deposit" indicator
- [ ] Visual regression tests

**Convoy 2C: Deposit History Page**
- [ ] Create `/deposits` route
- [ ] Build `<DepositHistoryTable>` component
- [ ] Add sorting and filtering
- [ ] Implement CSV export
- [ ] Add summary card
- [ ] Page tests

**Deliverables:**
- Complete deposit entry flow
- Deposit history page
- Dashboard integration
- All UI tests passing

### Phase 3: Enhanced Features (Week 3)

**Goal:** Add withdrawals, analytics, and insights

**Convoy 3A: Withdrawal Support**
- [ ] Implement `recordCashWithdrawal()` action
- [ ] Create `<WithdrawalForm>` component
- [ ] Add withdrawal validation (can't exceed invested)
- [ ] Update benchmark to handle negative shares
- [ ] Show withdrawals in history
- [ ] Tests for withdrawal logic

**Convoy 3B: Deposit Analytics**
- [ ] Create `/deposits/analytics` page
- [ ] Build `<DepositSummaryCard>` component
- [ ] Implement DCA analysis calculation
- [ ] Create `<DCAChart>` component
- [ ] Add timing insights
- [ ] Tests for analytics

**Convoy 3C: Lump Sum Comparison**
- [ ] Implement lump sum comparison logic
- [ ] Create comparison visualization
- [ ] Add "What if?" calculator
- [ ] Display timing benefit/cost
- [ ] Component tests

**Deliverables:**
- Withdrawal tracking
- Deposit analytics page
- DCA visualizations
- Lump sum comparison

### Phase 4: Migration & Polish (Week 4)

**Goal:** Migrate existing users and refine UX

**Convoy 4A: Migration Tool**
- [ ] Implement `migrateBenchmark()` action
- [ ] Create `<MigrationWizard>` component
- [ ] Add migration detection
- [ ] Build preview UI
- [ ] Add verification checks
- [ ] Migration tests

**Convoy 4B: User Onboarding**
- [ ] Create first deposit tutorial
- [ ] Add contextual help tooltips
- [ ] Build FAQ section for deposits
- [ ] Create demo video/walkthrough
- [ ] Documentation updates

**Convoy 4C: Polish & Optimization**
- [ ] Performance optimization for deposit queries
- [ ] Add optimistic UI updates
- [ ] Improve error messages
- [ ] Mobile responsiveness
- [ ] Accessibility improvements
- [ ] Final QA testing

**Deliverables:**
- Migration tool working
- User onboarding complete
- Polished, production-ready UI
- Documentation complete

---

## Success Metrics

### Adoption Metrics

1. **Deposit Tracking Adoption**
   - Target: 80% of active users record at least 1 deposit within 30 days
   - Measure: `users_with_deposits / active_users`

2. **Migration Rate**
   - Target: 60% of users with old benchmarks migrate within 60 days
   - Measure: `migrated_benchmarks / total_old_benchmarks`

3. **Ongoing Usage**
   - Target: Users record deposits within 7 days of actual account funding
   - Target: Average 2+ deposits per user over 3 months
   - Measure: Deposit frequency and timing

### Accuracy Metrics

1. **Calculation Accuracy**
   - Target: 100% accuracy in share calculations
   - Target: Deposit-based benchmark matches sum of individual deposits
   - Measure: Automated verification checks

2. **Data Integrity**
   - Target: 0 orphaned deposits (deposits without SPY share data)
   - Target: 100% of deposits have valid SPY prices
   - Measure: Database integrity checks

3. **Comparison Fairness**
   - Target: Benchmark reflects actual dollar-cost averaging
   - Target: Users report comparison feels "fair"
   - Measure: User surveys, support tickets

### Business Impact

1. **User Satisfaction**
   - Target: 85% of users say deposit tracking improves their experience
   - Target: < 5% user confusion about new system
   - Measure: In-app surveys, NPS scores

2. **Feature Value**
   - Target: "Deposit tracking" in top 3 most-used features
   - Target: 40% of users check comparison weekly
   - Measure: Feature usage analytics

3. **Product Differentiation**
   - Target: "Best benchmark comparison" mentioned in 30% of positive reviews
   - Target: Deposit tracking drives 10% increase in conversions
   - Measure: Review analysis, A/B testing

### Technical Metrics

1. **Performance**
   - Target: Deposit recording < 500ms
   - Target: History page load < 1s for 100+ deposits
   - Target: Benchmark recalculation < 200ms
   - Measure: Performance monitoring

2. **Reliability**
   - Target: 99.9% success rate for deposit recording
   - Target: < 0.1% calculation errors
   - Target: Zero data loss incidents
   - Measure: Error logging, data audits

3. **Scalability**
   - Target: Support 1000+ deposits per user
   - Target: No performance degradation
   - Target: Efficient query plans
   - Measure: Load testing, database monitoring

---

## Appendices

### Appendix A: Deposit State Machine

```
States: NO_DEPOSITS → FIRST_DEPOSIT → MULTIPLE_DEPOSITS → ACTIVE_TRACKING

Transitions:
  NO_DEPOSITS → FIRST_DEPOSIT
    Trigger: User records first deposit
    Action: Create SPY benchmark with initial shares

  FIRST_DEPOSIT → MULTIPLE_DEPOSITS
    Trigger: User records second deposit
    Action: Add shares to existing benchmark

  MULTIPLE_DEPOSITS → ACTIVE_TRACKING
    Trigger: User has 3+ deposits over time
    Action: Enable full analytics and insights

  * → WITHDRAWAL
    Trigger: User records withdrawal
    Action: Reduce SPY shares proportionally
```

### Appendix B: Calculation Examples

**Example 1: Single Deposit**
```
Deposit: $10,000 on Jan 1 @ $450/share
Shares: 10,000 / 450 = 22.22 shares

On Mar 1, SPY = $480:
Current Value: 22.22 × 480 = $10,666
Gain/Loss: $10,666 - $10,000 = +$666
Return: 6.66%
```

**Example 2: Multiple Deposits (Dollar-Cost Averaging)**
```
Deposit 1: $5,000 on Jan 1 @ $450 = 11.11 shares
Deposit 2: $5,000 on Feb 1 @ $475 = 10.53 shares
Total: 21.64 shares, $10,000 invested

Average cost basis: $10,000 / 21.64 = $462.11/share

On Mar 1, SPY = $480:
Current Value: 21.64 × 480 = $10,387
Gain/Loss: $10,387 - $10,000 = +$387
Return: 3.87%

Note: Lower return than Example 1 because second deposit
was at higher price. This is accurate dollar-cost averaging!
```

**Example 3: With Withdrawal**
```
Deposit 1: $10,000 on Jan 1 @ $450 = 22.22 shares
Deposit 2: $5,000 on Mar 1 @ $480 = 10.42 shares
Total: 32.64 shares, $15,000 invested

Withdrawal: $3,000 on May 1 @ $500
Shares to sell: 3,000 / 500 = 6.00 shares
Remaining: 32.64 - 6.00 = 26.64 shares
Net invested: $15,000 - $3,000 = $12,000

On Jun 1, SPY = $510:
Current Value: 26.64 × 510 = $13,586
Gain/Loss: $13,586 - $12,000 = +$1,586
Return: 13.22%
```

### Appendix C: Migration Scenarios

**Scenario 1: User with Single Benchmark**
```
Before Migration:
MarketBenchmark {
  ticker: "SPY"
  initialCapital: $10,000
  setupDate: 2026-01-01
  initialPrice: $450
  shares: 22.22
}

After Migration:
CashDeposit {
  amount: $10,000
  depositDate: 2026-01-01
  spyPrice: $450
  spyShares: 22.22
  notes: "Migrated from initial benchmark"
}

MarketBenchmark {
  // Same values, plus:
  migrated: true
  migratedAt: 2026-02-10
}

Result: No change in calculations, but now can add new deposits.
```

**Scenario 2: User with Multiple Benchmarks (Edge Case)**
```
If user somehow has multiple SPY benchmarks:
- Migration wizard shows all benchmarks
- User chooses which to migrate
- Others are archived/deleted
- Creates deposits for chosen benchmark
```

### Appendix D: FAQ for Implementation

**Q: What if SPY price is unavailable for a historical date?**
A: Use the closest available date (warn user). For future enhancement, integrate historical price API.

**Q: Should we support multiple benchmark tickers (QQQ, VTI)?**
A: Phase 1 focuses on SPY only. Phase 2+ can add multi-ticker support using same deposit tracking approach.

**Q: How do we handle partial shares?**
A: Store shares as `Decimal` with 4 decimal places. Most brokers support fractional shares now.

**Q: What if user deletes a deposit?**
A: Warn that benchmark will be recalculated. Cascade delete is safe, just recalc totals.

**Q: Should deposits be required to use the app?**
A: No. Deposit tracking is optional. Users can still use old-style manual benchmark setup.

**Q: How do we prevent duplicate deposit entry?**
A: Show recent deposits before entry. Add "Did you already enter this?" warning if duplicate date/amount detected.

---

## Questions for Product Review

1. **Should we auto-detect deposits from trade history?** (If user sells PUT for $X, assume $X was added to account)
2. **Should we remind users to record deposits?** (Email: "Record your deposit to keep benchmark accurate")
3. **Do we need support for multiple currencies?** (For international users)
4. **Should we allow backdating deposits?** (User forgot to record deposit from 3 months ago)
5. **What's the privacy policy for deposit data?** (Is this sensitive financial info?)
6. **Should we support recurring deposits?** (Auto-record "$1000 every month")
7. **Do we need broker integrations for auto-import?** (TDA/IBKR/Schwab deposit feeds)
8. **Should we track cash sources?** (Salary, bonus, tax refund, etc.)

---

**Document Status:** DRAFT - Ready for Mayor Review
**Next Steps:** Convoy assignments and sprint planning
**Estimated Timeline:** 4 weeks for full implementation
**Priority:** HIGH - Core feature for accurate performance tracking
**Dependencies:** Existing MarketBenchmark system, market data API

**Polecats Needed:**
- Backend: 2 polecats (database, actions, calculations)
- Frontend: 2 polecats (UI components, pages)
- QA: 1 polecat (testing, migration validation)
- Total: 5 polecats for 4-week implementation

---

*End of PRD*

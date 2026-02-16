# GreekWheel Features Guide

**Version:** 1.0.0
**Last Updated:** February 2026
**Status:** Production Ready

## Table of Contents

1. [Introduction](#introduction)
2. [Wheels Dashboard](#wheels-dashboard)
3. [Wheel Detail View](#wheel-detail-view)
4. [Notification System](#notification-system)
5. [Trade Management](#trade-management)
6. [Position Management](#position-management)
7. [Dashboard & Analytics](#dashboard--analytics)
8. [Data Export](#data-export)
9. [Tips & Best Practices](#tips--best-practices)

---

## Introduction

GreekWheel provides a comprehensive suite of features to help you manage your options wheel strategy efficiently. This guide covers all major features with step-by-step instructions and examples.

### What You Can Do

- **Track Complete Wheel Cycles**: Monitor each wheel from initial PUT to final CALL assignment
- **Get Smart Notifications**: Receive alerts for expiring options, ITM positions, and opportunities
- **Visualize Performance**: See P&L charts, benchmarks, and performance metrics
- **Manage Trades & Positions**: Easily enter, update, and close trades and positions
- **Export Data**: Download your trading data for tax preparation and analysis

---

## Wheels Dashboard

The Wheels Dashboard provides a bird's-eye view of all your wheel strategy cycles in one place.

### Overview

**Location**: `/wheels`

The Wheels Dashboard shows:
- Summary statistics across all wheels
- Individual wheel cards with key metrics
- Filter options to view active, completed, or all wheels
- Quick access to wheel details

### Summary Statistics

At the top of the dashboard, you'll see four key metrics:

1. **Total Wheels**: Number of unique tickers you're wheeling
2. **Active Cycles**: Number of wheels currently in progress
3. **Total P&L**: Combined profit/loss across all wheels
4. **Win Rate**: Percentage of profitable completed cycles

**Example**:
```
Total Wheels: 5
Active Cycles: 3
Total P&L: +$4,250 (12.3%)
Win Rate: 85% (17/20 completed cycles)
```

### Wheel Cards

Each wheel is displayed as a card showing:

- **Ticker Symbol**: Stock being wheeled
- **Current Step**: Where in the cycle (PUT, Position, CALL)
- **Cycle Count**: Number of completed cycles
- **Total P&L**: Cumulative profit/loss for this wheel
- **Last Activity**: Most recent trade or action

**Card Example**:
```
┌─────────────────────────────────┐
│ AAPL                            │
│ Step: Selling Covered Calls     │
│ Cycle #3                        │
│                                 │
│ P&L: +$1,850 (15.2%)           │
│ Last Activity: 2 days ago       │
│                                 │
│ [View Details →]                │
└─────────────────────────────────┘
```

### Filtering Wheels

Use the filter tabs to view:

- **All**: Every wheel you've ever started
- **Active**: Wheels with open trades or positions
- **Completed**: Wheels that have finished all cycles
- **Profitable**: Wheels with positive P&L

### Getting Started

**To create your first wheel**:

1. Navigate to `/trades/new`
2. Create a SELL_TO_OPEN PUT trade
3. The system automatically creates a new wheel for that ticker
4. View it in the Wheels Dashboard

**Example - Starting a New Wheel**:
```
1. Go to "Trades" → "New Trade"
2. Fill in trade details:
   - Ticker: AAPL
   - Type: PUT
   - Action: SELL_TO_OPEN
   - Strike: $175
   - Premium: $350
   - Contracts: 1
   - Expiration: 45 days out
3. Submit trade
4. Check Wheels Dashboard - new AAPL wheel appears!
```

---

## Wheel Detail View

The Wheel Detail page provides in-depth information about a single wheel cycle.

### Overview

**Location**: `/wheels/[ticker]`

**Sections**:
1. Wheel Overview (header metrics)
2. Current Status (step visualization)
3. Active Trades (open options)
4. Current Position (owned shares)
5. Cycle History (past completed cycles)

### Wheel Overview

The header shows comprehensive metrics for this wheel:

**Displayed Metrics**:
- **Ticker**: Stock symbol
- **Current Step**: Where you are in the cycle
- **Cycle Count**: Number of completed full cycles
- **Total P&L**: Overall profit/loss
- **Return %**: Percentage return on capital
- **Average Cycle Duration**: Mean days to complete a cycle
- **Total Premium Collected**: Sum of all option premiums
- **Active Capital**: Current amount invested

**Example**:
```
AAPL Wheel Overview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Step: Selling Covered Calls (Step 3)
Cycle #3 • 2 completed cycles

Performance:
  Total P&L: +$1,850 (15.2%)
  Premium Collected: $1,200
  Stock Gains: +$650

Stats:
  Avg Cycle Duration: 87 days
  Active Capital: $15,000
  Win Rate: 100% (2/2)
```

### Current Status

A visual indicator shows where you are in the wheel cycle:

**Step 1: Selling PUTs** 🔵
- You have an open PUT option
- Collecting premium
- Waiting for expiration or assignment

**Step 2: Holding Position** 🟡
- You own shares from PUT assignment
- No covered CALL sold yet
- Opportunity to sell covered CALL

**Step 3: Selling CALLs** 🟢
- You have an open CALL option against your position
- Collecting premium
- Waiting for expiration or assignment

**Example Visual**:
```
Current Status: Step 3 - Selling Covered Calls

[✓] Step 1: Sell PUT
     └─> Assigned on 2026-01-15

[✓] Step 2: Hold Position
     └─> 100 shares @ $147.50 cost basis

[•] Step 3: Sell CALL ← YOU ARE HERE
     └─> 1 CALL @ $155 strike, exp 2026-03-21
         └─> 23 days remaining
```

### Active Trades

Lists all OPEN options for this wheel:

**Displayed Information**:
- Trade type (PUT/CALL)
- Strike price
- Expiration date
- Days until expiration
- Premium collected
- Current P&L
- Quick actions (Close, Assign)

**Example**:
```
Active Trades

CALL @ $155 Strike • Expires 2026-03-21 (23 days)
Premium: $250 • Contracts: 1 • Shares: 100
Status: OPEN • Days to Expiration: 23
P&L: +$250 (if expires worthless)

[Close Trade] [Mark as Assigned]
```

### Current Position

Shows your stock position if you own shares:

**Displayed Information**:
- Shares owned
- Cost basis per share
- Total investment
- Current market value
- Unrealized P&L
- Covered calls against this position
- Quick actions (Sell CALL, Close Position)

**Example**:
```
Current Position

100 shares @ $147.50 cost basis
Total Cost: $14,750
Current Value: $15,200 (AAPL @ $152.00)
Unrealized P&L: +$450 (+3.1%)

Covered Calls:
  • 1 CALL @ $155, exp 2026-03-21

Acquired: 2026-01-15 (from PUT assignment)
Days Held: 38 days

[Sell Covered Call] [Close Position] [View Details]
```

### Cycle History

Shows completed wheel cycles for this ticker:

**Displayed Information per Cycle**:
- Cycle number
- Date range (start → end)
- Duration (days)
- Total P&L
- Breakdown (PUT premium + CALL premiums + stock gain)
- Return percentage

**Example**:
```
Cycle History

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cycle #2: Jan 2026 → Mar 2026 (65 days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

P&L Breakdown:
  PUT Premium:    +$300
  CALL Premium:   +$450  (2 calls)
  Stock Gain:     +$500
  ──────────────────────
  Total:          +$1,250 (10.4% return)

Timeline:
  2026-01-01: Sold PUT @ $150
  2026-02-05: PUT assigned, acquired shares
  2026-02-10: Sold CALL @ $155
  2026-02-28: CALL expired worthless
  2026-03-01: Sold CALL @ $157
  2026-03-21: CALL assigned, sold shares

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cycle #1: Oct 2025 → Dec 2025 (78 days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

P&L Breakdown:
  PUT Premium:    +$250
  CALL Premium:   +$200
  Stock Gain:     +$150
  ──────────────────────
  Total:          +$600 (5.1% return)
```

### Navigation

From the Wheel Detail page, you can:

- **Go back** to Wheels Dashboard (breadcrumb)
- **Create new trade** for this ticker (quick action button)
- **View individual trades** (click on trade cards)
- **View individual positions** (click on position cards)
- **Export data** for this wheel

---

## Notification System

Stay informed about important events and opportunities with the smart notification system.

### Overview

The notification system monitors your trades and positions to alert you about:

1. **Upcoming Expirations**: Options expiring soon
2. **In-The-Money Options**: Options likely to be assigned
3. **Naked Positions**: Shares without covered calls

**Access Notifications**: Look for the notification bell icon 🔔 in the navigation bar.

### Upcoming Expirations

**What it alerts**: Options expiring within the next 7 days.

**Why it matters**: You need to decide whether to:
- Let the option expire worthless (ideal!)
- Close the option early (buy it back)
- Roll the option to a new date/strike
- Prepare for assignment

**Notification Details**:
- Ticker symbol
- Option type (PUT/CALL)
- Strike price
- Expiration date
- Days remaining
- Premium collected

**Example Notification**:
```
⏰ Expiring in 3 Days

AAPL CALL @ $155
Expires: 2026-03-21 (3 days)
Premium Collected: $250
Contracts: 1

Actions:
[View Trade] [Close Early] [Roll Option]
```

**How to Use**:
1. Review expiring options daily
2. Check current stock price vs. strike price
3. Decide on action:
   - **OTM (Out-of-the-money)**: Let expire, collect full premium
   - **ITM (In-the-money)**: Prepare for assignment or close/roll
4. Take action before expiration

### In-The-Money (ITM) Options

**What it alerts**: Options where the current stock price makes assignment likely.

**Why it matters**:
- **ITM PUTs**: You may be assigned shares soon
- **ITM CALLs**: Your shares may be called away soon

**Notification Details**:
- Ticker symbol
- Option type
- Strike price
- Current stock price
- Intrinsic value (how much ITM)
- Expiration date
- Premium collected

**Example Notification - ITM PUT**:
```
📉 In-The-Money PUT

AAPL PUT @ $150
Current Price: $145.00 ($5.00 below strike)
Intrinsic Value: $500 (per contract)

Expires: 2026-03-21 (23 days)
Premium Collected: $300

Likely Assignment: Yes
Prepare to buy 100 shares @ $150

Effective Cost Basis: $147.00/share (after premium)

Actions:
[Accept Assignment] [Roll to Lower Strike] [Close Trade]
```

**Example Notification - ITM CALL**:
```
📈 In-The-Money CALL

MSFT CALL @ $380
Current Price: $390.00 ($10.00 above strike)
Intrinsic Value: $1,000 (per contract)

Expires: 2026-03-28 (30 days)
Premium Collected: $450

Position Cost Basis: $375.00/share
If Assigned: Profit of $950 total

Actions:
[Accept Assignment] [Roll to Higher Strike] [Close Trade]
```

**How to Use**:
1. Check ITM notifications regularly
2. For ITM PUTs:
   - Ensure you have cash to buy shares
   - Verify you still want to own the stock
   - Consider rolling to avoid assignment
3. For ITM CALLs:
   - Calculate total profit if assigned
   - Decide if you want to keep shares (roll)
   - Consider closing early to retain shares

### Positions Without Covered Calls

**What it alerts**: Stock positions that don't have any covered calls against them.

**Why it matters**: You're missing out on premium income! Selling covered calls is a key part of the wheel strategy.

**Notification Details**:
- Ticker symbol
- Number of shares
- Cost basis
- Current value
- Days held
- Unrealized P&L

**Example Notification**:
```
💡 Opportunity: Naked Position

AAPL Position
100 shares @ $147.50 cost basis
Current Value: $15,200 (@ $152.00)
Unrealized P&L: +$450 (+3.1%)

Days Held: 38 days
No covered calls sold yet

Potential Premium: $200-$300/month
Suggested Strike: $155-$160

Actions:
[Sell Covered Call] [View Position]
```

**How to Use**:
1. Review naked positions weekly
2. Evaluate stock price vs. cost basis
3. Choose strike price:
   - **Above cost basis**: Guarantees profit if assigned
   - **At cost basis**: Break even, collect premium only
4. Sell covered call to generate income
5. Dismiss notification once call is sold

### Notification Settings

**Frequency**: Notifications update in real-time based on market data.

**Expiration Lookback**: Default is 7 days. You can adjust to see:
- 3 days (urgent only)
- 7 days (recommended)
- 14 days (advance planning)
- 30 days (full month view)

**How to Adjust**:
1. Go to notification center
2. Click settings icon
3. Adjust lookback period
4. Save preferences

### Notification Best Practices

**Daily Review**:
- Check notifications each trading morning
- Focus on expirations within 3 days
- Review ITM options for action needed

**Weekly Review**:
- Review all upcoming expirations
- Scan for naked positions
- Plan covered call sales

**Before Expiration**:
- Check notifications the day before options expire
- Make final decisions on assignments
- Close or roll options if needed

---

## Trade Management

Efficiently create, update, and close option trades.

### Creating a New Trade

**Location**: `/trades/new`

**Step-by-Step**:

1. **Navigate to form**:
   - Click "Trades" in navigation
   - Click "New Trade" button

2. **Fill in required fields**:
   - **Ticker**: Stock symbol (e.g., AAPL, MSFT)
   - **Type**: PUT or CALL
   - **Action**: SELL_TO_OPEN (most common for wheel strategy)
   - **Strike Price**: Option strike price
   - **Premium**: Total premium collected (for all contracts)
   - **Contracts**: Number of option contracts
   - **Expiration Date**: When option expires

3. **Optional fields**:
   - **Notes**: Journal entry about why you made this trade
   - **Opening Date**: Defaults to today

4. **Validation**:
   - System checks all required fields
   - Calculates shares automatically (contracts × 100)
   - Validates dates and numbers

5. **Submit**:
   - Click "Create Trade"
   - Success notification appears
   - Redirects to trade list

**Example - Selling a PUT**:
```
Create New Trade
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ticker: AAPL
Type: PUT
Action: SELL_TO_OPEN

Strike Price: $175.00
Premium: $350.00
Contracts: 1
Shares: 100 (auto-calculated)

Expiration Date: 2026-04-18 (45 days out)

Notes: (Optional)
AAPL has been trading in a range, good support at $170.
IV is elevated, good premium. Willing to own at $175.

[Create Trade] [Cancel]
```

### Viewing Trades

**Location**: `/trades`

**Table View** shows:
- Ticker symbol
- Type (PUT/CALL)
- Strike price
- Premium collected
- Contracts
- Expiration date
- Status (OPEN/EXPIRED/CLOSED/ASSIGNED)
- Actions

**Sorting**:
- By expiration date (default)
- By ticker
- By P&L
- By creation date

**Filtering**:
- All trades
- Open only
- Closed only
- By ticker

### Closing a Trade Early

Sometimes you want to buy back an option before expiration.

**When to Close Early**:
- Captured 50-75% of maximum profit
- Want to free up capital
- Stock moved against you significantly
- Rolling to a new strike/date

**How to Close**:
1. Find trade in trades list
2. Click "Close Trade" button
3. Enter closing details:
   - **Closing Date**: Date you closed (defaults to today)
   - **Closing Premium**: Amount paid to buy back
4. Click "Close Trade"
5. Status changes to CLOSED
6. P&L calculated: (Opening Premium - Closing Premium)

**Example**:
```
Close Trade: AAPL PUT @ $175

Opening Premium: $350
Closing Premium: $100 (you pay to close)

Profit: $250 (71% of max profit)

Notes: Captured most of the premium with 20 days left.
Want to redeploy capital into new trade.

[Confirm Close] [Cancel]
```

### Marking a Trade as Assigned

When an option is exercised, mark it as assigned.

**PUT Assignment** (you buy shares):
1. Find PUT trade in trades list
2. Click "Assign" button
3. Confirm assignment
4. System automatically:
   - Changes trade status to ASSIGNED
   - Creates new position with calculated cost basis
   - Links position to this PUT trade
   - Prompts you to sell covered call

**CALL Assignment** (you sell shares):
1. Find CALL trade in trades list
2. Click "Assign" button
3. Confirm assignment
4. System automatically:
   - Changes trade status to ASSIGNED
   - Closes related position
   - Calculates total P&L
   - Shows profit summary

**Example - PUT Assignment**:
```
Assign PUT Trade

AAPL PUT @ $175
Premium Collected: $350

You will:
  • Buy 100 shares @ $175/share
  • Total Cost: $17,500
  • Cost Basis: $171.50/share (after premium)

New position will be created automatically.

[Confirm Assignment] [Cancel]
```

### Trade Details

Click any trade to see full details:

- All trade information
- Timeline of events
- P&L breakdown
- Related positions (if any)
- Related wheel cycle
- Edit/delete options

---

## Position Management

Manage stock positions acquired from PUT assignments.

### Viewing Positions

**Location**: `/positions`

**Table View** shows:
- Ticker symbol
- Shares owned
- Cost basis per share
- Total cost
- Current value
- Unrealized P&L
- Days held
- Status (OPEN/CLOSED)
- Covered calls (if any)
- Actions

### Position Details

Each position shows:

**Acquisition Info**:
- Acquired date
- Original cost basis (from PUT assignment)
- Assignment trade link

**Current Status**:
- Shares owned
- Current market price
- Current total value
- Unrealized P&L (amount and %)

**Covered Calls**:
- List of calls sold against position
- Premium collected per call
- Total premium from all calls
- Current open calls

**History**:
- All trades related to this position
- Premium collection timeline
- Cost basis adjustments

### Selling a Covered Call

**From Position Page**:
1. Navigate to position
2. Click "Sell Covered Call" button
3. Form pre-filled with:
   - Ticker (from position)
   - Contracts (based on shares, e.g., 100 shares = 1 contract)
   - Action (SELL_TO_OPEN)
4. Fill in:
   - Strike price (choose above cost basis)
   - Premium
   - Expiration date
5. Submit
6. New CALL trade created and linked to position

**Guided Flow**:
```
Sell Covered Call on AAPL Position

Position Details:
  100 shares @ $171.50 cost basis
  Current Price: $180.00
  Unrealized Gain: +$850

Suggested Strikes:
  [ ] $185 (+$250 premium, 65% probability OTM)
  [•] $190 (+$150 premium, 85% probability OTM) ← Recommended
  [ ] $195 (+$80 premium, 95% probability OTM)

If assigned at $190:
  Stock Profit: +$1,850 ($190 - $171.50) × 100
  Call Premium: +$150
  Total Profit: +$2,000

Strike Price: $190.00
Premium: $150.00
Contracts: 1
Expiration: 2026-04-18

[Create Covered Call] [Cancel]
```

### Closing a Position

**When to Close**:
- Stock price dropped significantly
- Want to exit the wheel on this ticker
- Need capital for other opportunities
- Stock fundamentals changed

**How to Close**:
1. Navigate to position
2. Click "Close Position" button
3. Enter closing details:
   - **Sale Date**: When you sold (defaults to today)
   - **Sale Price per Share**: Price you sold at
4. Confirm
5. System calculates:
   - Stock gain/loss
   - Total premium collected
   - Overall P&L
6. Position status changes to CLOSED

**Example**:
```
Close Position: AAPL

Position Details:
  100 shares @ $171.50 cost basis
  Total Cost: $17,150

Covered Calls Premium: $350

Sale Price: $165.00/share
Sale Value: $16,500

Calculation:
  Stock Loss: -$650 ($165 - $171.50) × 100
  Premiums: +$350 (covered calls)
  ────────────────────
  Net P&L: -$300 (-1.7%)

[Confirm Close] [Cancel]
```

---

## Dashboard & Analytics

Get insights into your overall portfolio performance.

### Main Dashboard

**Location**: `/dashboard`

**Sections**:
1. Portfolio Overview (summary cards)
2. P&L Over Time (chart)
3. Performance by Ticker (chart)
4. Benchmark Comparison (chart)
5. Upcoming Expirations (calendar)

### Portfolio Overview

**Four Summary Cards**:

**1. Total Portfolio Value**
```
Total Portfolio Value
$45,250

+$5,250 (+13.1%)
```
- Current value of all positions
- Plus cash from premiums
- Total unrealized gains/losses

**2. Realized P&L**
```
Realized P&L
+$3,200

12 closed trades
```
- Profit/loss from closed trades
- Completed wheel cycles
- Win rate percentage

**3. Unrealized P&L**
```
Unrealized P&L
+$2,050

5 open positions
```
- Current gain/loss on open positions
- Based on current market prices
- Updates in real-time

**4. Active Positions**
```
Active Positions
5 positions

Total Value: $28,400
```
- Number of stock positions
- Total current value
- Quick link to positions page

### P&L Over Time

Line chart showing cumulative profit/loss over time.

**Features**:
- Toggle between realized, unrealized, and total P&L
- Zoom to specific date ranges
- Hover for exact values
- Compare against starting capital

### Performance by Ticker

Bar chart comparing P&L across different stocks.

**Shows**:
- Profit/loss per ticker
- Number of trades per ticker
- Win rate per ticker
- Sorted by P&L (best to worst)

### Benchmark Comparison

Compare your performance against market indices.

**Available Benchmarks**:
- SPY (S&P 500)
- QQQ (Nasdaq 100)
- VTI (Total Stock Market)
- Custom benchmark

**Chart Features**:
- Your portfolio vs. benchmark over time
- Relative performance percentage
- Outperformance/underperformance periods

### Upcoming Expirations

Calendar view of options expiring soon.

**Shows**:
- Next 30 days of expirations
- Color-coded by days remaining:
  - 🔴 Red: 0-3 days (urgent)
  - 🟡 Yellow: 4-7 days (soon)
  - 🟢 Green: 8-14 days (upcoming)
  - ⚫ Gray: 15+ days (distant)
- Click to view trade details

---

## Data Export

Export your data for taxes, analysis, or record-keeping.

### What You Can Export

**Trades Export**:
- All trade details
- Opening and closing dates
- Premiums collected
- Profit/loss calculations
- Assignment information

**Positions Export**:
- All position details
- Acquisition and sale dates
- Cost basis and sale prices
- Covered calls against positions
- Realized gains/losses

**Wheels Export**:
- Complete wheel cycle data
- Cycle-by-cycle breakdown
- Total P&L per wheel
- Timeline of events

### Export Formats

**CSV (Recommended)**:
- Opens in Excel, Google Sheets
- Easy to manipulate
- Standard format for tax software

**JSON**:
- Complete data structure
- For developers/custom tools
- All metadata included

### How to Export

1. **Go to the page** you want to export (Trades, Positions, or Wheels)
2. **Click "Export" button** (usually top-right)
3. **Choose format**: CSV or JSON
4. **Select date range** (optional):
   - All time
   - This year
   - Last year
   - Custom range
5. **Click "Download"**
6. File downloads to your device

### Tax Preparation

**For 1099 reporting**:

1. Export trades for the tax year
2. Open in Excel/Sheets
3. Calculate:
   - Total premiums collected
   - Realized gains/losses from closed positions
   - Separate short-term vs. long-term gains
4. Provide to your CPA or tax software

**What to Include**:
- All option premiums (short-term capital gains)
- Stock assignments and sales
- Cost basis for each position
- Dates for holding period calculations

---

## Tips & Best Practices

### Getting Started Tips

**1. Start Small**
- Begin with 1-2 wheels on stocks you know
- Use smaller position sizes (1 contract)
- Get comfortable with the workflow

**2. Choose Quality Stocks**
- Only wheel stocks you'd want to own
- Pick stocks with good options liquidity
- Avoid meme stocks and penny stocks

**3. Set Realistic Expectations**
- Target 15-25% annual returns
- Some cycles will lose money (it's normal)
- Consistency beats home runs

### Trade Management Tips

**1. Expiration Management**
- Check expiring options daily in the last week
- Decide early whether to roll or accept assignment
- Don't wait until expiration day

**2. Strike Selection**
- For PUTs: 5-10% below current price (safer)
- For CALLs: Above your cost basis (guarantee profit)
- Balance premium vs. probability

**3. Premium Targets**
- Aim for 1-3% per month on PUTs
- Aim for 1-2% per month on CALLs
- Don't chase unusually high premiums (higher risk)

### Position Management Tips

**1. Always Sell Covered Calls**
- Don't let positions sit idle
- Consistent premium collection is key
- Even small premiums add up

**2. Manage Losers**
- Keep selling calls to reduce cost basis
- Don't panic sell at a loss
- Give the stock time to recover (if fundamentals are sound)

**3. Take Profits**
- Don't be afraid to close winning trades early
- 50-70% of max profit is good
- Redeploy capital quickly

### Risk Management Tips

**1. Position Sizing**
- Never use more than 10-15% of portfolio per wheel
- Diversify across 5+ different tickers
- Keep cash reserve for opportunities

**2. Stop Loss Rules**
- Set mental stop losses (e.g., -20% on stock)
- Exit if company fundamentals deteriorate
- Don't marry positions

**3. Avoid These Common Mistakes**
- Don't sell calls below your cost basis
- Don't wheel stocks you don't understand
- Don't over-leverage your account
- Don't ignore ITM notifications

### Notification Tips

**1. Daily Routine**
- Check notifications every morning
- Focus on <3 day expirations first
- Review ITM options for action

**2. Weekly Routine**
- Review naked positions
- Plan covered call sales
- Analyze performance metrics

**3. Monthly Routine**
- Review completed wheels
- Calculate returns
- Adjust strategy as needed

### Dashboard Tips

**1. Track Key Metrics**
- Monitor win rate (target: >70%)
- Watch average cycle duration
- Compare to benchmarks

**2. Use Charts**
- P&L over time shows consistency
- Performance by ticker identifies winners
- Benchmarks show relative performance

**3. Review Regularly**
- Weekly: Check current positions
- Monthly: Analyze overall performance
- Quarterly: Compare to benchmarks

### Export Tips

**1. Regular Backups**
- Export data monthly
- Keep backups in cloud storage
- Don't rely solely on app data

**2. Tax Preparation**
- Export annually for taxes
- Keep records for 7 years (IRS requirement)
- Track cost basis carefully

**3. Analysis**
- Export to spreadsheet for custom analysis
- Create pivot tables for insights
- Track personal metrics

---

## Getting Help

### In-App Resources

- **Help Center**: `/help` - FAQs and tutorials
- **Glossary**: `/help/glossary` - Options trading terms
- **Wheel Strategy Guide**: `/docs/wheel-strategy-guide` - Complete strategy education
- **User Guide**: `/docs/USER_GUIDE` - Comprehensive user documentation

### Support

- **Documentation**: Check this guide and others in `/docs`
- **Contact**: support@wheeltracker.com
- **Report Issues**: GitHub Issues (if available)

---

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `n` | New Trade (from trades page) |
| `/` | Focus search |
| `?` | Show keyboard shortcuts |
| `Esc` | Close modal/dialog |

---

## Appendix: Feature Checklist

Use this checklist to ensure you're using all features effectively:

### Daily Tasks
- [ ] Check notification bell for alerts
- [ ] Review options expiring in next 3 days
- [ ] Check ITM options for action
- [ ] Review dashboard for position values

### Weekly Tasks
- [ ] Review Wheels Dashboard
- [ ] Sell covered calls on naked positions
- [ ] Check P&L charts
- [ ] Plan upcoming expirations

### Monthly Tasks
- [ ] Review completed wheels
- [ ] Export data for records
- [ ] Analyze performance vs. benchmarks
- [ ] Adjust strategy if needed

### Tax Season Tasks
- [ ] Export full year trades
- [ ] Export full year positions
- [ ] Calculate total premiums collected
- [ ] Separate short-term vs. long-term gains
- [ ] Provide data to CPA

---

**Last Updated**: February 2026
**Version**: 1.0.0
**For Questions**: support@wheeltracker.com

Happy Wheeling! 🎯📈

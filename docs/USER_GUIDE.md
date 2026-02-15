# Wheel Tracker User Guide

Welcome to Wheel Tracker! This guide will help you understand and use the application to track your options trading using the wheel strategy.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding the Wheel Strategy](#understanding-the-wheel-strategy)
3. [Entering Your First Trade](#entering-your-first-trade)
4. [Managing Trades](#managing-trades)
5. [Handling Assignments](#handling-assignments)
6. [Managing Positions](#managing-positions)
7. [Understanding Your Dashboard](#understanding-your-dashboard)
8. [Profit & Loss Calculations](#profit--loss-calculations)
9. [Using Benchmarks](#using-benchmarks)
10. [Exporting for Taxes](#exporting-for-taxes)
11. [Best Practices](#best-practices)
12. [FAQ](#faq)

---

## Getting Started

### Creating Your Account

1. Navigate to the Wheel Tracker homepage
2. Click "Register" to create a new account
3. Enter your email, name, and password
4. Verify your email (if email verification is enabled)
5. Log in with your credentials

### Initial Setup

After logging in for the first time:

1. **Set up benchmarks** (optional but recommended):
   - Navigate to the Dashboard
   - Click "Add Benchmark" to track your performance
   - Consider adding market benchmarks like SPY or QQQ for comparison

2. **Familiarize yourself with the interface**:
   - **Dashboard**: Overview of your portfolio performance
   - **Trades**: View and manage all your option trades
   - **Positions**: Track stock positions from assigned PUTs

---

## Understanding the Wheel Strategy

The wheel strategy is a conservative options trading strategy that generates income through:

### The Three Steps of the Wheel

#### 1. Selling Cash-Secured PUTs
- Sell PUT options on stocks you'd be happy to own
- Collect premium income
- If the PUT expires worthless, keep the premium and repeat
- If assigned, you buy the stock at the strike price

#### 2. Getting Assigned (Optional)
- If the stock price falls below your strike price at expiration, you're assigned the shares
- Your cost basis = strike price - premium collected
- You now own the underlying stock

#### 3. Selling Covered CALLs
- Once you own shares, sell CALL options against them
- Collect premium income while holding the shares
- If the CALL expires worthless, keep shares and premium
- If assigned, you sell shares at the strike price

### Why Use the Wheel?

- **Consistent Income**: Collect premiums regularly
- **Lower Risk**: More conservative than buying options
- **Stock Ownership**: Eventually own quality stocks at a discount
- **Flexibility**: Can adjust strategy based on market conditions

---

## Entering Your First Trade

### Selling a PUT

1. **Navigate to Trades**:
   - Click "Trades" in the navigation menu
   - Click "New Trade" button

2. **Fill in trade details**:
   - **Ticker**: Stock symbol (e.g., "AAPL", "MSFT")
   - **Type**: Select "PUT"
   - **Action**: Select "SELL_TO_OPEN"
   - **Strike Price**: The price at which you'd buy the stock
   - **Premium**: Total premium collected (for all contracts)
   - **Contracts**: Number of contracts sold
   - **Expiration Date**: When the option expires
   - **Notes** (optional): Any additional information

3. **Calculate shares**:
   - Shares are automatically calculated (contracts × 100)

4. **Submit**:
   - Click "Create Trade"
   - You'll see a success notification

### Selling a CALL

Follow the same steps but:
- **Type**: Select "CALL"
- **Action**: Select "SELL_TO_OPEN"
- If it's a covered call, it will be associated with your position

---

## Managing Trades

### Viewing Your Trades

The Trades page shows all your trades in a table with:
- Ticker symbol
- Trade type (PUT/CALL)
- Strike price
- Premium collected
- Number of contracts
- Expiration date
- Current status
- Actions

### Trade Statuses

- **OPEN**: Active option contract
- **EXPIRED**: Option expired worthless (you keep the premium!)
- **CLOSED**: You bought back the option early
- **ASSIGNED**: Option was exercised (PUTs = you bought shares, CALLs = you sold shares)

### Closing a Trade Early

To buy back an option before expiration:

1. Find the trade in your trades list
2. Click the "Close" button
3. Enter the closing premium (what you paid to buy it back)
4. The status will update to "CLOSED"

### Marking a Trade as Assigned

When a PUT gets assigned:

1. Click "Assign" on the PUT trade
2. This will:
   - Change the trade status to "ASSIGNED"
   - Create a new position for the shares
   - Link the position to the assignment trade

---

## Handling Assignments

### PUT Assignment

When your PUT is assigned, you receive shares:

1. **Automatic Position Creation**:
   - A new position is automatically created
   - Cost basis = strike price
   - Total cost = strike price × shares
   - The premium you collected reduces your effective cost basis

2. **What Happens Next**:
   - Navigate to Positions to see your new shares
   - Consider selling covered CALLs against the position
   - Track the position's performance on the dashboard

### CALL Assignment

When your covered CALL is assigned, your shares are sold:

1. **Automatic Position Closure**:
   - The position status changes to "CLOSED"
   - Realized gain/loss is calculated
   - All premiums from covered calls are included in P&L

2. **Result**:
   - You've completed a full wheel cycle!
   - Total profit = PUT premium + CALL premiums + (sale price - purchase price)

---

## Managing Positions

### Viewing Positions

The Positions page shows:
- Ticker symbol
- Number of shares
- Cost basis (per share)
- Total cost
- Current market value
- Unrealized gain/loss
- Status (OPEN/CLOSED)
- Associated covered calls

### Understanding Position Metrics

- **Cost Basis**: Original purchase price per share (from PUT assignment)
- **Total Cost**: Cost basis × number of shares
- **Current Value**: Current market price × shares
- **Unrealized P&L**: Current value - total cost (for open positions)
- **Realized P&L**: Actual profit/loss when position is closed

### Selling Covered CALLs

To sell covered calls against a position:

1. Navigate to Trades → New Trade
2. Select the ticker of your position
3. Type: "CALL"
4. Action: "SELL_TO_OPEN"
5. Enter strike price and premium
6. The system automatically associates it with your position

### Closing a Position

To manually close a position (sell shares outside of assignment):

1. Find the position in your positions list
2. Click "Close Position"
3. Enter the sale price per share
4. Realized gain/loss is automatically calculated

---

## Understanding Your Dashboard

The dashboard is your performance overview:

### Key Metrics

1. **Total Portfolio Value**:
   - Sum of all open positions' current values
   - Plus cash balance (premiums collected minus costs)

2. **Total Gain/Loss**:
   - Realized gains/losses from closed positions
   - Unrealized gains/losses from open positions
   - All premiums collected from options

3. **Active Positions**:
   - Number of open stock positions
   - Quick view of which stocks you currently hold

4. **Open Trades**:
   - Number of active option contracts
   - Sorted by expiration date

### Performance Charts

- **P&L Over Time**: Track your cumulative profit/loss
- **Win Rate**: Percentage of profitable trades
- **Premium Income**: Total premiums collected by month
- **Position Performance**: Compare individual stock performance

### Upcoming Expirations

- See which options are expiring soon
- Helps you plan ahead for potential assignments
- Color-coded by days until expiration

---

## Profit & Loss Calculations

Understanding how your P&L is calculated:

### Trade P&L

**For PUT trades**:
```
If EXPIRED or CLOSED:
  P&L = Premium Collected - Closing Cost (if bought back)

If ASSIGNED:
  P&L = Premium Collected (helps reduce cost basis of position)
```

**For CALL trades**:
```
If EXPIRED or CLOSED:
  P&L = Premium Collected - Closing Cost (if bought back)

If ASSIGNED:
  P&L = Premium Collected + Position Sale Gain
```

### Position P&L

**While OPEN**:
```
Unrealized P&L = (Current Price - Cost Basis) × Shares
```

**When CLOSED**:
```
Realized P&L = (Sale Price - Cost Basis) × Shares + All Associated CALL Premiums
```

### Total Portfolio P&L

```
Total P&L =
  + All PUT premiums collected
  + All CALL premiums collected
  - Any option buyback costs
  + Realized gains from closed positions
  + Unrealized gains from open positions
```

---

## Using Benchmarks

Benchmarks help you compare your wheel strategy performance against market indices.

### Setting Up Personal Benchmarks

1. Navigate to Dashboard
2. Click "Add Benchmark"
3. Enter:
   - Date (typically your starting date)
   - Total portfolio value
   - Cash balance
   - Any notes

4. Add benchmarks regularly (monthly recommended) to track growth

### Setting Up Market Benchmarks

Compare your performance to market indices:

1. Add a market benchmark (SPY, QQQ, VTI, etc.)
2. Enter:
   - Ticker symbol
   - Initial capital amount (match your portfolio starting value)
   - Setup date (your portfolio start date)

3. The system calculates how much that index would be worth if you had invested the same amount

### Interpreting Benchmark Comparisons

- **Outperforming**: Your wheel strategy returns > market benchmark
- **Underperforming**: Your returns < market benchmark
- **Risk-Adjusted**: Consider that wheel strategy typically has lower risk than buying index

### Benchmark Charts

- **Performance Comparison**: See your portfolio vs. market side-by-side
- **Relative Performance**: Percentage difference from benchmark
- **Cumulative Returns**: Long-term growth comparison

---

## Exporting for Taxes

### Exporting Trade Data

1. Navigate to Trades or Positions
2. Click "Export" button
3. Choose format (CSV recommended for Excel/Google Sheets)
4. File includes:
   - All trade details
   - Dates and prices
   - Premiums collected
   - Realized gains/losses
   - Assignment information

### Tax Considerations

**Important**: Consult with a tax professional for your specific situation.

#### Options Premium Taxation

- Premiums collected from selling options are typically taxed as short-term capital gains
- Premium is recognized when:
  - Option expires worthless (immediately)
  - Option is closed (immediately)
  - Option is assigned (reduces cost basis or increases sale proceeds)

#### Stock Position Taxation

- **Short-term gains**: Held ≤ 1 year (taxed as ordinary income)
- **Long-term gains**: Held > 1 year (taxed at lower capital gains rate)
- **Cost basis**: Strike price of assigned PUT minus premiums

### What to Export

For tax filing, export:
1. **All closed trades** from the tax year
2. **All assigned trades** (these create taxable events)
3. **All closed positions** (stock sales)

### Organizing for Your CPA

Create a folder with:
- CSV export of all trades
- CSV export of all positions
- Notes on any adjustments or special circumstances
- List of total premiums collected by month

---

## Best Practices

### Choosing Stocks for Wheel Strategy

1. **Quality Companies**: Choose stocks you'd actually want to own
2. **Stable Blue Chips**: Less volatility = more predictable outcomes
3. **Dividend Payers**: Extra income while holding shares
4. **Adequate Liquidity**: Ensure good options volume for fair pricing

### Managing Risk

1. **Position Sizing**:
   - Don't put more than 10-15% of portfolio in one ticker
   - Start small while learning

2. **Strike Selection**:
   - For PUTs: Choose strikes below current price (out-of-the-money)
   - For CALLs: Choose strikes above your cost basis for profit

3. **Expiration Selection**:
   - 30-45 days until expiration is the "sweet spot"
   - Allows for good premium while managing risk

4. **Avoid Earnings**:
   - Don't sell options expiring right after earnings
   - High volatility can lead to unexpected assignments

### Maximizing Returns

1. **Consistent Premium Collection**:
   - Sell new PUTs immediately after previous ones expire
   - Sell covered CALLs on all positions

2. **Roll Options**:
   - If assigned on a CALL at a loss, consider rolling out and up
   - Close early if you've captured 50-75% of maximum profit

3. **Track Performance**:
   - Use benchmarks to measure success
   - Review monthly to adjust strategy

### Record Keeping

1. **Use Notes Field**:
   - Document why you chose each trade
   - Note market conditions
   - Track your learning

2. **Regular Reviews**:
   - Weekly: Check upcoming expirations
   - Monthly: Review P&L and adjust strategy
   - Quarterly: Compare to benchmarks

---

## FAQ

### General Questions

**Q: What's the minimum account size for wheel strategy?**
A: Recommended minimum is $5,000-$10,000. You need enough capital to be assigned 100 shares of quality stocks.

**Q: How much time does wheel strategy take?**
A: Approximately 1-2 hours per week once you're comfortable with the process.

**Q: What's a realistic return expectation?**
A: Conservative estimates are 15-25% annually, but results vary based on market conditions and execution.

### Trading Questions

**Q: What if I don't want to get assigned?**
A: You can:
- Roll the option (close and open a new one at a different strike/date)
- Buy back the option before expiration
- Choose strikes farther from the current price

**Q: What if a stock drops significantly after assignment?**
A: Continue selling covered CALLs to reduce cost basis. The wheel strategy is about long-term consistency, not quick profits.

**Q: Can I trade multiple tickers at once?**
A: Yes! Diversification is recommended. Track 3-5 different stocks to spread risk.

**Q: Should I always sell covered CALLs after assignment?**
A: Generally yes, but if you believe the stock will rally significantly, you might hold off temporarily.

### Technical Questions

**Q: How is my cost basis calculated after assignment?**
A: Cost basis = PUT strike price. The premium collected effectively reduces your break-even point.

**Q: Where does stock price data come from?**
A: We use FinancialData.net API for real-time stock pricing.

**Q: How often is my position value updated?**
A: Stock prices are updated when you view the positions page, and automatically daily via scheduled jobs.

**Q: Can I edit a trade after creating it?**
A: Currently, you can update the status and close date, but not the core trade details. If you made an error, contact support or delete and re-enter.

### Account Questions

**Q: Is my data secure?**
A: Yes, all data is encrypted and stored securely. We use industry-standard security practices.

**Q: Can I export my data?**
A: Yes, you can export trades and positions to CSV format at any time.

**Q: What if I forget my password?**
A: Use the "Forgot Password" link on the login page to reset your password via email.

---

## Need Help?

- **FAQ Page**: Visit `/help/faq` for common questions
- **Glossary**: Check `/help/glossary` for options trading terms
- **In-App Help**: Look for (?) icons throughout the app for contextual help
- **Support**: Contact us at support@wheeltracker.com

---

## Appendix: Wheel Strategy Example

Let's walk through a complete wheel cycle:

### Step 1: Sell a PUT
- **Stock**: AAPL trading at $180
- **Trade**: Sell 1 PUT contract, $175 strike, 45 days, $3.00 premium
- **Premium Collected**: $300 ($3 × 100 shares)

**Outcome**: If AAPL stays above $175, PUT expires worthless, you keep $300.

### Step 2: Get Assigned
- **At Expiration**: AAPL at $170
- **Assignment**: You buy 100 shares at $175 strike = $17,500
- **Effective Cost**: $175 - $3 premium = $172/share

### Step 3: Sell Covered CALLs
- **Current Price**: AAPL at $170
- **Trade**: Sell 1 CALL, $180 strike, 45 days, $2.50 premium
- **Premium Collected**: $250

**Outcome 1** (CALL expires worthless):
- Stock below $180 at expiration
- Keep shares and $250
- Sell another covered CALL

**Outcome 2** (CALL assigned):
- Stock above $180 at expiration
- Sell 100 shares at $180 = $18,000

### Total Profit Calculation
```
Purchase: -$17,500 (from PUT assignment)
Sale: +$18,000 (from CALL assignment)
PUT Premium: +$300
CALL Premium: +$250
-----------
Total Profit: +$1,050 (6% return in ~90 days)
```

This complete cycle shows how the wheel strategy generates consistent income through premium collection and strategic stock ownership.

---

*Last Updated: February 2026*
*Version: 1.0.0*

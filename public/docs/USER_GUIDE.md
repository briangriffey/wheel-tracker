# Wheel Tracker User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [The Wheel Strategy](#the-wheel-strategy)
3. [Getting Started](#getting-started)
4. [Creating Trades](#creating-trades)
5. [Managing Positions](#managing-positions)
6. [Understanding Your Dashboard](#understanding-your-dashboard)
7. [Advanced Features](#advanced-features)
8. [Best Practices](#best-practices)
9. [Frequently Asked Questions](#frequently-asked-questions)

---

## Introduction

Welcome to Wheel Tracker! This application helps you track and manage your options trading using the wheel strategy. Whether you're new to options trading or an experienced trader, this guide will help you get the most out of Wheel Tracker.

### What is Wheel Tracker?

Wheel Tracker is a web-based application designed specifically for traders who use the wheel strategy to generate income from options. It helps you:

- **Track all your trades** - Record PUT and CALL options with detailed information
- **Manage positions** - Handle stock assignments and track unrealized gains/losses
- **Monitor performance** - View comprehensive P&L metrics and charts
- **Stay organized** - Get alerts for upcoming expirations and in-the-money options
- **Analyze results** - Compare your performance to market benchmarks

---

## The Wheel Strategy

### Overview

The wheel strategy is a systematic options trading strategy that aims to generate consistent income by selling cash-secured PUT options and covered CALL options. It's called the "wheel" because the process repeats in a cycle.

### The Three Phases

#### Phase 1: Sell Cash-Secured PUTs
- Sell PUT options on stocks you'd be happy to own
- Collect premium income upfront
- If the stock stays above the strike price, the option expires worthless and you keep the premium
- If the stock drops below the strike price, you may be assigned shares

#### Phase 2: Assignment (Optional)
- If your PUT is assigned, you purchase 100 shares per contract at the strike price
- Your effective cost basis is lower than the strike price because you collected premium
- Now you own the stock and can move to Phase 3

#### Phase 3: Sell Covered CALLs
- Sell CALL options against your shares (covered calls)
- Collect additional premium income
- If the stock stays below the strike price, the option expires worthless and you keep both the shares and the premium
- If the stock rises above the strike price, your shares are called away (sold) at the strike price
- You've now completed one full "wheel cycle" and can start over with a new PUT

### Key Benefits

- **Consistent Income**: Generate premium income whether the market goes up, down, or sideways
- **Lower Risk**: You only buy stocks you want to own at prices you're comfortable with
- **Compounding Returns**: Reinvest premiums to grow your portfolio over time
- **Defined Risk**: Know your maximum loss upfront (cost of shares minus premium collected)

### Key Risks

- **Capital Intensive**: Requires enough cash to buy 100 shares per contract
- **Opportunity Cost**: May miss out on explosive upside moves
- **Assignment Risk**: Must be willing to own the underlying stock
- **Market Risk**: Stock prices can decline significantly

---

## Getting Started

### 1. Set Up Your Account

1. Register for a Wheel Tracker account with your email
2. Log in to access your dashboard
3. Review the help center and glossary to familiarize yourself with the interface

### 2. Plan Your First Trade

Before entering your first trade in Wheel Tracker:

1. **Choose a stock** - Select a high-quality company you'd be happy to own
2. **Research the stock** - Check fundamentals, technical, and upcoming events (especially earnings)
3. **Select an expiration** - Typically 30-45 days out for optimal premium decay
4. **Choose a strike price** - Usually at or slightly below the current stock price
5. **Calculate your premium** - Ensure the premium justifies your risk

### 3. Enter Your First Trade

See the [Creating Trades](#creating-trades) section below for step-by-step instructions.

---

## Creating Trades

### Selling a Cash-Secured PUT

1. **Navigate to Trades**
   - Click "Trades" in the main navigation
   - Click the "New Trade" button

2. **Fill in Trade Details**
   - **Ticker**: Enter the stock symbol (e.g., "AAPL")
   - **Type**: Select "PUT"
   - **Action**: Select "SELL_TO_OPEN" (you're selling/writing the option)
   - **Strike Price**: Enter your strike price (e.g., 150.00)
   - **Premium**: Enter the total premium you collected (e.g., 250.00 for $2.50 per share)
   - **Contracts**: Enter number of contracts (1 contract = 100 shares)
   - **Expiration Date**: Select when the option expires
   - **Notes** (optional): Add any notes about your reasoning

3. **Review and Submit**
   - Verify all details are correct
   - Click "Create Trade"
   - Your trade now appears in the Trades list with status "OPEN"

### Selling a Covered CALL

You can only sell covered calls if you have an open position (shares you own).

1. **Navigate to Positions**
   - Click "Positions" in the main navigation
   - Find the position you want to sell a call against

2. **Click "Sell Covered Call"**
   - A form will appear pre-populated with your position details

3. **Fill in CALL Details**
   - **Strike Price**: Enter your target exit price
   - **Premium**: Enter the total premium collected
   - **Expiration Date**: Select the expiration date
   - **Notes** (optional): Add any notes

4. **Review and Submit**
   - Verify the details
   - Click "Create Covered Call"
   - The covered call now appears linked to your position

### Closing an Option Early (Buy to Close)

Sometimes you may want to close an option before expiration to lock in profits or cut losses.

1. **Find Your Trade**
   - Navigate to "Trades" or "Positions"
   - Locate the option you want to close

2. **Click "Close Option"**
   - A dialog will appear

3. **Enter Close Details**
   - **Close Premium**: Enter the amount you paid to buy back the option
   - Review the net P/L calculation

4. **Confirm**
   - Click "Confirm Close"
   - The trade status changes to "CLOSED"

---

## Managing Positions

### Handling PUT Assignment

When your cash-secured PUT is assigned, you purchase the underlying shares. Here's how to record it:

1. **Find Your Assigned PUT**
   - Navigate to "Trades"
   - Find the PUT option that was assigned

2. **Click "Assign PUT"**
   - A detailed dialog will appear

3. **Review Assignment Details**
   - **Cost Breakdown**: Shows strike price × shares minus premium credit
   - **Effective Cost Basis**: Your actual cost per share after premium
   - **Current Market Value**: Real-time P&L if available
   - **Unrealized P/L**: Shows if you have a gain or loss

4. **Confirm Assignment**
   - Review all details carefully
   - Click "Confirm Assignment"
   - A new position is created with status "OPEN"
   - The PUT trade status changes to "ASSIGNED"

5. **Optional: Sell Covered Call**
   - After assignment, you'll see a prompt to sell a covered call
   - This is the next step in the wheel strategy
   - Click "Sell Covered Call" to continue, or "Maybe Later" to skip

### Handling CALL Assignment

When your covered CALL is assigned, your shares are sold (called away):

1. **Find Your Assigned CALL**
   - Navigate to "Positions"
   - Find the position with the assigned covered call

2. **Click "Assign CALL"**
   - A detailed dialog will appear

3. **Review P&L Summary**
   - **Sale Proceeds**: Strike price × shares
   - **Total Premiums**: PUT premium + CALL premium
   - **Stock Gain/Loss**: Based on your cost basis
   - **Total Realized Profit**: Complete cycle P/L
   - **Duration**: Days you held the position
   - **Annualized Return**: Your return projected over a year

4. **Confirm Assignment**
   - Review all details carefully
   - Click "Confirm Assignment"
   - The position status changes to "CLOSED"
   - The CALL trade status changes to "ASSIGNED"
   - Realized P/L is recorded

5. **Optional: Start New PUT**
   - After completing the wheel cycle, you'll see a prompt
   - Click "Start New PUT" to begin another cycle
   - Or "Maybe Later" to skip

### Viewing Position Details

- **Open Positions**: Shows all currently held stocks
- **Cost Basis**: Your effective cost per share
- **Current Value**: Latest market value
- **Unrealized P/L**: Current gain or loss
- **Covered Calls**: Any active calls against the position
- **Actions**: Sell covered call, assign call, view details

---

## Understanding Your Dashboard

### Key Metrics

Your dashboard displays several important metrics:

#### Total Realized P&L
- Sum of all closed trades and positions
- Only includes completed transactions
- Green = profit, Red = loss

#### Active Positions Value
- Total market value of all open positions
- Based on current stock prices
- Updates periodically

#### Total Premiums Collected
- Sum of all premiums from PUT and CALL options
- This is your income from the strategy
- Includes both open and closed trades

#### Active Positions Count
- Number of stocks you currently own
- Helps track portfolio diversification

#### Open Trades Count
- Number of options currently active
- Includes both PUTs and CALLs

#### Win Rate
- Percentage of profitable closed trades
- Higher is better, but not the only metric that matters

### Charts and Visualizations

#### P&L Over Time
- Line chart showing your cumulative profit/loss
- Filter by time range (1M, 3M, 6M, 1Y, All)
- Helps visualize performance trends

#### P&L by Ticker
- Bar chart showing profit/loss per stock symbol
- Identify your best and worst performing stocks
- Use to guide future stock selection

#### Win Rate by Type
- Pie charts comparing PUT vs CALL success rates
- Understand which part of the strategy works best for you

### Alerts and Notifications

The dashboard shows important alerts:

#### Upcoming Expirations
- Options expiring in the next 7 days
- Take action before they expire or get assigned

#### In-the-Money Options
- Options where assignment is likely
- Prepare for potential assignment

#### Positions Without Calls
- Shares that don't have covered calls
- Opportunity to generate additional income

---

## Advanced Features

### Wheel Tracking

Wheel Tracker can automatically group your trades into wheels (cycles):

1. **Navigate to Wheels**
   - Click "Wheels" in the main navigation

2. **View Wheel Details**
   - See all trades and positions for each stock
   - Track total premiums for the wheel
   - Monitor cycle count (how many times you've repeated the wheel)

3. **Wheel Status**
   - **Active**: Currently in a cycle
   - **Idle**: Cycle complete, waiting for new PUT
   - **Paused**: Temporarily stopped
   - **Completed**: Permanently ended

### Benchmarking

Compare your performance to market indexes:

1. **Set Up Benchmarks**
   - Navigate to "Settings" or "Benchmarks"
   - Add market indexes (SPY, QQQ, VTI, etc.)
   - Specify your starting capital and date

2. **View Comparisons**
   - Dashboard shows your returns vs. benchmark returns
   - Understand if the wheel strategy is outperforming

### Exporting Data

Export your trade history for tax preparation or analysis:

1. **Navigate to Export**
   - Look for "Export" or "Download" button on the Dashboard

2. **Select Data Range**
   - Choose date range (tax year, quarter, all time)

3. **Download CSV**
   - Opens in Excel or Google Sheets
   - Contains all trade details, P&L, and position info

### Notes and Tags

Add notes to trades and positions:

- **Trade Notes**: Record your reasoning, market conditions, or strategy
- **Position Notes**: Track thoughts about the underlying stock
- **Review Later**: Use notes to analyze what worked and what didn't

---

## Best Practices

### Stock Selection

✅ **DO:**
- Choose high-quality, stable companies
- Select stocks with good liquidity (high volume)
- Pick stocks you'd be happy to own long-term
- Research fundamentals and technicals
- Avoid stocks right before earnings (unless experienced)

❌ **DON'T:**
- Trade stocks just because they have high premiums
- Ignore company fundamentals
- Sell PUTs on stocks you don't want to own
- Overtrade or chase premiums

### Position Sizing

✅ **DO:**
- Start small (1-2 contracts) while learning
- Keep cash reserves for unexpected events
- Diversify across 3-5 different stocks
- Scale position size based on account size
- Limit any single position to 20-25% of portfolio

❌ **DON'T:**
- Go all-in on one stock
- Use all your capital at once
- Overleverage your account
- Trade more contracts than you can afford to be assigned on

### Option Selection

✅ **DO:**
- Aim for 30-45 day expirations (sweet spot for theta decay)
- Target 0.30 delta PUTs (30% chance of assignment)
- Collect 1-3% premium relative to capital at risk
- Adjust strike prices based on support levels
- Consider implied volatility (higher = higher premiums)

❌ **DON'T:**
- Sell weekly options (too risky and time-consuming)
- Go too far out-of-the-money (insufficient premium)
- Chase abnormally high premiums (usually high risk)
- Ignore technical levels and support/resistance

### Assignment Management

✅ **DO:**
- Have a plan before assignment happens
- Immediately sell covered calls after PUT assignment
- Set CALL strikes 5-10% above cost basis
- Be patient if assigned during a downturn
- Use assignment as an opportunity to own great companies

❌ **DON'T:**
- Panic sell when assigned
- Set CALL strikes too low (limit upside)
- Let positions sit without covered calls
- Hold stocks you no longer believe in
- Forget to factor in your premium when calculating cost basis

### Risk Management

✅ **DO:**
- Set maximum loss limits for each trade
- Close losing trades that violate your rules
- Diversify across sectors and market caps
- Keep a trading journal to learn from mistakes
- Adjust strategy based on market conditions

❌ **DON'T:**
- Let losses run hoping for recovery
- Trade stocks you can't afford to own
- Ignore changing fundamentals
- Trade without stop-loss rules
- Forget that stocks can go to zero

### Tax Considerations

✅ **DO:**
- Track all trades and assignments carefully
- Export trade data regularly
- Consult with a tax professional
- Understand wash sale rules
- Keep records of all premiums collected

❌ **DON'T:**
- Ignore tax implications
- Forget to report option income
- Misunderstand cost basis after assignment
- Make trades solely for tax reasons

---

## Frequently Asked Questions

### General Questions

**Q: Is Wheel Tracker free?**
A: Pricing information is available on our website. We offer both free and premium plans.

**Q: Do I need a brokerage account to use Wheel Tracker?**
A: Yes. Wheel Tracker is a tracking and analysis tool. You'll execute actual trades through your brokerage (TD Ameritrade, Robinhood, Interactive Brokers, etc.).

**Q: Can I import trades from my broker?**
A: Currently, you need to manually enter trades. We're working on import features for future releases.

**Q: Is my data secure?**
A: Yes. We use industry-standard encryption and security practices. Your data is stored securely and never shared with third parties.

### Strategy Questions

**Q: How much money do I need to start the wheel strategy?**
A: You need enough cash to cover the shares if assigned. For a $50 stock, one contract requires $5,000 in cash. Start with at least $10,000-$15,000 to diversify.

**Q: What stocks should I trade?**
A: Focus on large-cap, liquid stocks with strong fundamentals. Popular choices include AAPL, MSFT, NVDA, SPY, QQQ, and other blue-chip stocks.

**Q: How much can I expect to earn?**
A: Typical returns are 1-3% per month, or 12-36% annually. Results vary based on market conditions, stock selection, and your skill level.

**Q: What if the stock crashes after I'm assigned?**
A: This is the main risk. You'll own the shares at a loss, but you can: 1) Hold and sell covered calls while waiting for recovery, 2) Close the position and take the loss, 3) Average down by selling more PUTs at lower strikes (advanced).

**Q: Should I let my options expire or close them early?**
A: Many traders close at 50-75% profit to free up capital and reduce risk. Options with &lt;7 days and &lt;$0.10 value can often be closed for pennies.

**Q: What's the difference between a wheel and just selling covered calls?**
A: The wheel *starts* with selling PUTs (hoping NOT to be assigned) and only moves to covered calls if/when assigned. Traditional covered call strategies require owning shares upfront.

### Technical Questions

**Q: How do I edit or delete a trade?**
A: Currently, you cannot edit trades (for accuracy). If you made a mistake, contact support. Delete functionality may be added in future versions.

**Q: Why doesn't my position show current prices?**
A: We fetch prices periodically from FinancialData.net API. Refresh the page or wait a few minutes for updates.

**Q: Can I use Wheel Tracker on my phone?**
A: Yes! Wheel Tracker is fully responsive and works on mobile devices, tablets, and desktops.

**Q: What browsers are supported?**
A: We support all modern browsers: Chrome, Firefox, Safari, and Edge (latest versions).

**Q: How do I export my data?**
A: Look for the "Export" button on your Dashboard. You can download CSV files for Excel or Google Sheets.

**Q: Can multiple users share an account?**
A: Each account is designed for individual use. Consider separate accounts for separate portfolios.

---

## Getting Help

### Help Resources

- **Help Center**: Visit [/help](/help) for quick guides and FAQs
- **Glossary**: Learn options terminology at [/help/glossary](/help/glossary)
- **FAQ**: Find answers at [/help/faq](/help/faq)

### Contact Support

If you need assistance:

- **Email**: support@wheeltracker.com
- **Response Time**: We typically respond within 24-48 hours
- **Include**: Your account email, description of the issue, and screenshots if applicable

### Community

- Join our community forum to connect with other wheel traders
- Share strategies, ask questions, and learn from experienced traders
- Follow us on social media for tips and updates

---

## Conclusion

The wheel strategy is a powerful way to generate consistent income from options trading. Wheel Tracker makes it easy to track your trades, manage positions, and analyze your performance.

**Remember:**
- Start small and learn as you go
- Only trade stocks you'd be happy to own
- Be patient and disciplined
- Track every trade for continuous improvement
- Manage risk above all else

**Happy trading!** 🎉

---

*Last Updated: February 2026*
*Version: 1.0*

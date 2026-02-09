# The Wheel Strategy: A Complete Guide

## What is the Wheel Strategy?

The wheel strategy (also called "The Triple Income Wheel") is a systematic options trading approach designed to generate consistent income through a repeating cycle of selling options and managing stock positions. It's called "the wheel" because you continuously rotate through the same steps, generating income at each stage.

### Three Income Streams

The wheel strategy generates income through three mechanisms:

1. **PUT Premium Collection** - Earn income by selling cash-secured put options
2. **CALL Premium Collection** - Earn income by selling covered calls on owned shares
3. **Capital Gains** - Profit from stock price appreciation when shares are sold

### Why Trade the Wheel?

- **Consistent Income**: Generate regular premium income from option sales
- **Defined Risk**: Know your maximum cost basis before entering trades
- **Stock Acquisition**: Buy stocks you like at prices below market value
- **Flexibility**: Works in sideways, moderately bullish, or slightly bearish markets
- **Simplicity**: Straightforward strategy with clear entry and exit rules

---

## The Wheel Cycle: Step by Step

The wheel strategy follows a repeating three-step cycle:

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

### Step 1: Sell Cash-Secured PUT

**What it means**: You sell a put option and hold enough cash to buy 100 shares per contract if the stock price falls below your strike price.

**When to do it**:
- You're willing to own the stock at the strike price
- You have cash available to buy the shares if assigned
- You believe the stock will stay at or above the strike price

**What happens**:
- **Stock stays above strike**: Put expires worthless, you keep the premium (profit!)
- **Stock falls below strike**: You're assigned and must buy 100 shares at the strike price

**Example**:
```
Sell 1 PUT on AAPL @ $150 strike, expiring in 30 days
Collect $250 premium

Outcome A: AAPL stays at $155
→ Put expires worthless
→ You keep $250
→ Sell another put or move on to different stock

Outcome B: AAPL drops to $145
→ Put assigned - you buy 100 shares @ $150
→ You paid $15,000 but collected $250 premium
→ Effective cost basis: $147.50/share
→ Move to Step 2
```

### Step 2: Hold Stock Position

**What it means**: You now own 100 shares of stock from the put assignment.

**Your cost basis**: Strike price minus the premium you collected from the put, divided by number of shares.

**Formula**: `Cost Basis = (Strike Price - Premium) / 100`

**What to do**:
- Calculate your true cost basis
- Decide on a target sell price (typically above your cost basis)
- Move to Step 3 to sell a covered call

**Example**:
```
You own 100 shares of AAPL
Purchase price: $150/share (from put assignment)
Premium collected: $250
Cost basis: ($15,000 - $250) / 100 = $147.50/share

Current stock price: $145
Unrealized loss: $250 (but you're not selling yet!)
```

### Step 3: Sell Covered CALL

**What it means**: You sell a call option against the 100 shares you own, giving someone the right to buy your shares at the strike price.

**When to do it**:
- You own the stock (from put assignment)
- You're willing to sell the stock at the strike price
- Ideally, choose a strike price above your cost basis to guarantee profit

**What happens**:
- **Stock stays below strike**: Call expires worthless, you keep premium and shares (sell another call!)
- **Stock rises above strike**: You're assigned and must sell your 100 shares at the strike price

**Example**:
```
Own 100 shares of AAPL @ $147.50 cost basis
Current price: $150

Sell 1 CALL @ $155 strike, expiring in 30 days
Collect $200 premium

Outcome A: AAPL stays at $152
→ Call expires worthless
→ You keep $200
→ Still own shares, sell another call

Outcome B: AAPL rises to $158
→ Call assigned - you sell 100 shares @ $155
→ Stock profit: ($155 - $147.50) × 100 = $750
→ Total profit: $250 (put) + $200 (call) + $750 (stock) = $1,200
→ Return to Step 1, start over with new put
```

---

## Complete Wheel Cycle Example

Let's walk through a full wheel cycle on AAPL stock:

### Month 1: Sell Cash-Secured PUT

```
Action: Sell 1 PUT on AAPL @ $150 strike, 30 days to expiration
Premium collected: $250
Cash required: $15,000 (to buy 100 shares if assigned)

Result: AAPL drops to $145
→ PUT assigned
→ Buy 100 shares @ $150 = $15,000
→ Effective cost basis: $147.50/share (after $250 premium)
```

**Running P&L**: +$250

### Month 2: Sell First Covered CALL

```
Position: Own 100 shares @ $147.50 cost basis
Current price: $145 (-$2.50/share unrealized loss)

Action: Sell 1 CALL @ $155 strike, 30 days to expiration
Premium collected: $200

Result: AAPL stays at $152
→ CALL expires worthless
→ Keep $200 premium
→ Still own 100 shares
```

**Running P&L**: +$250 (put) +$200 (call 1) = +$450

### Month 3: Sell Second Covered CALL

```
Position: Still own 100 shares @ $147.50 cost basis
Current price: $152 (+$4.50/share unrealized gain)

Action: Sell 1 CALL @ $155 strike, 30 days to expiration
Premium collected: $200

Result: AAPL rises to $158
→ CALL assigned
→ Sell 100 shares @ $155
```

**Final P&L Calculation**:
```
PUT premium:        +$250
CALL premium #1:    +$200
CALL premium #2:    +$200
Stock gain:         +$750  (sold @ $155, cost basis $147.50)
─────────────────────────
TOTAL PROFIT:       $1,400

Capital deployed:   $15,000
Return:             9.3%
Duration:           90 days
Annualized return:  ~38%
```

### Cycle Complete - Start Over

Now you can sell a new PUT on AAPL (or any other stock) and start the wheel cycle again!

---

## Key Concepts

### Cash-Secured PUT

A **cash-secured put** means you have enough cash in your account to buy the shares if assigned. This is the safest way to sell puts because you're prepared for assignment.

**Formula**: `Cash Required = Strike Price × 100 shares × Number of Contracts`

**Example**: Selling 1 PUT @ $150 requires $15,000 in cash (or buying power)

### Covered CALL

A **covered call** means you own the underlying shares, so if the call is assigned, you can deliver them. This is the safest way to sell calls.

**Formula**: `Shares Required = 100 shares × Number of Contracts`

**Example**: Selling 1 CALL requires owning 100 shares

### Assignment

**Assignment** occurs when the option buyer exercises their right to buy (for calls) or sell (for puts) the stock.

- **PUT assignment**: You must BUY shares at the strike price
- **CALL assignment**: You must SELL shares at the strike price

Assignment typically happens when the option is **in-the-money (ITM)** at expiration.

### In-the-Money (ITM) vs. Out-of-the-Money (OTM)

**For PUTs**:
- ITM: Stock price < Strike price (you'll likely be assigned)
- OTM: Stock price > Strike price (option expires worthless)

**For CALLs**:
- ITM: Stock price > Strike price (you'll likely be assigned)
- OTM: Stock price < Strike price (option expires worthless)

**Example**:
```
AAPL stock price: $150

$155 PUT: OTM (stock above strike, won't be assigned)
$145 PUT: ITM (stock below strike, will likely be assigned)

$155 CALL: OTM (stock below strike, won't be assigned)
$145 CALL: ITM (stock above strike, will likely be assigned)
```

### Cost Basis Calculation

Your **cost basis** is your effective price per share after accounting for premiums collected.

**Formula**: `Cost Basis = (Purchase Price × Shares - Total Premiums) / Shares`

**Example**:
```
Bought 100 shares @ $150 (from PUT assignment)
PUT premium collected: $250
Cost basis: ($15,000 - $250) / 100 = $147.50/share

Later, if you sell @ $155 via CALL assignment:
Stock profit: ($155 - $147.50) × 100 = $750
```

---

## Risk Management

### Understanding Your Risks

#### 1. Downside Risk (Stock Price Drops)

**The Risk**: After put assignment, the stock price continues to fall, leaving you with shares worth less than your cost basis.

**Example**:
```
You bought AAPL @ $147.50 cost basis
Stock drops to $130
Unrealized loss: -$1,750 (-11.9%)
```

**Mitigation Strategies**:
- Only sell puts on stocks you're willing to own long-term
- Choose strike prices you're comfortable with as a cost basis
- Diversify across multiple stocks
- Keep selling covered calls to reduce your cost basis over time
- Set stop-loss levels if the stock fundamentals change

#### 2. Opportunity Cost (Stock Price Soars)

**The Risk**: After selling a covered call, the stock price soars well above your strike, and your shares get called away, missing out on further gains.

**Example**:
```
You sold CALL @ $155 strike
Stock rises to $180
Your shares sold @ $155
Missed gain: $25/share ($2,500 total)
```

**Mitigation Strategies**:
- Accept that this is part of the strategy (you still made profit!)
- Choose higher strikes for more upside potential (but less premium)
- Don't sell calls on stocks you expect to make explosive moves
- Consider "rolling" the call to a higher strike or later date

#### 3. Assignment Before Expiration

**The Risk**: Options can be assigned early if they're deep in-the-money, disrupting your timeline.

**Mitigation**:
- Early assignment is rare (option holders lose time value)
- Most common right before ex-dividend dates
- Monitor positions approaching dividend dates
- Accept it as part of the strategy

### Best and Worst Market Conditions

#### Best Conditions for the Wheel
✅ **Range-bound markets**: Stock moves sideways, options expire worthless repeatedly
✅ **Moderate volatility**: Higher premiums without excessive risk
✅ **Slight uptrend**: Stock appreciates slowly, calls assigned at profit
✅ **High implied volatility**: Collect larger premiums

#### Worst Conditions for the Wheel
❌ **Sharp downtrends**: Stock crashes after put assignment, large unrealized losses
❌ **Parabolic moves**: Stock soars, shares called away, missing massive gains
❌ **Low volatility**: Premiums too small to make strategy worthwhile
❌ **Gap moves**: Large overnight moves can cause unexpected assignments

### Position Sizing

**Never risk more than you can afford to lose on a single wheel.**

**Recommended approach**:
- Allocate 5-10% of your portfolio per wheel
- Run multiple wheels on different stocks to diversify
- Keep cash reserve for new opportunities
- Don't over-leverage your account

**Example Portfolio Allocation**:
```
Total Portfolio: $100,000

Wheel on AAPL:  $15,000 (15%)
Wheel on MSFT:  $20,000 (20%)
Wheel on TSLA:  $10,000 (10%)
Cash Reserve:   $55,000 (55%)
─────────────────────────
Total Deployed: $45,000 (45% of portfolio)
```

### When to Exit a Wheel

Consider stopping a wheel on a stock if:

- ❌ Company fundamentals deteriorate
- ❌ Stock enters long-term downtrend
- ❌ Better opportunities arise elsewhere
- ❌ You no longer want to own the stock
- ❌ Volatility drops too low (premiums not worth it)

**Exit strategy**:
1. Stop selling new options
2. Let current options expire or close them
3. Sell shares at market if holding a position
4. Realize your P&L and move on

---

## Advanced Techniques

### Rolling Options

**Rolling** means closing your current option and opening a new one with a different strike or expiration date.

**When to roll**:
- Option is ITM and you don't want assignment
- Want to extend time to collect more premium
- Want to adjust strike price

**How to roll a PUT**:
```
Current: Short PUT @ $150 strike, expiring this week, ITM
Action: BUY_TO_CLOSE the $150 PUT (pay to close)
        SELL_TO_OPEN a $145 PUT expiring next month (collect premium)
Result: Extended time, lowered strike, collected net credit/debit
```

**How to roll a CALL**:
```
Current: Short CALL @ $155 strike, expiring this week, ITM
Action: BUY_TO_CLOSE the $155 CALL (pay to close)
        SELL_TO_OPEN a $160 CALL expiring next month (collect premium)
Result: Extended time, raised strike, collected net credit/debit
```

### Selecting Strike Prices

#### For PUTs (Step 1)
- **Conservative**: 5-10% below current stock price (lower probability of assignment)
- **Moderate**: At-the-money (ATM) or slightly below (balanced risk/reward)
- **Aggressive**: Above current price (higher probability of assignment)

#### For CALLs (Step 3)
- **Above cost basis**: Guarantees profit if assigned (recommended)
- **At cost basis**: Break even on stock, keep only premiums
- **Below cost basis**: Realize loss on stock (not recommended)

**Example**:
```
Stock: AAPL @ $150
Cost basis after PUT: $147.50

CALL strike options:
$145 - Below cost basis (would lose $2.50/share) ❌
$150 - Near cost basis (small profit $2.50/share) ⚠️
$155 - Above cost basis (profit $7.50/share) ✅ RECOMMENDED
$160 - Well above cost basis (more profit, less premium) ✅
```

### Choosing Expiration Dates

**Short-term (7-14 days)**:
- ✅ Higher theta decay (premium erodes faster)
- ✅ More flexibility to adjust
- ❌ More transactions, more fees
- ❌ Lower premium per trade

**Medium-term (30-45 days)**:
- ✅ Good balance of premium and flexibility
- ✅ Recommended for most traders
- ✅ Weekly/monthly expirations available

**Long-term (60+ days)**:
- ✅ Higher premium collected upfront
- ❌ Capital tied up longer
- ❌ Less flexibility to adjust

### Managing Multiple Wheels

You can run wheels on multiple stocks simultaneously to diversify risk and income:

```
PORTFOLIO OVERVIEW

AAPL Wheel - Step 3 (Covered Position)
→ 100 shares @ $147.50
→ 1 CALL @ $155, exp 3/15
→ Cycle #3, Total P&L: +$3,200

MSFT Wheel - Step 1 (Collecting Premium)
→ 1 PUT @ $380, exp 3/22
→ Cycle #1, Total P&L: +$450

TSLA Wheel - Step 2 (Uncovered Position)
→ 100 shares @ $210
→ No active CALL
→ Cycle #2, Total P&L: -$150

Portfolio Stats:
→ Total Premiums: $3,500
→ Realized P&L: +$3,500
→ Unrealized P&L: +$450
```

---

## Common Questions

### What if I don't want to own the stock?

Don't sell puts on stocks you wouldn't want to own. The wheel strategy works best when you're happy to own the underlying stock at your strike price. If you're uncomfortable holding a stock, choose a different ticker.

### What if the stock drops significantly after assignment?

This is the main risk of the wheel. Your options:

1. **Keep selling calls** to reduce your cost basis over time
2. **Hold and wait** for the stock to recover
3. **Take the loss** and exit the position
4. **Average down** by buying more shares (risky!)

The key is to only wheel stocks you believe in long-term.

### How much premium should I target?

A general rule of thumb:

- **PUTs**: Target 1-3% of the strike price per month
- **CALLs**: Target 1-2% of the strike price per month

**Example**:
```
$150 strike PUT, 30 days to expiration
Target premium: $150-$450 (1-3%)

If premium is less than 1%, the risk/reward may not be worth it.
```

### Can I wheel any stock?

Technically yes, but the best candidates are:

✅ Stocks you want to own
✅ Liquid stocks with tight bid-ask spreads
✅ Stocks with moderate to high implied volatility
✅ Blue-chip or fundamentally sound companies
✅ Stocks that trade in a range (not parabolic movers)

❌ Avoid:
- Penny stocks
- Extremely volatile meme stocks (unless you accept high risk)
- Stocks with poor fundamentals
- Illiquid options (wide spreads)

### What about dividends?

**Dividends are a bonus!** If you own shares and the stock pays a dividend, you collect it. This adds to your total return.

**Watch out for early assignment**: Call buyers may exercise early before ex-dividend date to capture the dividend.

### What's the minimum account size?

It depends on the stocks you want to wheel:

- **Small account ($5,000-$10,000)**: Wheel cheaper stocks ($20-50/share)
- **Medium account ($10,000-$50,000)**: Wheel mid-cap stocks ($50-150/share)
- **Large account ($50,000+)**: Wheel any stocks including expensive ones ($200+/share)

**Remember**: You need cash to buy 100 shares at your strike price.

---

## Using Wheel Tracker App

The Wheel Tracker app helps you manage your wheel strategies efficiently:

### Key Features

1. **Track Complete Cycles**: See each wheel from start to finish
2. **Guided Flows**: Step-by-step prompts for assignments and new trades
3. **P&L Tracking**: Automatic calculation of realized and unrealized gains
4. **Cost Basis Calculation**: Automatically tracks your effective cost per share
5. **Dashboard**: Visual overview of all active wheels
6. **Analytics**: Performance metrics per wheel and overall portfolio

### Workflow in Wheel Tracker

**Starting a New Wheel**:
1. Create a new PUT trade
2. App tracks it as Step 1 of a new wheel cycle

**PUT Assignment**:
1. Mark PUT as assigned
2. App creates position with calculated cost basis
3. Prompts you to sell covered call

**Selling Covered Calls**:
1. Navigate to position
2. Click "Sell Covered Call"
3. Pre-filled form with position data
4. App validates strike price and shares

**CALL Assignment**:
1. Mark CALL as assigned
2. App shows profit summary
3. Position closed automatically
4. Prompts to start new PUT cycle

**Monitoring**:
- Dashboard shows all active wheels
- See which step each wheel is on
- View total P&L per wheel
- Track cycle count and win rate

---

## Further Reading

### Recommended Resources

**Educational Websites**:
- [Charles Schwab: Three Things to Know About the Wheel Strategy](https://www.schwab.com/learn/story/three-things-to-know-about-wheel-strategy)
- [Option Alpha: How to Trade the Options Wheel Strategy](https://optionalpha.com/blog/wheel-strategy)
- [InsiderFinance: Complete Guide to Wheel Options Trading Strategy](https://www.insiderfinance.io/resources/complete-guide-to-wheel-options-trading-strategy)

**Options Education**:
- r/thetagang (Reddit community for premium selling strategies)
- Option Alpha (Free options education)
- tastytrade (Options trading education and research)

**Important Disclaimer**:
This guide is for educational purposes only. Options trading involves risk and is not suitable for all investors. Past performance does not guarantee future results. Consult with a financial advisor before trading options.

---

## Quick Reference

### The Wheel in 3 Steps

1. **Sell PUT** → Collect premium → (If assigned: buy shares) → Go to 2
2. **Hold Shares** → Calculate cost basis → Go to 3
3. **Sell CALL** → Collect premium → (If assigned: sell shares) → Go to 1

### Key Formulas

```
Cost Basis = (Strike Price - Premium per Share)

Put Premium Target = Strike Price × 1-3% × (Days to Expiration / 30)

Call Premium Target = Strike Price × 1-2% × (Days to Expiration / 30)

Realized P&L = Total Premiums + Stock Gain/Loss

Annualized Return = (Total P&L / Capital / Days) × 365 × 100
```

### Decision Tree

```
Do you want to own this stock long-term?
├─ Yes → Proceed with wheel
└─ No → Choose different stock

Is the premium worth the risk?
├─ Yes (≥1% per month) → Proceed
└─ No (< 1% per month) → Skip or choose different strike

After PUT assignment: Is stock above cost basis?
├─ Yes → Sell CALL at higher strike (profit guaranteed)
└─ No → Sell CALL at or above cost basis (reduce loss)

After CALL assignment: Wheel completed!
→ Start new PUT or move to different stock
```

---

**Happy Wheeling!** Remember: patience and consistency are key. The wheel strategy is a marathon, not a sprint. Focus on collecting premium consistently and making smart decisions, and the profits will compound over time.

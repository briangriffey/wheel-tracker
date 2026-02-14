import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Glossary - Wheel Tracker',
  description: 'Options trading and wheel strategy terminology',
}

interface GlossaryTermProps {
  term: string
  definition: string | React.ReactNode
  category?: string
}

function GlossaryTerm({ term, definition }: GlossaryTermProps) {
  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      <dt className="font-bold text-lg text-gray-900 mb-2">{term}</dt>
      <dd className="text-gray-700 leading-relaxed pl-4">{definition}</dd>
    </div>
  )
}

export default function GlossaryPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Options Trading Glossary
          </h1>
          <p className="text-gray-600">
            Key terms and definitions for options trading and the wheel strategy.
          </p>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-3">Categories</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href="#basics"
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100"
            >
              Basics
            </a>
            <a
              href="#options"
              className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm hover:bg-green-100"
            >
              Options
            </a>
            <a
              href="#wheel"
              className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm hover:bg-purple-100"
            >
              Wheel Strategy
            </a>
            <a
              href="#metrics"
              className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm hover:bg-orange-100"
            >
              Metrics
            </a>
            <a
              href="#advanced"
              className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-sm hover:bg-pink-100"
            >
              Advanced
            </a>
          </div>
        </div>

        {/* Basics */}
        <section id="basics" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
            Basics
          </h2>
          <dl>
            <GlossaryTerm
              term="Stock (Equity)"
              definition="A share of ownership in a company. When you own stock, you own a piece of that company and may receive dividends and voting rights."
            />
            <GlossaryTerm
              term="Ticker Symbol"
              definition="A unique series of letters representing a publicly traded company. For example, AAPL for Apple, MSFT for Microsoft, SPY for the S&P 500 ETF."
            />
            <GlossaryTerm
              term="Shares"
              definition="Units of stock ownership. One contract of options controls 100 shares of the underlying stock."
            />
            <GlossaryTerm
              term="Premium"
              definition="The price paid or received for an options contract. When you sell an option, you collect the premium as income. Quoted per share but represents the total for 100 shares (e.g., $2.50 premium = $250 total)."
            />
            <GlossaryTerm
              term="Strike Price"
              definition="The predetermined price at which the option can be exercised. For PUTs, it's the price at which you'd buy the stock. For CALLs, it's the price at which you'd sell the stock."
            />
            <GlossaryTerm
              term="Expiration Date"
              definition="The date when an options contract expires and becomes worthless if not exercised. After this date, the option no longer exists."
            />
            <GlossaryTerm
              term="Contract"
              definition="A single options contract represents the right to buy or sell 100 shares of stock at the strike price. If you sell 2 contracts, you're controlling 200 shares."
            />
          </dl>
        </section>

        {/* Options */}
        <section id="options" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-green-500 pb-2">
            Options Trading
          </h2>
          <dl>
            <GlossaryTerm
              term="Option"
              definition="A contract giving the right (but not obligation) to buy or sell a stock at a specific price by a specific date. There are two types: PUTs and CALLs."
            />
            <GlossaryTerm
              term="PUT Option"
              definition="A contract giving the holder the right to SELL stock at the strike price. When you sell a PUT, you're obligated to BUY the stock at the strike price if assigned."
            />
            <GlossaryTerm
              term="CALL Option"
              definition="A contract giving the holder the right to BUY stock at the strike price. When you sell a CALL, you're obligated to SELL the stock at the strike price if assigned."
            />
            <GlossaryTerm
              term="Sell to Open (STO)"
              definition="Opening a new short position by selling an option contract. This is how you initiate trades in the wheel strategy - you sell options to collect premium."
            />
            <GlossaryTerm
              term="Buy to Close (BTC)"
              definition="Closing an existing short option position by buying back the contract. You do this to exit a trade early, typically for a profit if the option's value has decreased."
            />
            <GlossaryTerm
              term="In the Money (ITM)"
              definition="An option with intrinsic value. For PUTs: stock price < strike price. For CALLs: stock price > strike price. ITM options are likely to be exercised."
            />
            <GlossaryTerm
              term="Out of the Money (OTM)"
              definition="An option with no intrinsic value. For PUTs: stock price > strike price. For CALLs: stock price < strike price. OTM options typically expire worthless."
            />
            <GlossaryTerm
              term="At the Money (ATM)"
              definition="An option where the stock price equals (or is very close to) the strike price. These have maximum time value."
            />
            <GlossaryTerm
              term="Assignment"
              definition="When an option is exercised and you're required to fulfill the contract. For short PUTs: you buy the stock. For short CALLs: you sell the stock. This happens automatically at expiration if the option is ITM."
            />
            <GlossaryTerm
              term="Exercise"
              definition="The act of using the rights granted by an option contract. The buyer chooses to exercise; the seller is assigned. Most options are exercised at expiration if ITM."
            />
            <GlossaryTerm
              term="Time Decay (Theta)"
              definition="The rate at which an option loses value as time passes. This works in favor of option sellers (like in the wheel strategy). Time decay accelerates as expiration approaches, especially in the last 30 days."
            />
            <GlossaryTerm
              term="Implied Volatility (IV)"
              definition="The market's forecast of future price volatility. Higher IV means higher premiums (good for sellers). IV often spikes before earnings announcements."
            />
          </dl>
        </section>

        {/* Wheel Strategy */}
        <section id="wheel" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-500 pb-2">
            Wheel Strategy Terms
          </h2>
          <dl>
            <GlossaryTerm
              term="The Wheel Strategy"
              definition="A systematic options trading strategy that involves selling cash-secured PUTs, getting assigned shares, then selling covered CALLs. Called 'the wheel' because you cycle through these steps repeatedly."
            />
            <GlossaryTerm
              term="Cash-Secured PUT"
              definition="A PUT option you sell while having enough cash in your account to buy the stock if assigned. This is the first step of the wheel strategy. You collect premium and either keep it (if expired) or buy the stock."
            />
            <GlossaryTerm
              term="Covered CALL"
              definition="A CALL option you sell while owning the underlying stock (100 shares per contract). This is step 3 of the wheel. You collect premium and either keep it (if expired) or sell your shares at the strike price."
            />
            <GlossaryTerm
              term="Cost Basis"
              definition="Your effective purchase price per share. For assigned PUTs, it's the strike price. The premium you collected reduces your break-even point. Example: $100 strike - $2 premium = $98 cost basis."
            />
            <GlossaryTerm
              term="Rolling"
              definition="Closing an existing option and simultaneously opening a new one at a different strike price and/or expiration date. Used to avoid assignment or to collect more premium. Can roll 'out' (later date), 'up' (higher strike), or 'down' (lower strike)."
            />
            <GlossaryTerm
              term="Wheel Cycle"
              definition="One complete rotation through the wheel: Sell PUT → Get Assigned → Sell CALLs → Get Assigned (shares sold). A full cycle generates premium from both the PUT and multiple CALLs."
            />
            <GlossaryTerm
              term="Premium Farming"
              definition="The practice of consistently collecting option premiums, which is the core income generation method of the wheel strategy."
            />
          </dl>
        </section>

        {/* Metrics */}
        <section id="metrics" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
            Performance Metrics
          </h2>
          <dl>
            <GlossaryTerm
              term="Profit & Loss (P&L)"
              definition="The total gain or loss from your trading activity. Includes all premiums collected, minus any costs to close positions, plus gains/losses from stock sales."
            />
            <GlossaryTerm
              term="Realized P&L"
              definition="Actual profit or loss from closed trades and positions. This is 'real' money that's been earned or lost."
            />
            <GlossaryTerm
              term="Unrealized P&L"
              definition="Paper profit or loss on open positions based on current market prices. This hasn't been 'realized' yet because you still hold the position."
            />
            <GlossaryTerm
              term="Return on Capital"
              definition="The percentage return on the money you have invested. Calculated as (Total P&L / Total Capital) × 100%. Helps you measure strategy effectiveness."
            />
            <GlossaryTerm
              term="Win Rate"
              definition="Percentage of trades that are profitable. In wheel strategy, this is typically high (70-90%) because you profit from time decay and the stock not moving against you."
            />
            <GlossaryTerm
              term="Benchmark"
              definition="A standard to compare your performance against, typically a market index like SPY (S&P 500) or QQQ (Nasdaq 100). Helps you know if your strategy is outperforming the market."
            />
            <GlossaryTerm
              term="Portfolio Value"
              definition="Total value of all your holdings: open positions (current market value) + cash balance (including collected premiums)."
            />
            <GlossaryTerm
              term="Break-Even Price"
              definition="The stock price where you neither profit nor lose money. For wheel strategy: Strike Price - Total Premiums Collected."
            />
          </dl>
        </section>

        {/* Advanced */}
        <section id="advanced" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-pink-500 pb-2">
            Advanced Concepts
          </h2>
          <dl>
            <GlossaryTerm
              term="Delta"
              definition="A measure of how much an option's price changes when the stock price moves $1. Also represents the approximate probability of the option being ITM at expiration. Many wheel traders sell PUTs with 0.30 delta (30% probability of assignment)."
            />
            <GlossaryTerm
              term="Theta (Time Decay)"
              definition="The amount an option loses in value per day, all else being equal. As an option seller, theta works in your favor. It accelerates in the last 30-45 days before expiration."
            />
            <GlossaryTerm
              term="Gamma"
              definition="The rate of change of delta. Important to understand that as expiration approaches, small price moves can cause large changes in whether you'll be assigned."
            />
            <GlossaryTerm
              term="Vega"
              definition="Measures sensitivity to implied volatility. Higher volatility = higher premiums. Wheel strategy benefits from high IV when selling options."
            />
            <GlossaryTerm
              term="The Greeks"
              definition="Collective term for Delta, Theta, Gamma, and Vega - the four main risk measures for options. Understanding these helps you select better trades."
            />
            <GlossaryTerm
              term="Extrinsic Value"
              definition="The portion of an option's price attributed to time remaining and volatility (not intrinsic value). This is what decays over time and what you want to capture as a seller."
            />
            <GlossaryTerm
              term="Intrinsic Value"
              definition="The real value of an option if exercised right now. For PUTs: max(Strike Price - Stock Price, 0). For CALLs: max(Stock Price - Strike Price, 0)."
            />
            <GlossaryTerm
              term="Annualized Return"
              definition="Your return extrapolated to a full year for comparison purposes. Example: 2% return in 30 days ≈ 24% annualized (2% × 12 months)."
            />
            <GlossaryTerm
              term="Probability of Profit (POP)"
              definition="The statistical likelihood that a trade will be profitable. In the wheel strategy, selling OTM options gives you high POP (often 60-80%) because the stock just needs to not move much."
            />
            <GlossaryTerm
              term="Max Profit"
              definition="For option sellers, the maximum profit is the premium collected. This is achieved when options expire worthless or are closed at little/no cost."
            />
            <GlossaryTerm
              term="Max Loss"
              definition="For cash-secured PUTs: (Strike Price × 100) - Premium. For covered CALLs: Technically unlimited on the upside opportunity cost, but capped risk at your cost basis."
            />
          </dl>
        </section>

        {/* Additional Resources */}
        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Learn More
          </h2>
          <p className="text-gray-700 mb-4">
            Now that you know the terminology, put it into practice:
          </p>
          <div className="space-y-2">
            <Link
              href="/help/user-guide"
              className="block text-blue-600 hover:text-blue-800 hover:underline"
            >
              📖 Read the Complete User Guide
            </Link>
            <Link
              href="/help/faq"
              className="block text-blue-600 hover:text-blue-800 hover:underline"
            >
              ❓ Check the FAQ
            </Link>
            <Link
              href="/dashboard"
              className="block text-blue-600 hover:text-blue-800 hover:underline"
            >
              📊 Go to Dashboard
            </Link>
          </div>
        </div>

        {/* Quick Reference Card */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Quick Reference: The Wheel in 3 Steps
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl mb-2">1️⃣</div>
              <h3 className="font-bold text-gray-900 mb-1">Sell PUT</h3>
              <p className="text-sm text-gray-600">
                Collect premium. If expired: keep premium. If assigned: buy
                stock at strike.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl mb-2">2️⃣</div>
              <h3 className="font-bold text-gray-900 mb-1">Own Shares</h3>
              <p className="text-sm text-gray-600">
                Your cost basis is the strike price. Premium collected reduces
                break-even.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl mb-2">3️⃣</div>
              <h3 className="font-bold text-gray-900 mb-1">Sell CALL</h3>
              <p className="text-sm text-gray-600">
                Collect more premium. Repeat until assigned, then restart the
                wheel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

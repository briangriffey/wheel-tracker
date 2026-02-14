import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'FAQ - Wheel Tracker',
  description: 'Frequently asked questions about using Wheel Tracker',
}

interface FAQItemProps {
  question: string
  answer: string | React.ReactNode
  category?: string
}

function FAQItem({ question, answer }: FAQItemProps) {
  return (
    <details className="group border-b border-gray-200 pb-4 mb-4">
      <summary className="font-semibold text-gray-900 cursor-pointer list-none flex items-center justify-between py-2 hover:text-blue-600 transition-colors">
        {question}
        <span className="ml-2 text-gray-500 group-open:rotate-180 transition-transform">
          ▼
        </span>
      </summary>
      <div className="mt-3 text-gray-700 leading-relaxed pl-4">{answer}</div>
    </details>
  )
}

export default function FAQPage() {
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
            Frequently Asked Questions
          </h1>
          <p className="text-gray-600">
            Find answers to common questions about Wheel Tracker and the wheel
            strategy.
          </p>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-3">Quick Links</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href="#getting-started"
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100"
            >
              Getting Started
            </a>
            <a
              href="#trading"
              className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm hover:bg-green-100"
            >
              Trading
            </a>
            <a
              href="#strategy"
              className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm hover:bg-purple-100"
            >
              Strategy
            </a>
            <a
              href="#technical"
              className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm hover:bg-orange-100"
            >
              Technical
            </a>
            <a
              href="#account"
              className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-sm hover:bg-pink-100"
            >
              Account
            </a>
          </div>
        </div>

        {/* Getting Started */}
        <section id="getting-started" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Getting Started
          </h2>

          <FAQItem
            question="What is the wheel strategy?"
            answer={
              <>
                The wheel strategy is a conservative options trading strategy
                that involves three steps:
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Sell cash-secured PUTs to collect premium</li>
                  <li>If assigned, own the stock at a reduced cost basis</li>
                  <li>Sell covered CALLs against your shares for more premium</li>
                </ol>
                <p className="mt-2">
                  It&apos;s called the &quot;wheel&quot; because you cycle through these steps
                  repeatedly to generate consistent income.
                </p>
              </>
            }
          />

          <FAQItem
            question="What's the minimum account size needed?"
            answer="We recommend starting with at least $5,000-$10,000. This gives you enough capital to be assigned 100 shares of quality stocks if your PUTs get exercised. However, you can start smaller by trading lower-priced stocks or using smaller position sizes."
          />

          <FAQItem
            question="How much time does wheel trading take?"
            answer="Typically 1-2 hours per week once you're comfortable with the process. This includes: researching new trades (30 min), entering trades in your broker (15 min), updating Wheel Tracker (15 min), and reviewing performance (30 min). The strategy is designed to be passive income."
          />

          <FAQItem
            question="What's a realistic return expectation?"
            answer="Conservative estimates are 15-25% annually, though results vary based on market conditions, stock selection, and your strike choices. The wheel strategy prioritizes consistency over maximum returns, trading lower risk for steadier income."
          />
        </section>

        {/* Trading Questions */}
        <section id="trading" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Trading</h2>

          <FAQItem
            question="How do I enter my first trade?"
            answer={
              <>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to Trades → New Trade</li>
                  <li>Enter the ticker symbol (e.g., &quot;AAPL&quot;)</li>
                  <li>Select type (PUT or CALL)</li>
                  <li>Select action (SELL_TO_OPEN)</li>
                  <li>Enter strike price and premium</li>
                  <li>Enter number of contracts and expiration date</li>
                  <li>Add any notes and click Create Trade</li>
                </ol>
                <p className="mt-2">
                  See the{' '}
                  <Link href="/help/user-guide" className="text-blue-600 hover:underline">
                    User Guide
                  </Link>{' '}
                  for detailed instructions.
                </p>
              </>
            }
          />

          <FAQItem
            question="What happens when I get assigned?"
            answer="When a PUT is assigned, Wheel Tracker automatically creates a new position for the shares you received. Your cost basis is set to the strike price. You can then start selling covered CALLs against this position to collect additional premium."
          />

          <FAQItem
            question="How do I close a trade early?"
            answer="Find the trade in your trades list and click the 'Close' button. Enter the closing premium (what you paid to buy it back). The trade status will update to 'CLOSED' and your P&L will be calculated automatically."
          />

          <FAQItem
            question="Can I edit a trade after creating it?"
            answer="You can update the status and close date, but core trade details (strike, premium, contracts) cannot be edited to maintain data integrity. If you made an error, delete the trade and create a new one with the correct information."
          />

          <FAQItem
            question="What if I don't want to get assigned?"
            answer={
              <>
                You have several options:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    <strong>Roll the option:</strong> Close the current position and
                    open a new one at a different strike or expiration
                  </li>
                  <li>
                    <strong>Buy it back:</strong> Close the option before expiration
                  </li>
                  <li>
                    <strong>Choose safer strikes:</strong> Sell PUTs farther
                    out-of-the-money
                  </li>
                </ul>
              </>
            }
          />
        </section>

        {/* Strategy Questions */}
        <section id="strategy" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Strategy & Best Practices
          </h2>

          <FAQItem
            question="Which stocks should I use for wheel strategy?"
            answer={
              <>
                Choose stocks that meet these criteria:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    <strong>Quality companies:</strong> Stocks you&apos;d actually want to
                    own
                  </li>
                  <li>
                    <strong>Stable blue chips:</strong> Lower volatility = more
                    predictable
                  </li>
                  <li>
                    <strong>Dividend payers:</strong> Extra income while holding
                    shares
                  </li>
                  <li>
                    <strong>Good liquidity:</strong> Adequate options volume for fair
                    pricing
                  </li>
                </ul>
                <p className="mt-2">
                  Popular choices: AAPL, MSFT, SPY, QQQ, INTC, F, AMD, NVDA
                </p>
              </>
            }
          />

          <FAQItem
            question="What expiration date should I choose?"
            answer="The 'sweet spot' is typically 30-45 days until expiration. This strikes a balance between collecting good premium (time decay accelerates) and managing risk (less time for unexpected moves). Some traders prefer weekly options for faster cycles, while others use 45-60 days for more premium."
          />

          <FAQItem
            question="How do I choose the right strike price?"
            answer={
              <>
                <p>
                  <strong>For PUTs:</strong> Choose strikes below the current price
                  (out-of-the-money) at a price where you&apos;d be happy owning the
                  stock. Consider using technical support levels.
                </p>
                <p className="mt-2">
                  <strong>For CALLs:</strong> Choose strikes above your cost basis
                  to ensure profitability if assigned. Many traders aim for 2-5%
                  above current price for weekly options.
                </p>
              </>
            }
          />

          <FAQItem
            question="Should I always sell covered CALLs after assignment?"
            answer="Generally yes, as this is core to the wheel strategy and generates consistent income. However, if you strongly believe the stock will rally significantly in the short term, you might temporarily hold off. Just remember that not selling calls means giving up guaranteed premium income."
          />

          <FAQItem
            question="What if a stock drops significantly after I'm assigned?"
            answer="Stay patient and continue the strategy. Keep selling covered CALLs at strikes that reduce your cost basis. Each premium collected brings your break-even point lower. The wheel strategy is about long-term consistency, not quick profits. This is why choosing quality stocks you believe in is crucial."
          />

          <FAQItem
            question="Can I trade multiple tickers at once?"
            answer="Yes, and diversification is recommended! Track 3-5 different stocks to spread risk. Don't put more than 10-15% of your portfolio in any single ticker. This way, if one stock underperforms, it won't sink your entire strategy."
          />
        </section>

        {/* Technical Questions */}
        <section id="technical" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Technical Questions
          </h2>

          <FAQItem
            question="How is my profit & loss calculated?"
            answer={
              <>
                <p>
                  <strong>For trades:</strong> P&L = Premium Collected - Closing
                  Cost (if any)
                </p>
                <p className="mt-2">
                  <strong>For positions:</strong> P&L = (Sale Price - Cost Basis) ×
                  Shares + All Associated CALL Premiums
                </p>
                <p className="mt-2">
                  <strong>Total portfolio:</strong> Sum of all trade premiums + all
                  position gains/losses (both realized and unrealized)
                </p>
                <p className="mt-2">
                  See the{' '}
                  <Link href="/help/user-guide#profit--loss-calculations" className="text-blue-600 hover:underline">
                    User Guide
                  </Link>{' '}
                  for detailed calculations.
                </p>
              </>
            }
          />

          <FAQItem
            question="Where does stock price data come from?"
            answer="We use the Alpha Vantage API for stock price data. Prices are updated when you view the positions page and automatically once daily via scheduled background jobs. This ensures accurate position valuations for calculating unrealized P&L."
          />

          <FAQItem
            question="How often is my position value updated?"
            answer="Stock prices refresh automatically when you visit the Positions page. Additionally, a background job updates all stock prices daily to keep your portfolio valuation current. You can manually refresh prices using the 'Refresh Prices' button."
          />

          <FAQItem
            question="What are benchmarks and how do I use them?"
            answer={
              <>
                <p>
                  Benchmarks help you compare your wheel strategy performance
                  against market indices like SPY or QQQ. To set up:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Go to Dashboard</li>
                  <li>Click &quot;Add Market Benchmark&quot;</li>
                  <li>
                    Enter a ticker (SPY, QQQ, VTI), initial capital, and start
                    date
                  </li>
                  <li>
                    View comparison charts to see if your strategy outperforms
                  </li>
                </ol>
              </>
            }
          />

          <FAQItem
            question="Can I export my data?"
            answer="Yes! Both the Trades and Positions pages have Export buttons that generate CSV files. These files include all trade details, dates, premiums, and P&L calculations - perfect for tax preparation or further analysis in Excel."
          />
        </section>

        {/* Account Questions */}
        <section id="account" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Account & Security
          </h2>

          <FAQItem
            question="Is my data secure?"
            answer="Yes. All data is encrypted in transit (HTTPS) and at rest. Passwords are hashed using industry-standard bcrypt. We use NextAuth.js for secure authentication. Your trading data is stored in a secure PostgreSQL database and never shared with third parties."
          />

          <FAQItem
            question="What if I forget my password?"
            answer="Use the 'Forgot Password' link on the login page. Enter your email address and you'll receive a password reset link. The link expires after 24 hours for security."
          />

          <FAQItem
            question="Can I change my email or name?"
            answer="Currently, you can update your name in account settings. Email changes require additional verification and may need to contact support to ensure account security."
          />

          <FAQItem
            question="How do I delete my account?"
            answer="Contact support to request account deletion. We'll permanently delete all your data within 30 days. Note that this action cannot be undone, so export your data first if you need it for tax purposes."
          />
        </section>

        {/* Still Need Help */}
        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Still need help?
          </h2>
          <p className="text-gray-700 mb-4">
            Check out these additional resources:
          </p>
          <div className="space-y-2">
            <Link
              href="/help/user-guide"
              className="block text-blue-600 hover:text-blue-800 hover:underline"
            >
              📖 Complete User Guide
            </Link>
            <Link
              href="/help/glossary"
              className="block text-blue-600 hover:text-blue-800 hover:underline"
            >
              📚 Options Trading Glossary
            </Link>
            <a
              href="mailto:support@wheeltracker.com"
              className="block text-blue-600 hover:text-blue-800 hover:underline"
            >
              ✉️ Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

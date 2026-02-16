import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'User Guide - GreekWheel',
  description: 'Step-by-step guide to using GreekWheel for the wheel strategy',
}

export default function UserGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/help"
            className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block"
          >
            &larr; Back to Help Center
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Guide</h1>
          <p className="text-gray-600">
            A complete walkthrough of the GreekWheel workflow, from funding your account to
            reading your dashboard.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-3">Contents</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href="#adding-cash"
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100"
            >
              Adding Cash
            </a>
            <a
              href="#opening-trades"
              className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm hover:bg-green-100"
            >
              Opening Trades
            </a>
            <a
              href="#managing-open-trades"
              className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm hover:bg-purple-100"
            >
              Managing Open Trades
            </a>
            <a
              href="#positions-from-assignment"
              className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm hover:bg-orange-100"
            >
              Positions from Assignment
            </a>
            <a
              href="#selling-covered-calls"
              className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-sm hover:bg-pink-100"
            >
              Selling Covered Calls
            </a>
            <a
              href="#the-wheel-cycle"
              className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm hover:bg-indigo-100"
            >
              The Wheel Cycle
            </a>
            <a
              href="#reading-your-dashboard"
              className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm hover:bg-teal-100"
            >
              Reading Your Dashboard
            </a>
          </div>
        </div>

        {/* 1. Adding Cash */}
        <section id="adding-cash" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
            1. Adding Cash
          </h2>
          <p className="text-gray-700 mb-4">
            Before you start trading, record the cash you have available in your brokerage account.
            This lets GreekWheel compare your portfolio performance against a SPY buy-and-hold
            benchmark.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
            <li>
              Navigate to <strong>Deposits</strong> in the sidebar.
            </li>
            <li>
              Click <strong>Add Deposit</strong>.
            </li>
            <li>Enter the amount and date that match your brokerage account deposit.</li>
            <li>
              Click <strong>Save</strong>.
            </li>
          </ol>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Why track deposits?</strong> GreekWheel uses your deposit history to
              calculate a &ldquo;what if you had bought SPY instead?&rdquo; benchmark. Each deposit
              is assumed to purchase SPY at the closing price on that date, so keeping deposits
              accurate makes the comparison meaningful.
            </p>
          </div>
          <p className="text-gray-700 mt-4">
            If you withdraw money from your brokerage account, record a withdrawal on the same page
            so the benchmark stays in sync.
          </p>
        </section>

        {/* 2. Opening Trades */}
        <section id="opening-trades" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-green-500 pb-2">
            2. Opening Trades
          </h2>
          <p className="text-gray-700 mb-4">There are two ways to create a new trade:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
            <li>
              <strong>From the Wheels page</strong> &mdash; click <strong>Sell PUT</strong> on any
              wheel card to open a pre-filled trade form for that ticker.
            </li>
            <li>
              <strong>From the Trades page</strong> &mdash; click <strong>New Trade</strong> to open
              a blank form.
            </li>
          </ul>

          <h3 className="font-bold text-gray-900 mb-3">Trade form fields</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b">
                    Field
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900">Ticker</td>
                  <td className="px-4 py-2 text-gray-700">Stock symbol, e.g. AAPL, MSFT</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900">Type</td>
                  <td className="px-4 py-2 text-gray-700">PUT or CALL</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900">Action</td>
                  <td className="px-4 py-2 text-gray-700">
                    SELL_TO_OPEN (you are selling to collect premium)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900">Strike Price</td>
                  <td className="px-4 py-2 text-gray-700">
                    The price at which you would buy (PUT) or sell (CALL) shares
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900">Premium</td>
                  <td className="px-4 py-2 text-gray-700">
                    Per-share premium received (e.g. $2.50)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900">Contracts</td>
                  <td className="px-4 py-2 text-gray-700">
                    Number of contracts (each controls 100 shares)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900">Expiration</td>
                  <td className="px-4 py-2 text-gray-700">Date the option contract expires</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-900">Notes</td>
                  <td className="px-4 py-2 text-gray-700">
                    Optional notes about why you entered the trade
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 mt-4">
            <p className="text-sm text-gray-700">
              <strong>Tracking only:</strong> GreekWheel does not connect to your broker. You
              still need to place the actual trade with your brokerage. Enter the trade here after
              you&apos;ve executed it so your performance tracking stays accurate.
            </p>
          </div>
        </section>

        {/* 3. Managing Open Trades */}
        <section id="managing-open-trades" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-purple-500 pb-2">
            3. Managing Open Trades
          </h2>
          <p className="text-gray-700 mb-4">
            Open trades appear on the Trades page with status{' '}
            <span className="font-mono text-sm bg-gray-100 px-1 rounded">OPEN</span>. Each trade has
            action buttons depending on its type:
          </p>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-1">Mark as Expired</h3>
              <p className="text-sm text-gray-700">
                Use this when the option expires worthless. The trade status changes to{' '}
                <span className="font-mono text-xs bg-green-100 text-green-800 px-1 rounded">
                  EXPIRED
                </span>{' '}
                and you keep the full premium as profit.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-1">Close Early (Buy to Close)</h3>
              <p className="text-sm text-gray-700">
                Buy back the option before expiration. Enter the closing premium you paid. Your
                P&amp;L is the difference between the premium you collected and the cost to close.
                Status changes to{' '}
                <span className="font-mono text-xs bg-gray-200 text-gray-800 px-1 rounded">
                  CLOSED
                </span>
                .
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-1">Mark as Assigned</h3>
              <p className="text-sm text-gray-700">
                Use this when a PUT is exercised and you receive shares. GreekWheel automatically
                creates a new position for you (see next section). Status changes to{' '}
                <span className="font-mono text-xs bg-orange-100 text-orange-800 px-1 rounded">
                  ASSIGNED
                </span>
                .
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-1">Delete</h3>
              <p className="text-sm text-gray-700">
                Remove a trade entered by mistake. This cannot be undone, so double-check before
                deleting.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Positions from Assignment */}
        <section id="positions-from-assignment" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-orange-500 pb-2">
            4. Positions from Assignment
          </h2>
          <p className="text-gray-700 mb-4">
            When you mark a PUT trade as assigned, GreekWheel automatically creates a stock
            position:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li>
              <strong>Ticker &amp; shares</strong> are copied from the original PUT trade (contracts
              &times; 100).
            </li>
            <li>
              <strong>Cost basis</strong> is set to the strike price of the assigned PUT.
            </li>
            <li>
              The new position appears on the <strong>Positions</strong> page.
            </li>
          </ul>

          <div className="bg-orange-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700">
              <strong>Cost basis example:</strong> You sold a $175 PUT on AAPL for $3.00 premium and
              got assigned. Your position cost basis is $175 per share. The $300 premium you
              collected is tracked separately as trade P&amp;L, effectively making your break-even
              price $172.
            </p>
          </div>

          <p className="text-gray-700">
            While a position is open, GreekWheel fetches the current stock price and shows your{' '}
            <strong>unrealized P&amp;L</strong> (current market value minus cost basis). This
            updates each time you visit the Positions page.
          </p>
        </section>

        {/* 5. Selling Covered Calls */}
        <section id="selling-covered-calls" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-pink-500 pb-2">
            5. Selling Covered Calls
          </h2>
          <p className="text-gray-700 mb-4">
            Once you own shares from a PUT assignment, you can sell covered CALLs to collect
            additional premium.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
            <li>
              Go to the <strong>Wheels</strong> page and find the position card for that ticker.
            </li>
            <li>
              Click <strong>Sell CALL</strong>. The form is pre-filled with the ticker and type set
              to CALL.
            </li>
            <li>Enter the strike price, premium, contracts, and expiration date.</li>
            <li>Submit the trade.</li>
          </ol>

          <h3 className="font-bold text-gray-900 mb-3">Three possible outcomes</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <span className="text-green-600 font-bold mr-3 mt-0.5">1.</span>
              <div>
                <p className="font-semibold text-gray-900">CALL expires worthless</p>
                <p className="text-sm text-gray-700">
                  You keep the premium and still own the shares. Sell another CALL to collect more
                  premium.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 font-bold mr-3 mt-0.5">2.</span>
              <div>
                <p className="font-semibold text-gray-900">CALL is assigned (shares called away)</p>
                <p className="text-sm text-gray-700">
                  You sell your shares at the strike price. The position closes and your realized
                  P&amp;L includes the stock gain plus all premiums collected. The wheel cycle is
                  complete.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-purple-600 font-bold mr-3 mt-0.5">3.</span>
              <div>
                <p className="font-semibold text-gray-900">You close the CALL early</p>
                <p className="text-sm text-gray-700">
                  Buy back the CALL before expiration. Your P&amp;L is the difference between the
                  premium collected and the closing cost. You still own the shares.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. The Wheel Cycle */}
        <section id="the-wheel-cycle" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-indigo-500 pb-2">
            6. The Wheel Cycle
          </h2>
          <p className="text-gray-700 mb-6">
            The wheel strategy is a repeating cycle. Here&apos;s how all the pieces fit together:
          </p>

          {/* Visual cycle diagram */}
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">1</div>
              <p className="font-bold text-gray-900">Sell PUT</p>
              <p className="text-xs text-gray-600 mt-1">Collect premium</p>
            </div>
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">2</div>
              <p className="font-bold text-gray-900">Assigned</p>
              <p className="text-xs text-gray-600 mt-1">Receive shares</p>
            </div>
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-center col-start-2 row-start-2">
              <div className="text-2xl mb-1">3</div>
              <p className="font-bold text-gray-900">Sell CALL</p>
              <p className="text-xs text-gray-600 mt-1">Collect more premium</p>
            </div>
            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 text-center col-start-1 row-start-2">
              <div className="text-2xl mb-1">4</div>
              <p className="font-bold text-gray-900">Called Away</p>
              <p className="text-xs text-gray-600 mt-1">Sell shares, restart</p>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 mb-6">
            If a PUT or CALL expires worthless, you keep the premium and repeat that step.
          </div>

          <p className="text-gray-700">
            The <strong>Wheels</strong> page groups your trades and positions by ticker so you can
            see exactly where each stock is in its wheel cycle. Each wheel card shows open PUTs,
            active positions, and covered CALLs for that ticker in one place.
          </p>
        </section>

        {/* 7. Reading Your Dashboard */}
        <section id="reading-your-dashboard" className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-teal-500 pb-2">
            7. Reading Your Dashboard
          </h2>
          <p className="text-gray-700 mb-4">
            The Dashboard gives you a top-level view of your portfolio. It is organized into three
            rows:
          </p>

          <div className="space-y-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">Portfolio Overview</h3>
              <p className="text-sm text-gray-700">
                Summary cards showing total deposited capital, current portfolio value, overall
                P&amp;L (dollar and percentage), and how your returns compare to the SPY benchmark
                over the same period.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">Stocks</h3>
              <p className="text-sm text-gray-700">
                A breakdown of each stock position you hold: shares, cost basis, current price,
                unrealized P&amp;L, and the total premium collected from covered CALLs on that
                position.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">Options</h3>
              <p className="text-sm text-gray-700">
                All open option trades with expiration dates, strike prices, premium collected, and
                days remaining. Trades expiring within 7 days are highlighted so you can plan ahead.
              </p>
            </div>
          </div>

          <h3 className="font-bold text-gray-900 mb-3">Charts</h3>
          <p className="text-gray-700">
            Below the summary cards you&apos;ll find performance charts including cumulative P&amp;L
            over time, a portfolio value line chart compared to the SPY benchmark, and a breakdown
            of premium income by month.
          </p>
        </section>

        {/* Footer links */}
        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">More resources</h2>
          <p className="text-gray-700 mb-4">Dive deeper into specific topics:</p>
          <div className="space-y-2">
            <Link
              href="/help/faq"
              className="block text-blue-600 hover:text-blue-800 hover:underline"
            >
              &#10067; Frequently Asked Questions
            </Link>
            <Link
              href="/help/glossary"
              className="block text-blue-600 hover:text-blue-800 hover:underline"
            >
              &#128218; Options Trading Glossary
            </Link>
            <Link href="/help" className="block text-blue-600 hover:text-blue-800 hover:underline">
              &#127968; Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

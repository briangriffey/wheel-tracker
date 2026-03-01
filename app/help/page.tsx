import React from 'react'
import Link from 'next/link'
import { ReplayTourButton } from '@/components/onboarding/replay-tour-button'

export const metadata = {
  title: 'Help Center - GreekWheel',
  description: 'Get help with GreekWheel and the wheel strategy',
}

export default function HelpPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Help Center</h1>
          <p className="text-xl text-gray-600">
            Everything you need to master GreekWheel and the wheel strategy
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/help/faq"
            className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 text-blue-600 text-2xl">
                  ❓
                </div>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
                <p className="text-gray-600">
                  Find quick answers to common questions about trading, strategy, and using the app.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/help/glossary"
            className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 text-green-600 text-2xl">
                  📚
                </div>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Trading Glossary</h2>
                <p className="text-gray-600">
                  Learn options trading terminology and wheel strategy concepts.
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Main Documentation */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-16 w-16 rounded-lg bg-purple-100 text-purple-600 text-3xl">
                📖
              </div>
            </div>
            <div className="ml-6 flex-grow">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Complete User Guide</h2>
              <p className="text-gray-600 mb-4">
                Comprehensive documentation covering everything from getting started to advanced
                strategies. Learn how to enter trades, handle assignments, read your dashboard, and
                optimize your wheel trading.
              </p>
              <Link
                href="/help/user-guide"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <span className="mr-2">📖</span>
                Read User Guide
              </Link>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl mb-2">1️⃣</div>
              <h3 className="font-bold text-gray-900 mb-2">Learn the Basics</h3>
              <p className="text-sm text-gray-700 mb-3">
                Start with the glossary to understand key terms, then read about the wheel strategy.
              </p>
              <Link
                href="/help/glossary#wheel"
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                View Wheel Strategy Terms →
              </Link>
            </div>
            <div>
              <div className="text-3xl mb-2">2️⃣</div>
              <h3 className="font-bold text-gray-900 mb-2">Enter Your First Trade</h3>
              <p className="text-sm text-gray-700 mb-3">
                Follow the step-by-step guide to enter your first PUT option trade.
              </p>
              <Link
                href="/help/faq#trading"
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                How to Enter a Trade →
              </Link>
            </div>
            <div>
              <div className="text-3xl mb-2">3️⃣</div>
              <h3 className="font-bold text-gray-900 mb-2">Track Performance</h3>
              <p className="text-sm text-gray-700 mb-3">
                Set up benchmarks and learn to read your dashboard metrics.
              </p>
              <Link
                href="/help/faq#technical"
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Understanding Benchmarks →
              </Link>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-blue-200/50 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Want to see the welcome tour again?
            </p>
            <ReplayTourButton />
          </div>
        </div>

        {/* Common Tasks */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Common Tasks</h2>
          <div className="space-y-4">
            <div className="flex items-start pb-4 border-b border-gray-200">
              <span className="text-2xl mr-4">💰</span>
              <div className="flex-grow">
                <h3 className="font-bold text-gray-900">Selling a PUT</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Trades → New Trade → Select PUT → Enter details → Submit
                </p>
              </div>
              <Link
                href="/trades/new"
                className="text-blue-600 hover:underline text-sm font-medium whitespace-nowrap"
              >
                Create Trade →
              </Link>
            </div>

            <div className="flex items-start pb-4 border-b border-gray-200">
              <span className="text-2xl mr-4">📦</span>
              <div className="flex-grow">
                <h3 className="font-bold text-gray-900">Handling Assignment</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Click &quot;Assign&quot; on a trade to create a position and start selling covered
                  calls
                </p>
              </div>
              <Link
                href="/help/faq#trading"
                className="text-blue-600 hover:underline text-sm font-medium whitespace-nowrap"
              >
                Learn More →
              </Link>
            </div>

            <div className="flex items-start pb-4 border-b border-gray-200">
              <span className="text-2xl mr-4">📊</span>
              <div className="flex-grow">
                <h3 className="font-bold text-gray-900">Reading Your Dashboard</h3>
                <p className="text-sm text-gray-600 mt-1">
                  View total P&L, active positions, upcoming expirations, and performance charts
                </p>
              </div>
              <Link
                href="/dashboard"
                className="text-blue-600 hover:underline text-sm font-medium whitespace-nowrap"
              >
                View Dashboard →
              </Link>
            </div>

            <div className="flex items-start pb-4 border-b border-gray-200">
              <span className="text-2xl mr-4">📈</span>
              <div className="flex-grow">
                <h3 className="font-bold text-gray-900">Setting Up Benchmarks</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Compare your performance to market indices like SPY or QQQ
                </p>
              </div>
              <Link
                href="/help/faq#technical"
                className="text-blue-600 hover:underline text-sm font-medium whitespace-nowrap"
              >
                Learn More →
              </Link>
            </div>

            <div className="flex items-start">
              <span className="text-2xl mr-4">📥</span>
              <div className="flex-grow">
                <h3 className="font-bold text-gray-900">Exporting for Taxes</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Export trades and positions to CSV for tax preparation
                </p>
              </div>
              <Link
                href="/help/faq#account"
                className="text-blue-600 hover:underline text-sm font-medium whitespace-nowrap"
              >
                Learn More →
              </Link>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-green-50 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">💡 Pro Tips</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>
                <strong>30-45 days expiration</strong> offers the best balance of premium and risk
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>
                <strong>Diversify across 3-5 stocks</strong> to spread your risk
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>
                <strong>Choose quality companies</strong> you&apos;d be happy to own
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>
                <strong>Avoid options during earnings</strong> to reduce volatility risk
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>
                <strong>Use the notes field</strong> to track your reasoning for each trade
              </span>
            </li>
          </ul>
        </div>

        {/* Contact Support */}
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Still Need Help?</h2>
          <p className="text-gray-600 mb-6">
            Can&apos;t find what you&apos;re looking for? Our support team is here to help.
          </p>
          <a
            href="mailto:support@wheeltracker.com"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <span className="mr-2">✉️</span>
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}

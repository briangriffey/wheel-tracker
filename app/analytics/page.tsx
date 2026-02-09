import Link from 'next/link'
import { getPortfolioAnalytics } from '@/lib/actions/analytics'
import { prisma } from '@/lib/db'
import { PortfolioMetrics } from '@/components/analytics/portfolio-metrics'
import { WinRateChart } from '@/components/charts/win-rate-chart'
import { PremiumCollectionChart } from '@/components/charts/premium-collection-chart'
import { CycleDurationHistogram } from '@/components/charts/cycle-duration-histogram'
import { ExportButton } from '@/components/analytics/export-button'
import { calculateTickerPerformances } from '@/lib/calculations/portfolio'

export const metadata = {
  title: 'Analytics | Wheel Tracker',
  description: 'Portfolio analytics and performance metrics',
}

/**
 * Get the current user ID
 * TODO: Replace with actual session-based authentication
 */
async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found. Please create a user first.')
  }
  return user.id
}

export default async function AnalyticsPage() {
  // Fetch portfolio metrics
  const metricsResult = await getPortfolioAnalytics()

  if (!metricsResult.success) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading analytics: {metricsResult.error}</p>
        </div>
      </div>
    )
  }

  const metrics = metricsResult.data

  // Fetch all wheels for chart data
  const userId = await getCurrentUserId()
  const wheels = await prisma.wheel.findMany({
    where: { userId },
    select: {
      id: true,
      ticker: true,
      status: true,
      cycleCount: true,
      totalPremiums: true,
      totalRealizedPL: true,
    },
  })

  // Convert to plain data for ticker performances
  const wheelData = wheels.map((wheel: typeof wheels[number]) => ({
    id: wheel.id,
    ticker: wheel.ticker,
    status: wheel.status,
    cycleCount: wheel.cycleCount,
    totalPremiums: Number(wheel.totalPremiums),
    totalRealizedPL: Number(wheel.totalRealizedPL),
  }))

  const tickerPerformances = calculateTickerPerformances(wheelData)

  // Fetch all trades for premium collection chart
  const trades = await prisma.trade.findMany({
    where: { userId },
    select: {
      id: true,
      premium: true,
      openDate: true,
    },
    orderBy: { openDate: 'asc' },
  })

  // Convert Decimals to numbers
  const tradesData = trades.map((trade: typeof trades[number]) => ({
    id: trade.id,
    premium: Number(trade.premium),
    openDate: trade.openDate,
  }))

  // Fetch all positions and trades for cycle duration histogram
  const positions = await prisma.position.findMany({
    where: { userId },
    select: {
      id: true,
      acquiredDate: true,
      closedDate: true,
      status: true,
    },
  })

  const allTrades = await prisma.trade.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      status: true,
      openDate: true,
    },
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Analytics</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive performance metrics across all wheel strategies
          </p>
        </div>
        <div className="flex gap-4">
          <ExportButton />
          <Link
            href="/wheels"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Wheels
          </Link>
        </div>
      </div>

      {/* Portfolio Metrics Dashboard */}
      <div className="mb-8">
        <PortfolioMetrics metrics={metrics} />
      </div>

      {/* Visualizations Grid */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Win Rate by Ticker */}
          <WinRateChart tickerPerformances={tickerPerformances} />

          {/* Premium Collection by Month */}
          <PremiumCollectionChart trades={tradesData} />
        </div>

        {/* Cycle Duration Histogram */}
        <CycleDurationHistogram positions={positions} trades={allTrades} />
      </div>

      {/* Empty State */}
      {metrics.totalWheels.total === 0 && (
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No wheels yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Get started by creating your first wheel strategy.
          </p>
          <div className="mt-6">
            <Link
              href="/wheels/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Wheel
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

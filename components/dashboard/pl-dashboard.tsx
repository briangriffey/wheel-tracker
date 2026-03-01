'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type {
  TimeRange,
  DashboardMetrics,
  PLOverTimeDataPoint,
  PLByTickerDataPoint,
  WinRateData,
} from '@/lib/queries/dashboard'
import { MetricCard } from './metric-card'
import { StatCard } from './stat-card'
import { TimeRangeSelector } from './time-range-selector'
import { getDeploymentColorClass } from '@/lib/design/colors'
import { formatCurrency } from '@/lib/utils/format'
import { OnboardingSlideshow } from '@/components/onboarding'

// Import Card for loading states
const LoadingCard = ({ height = 'h-96' }: { height?: string }) => (
  <div className={`${height} animate-pulse`}>
    <div className="h-full bg-gray-200 rounded-lg"></div>
  </div>
)

// Dynamically import chart components to reduce initial bundle size
const PLOverTimeChart = dynamic(
  () => import('./pl-over-time-chart').then((mod) => ({ default: mod.PLOverTimeChart })),
  {
    loading: () => <LoadingCard height="h-96" />,
    ssr: false,
  }
)

const PLByTickerChart = dynamic(
  () => import('./pl-by-ticker-chart').then((mod) => ({ default: mod.PLByTickerChart })),
  {
    loading: () => <LoadingCard height="h-96" />,
    ssr: false,
  }
)

const WinRateChart = dynamic(
  () => import('./win-rate-chart').then((mod) => ({ default: mod.WinRateChart })),
  {
    loading: () => <LoadingCard height="h-64" />,
    ssr: false,
  }
)

interface PLDashboardProps {
  initialMetrics: DashboardMetrics
  initialPLOverTime: PLOverTimeDataPoint[]
  initialPLByTicker: PLByTickerDataPoint[]
  initialWinRateData: WinRateData
  showOnboarding?: boolean
}

export function PLDashboard({
  initialMetrics,
  initialPLOverTime,
  initialPLByTicker,
  initialWinRateData,
  showOnboarding,
}: PLDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('All')
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics)
  const [onboardingVisible, setOnboardingVisible] = useState(showOnboarding ?? false)
  const [plOverTime, setPLOverTime] = useState<PLOverTimeDataPoint[]>(initialPLOverTime)
  const [plByTicker, setPLByTicker] = useState<PLByTickerDataPoint[]>(initialPLByTicker)
  const [winRateData, setWinRateData] = useState<WinRateData>(initialWinRateData)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/dashboard?timeRange=${timeRange}`)
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const data = await response.json()
        setMetrics(data.metrics)
        setPLOverTime(data.plOverTime)
        setPLByTicker(data.plByTicker)
        setWinRateData(data.winRateData)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (timeRange !== 'All' || !initialMetrics) {
      fetchData()
    }
  }, [timeRange, initialMetrics])

  return (
    <div className="space-y-6">
      {onboardingVisible && (
        <OnboardingSlideshow
          isOpen={onboardingVisible}
          onClose={() => setOnboardingVisible(false)}
        />
      )}

      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">P&L Dashboard</h1>
        <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
      </div>

      {/* Row 1 — Portfolio Overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Portfolio Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Portfolio Value"
            value={metrics.totalPortfolioValue}
            formatAs="currency"
            loading={loading}
          />
          <MetricCard
            title="If You Bought SPY"
            value={metrics.spyComparisonValue}
            formatAs="currency"
            loading={loading}
          />
          <MetricCard
            title="vs SPY"
            value={metrics.totalPortfolioValue - metrics.spyComparisonValue}
            formatAs="currency"
            colorize
            loading={loading}
          />
          <MetricCard
            title="Deployed Capital"
            value={metrics.deployedCapitalPercent}
            formatAs="percentage"
            colorClassName={
              metrics.deployedCapitalPercent !== null
                ? getDeploymentColorClass(metrics.deployedCapitalPercent)
                : undefined
            }
            subtitle={
              metrics.deployedCapitalPercent !== null
                ? `${formatCurrency(metrics.deployedCapitalAmount)} of ${formatCurrency(metrics.accountValue)}`
                : 'Record deposits to track'
            }
            loading={loading}
          />
        </div>
      </div>

      {/* Row 2 — Stocks */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Stocks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Stock P&L"
            value={metrics.totalPL}
            formatAs="currency"
            colorize
            loading={loading}
          />
          <MetricCard
            title="Realized P&L"
            value={metrics.realizedPL}
            formatAs="currency"
            colorize
            loading={loading}
          />
          <MetricCard
            title="Unrealized P&L"
            value={metrics.unrealizedPL}
            formatAs="currency"
            colorize
            loading={loading}
          />
          <MetricCard
            title="Stocks Owned"
            value={metrics.distinctStockCount}
            formatAs="number"
            loading={loading}
          />
        </div>
      </div>

      {/* Row 3 — Options */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Options</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Premium Collected"
            value={metrics.totalPremiumCollected}
            formatAs="currency"
            loading={loading}
          />
          <StatCard
            label="Win Rate"
            value={metrics.optionsWinRate}
            formatAs="percentage"
            loading={loading}
          />
          <StatCard
            label="Assignment Rate"
            value={metrics.assignmentRate}
            formatAs="percentage"
            loading={loading}
          />
          <StatCard label="Open Contracts" value={metrics.openContracts} loading={loading} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <PLOverTimeChart data={plOverTime} loading={loading} />
        </div>
        <PLByTickerChart data={plByTicker} loading={loading} />
        <WinRateChart data={winRateData} loading={loading} />
      </div>

      {/* Benchmark Comparison */}
      {/* <BenchmarkComparisonSection timeRange={timeRange} /> */}
    </div>
  )
}

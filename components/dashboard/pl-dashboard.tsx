'use client'

import React, { useState, useEffect } from 'react'
import type {
  TimeRange,
  DashboardMetrics,
  PLOverTimeDataPoint,
  PLByTickerDataPoint,
  WinRateData,
} from '@/lib/queries/dashboard'
import { MetricCard } from './metric-card'
import { StatCard } from './stat-card'
import { PLOverTimeChart } from './pl-over-time-chart'
import { PLByTickerChart } from './pl-by-ticker-chart'
import { WinRateChart } from './win-rate-chart'
import { TimeRangeSelector } from './time-range-selector'

interface PLDashboardProps {
  initialMetrics: DashboardMetrics
  initialPLOverTime: PLOverTimeDataPoint[]
  initialPLByTicker: PLByTickerDataPoint[]
  initialWinRateData: WinRateData
}

export function PLDashboard({
  initialMetrics,
  initialPLOverTime,
  initialPLByTicker,
  initialWinRateData,
}: PLDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('All')
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics)
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
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">P&L Dashboard</h1>
        <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
      </div>

      {/* Headline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total P&L"
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
          title="vs SPY"
          value={metrics.vsSPY}
          formatAs="percentage"
          subtitle="Benchmark comparison (coming soon)"
          loading={loading}
        />
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Premium Collected"
          value={metrics.totalPremiumCollected}
          formatAs="currency"
          loading={loading}
        />
        <StatCard
          label="Win Rate"
          value={metrics.winRate}
          formatAs="percentage"
          loading={loading}
        />
        <StatCard
          label="Assignment Rate"
          value={metrics.assignmentRate}
          formatAs="percentage"
          loading={loading}
        />
        <StatCard label="Active Positions" value={metrics.activePositions} loading={loading} />
        <StatCard label="Open Contracts" value={metrics.openContracts} loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <PLOverTimeChart data={plOverTime} loading={loading} />
        </div>
        <PLByTickerChart data={plByTicker} loading={loading} />
        <WinRateChart data={winRateData} loading={loading} />
      </div>
    </div>
  )
}

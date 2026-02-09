'use client'

import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/design-system'
import type { TickerPerformance } from '@/lib/calculations/portfolio'

interface WinRateChartProps {
  tickerPerformances: TickerPerformance[]
  loading?: boolean
}

// Color constants
const COLORS = {
  winRate: '#3b82f6', // blue
}

/**
 * WinRateChart Component
 * Bar chart showing win rate percentage for each ticker
 */
export function WinRateChart({ tickerPerformances, loading = false }: WinRateChartProps) {
  const chartData = useMemo(() => {
    // Filter tickers with completed cycles and sort by win rate
    const tickersWithCycles = tickerPerformances.filter((t) => t.cycleCount > 0)

    if (tickersWithCycles.length === 0) {
      return []
    }

    // Sort by win rate descending
    const sorted = [...tickersWithCycles].sort((a, b) => b.winRate - a.winRate)

    return sorted.map((ticker) => ({
      ticker: ticker.ticker,
      winRate: ticker.winRate,
      cycleCount: ticker.cycleCount,
    }))
  }, [tickerPerformances])

  if (loading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Win Rate by Ticker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Win Rate by Ticker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No completed cycles yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Win Rate by Ticker</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="ticker"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value: number | undefined) =>
                value !== undefined ? `${value.toFixed(1)}%` : 'N/A'
              }
              labelStyle={{ color: '#111827' }}
            />
            <Legend />
            <Bar
              dataKey="winRate"
              fill={COLORS.winRate}
              name="Win Rate (%)"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

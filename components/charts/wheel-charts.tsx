'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/design-system'

// Types based on getWheelDetail response
interface Trade {
  id: string
  type: string
  action: string
  status: string
  strikePrice: number
  premium: number
  contracts: number
  expirationDate: Date
  openDate: Date
  closeDate: Date | null
}

interface Position {
  id: string
  shares: number
  costBasis: number
  totalCost: number
  status: string
  realizedGainLoss: number | null
  acquiredDate: Date
  closedDate: Date | null
}

interface WheelData {
  trades: Trade[]
  positions: Position[]
  startedAt: Date
}

interface WheelChartsProps {
  wheelData: WheelData
  loading?: boolean
}

// Color constants
const COLORS = {
  pl: '#3b82f6', // blue
  premium: '#10b981', // green
  winners: '#10b981', // green
  losers: '#ef4444', // red
  breakeven: '#6b7280', // gray
}

// Helper to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Helper to calculate cycle duration in days
function calculateCycleDuration(
  position: Position,
  trades: Trade[]
): number | null {
  if (!position.closedDate) return null

  // Find the PUT trade that created this position
  const assignmentTrade = trades.find(
    (t) => t.status === 'ASSIGNED' && t.type === 'PUT'
  )

  if (!assignmentTrade) return null

  const start = new Date(assignmentTrade.openDate)
  const end = new Date(position.closedDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * P&L Over Time Chart
 * Shows cumulative P&L as trades close over time
 */
function PLOverTimeChart({ trades }: { trades: Trade[] }) {
  const chartData = useMemo(() => {
    // Get all trades sorted by close date
    const closedTrades = trades
      .filter((t) => t.closeDate && t.premium > 0)
      .sort((a, b) => new Date(a.closeDate!).getTime() - new Date(b.closeDate!).getTime())

    if (closedTrades.length === 0) return []

    // Calculate cumulative P&L
    let cumulativePL = 0
    return closedTrades.map((trade) => {
      cumulativePL += trade.premium
      return {
        date: new Date(trade.closeDate!).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: '2-digit',
        }),
        pl: cumulativePL,
      }
    })
  }, [trades])

  if (chartData.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>P&L Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No closed trades yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>P&L Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip
              formatter={(value: number | undefined) =>
                value !== undefined ? formatCurrency(value) : 'N/A'
              }
              labelStyle={{ color: '#111827' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="pl"
              stroke={COLORS.pl}
              name="Cumulative P&L"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Premiums by Month Chart
 * Bar chart showing total premiums collected each month
 */
function PremiumsByMonthChart({ trades }: { trades: Trade[] }) {
  const chartData = useMemo(() => {
    // Group premiums by month
    const monthlyPremiums = new Map<string, number>()

    trades.forEach((trade) => {
      if (trade.premium > 0) {
        const date = new Date(trade.openDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        const current = monthlyPremiums.get(monthKey) || 0
        monthlyPremiums.set(monthKey, current + trade.premium)
      }
    })

    // Convert to array and sort by date
    const data = Array.from(monthlyPremiums.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, premium]) => {
        const [year, month] = key.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1)
        return {
          month: date.toLocaleDateString('en-US', {
            month: 'short',
            year: '2-digit',
          }),
          premium,
        }
      })

    return data
  }, [trades])

  if (chartData.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Premiums by Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No premium data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Premiums by Month</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip
              formatter={(value: number | undefined) =>
                value !== undefined ? formatCurrency(value) : 'N/A'
              }
              labelStyle={{ color: '#111827' }}
            />
            <Legend />
            <Bar dataKey="premium" fill={COLORS.premium} name="Premiums Collected" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Win Rate Chart
 * Pie chart showing profitable vs unprofitable positions
 */
function WinRateChart({ positions }: { positions: Position[] }) {
  const chartData = useMemo(() => {
    const closedPositions = positions.filter((p) => p.status === 'CLOSED' && p.realizedGainLoss !== null)

    if (closedPositions.length === 0) {
      return { data: [], total: 0, winRate: 0, winners: 0 }
    }

    const winners = closedPositions.filter((p) => (p.realizedGainLoss || 0) > 0).length
    const losers = closedPositions.filter((p) => (p.realizedGainLoss || 0) < 0).length
    const breakeven = closedPositions.filter((p) => (p.realizedGainLoss || 0) === 0).length

    const winRate = (winners / closedPositions.length) * 100

    const data = [
      { name: 'Winners', value: winners },
      { name: 'Losers', value: losers },
      { name: 'Breakeven', value: breakeven },
    ].filter((item) => item.value > 0)

    return {
      data,
      total: closedPositions.length,
      winRate,
      winners,
    }
  }, [positions])

  if (chartData.total === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Win Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No closed positions yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Win Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <p className="text-4xl font-bold text-gray-900">
            {chartData.winRate.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500">
            {chartData.winners} winners out of {chartData.total} closed positions
          </p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData.data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${percent ? (percent * 100).toFixed(0) : '0'}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.name === 'Winners'
                      ? COLORS.winners
                      : entry.name === 'Losers'
                        ? COLORS.losers
                        : COLORS.breakeven
                  }
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Cycle Duration Distribution Chart
 * Bar chart showing how many days each completed cycle took
 */
function CycleDurationChart({ positions, trades }: { positions: Position[]; trades: Trade[] }) {
  const chartData = useMemo(() => {
    const closedPositions = positions.filter((p) => p.status === 'CLOSED')

    const durations = closedPositions
      .map((position, index) => {
        const duration = calculateCycleDuration(position, trades)
        return {
          cycle: `Cycle ${index + 1}`,
          days: duration,
        }
      })
      .filter((item) => item.days !== null)

    return durations
  }, [positions, trades])

  if (chartData.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Cycle Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No completed cycles yet
          </div>
        </CardContent>
      </Card>
    )
  }

  const avgDuration = chartData.reduce((sum, item) => sum + (item.days || 0), 0) / chartData.length

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Cycle Duration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <p className="text-2xl font-bold text-gray-900">
            {avgDuration.toFixed(0)} days
          </p>
          <p className="text-sm text-gray-500">Average cycle duration</p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="cycle"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: 'Days', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number | undefined) =>
                value !== undefined ? `${value} days` : 'N/A'
              }
              labelStyle={{ color: '#111827' }}
            />
            <Legend />
            <Bar dataKey="days" fill={COLORS.pl} name="Duration (days)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * WheelCharts Component
 * Main component that renders all four wheel-related charts
 */
export function WheelCharts({ wheelData, loading = false }: WheelChartsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="elevated">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PLOverTimeChart trades={wheelData.trades} />
      <PremiumsByMonthChart trades={wheelData.trades} />
      <WinRateChart positions={wheelData.positions} />
      <CycleDurationChart positions={wheelData.positions} trades={wheelData.trades} />
    </div>
  )
}

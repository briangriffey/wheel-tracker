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

interface Position {
  id: string
  acquiredDate: Date
  closedDate: Date | null
  status: string
}

interface Trade {
  id: string
  type: string
  status: string
  openDate: Date
}

interface CycleDurationHistogramProps {
  positions: Position[]
  trades: Trade[]
  loading?: boolean
}

// Color constants
const COLORS = {
  duration: '#3b82f6', // blue
}

/**
 * Calculate cycle duration in days
 */
function calculateCycleDuration(position: Position, trades: Trade[]): number | null {
  if (!position.closedDate || position.status !== 'CLOSED') return null

  // Find the PUT trade that created this position
  const assignmentTrade = trades.find(
    (t) => t.status === 'ASSIGNED' && t.type === 'PUT'
  )

  if (!assignmentTrade) {
    // Fallback to acquired date to closed date
    const start = new Date(position.acquiredDate)
    const end = new Date(position.closedDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const start = new Date(assignmentTrade.openDate)
  const end = new Date(position.closedDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * CycleDurationHistogram Component
 * Histogram showing distribution of cycle durations across all completed cycles
 */
export function CycleDurationHistogram({
  positions,
  trades,
  loading = false,
}: CycleDurationHistogramProps) {
  const chartData = useMemo(() => {
    const closedPositions = positions.filter((p) => p.status === 'CLOSED')

    if (closedPositions.length === 0) {
      return { bins: [], avgDuration: 0 }
    }

    // Calculate durations
    const durations = closedPositions
      .map((position) => calculateCycleDuration(position, trades))
      .filter((d): d is number => d !== null && d > 0)

    if (durations.length === 0) {
      return { bins: [], avgDuration: 0 }
    }

    // Calculate average duration
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length

    // Create bins (0-30, 31-60, 61-90, 91-120, 120+)
    const bins = [
      { range: '0-30', min: 0, max: 30, count: 0 },
      { range: '31-60', min: 31, max: 60, count: 0 },
      { range: '61-90', min: 61, max: 90, count: 0 },
      { range: '91-120', min: 91, max: 120, count: 0 },
      { range: '120+', min: 121, max: Infinity, count: 0 },
    ]

    // Count durations in each bin
    durations.forEach((duration) => {
      const bin = bins.find((b) => duration >= b.min && duration <= b.max)
      if (bin) {
        bin.count++
      }
    })

    // Filter out empty bins
    const nonEmptyBins = bins.filter((b) => b.count > 0)

    return {
      bins: nonEmptyBins.map((bin) => ({
        range: bin.range,
        count: bin.count,
      })),
      avgDuration,
    }
  }, [positions, trades])

  if (loading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Cycle Duration Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.bins.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Cycle Duration Distribution</CardTitle>
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
        <CardTitle>Cycle Duration Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <p className="text-2xl font-bold text-gray-900">
            {chartData.avgDuration.toFixed(0)} days
          </p>
          <p className="text-sm text-gray-500">Average cycle duration</p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData.bins}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 12 }}
              label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: 'Number of Cycles', angle: -90, position: 'insideLeft' }}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: number | undefined) =>
                value !== undefined ? `${value} cycles` : 'N/A'
              }
              labelStyle={{ color: '#111827' }}
            />
            <Legend />
            <Bar dataKey="count" fill={COLORS.duration} name="Number of Cycles" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

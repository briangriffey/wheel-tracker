'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/format'
import type { BenchmarkTicker } from './benchmark-selector'

export interface ComparisonDataPoint {
  date: string
  wheelValue: number
  benchmarkValue: number
}

interface BenchmarkComparisonChartProps {
  data: ComparisonDataPoint[]
  benchmarkTicker: BenchmarkTicker
  loading?: boolean
  outperforming: boolean
}

export function BenchmarkComparisonChart({
  data,
  benchmarkTicker,
  loading = false,
  outperforming,
}: BenchmarkComparisonChartProps) {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-80 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-gray-500">
        <div className="text-center">
          <p className="mb-2">No comparison data available</p>
          <p className="text-sm">Set up a benchmark to see performance comparison</p>
        </div>
      </div>
    )
  }

  // Format data for display
  const chartData = data.map((point) => ({
    ...point,
    displayDate: new Date(point.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
  }))

  // Determine colors based on performance
  const wheelColor = outperforming ? '#10b981' : '#ef4444' // green if winning, red if losing
  const benchmarkColor = '#6b7280' // neutral gray

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Performance Comparison</h3>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${outperforming ? 'text-green-600' : 'text-red-600'}`}
          >
            {outperforming ? '↑ Outperforming' : '↓ Underperforming'}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value.toLocaleString()}`} />
          <Tooltip
            formatter={(value: number | undefined) =>
              value !== undefined ? formatCurrency(value) : 'N/A'
            }
            labelStyle={{ color: '#111827' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="wheelValue"
            stroke={wheelColor}
            name="Wheel Strategy"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="benchmarkValue"
            stroke={benchmarkColor}
            name={benchmarkTicker}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

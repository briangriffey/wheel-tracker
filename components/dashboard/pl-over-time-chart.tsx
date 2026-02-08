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
import type { PLOverTimeDataPoint } from '@/lib/queries/dashboard'
import { formatCurrency } from '@/lib/utils/position-calculations'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/design-system'

interface PLOverTimeChartProps {
  data: PLOverTimeDataPoint[]
  loading?: boolean
}

export function PLOverTimeChart({ data, loading = false }: PLOverTimeChartProps) {
  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>P&L Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No data available for the selected time range
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format data for display
  const chartData = data.map((point) => ({
    ...point,
    date: new Date(point.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

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
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value.toFixed(0)}`} />
            <Tooltip
              formatter={(value: number | undefined) =>
                value !== undefined ? formatCurrency(value) : 'N/A'
              }
              labelStyle={{ color: '#111827' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="realizedPL"
              stroke="#10b981"
              name="Realized P&L"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="unrealizedPL"
              stroke="#f59e0b"
              name="Unrealized P&L"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="totalPL"
              stroke="#3b82f6"
              name="Total P&L"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

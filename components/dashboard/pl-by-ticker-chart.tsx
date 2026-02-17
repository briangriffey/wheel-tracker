'use client'

import React from 'react'
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
import type { PLByTickerDataPoint } from '@/lib/queries/dashboard'
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/design-system'

interface PLByTickerChartProps {
  data: PLByTickerDataPoint[]
  loading?: boolean
}

export function PLByTickerChart({ data, loading = false }: PLByTickerChartProps) {
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
          <CardTitle>P&L by Ticker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No data available for the selected time range
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>P&L by Ticker</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="ticker" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value.toFixed(0)}`} />
            <Tooltip
              formatter={(value: number | undefined) =>
                value !== undefined ? formatCurrency(value) : 'N/A'
              }
              labelStyle={{ color: '#111827' }}
            />
            <Legend />
            <Bar dataKey="realizedPL" fill="#10b981" name="Realized P&L" />
            <Bar dataKey="unrealizedPL" fill="#f59e0b" name="Unrealized P&L" />
            <Bar dataKey="premiumPL" fill="#8b5cf6" name="Premium P&L" />
            <Bar dataKey="totalPL" fill="#3b82f6" name="Total P&L" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

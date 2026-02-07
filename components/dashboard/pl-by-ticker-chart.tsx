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
import { formatCurrency } from '@/lib/utils/position-calculations'

interface PLByTickerChartProps {
  data: PLByTickerDataPoint[]
  loading?: boolean
}

export function PLByTickerChart({ data, loading = false }: PLByTickerChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">P&L by Ticker</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available for the selected time range
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">P&L by Ticker</h3>
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
          <Bar dataKey="totalPL" fill="#3b82f6" name="Total P&L" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

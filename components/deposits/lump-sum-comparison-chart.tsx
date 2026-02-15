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
import type { LumpSumComparison } from '@/lib/calculations/lump-sum-comparison'

interface LumpSumComparisonChartProps {
  comparison: LumpSumComparison
}

export function LumpSumComparisonChart({ comparison }: LumpSumComparisonChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

  // Prepare data for chart
  const chartData = comparison.dataPoints.map((point) => ({
    date: new Date(point.date).getTime(),
    dateStr: formatDate(point.date),
    dcaValue: point.dcaValue,
    lumpSumValue: point.lumpSumValue,
  }))

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">DCA vs Lump Sum Over Time</h3>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => {
              const date = new Date(value)
              return formatDate(date)
            }}
            label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            label={{ value: 'Portfolio Value', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null

              const data = payload[0].payload
              return (
                <div className="bg-white border border-gray-200 rounded p-3 shadow-lg">
                  <p className="text-sm font-semibold text-gray-900 mb-2">{data.dateStr}</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span className="text-sm text-gray-700">
                        DCA: {formatCurrency(data.dcaValue)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full" />
                      <span className="text-sm text-gray-700">
                        Lump Sum: {formatCurrency(data.lumpSumValue)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2 pt-2 border-t">
                      Difference: {formatCurrency(data.dcaValue - data.lumpSumValue)}
                    </div>
                  </div>
                </div>
              )
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="dcaValue"
            stroke="#3b82f6"
            name="DCA Strategy"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="lumpSumValue"
            stroke="#a855f7"
            name="Lump Sum"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

'use client'

import React, { useState, useCallback } from 'react'
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
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/design-system'

interface PLOverTimeChartProps {
  data: PLOverTimeDataPoint[]
  loading?: boolean
}

interface TooltipData {
  label: string
  realizedPL?: number
  unrealizedPL?: number
  premiumPL?: number
  totalPL?: number
}

export function PLOverTimeChart({ data, loading = false }: PLOverTimeChartProps) {
  const [activeTooltip, setActiveTooltip] = useState<TooltipData | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTooltipContent = useCallback((props: any) => {
    const { active, payload, label } = props as { active?: boolean; payload?: ReadonlyArray<{ dataKey: string; value: number }>; label?: string | number }
    if (active && payload && payload.length > 0 && label != null) {
      const data: TooltipData = { label: String(label) }
      for (const entry of payload) {
        if (entry.dataKey === 'realizedPL') data.realizedPL = entry.value
        if (entry.dataKey === 'unrealizedPL') data.unrealizedPL = entry.value
        if (entry.dataKey === 'premiumPL') data.premiumPL = entry.value
        if (entry.dataKey === 'totalPL') data.totalPL = entry.value
      }
      setActiveTooltip(data)
    } else {
      setActiveTooltip(null)
    }
    return null // render nothing as the floating tooltip
  }, [])

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

  const tooltipItems: { key: keyof TooltipData; label: string; color: string }[] = [
    { key: 'realizedPL', label: 'Realized P&L', color: '#10b981' },
    { key: 'unrealizedPL', label: 'Unrealized P&L', color: '#f59e0b' },
    { key: 'premiumPL', label: 'Premium P&L', color: '#8b5cf6' },
    { key: 'totalPL', label: 'Total P&L', color: '#3b82f6' },
  ]

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>P&L Over Time</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
              tickMargin={10}
            />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value.toFixed(0)}`} />
            <Tooltip
              content={handleTooltipContent}
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
              dataKey="premiumPL"
              stroke="#8b5cf6"
              name="Premium P&L"
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
        {activeTooltip && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 text-sm">
            <p className="font-medium text-gray-900 mb-1">{activeTooltip.label}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {tooltipItems.map(({ key, label, color }) =>
                activeTooltip[key] !== undefined ? (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-gray-600">{label}:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(activeTooltip[key] as number)}</span>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

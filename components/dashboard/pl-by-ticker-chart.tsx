'use client'

import React, { useState } from 'react'
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
import { Maximize2, Minimize2 } from 'lucide-react'
import type { PLByTickerDataPoint } from '@/lib/queries/dashboard'
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/design-system'
import { cn } from '@/lib/utils/cn'

interface PLByTickerChartProps {
  data: PLByTickerDataPoint[]
  loading?: boolean
  onExpandChange?: (expanded: boolean) => void
}

export function PLByTickerChart({ data, loading = false, onExpandChange }: PLByTickerChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = () => {
    const next = !isExpanded
    setIsExpanded(next)
    onExpandChange?.(next)
  }

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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>P&L by Ticker</CardTitle>
        <button
          onClick={handleToggle}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label={isExpanded ? 'Collapse chart' : 'Expand chart'}
        >
          {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'transition-[height] duration-300 ease-in-out',
            isExpanded ? 'h-[400px] md:h-[600px]' : 'h-[300px]'
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
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
        </div>
      </CardContent>
    </Card>
  )
}

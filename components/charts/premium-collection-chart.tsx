'use client'

import React, { useMemo } from 'react'
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/design-system'

interface Trade {
  id: string
  premium: number
  openDate: Date
}

interface PremiumCollectionChartProps {
  trades: Trade[]
  loading?: boolean
}

// Color constants
const COLORS = {
  premium: '#10b981', // green
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

/**
 * PremiumCollectionChart Component
 * Line chart showing monthly premium collection across all wheels
 */
export function PremiumCollectionChart({ trades, loading = false }: PremiumCollectionChartProps) {
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

    if (monthlyPremiums.size === 0) {
      return []
    }

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

  if (loading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Premium Collection by Month</CardTitle>
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
          <CardTitle>Premium Collection by Month</CardTitle>
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
        <CardTitle>Premium Collection by Month</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
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
            <Line
              type="monotone"
              dataKey="premium"
              stroke={COLORS.premium}
              name="Premiums Collected"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

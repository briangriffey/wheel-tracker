'use client'

import React from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { WinRateData } from '@/lib/queries/dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/design-system'

interface WinRateChartProps {
  data: WinRateData
  loading?: boolean
}

const COLORS = {
  winners: '#10b981', // green
  losers: '#ef4444', // red
  breakeven: '#6b7280', // gray
}

export function WinRateChart({ data, loading = false }: WinRateChartProps) {
  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-neutral-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.totalTrades === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Win Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-neutral-500">
            No closed trades available for the selected time range
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = [
    { name: 'Winners', value: data.winners },
    { name: 'Losers', value: data.losers },
    { name: 'Breakeven', value: data.breakeven },
  ].filter((item) => item.value > 0) // Only show categories with values

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Win Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <p className="text-4xl font-bold text-neutral-900">{data.winRate.toFixed(1)}%</p>
          <p className="text-sm text-neutral-500">
            {data.winners} winners out of {data.totalTrades} closed trades
          </p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
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
              {chartData.map((entry, index) => (
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

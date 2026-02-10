import React from 'react'
import { formatCurrency } from '@/lib/utils/format'
import { getPnLColorClass } from '@/lib/design/colors'
import { Card, CardContent } from '@/components/design-system'

interface MetricCardProps {
  title: string
  value: number | null
  formatAs?: 'currency' | 'percentage' | 'number'
  colorize?: boolean
  subtitle?: string
  loading?: boolean
}

export function MetricCard({
  title,
  value,
  formatAs = 'currency',
  colorize = false,
  subtitle,
  loading = false,
}: MetricCardProps) {
  const formatValue = (val: number | null): string => {
    if (val === null) return 'N/A'

    switch (formatAs) {
      case 'currency':
        return formatCurrency(val)
      case 'percentage':
        return `${val.toFixed(2)}%`
      case 'number':
        return val.toLocaleString('en-US', { maximumFractionDigits: 0 })
      default:
        return val.toString()
    }
  }

  const getColorClass = (val: number | null): string => {
    if (!colorize || val === null) return 'text-gray-900'
    return getPnLColorClass(val)
  }

  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
        <p className={`text-3xl font-bold ${getColorClass(value)}`}>{formatValue(value)}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

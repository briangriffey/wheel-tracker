import React from 'react'
import { formatCurrency } from '@/lib/utils/position-calculations'
import { Card, CardContent } from '@/components/design-system'

interface StatCardProps {
  label: string
  value: number | null
  formatAs?: 'currency' | 'percentage' | 'number'
  loading?: boolean
}

export function StatCard({ label, value, formatAs = 'number', loading = false }: StatCardProps) {
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

  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900">{formatValue(value)}</p>
      </CardContent>
    </Card>
  )
}

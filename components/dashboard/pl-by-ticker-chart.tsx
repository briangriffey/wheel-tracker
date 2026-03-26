'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
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

const MIN_BAR_GROUP_WIDTH = 100 // px per ticker (4 bars)
const SCROLL_THRESHOLD = 6

interface PLByTickerChartProps {
  data: PLByTickerDataPoint[]
  loading?: boolean
  onExpandChange?: (expanded: boolean) => void
}

export function PLByTickerChart({ data, loading = false, onExpandChange }: PLByTickerChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showLeftGradient, setShowLeftGradient] = useState(false)
  const [showRightGradient, setShowRightGradient] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleToggle = () => {
    const next = !isExpanded
    setIsExpanded(next)
    onExpandChange?.(next)
  }

  const needsScroll = isExpanded && data.length > SCROLL_THRESHOLD
  const scrollableWidth = data.length * MIN_BAR_GROUP_WIDTH

  const yDomain = useMemo(() => {
    if (data.length === 0) return [0, 0]
    const allValues = data.flatMap(d => [d.realizedPL, d.unrealizedPL, d.premiumPL, d.totalPL])
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const padding = (max - min) * 0.1 || 10
    return [Math.floor(min - padding), Math.ceil(max + padding)]
  }, [data])

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    setShowLeftGradient(el.scrollLeft > 0)
    setShowRightGradient(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el || !needsScroll) return
    // Initialize right gradient on mount
    setShowRightGradient(el.scrollWidth > el.clientWidth)
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [needsScroll, handleScroll, data.length])

  // Reset gradients when scrolling is no longer needed
  useEffect(() => {
    if (!needsScroll) {
      setShowLeftGradient(false)
      setShowRightGradient(false)
    }
  }, [needsScroll])

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
          {needsScroll ? (
            <div className="flex h-full">
              {/* Fixed Y-axis panel */}
              <div className="flex-shrink-0 w-[60px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      width={55}
                      domain={yDomain as [number, number]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Scrollable chart area with fade gradients */}
              <div className="relative flex-1 min-w-0">
                {showLeftGradient && (
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                )}
                {showRightGradient && (
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
                )}
                <div
                  className="overflow-x-auto h-full"
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                >
                  <div style={{ width: scrollableWidth, minWidth: '100%', height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="ticker" tick={{ fontSize: 12 }} />
                        <YAxis hide domain={yDomain as [number, number]} />
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
                </div>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ticker" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  domain={yDomain as [number, number]}
                />
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
          )}
        </div>
      </CardContent>
    </Card>
  )
}

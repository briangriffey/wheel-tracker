'use client'

import React, { useMemo } from 'react'
import { Card, CardContent } from '@/components/design-system'

interface Trade {
  id: string
  type: string
  action: string
  status: string
  strikePrice: number
  premium: number
  contracts: number
  expirationDate: Date
  openDate: Date
  closeDate: Date | null
}

interface Position {
  id: string
  shares: number
  costBasis: number
  totalCost: number
  status: string
  realizedGainLoss: number | null
  acquiredDate: Date
  closedDate: Date | null
}

interface WheelMetricsProps {
  wheel: {
    cycleCount: number
    totalPremiums: number
    totalRealizedPL: number
    startedAt: Date
  }
  trades: Trade[]
  positions: Position[]
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

// Helper to format percentage
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Calculate cycle metrics from positions
 */
function calculateCycleMetrics(positions: Position[], trades: Trade[]) {
  const closedPositions = positions.filter((p) => p.status === 'CLOSED')

  if (closedPositions.length === 0) {
    return {
      avgProfitPerCycle: 0,
      winRate: 0,
      avgCycleDuration: 0,
      bestCycle: 0,
      worstCycle: 0,
      totalCycles: 0,
    }
  }

  // Calculate P/L per cycle (includes position gain/loss + premiums)
  const cyclePLs = closedPositions.map((position) => {
    const positionPL = position.realizedGainLoss || 0
    // For a more accurate calculation, we'd need to know which premiums belong to each cycle
    // For now, we'll use the position's realized gain/loss which includes stock gains
    return positionPL
  })

  const totalPL = cyclePLs.reduce((sum, pl) => sum + pl, 0)
  const avgProfitPerCycle = totalPL / closedPositions.length

  // Calculate win rate (cycles with positive P/L)
  const winningCycles = cyclePLs.filter((pl) => pl > 0).length
  const winRate = (winningCycles / closedPositions.length) * 100

  // Calculate cycle durations
  const durations = closedPositions.map((position) => {
    if (!position.closedDate) return 0

    // Find the PUT trade that created this position
    const assignmentTrade = trades.find(
      (t) => t.status === 'ASSIGNED' && t.type === 'PUT'
    )

    if (!assignmentTrade) {
      // Fallback to acquired date to closed date
      const start = new Date(position.acquiredDate)
      const end = new Date(position.closedDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }

    const start = new Date(assignmentTrade.openDate)
    const end = new Date(position.closedDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  })

  const avgCycleDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0

  const bestCycle = cyclePLs.length > 0 ? Math.max(...cyclePLs) : 0
  const worstCycle = cyclePLs.length > 0 ? Math.min(...cyclePLs) : 0

  return {
    avgProfitPerCycle,
    winRate,
    avgCycleDuration,
    bestCycle,
    worstCycle,
    totalCycles: closedPositions.length,
  }
}

/**
 * Calculate annualized return
 */
function calculateAnnualizedReturn(
  totalPL: number,
  startDate: Date,
  capitalDeployed: number
): number {
  if (capitalDeployed <= 0) return 0

  const now = new Date()
  const start = new Date(startDate)
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 0

  // Calculate simple return percentage
  const returnPercent = (totalPL / capitalDeployed) * 100

  // Annualize based on 365-day year
  const annualizedReturn = (returnPercent / diffDays) * 365

  return annualizedReturn
}

/**
 * WheelMetrics Component
 * Displays key metrics for a wheel strategy
 */
export function WheelMetrics({ wheel, trades, positions }: WheelMetricsProps) {
  const metrics = useMemo(() => {
    const cycleMetrics = calculateCycleMetrics(positions, trades)

    // Calculate average capital deployed (average of all position costs)
    const positionCosts = positions.map((p) => p.totalCost)
    const avgCapitalDeployed = positionCosts.length > 0
      ? positionCosts.reduce((sum, cost) => sum + cost, 0) / positionCosts.length
      : 0

    const annualizedReturn = calculateAnnualizedReturn(
      wheel.totalRealizedPL,
      wheel.startedAt,
      avgCapitalDeployed
    )

    return {
      ...cycleMetrics,
      annualizedReturn,
    }
  }, [wheel, trades, positions])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Average Profit Per Cycle */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            Average Profit Per Cycle
          </div>
          <div className={`text-3xl font-bold ${
            metrics.avgProfitPerCycle >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(metrics.avgProfitPerCycle)}
          </div>
          {metrics.totalCycles > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Based on {metrics.totalCycles} completed {metrics.totalCycles === 1 ? 'cycle' : 'cycles'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Win Rate */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            Win Rate
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {formatPercentage(metrics.winRate)}
          </div>
          {metrics.totalCycles > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {Math.round((metrics.winRate / 100) * metrics.totalCycles)} winners out of {metrics.totalCycles}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Average Cycle Duration */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            Average Cycle Duration
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {metrics.avgCycleDuration.toFixed(0)} days
          </div>
          {metrics.totalCycles > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Across {metrics.totalCycles} completed {metrics.totalCycles === 1 ? 'cycle' : 'cycles'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Annualized Return */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            Annualized Return
          </div>
          <div className={`text-3xl font-bold ${
            metrics.annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatPercentage(metrics.annualizedReturn)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Based on current performance
          </div>
        </CardContent>
      </Card>

      {/* Best Cycle */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            Best Cycle
          </div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(metrics.bestCycle)}
          </div>
          {metrics.totalCycles === 0 && (
            <div className="text-xs text-gray-500 mt-1">
              No completed cycles yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Worst Cycle */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            Worst Cycle
          </div>
          <div className={`text-3xl font-bold ${
            metrics.worstCycle >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(metrics.worstCycle)}
          </div>
          {metrics.totalCycles === 0 && (
            <div className="text-xs text-gray-500 mt-1">
              No completed cycles yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

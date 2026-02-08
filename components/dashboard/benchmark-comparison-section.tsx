'use client'

import React, { useState, useEffect } from 'react'
import { BenchmarkSelector, type BenchmarkTicker } from './benchmark-selector'
import { BenchmarkComparisonChart, type ComparisonDataPoint } from './benchmark-comparison-chart'
import { getComparison } from '@/lib/actions/benchmarks'
import type { BenchmarkComparison } from '@/lib/calculations/benchmark'
import type { TimeRange } from '@/lib/queries/dashboard'
import { formatCurrency } from '@/lib/utils/position-calculations'
import { getPnLColorClass } from '@/lib/design/colors'
import { Card, CardHeader, CardTitle, CardContent, Button, Alert, AlertDescription } from '@/components/design-system'

interface BenchmarkComparisonSectionProps {
  timeRange: TimeRange
}

export function BenchmarkComparisonSection({ timeRange }: BenchmarkComparisonSectionProps) {
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkTicker>('SPY')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comparison, setComparison] = useState<BenchmarkComparison | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    const fetchComparison = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await getComparison({ ticker: selectedBenchmark })

        if (result.success) {
          setComparison(result.data as BenchmarkComparison)
        } else {
          setError(result.error)
        }
      } catch (err) {
        console.error('Error fetching comparison:', err)
        setError('Failed to load benchmark comparison')
      } finally {
        setLoading(false)
      }
    }

    fetchComparison()
  }, [selectedBenchmark, timeRange])

  // Generate chart data (for now, we'll use a simplified version)
  // In a future iteration, we could enhance the backend to provide historical comparison data
  const chartData: ComparisonDataPoint[] = comparison
    ? [
        {
          date: comparison.benchmark.setupDate.toISOString(),
          wheelValue: comparison.wheelStrategy.capitalDeployed,
          benchmarkValue: comparison.benchmark.initialCapital,
        },
        {
          date: new Date().toISOString(),
          wheelValue: comparison.wheelStrategy.capitalDeployed + comparison.wheelStrategy.totalPnL,
          benchmarkValue: comparison.benchmark.currentValue,
        },
      ]
    : []

  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Benchmark Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-80 text-gray-500">
            <svg
              className="w-12 h-12 mb-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-center mb-2">{error}</p>
            <p className="text-sm text-center">
              You may need to set up a benchmark first. Go to Benchmarks page to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!comparison) {
    return null
  }

  const { wheelStrategy, benchmark, difference } = comparison
  const outperforming = difference.outperforming

  return (
    <Card variant="elevated">
      <CardContent className="p-6">
        {/* Header with Benchmark Selector and Info Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Benchmark Comparison</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(!showInfo)}
              aria-label="Show calculation details"
              className="p-1 h-auto"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </Button>
          </div>
          <BenchmarkSelector
            selected={selectedBenchmark}
            onChange={setSelectedBenchmark}
          />
        </div>

        {/* Info Tooltip */}
        {showInfo && (
          <Alert variant="info" className="mb-6">
            <AlertDescription>
              <h4 className="text-sm font-semibold mb-2">How is this calculated?</h4>
              <ul className="text-sm space-y-1">
                <li>
                  • <strong>Wheel Strategy:</strong> Total P&L from all your trades and positions
                </li>
                <li>
                  • <strong>Benchmark:</strong> Hypothetical investment in {selectedBenchmark} with same
                  initial capital
                </li>
                <li>
                  • <strong>Comparison:</strong> Shows if your wheel strategy is outperforming (green)
                  or underperforming (red) the benchmark
                </li>
                <li>
                  • <strong>Return %:</strong> Calculated as (Current Value - Initial Capital) /
                  Initial Capital × 100
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Side-by-Side Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Wheel Strategy Metrics */}
          <Card variant="default">
            <CardContent className="p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Wheel Strategy</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-600">Total P&L:</span>
                  <span className={`text-lg font-bold ${getPnLColorClass(wheelStrategy.totalPnL)}`}>
                    {formatCurrency(wheelStrategy.totalPnL)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-600">Return:</span>
                  <span className={`text-lg font-bold ${getPnLColorClass(wheelStrategy.returnPercent)}`}>
                    {wheelStrategy.returnPercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-600">Capital Deployed:</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(wheelStrategy.capitalDeployed)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benchmark Metrics */}
          <Card variant="default">
            <CardContent className="p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                {selectedBenchmark} Benchmark
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-600">Total P&L:</span>
                  <span className={`text-lg font-bold ${getPnLColorClass(benchmark.gainLoss)}`}>
                    {formatCurrency(benchmark.gainLoss)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-600">Return:</span>
                  <span className={`text-lg font-bold ${getPnLColorClass(benchmark.returnPercent)}`}>
                    {benchmark.returnPercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-600">Initial Capital:</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(benchmark.initialCapital)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Difference Metrics */}
        <Card variant="default" className="mb-6 border-l-4 border-blue-500">
          <CardContent className="p-4 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Performance Difference</h4>
                <p className="text-xs text-gray-600">Wheel Strategy vs {selectedBenchmark}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-600 mb-1">P&L Difference</p>
                  <p className={`text-lg font-bold ${getPnLColorClass(difference.pnlDifference)}`}>
                    {difference.pnlDifference >= 0 ? '+' : ''}
                    {formatCurrency(difference.pnlDifference)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Return Difference</p>
                  <p className={`text-lg font-bold ${getPnLColorClass(difference.returnDifference)}`}>
                    {difference.returnDifference >= 0 ? '+' : ''}
                    {difference.returnDifference.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Chart */}
        <BenchmarkComparisonChart
          data={chartData}
          benchmarkTicker={selectedBenchmark}
          loading={loading}
          outperforming={outperforming}
        />
      </CardContent>
    </Card>
  )
}

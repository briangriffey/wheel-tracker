'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/design-system'
import type { PortfolioMetrics as PortfolioMetricsType } from '@/lib/calculations/portfolio'

interface PortfolioMetricsProps {
  metrics: PortfolioMetricsType
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
 * PortfolioMetrics Component
 * Displays comprehensive portfolio-wide metrics
 */
export function PortfolioMetrics({ metrics }: PortfolioMetricsProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Wheels */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">
              Total Wheels
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {metrics.totalWheels.total}
            </div>
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Active:</span>
                <span className="font-medium text-green-600">{metrics.totalWheels.active}</span>
              </div>
              <div className="flex justify-between">
                <span>Idle:</span>
                <span className="font-medium text-blue-600">{metrics.totalWheels.idle}</span>
              </div>
              <div className="flex justify-between">
                <span>Paused:</span>
                <span className="font-medium text-yellow-600">{metrics.totalWheels.paused}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-medium text-gray-600">{metrics.totalWheels.completed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Capital Deployed */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">
              Capital Deployed
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(metrics.totalCapitalDeployed)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Currently in open positions
            </div>
          </CardContent>
        </Card>

        {/* Total Premiums Collected */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">
              Total Premiums
            </div>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(metrics.totalPremiumsCollected)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              All-time premiums collected
            </div>
          </CardContent>
        </Card>

        {/* Total Realized P/L */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-600 mb-2">
              Total Realized P/L
            </div>
            <div className={`text-3xl font-bold ${
              metrics.totalRealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(metrics.totalRealizedPL)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Across all completed cycles
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Win Rate Card */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Overall Win Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-600">
                {formatPercentage(metrics.overallWinRate)}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Percentage of profitable cycles
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best and Worst Performing Tickers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Performing Tickers */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Best Performing Tickers</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.bestPerformingTickers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No completed cycles yet
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.bestPerformingTickers.map((ticker) => (
                  <Link
                    key={ticker.wheelId}
                    href={`/wheels/${ticker.wheelId}`}
                    className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg text-gray-900">
                          {ticker.ticker}
                        </div>
                        <div className="text-sm text-gray-600">
                          {ticker.cycleCount} {ticker.cycleCount === 1 ? 'cycle' : 'cycles'} • Win rate: {formatPercentage(ticker.winRate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {formatCurrency(ticker.totalRealizedPL)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(ticker.totalPremiums)} premiums
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Worst Performing Tickers */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Worst Performing Tickers</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.worstPerformingTickers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No completed cycles yet
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.worstPerformingTickers.map((ticker) => (
                  <Link
                    key={ticker.wheelId}
                    href={`/wheels/${ticker.wheelId}`}
                    className="block p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg text-gray-900">
                          {ticker.ticker}
                        </div>
                        <div className="text-sm text-gray-600">
                          {ticker.cycleCount} {ticker.cycleCount === 1 ? 'cycle' : 'cycles'} • Win rate: {formatPercentage(ticker.winRate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${
                          ticker.totalRealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(ticker.totalRealizedPL)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(ticker.totalPremiums)} premiums
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import type { LumpSumComparison } from '@/lib/calculations/lump-sum-comparison'

interface LumpSumComparisonCardProps {
  comparison: LumpSumComparison
}

export function LumpSumComparisonCard({ comparison }: LumpSumComparisonCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  const formatShares = (shares: number) => {
    return shares.toFixed(4)
  }

  // Determine colors based on winner
  const dcaColor = comparison.winner === 'DCA' ? 'text-green-600' : 'text-gray-900'
  const lumpSumColor = comparison.winner === 'LUMP_SUM' ? 'text-green-600' : 'text-gray-900'

  const timingBenefitColor = comparison.timingBenefit > 0 ? 'text-green-600' : 'text-red-600'
  const timingBenefitBg =
    comparison.timingBenefit > 0 ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">DCA vs Lump Sum Analysis</h2>
        {comparison.winner !== 'TIE' && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              comparison.winner === 'DCA'
                ? 'bg-green-100 text-green-800'
                : 'bg-purple-100 text-purple-800'
            }`}
          >
            {comparison.winner === 'DCA' ? 'DCA Wins' : 'Lump Sum Wins'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* DCA Strategy */}
        <div className="border-l-4 border-blue-500 pl-4">
          <div className="text-sm text-gray-600 mb-1">Dollar-Cost Averaging</div>
          <div className={`text-3xl font-bold ${dcaColor} mb-2`}>
            {formatCurrency(comparison.dcaCurrentValue)}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Invested:</span>
              <span className="font-medium">{formatCurrency(comparison.dcaInvested)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Return:</span>
              <span
                className={`font-medium ${comparison.dcaReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(comparison.dcaReturn)} ({formatPercent(comparison.dcaReturnPct)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SPY Shares:</span>
              <span className="font-medium">{formatShares(comparison.dcaShares)}</span>
            </div>
          </div>
        </div>

        {/* Lump Sum Strategy */}
        <div className="border-l-4 border-purple-500 pl-4">
          <div className="text-sm text-gray-600 mb-1">
            Lump Sum (
            {new Date(comparison.lumpSumDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            )
          </div>
          <div className={`text-3xl font-bold ${lumpSumColor} mb-2`}>
            {formatCurrency(comparison.lumpSumCurrentValue)}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Invested:</span>
              <span className="font-medium">{formatCurrency(comparison.lumpSumInvested)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Return:</span>
              <span
                className={`font-medium ${comparison.lumpSumReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(comparison.lumpSumReturn)} (
                {formatPercent(comparison.lumpSumReturnPct)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SPY Shares:</span>
              <span className="font-medium">{formatShares(comparison.lumpSumShares)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timing Benefit/Cost */}
      <div className={`rounded-lg p-4 border-l-4 ${timingBenefitBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 mb-1">
              {comparison.timingBenefit > 0 ? 'Timing Benefit' : 'Timing Cost'}
            </div>
            <div className={`text-2xl font-bold ${timingBenefitColor}`}>
              {formatCurrency(Math.abs(comparison.timingBenefit))}
            </div>
            <div className={`text-sm ${timingBenefitColor}`}>
              {formatPercent(Math.abs(comparison.timingBenefitPct))} difference
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-700">
              {comparison.timingBenefit > 0 ? (
                <>
                  DCA helped you <span className="font-semibold">gain</span> by spreading purchases
                  over time
                </>
              ) : (
                <>
                  DCA <span className="font-semibold">cost</span> you by missing early gains
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Period Info */}
      <div className="mt-4 text-sm text-gray-500">
        <p>
          Analysis period:{' '}
          {new Date(comparison.firstDepositDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}{' '}
          to{' '}
          {new Date(comparison.lastDepositDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
    </div>
  )
}

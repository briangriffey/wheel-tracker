'use client'

import React from 'react'
import type { DepositSummary } from '@/lib/actions/deposits'

interface DepositSummaryCardProps {
  summary: DepositSummary
}

export function DepositSummaryCard({ summary }: DepositSummaryCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  const formatShares = (shares: number) => {
    return shares.toFixed(4)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deposits */}
        <div className="border-l-4 border-green-500 pl-4">
          <div className="text-sm text-gray-600">Total Deposits</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.totalDeposits)}
          </div>
          <div className="text-xs text-gray-500">
            {summary.depositCount} transaction{summary.depositCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Total Withdrawals */}
        <div className="border-l-4 border-red-500 pl-4">
          <div className="text-sm text-gray-600">Total Withdrawals</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.totalWithdrawals)}
          </div>
          <div className="text-xs text-gray-500">
            {summary.withdrawalCount} transaction{summary.withdrawalCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Net Invested */}
        <div className="border-l-4 border-blue-500 pl-4">
          <div className="text-sm text-gray-600">Net Invested</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.netInvested)}
          </div>
          <div className="text-xs text-gray-500">
            {formatShares(summary.totalSpyShares)} SPY shares
          </div>
        </div>

        {/* Avg Cost Basis */}
        <div className="border-l-4 border-purple-500 pl-4">
          <div className="text-sm text-gray-600">Avg SPY Cost</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.avgCostBasis)}
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(summary.firstDepositDate)} - {formatDate(summary.lastDepositDate)}
          </div>
        </div>
      </div>
    </div>
  )
}

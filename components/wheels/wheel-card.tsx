'use client'

import React from 'react'
import Link from 'next/link'
import { formatCurrency, formatPercentage } from '@/lib/utils/position-calculations'
import { getPnLColorClass, getPnLBackgroundClass } from '@/lib/design/colors'

export interface WheelCardData {
  id: string
  ticker: string
  status: string
  cycleCount: number
  totalPremiums: number
  totalRealizedPL: number
  startedAt: Date
  lastActivityAt: Date
  completedAt: Date | null
  notes: string | null
  tradeCount: number
  positionCount: number
}

interface WheelCardProps {
  wheel: WheelCardData
}

function getStatusColor(status: string) {
  switch (status) {
    case 'ACTIVE':
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
    case 'IDLE':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' }
    case 'PAUSED':
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
    case 'COMPLETED':
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
  }
}

function getWheelStep(wheel: WheelCardData): string {
  // Determine current step based on trades and positions
  if (wheel.status === 'IDLE') return 'No active cycle'
  if (wheel.status === 'PAUSED') return 'Paused'
  if (wheel.status === 'COMPLETED') return 'Completed'

  // For ACTIVE wheels, determine step from counts
  if (wheel.positionCount > 0) {
    // Has open position(s) - either uncovered or covered
    return 'Holding Position'
  } else if (wheel.tradeCount > 0) {
    // Has trades but no positions - likely collecting premium
    return 'Collecting Premium'
  } else {
    // Just started
    return 'Getting Started'
  }
}

export function WheelCard({ wheel }: WheelCardProps) {
  const statusColors = getStatusColor(wheel.status)
  const pnlColorClass = getPnLColorClass(wheel.totalRealizedPL)
  const pnlBgClass = getPnLBackgroundClass(wheel.totalRealizedPL)
  const currentStep = getWheelStep(wheel)

  // Calculate average profit per cycle
  const avgProfitPerCycle = wheel.cycleCount > 0
    ? wheel.totalRealizedPL / wheel.cycleCount
    : 0

  // Calculate days active
  const daysActive = Math.floor(
    (new Date().getTime() - new Date(wheel.startedAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <Link href={`/wheels/${wheel.id}`}>
      <div className={`rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${statusColors.border} ${pnlBgClass}`}>
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">{wheel.ticker}</h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
              >
                {wheel.status}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {wheel.cycleCount} {wheel.cycleCount === 1 ? 'Cycle' : 'Cycles'}
            </div>
          </div>
          <div className="mt-1 text-sm text-gray-600">
            {currentStep}
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 py-4 sm:px-6 space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total P&L */}
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total P&L
              </dt>
              <dd className={`mt-1 text-lg font-bold ${pnlColorClass}`}>
                {wheel.totalRealizedPL >= 0 ? '+' : ''}
                {formatCurrency(wheel.totalRealizedPL)}
              </dd>
            </div>

            {/* Total Premiums */}
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total Premium
              </dt>
              <dd className="mt-1 text-lg font-semibold text-green-600">
                {formatCurrency(wheel.totalPremiums)}
              </dd>
            </div>

            {/* Avg Per Cycle */}
            {wheel.cycleCount > 0 && (
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Avg/Cycle
                </dt>
                <dd className={`mt-1 text-sm font-semibold ${getPnLColorClass(avgProfitPerCycle)}`}>
                  {avgProfitPerCycle >= 0 ? '+' : ''}
                  {formatCurrency(avgProfitPerCycle)}
                </dd>
              </div>
            )}

            {/* Win Rate */}
            {wheel.cycleCount > 0 && (
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Win Rate
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {/* TODO: Calculate actual win rate from cycle data */}
                  {formatPercentage(wheel.totalRealizedPL > 0 ? 100 : 0)}
                </dd>
              </div>
            )}
          </div>

          {/* Activity Stats */}
          <div className="pt-3 border-t border-gray-200 grid grid-cols-3 gap-2 text-xs text-gray-600">
            <div>
              <span className="font-medium">{wheel.tradeCount}</span> Trades
            </div>
            <div>
              <span className="font-medium">{wheel.positionCount}</span> Positions
            </div>
            <div>
              <span className="font-medium">{daysActive}</span> Days
            </div>
          </div>

          {/* Last Activity */}
          <div className="text-xs text-gray-500">
            Last activity: {new Date(wheel.lastActivityAt).toLocaleDateString()}
          </div>

          {/* Notes Preview */}
          {wheel.notes && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-700 line-clamp-2">{wheel.notes}</p>
            </div>
          )}
        </div>

        {/* Footer - Quick Actions Hint */}
        <div className="px-4 py-3 sm:px-6 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">View Details</span>
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}

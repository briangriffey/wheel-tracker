'use client'

import React, { useState } from 'react'
import {
  calculateUnrealizedPnL,
  calculateUnrealizedPnLPercentage,
  calculateCurrentPrice,
  calculateDaysHeld,
  calculateTotalCoveredCallPremium,
  getPnLColorClass,
  getPnLBackgroundClass,
  formatCurrency,
  formatPercentage,
} from '@/lib/utils/position-calculations'

/**
 * Position data type with related trades
 */
export interface PositionCardData {
  id: string
  ticker: string
  shares: number
  costBasis: number
  totalCost: number
  currentValue: number | null
  status: 'OPEN' | 'CLOSED'
  acquiredDate: Date
  closedDate: Date | null
  coveredCalls?: Array<{
    id: string
    premium: number
    status: string
  }>
}

interface PositionCardProps {
  position: PositionCardData
  onSellCall?: (positionId: string) => void
  onViewDetails?: (positionId: string) => void
  isLoadingPrice?: boolean
  priceError?: string | null
}

export function PositionCard({
  position,
  onSellCall,
  onViewDetails,
  isLoadingPrice = false,
  priceError = null,
}: PositionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate derived values
  const currentPrice = position.currentValue
    ? calculateCurrentPrice(position.currentValue, position.shares)
    : null
  const unrealizedPnL = position.currentValue
    ? calculateUnrealizedPnL(position.currentValue, position.totalCost)
    : null
  const unrealizedPnLPercent = position.currentValue
    ? calculateUnrealizedPnLPercentage(position.currentValue, position.totalCost)
    : null
  const daysHeld = calculateDaysHeld(position.acquiredDate, position.closedDate)
  const totalCoveredCallPremium = position.coveredCalls
    ? calculateTotalCoveredCallPremium(
        position.coveredCalls.map((call) => ({ premium: call.premium }))
      )
    : 0

  // Determine P&L color classes
  const pnlColorClass = unrealizedPnL !== null ? getPnLColorClass(unrealizedPnL) : 'text-gray-600'
  const pnlBgClass = unrealizedPnL !== null ? getPnLBackgroundClass(unrealizedPnL) : 'bg-gray-50'

  return (
    <div className={`rounded-lg border border-gray-200 shadow-sm ${pnlBgClass} overflow-hidden`}>
      {/* Header */}
      <div className="px-4 py-3 sm:px-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">{position.ticker}</h3>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                position.status === 'OPEN'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {position.status}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4 sm:px-6 space-y-4">
        {/* Price Error State */}
        {priceError && (
          <div className="rounded-md bg-yellow-50 p-3 border border-yellow-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  Unable to fetch current price: {priceError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Shares */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Shares</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{position.shares}</dd>
          </div>

          {/* Cost Basis */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Cost Basis
            </dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {formatCurrency(position.costBasis)}
            </dd>
          </div>

          {/* Current Price */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Current Price
            </dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {isLoadingPrice ? (
                <span className="inline-flex items-center gap-1">
                  <svg
                    className="animate-spin h-4 w-4 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-gray-400">Loading...</span>
                </span>
              ) : currentPrice !== null ? (
                formatCurrency(currentPrice)
              ) : (
                <span className="text-gray-400">N/A</span>
              )}
            </dd>
          </div>

          {/* Total Cost */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Cost</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {formatCurrency(position.totalCost)}
            </dd>
          </div>

          {/* Current Value */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Current Value
            </dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {isLoadingPrice ? (
                <span className="text-gray-400">Loading...</span>
              ) : position.currentValue !== null ? (
                formatCurrency(position.currentValue)
              ) : (
                <span className="text-gray-400">N/A</span>
              )}
            </dd>
          </div>

          {/* Days Held */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Days Held</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">{daysHeld}</dd>
          </div>
        </div>

        {/* Unrealized P&L - Prominent Display */}
        <div className={`rounded-md p-4 ${pnlBgClass} border-2 ${unrealizedPnL && unrealizedPnL > 0 ? 'border-green-200' : unrealizedPnL && unrealizedPnL < 0 ? 'border-red-200' : 'border-gray-200'}`}>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Unrealized P&L
          </dt>
          <dd className={`mt-1 text-2xl font-bold ${pnlColorClass}`}>
            {isLoadingPrice ? (
              <span className="text-gray-400 text-base">Loading...</span>
            ) : unrealizedPnL !== null && unrealizedPnLPercent !== null ? (
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <span>{formatCurrency(unrealizedPnL)}</span>
                <span className="text-base font-medium">{formatPercentage(unrealizedPnLPercent)}</span>
              </div>
            ) : (
              <span className="text-gray-400 text-base">N/A</span>
            )}
          </dd>
        </div>

        {/* Covered Calls Premium */}
        {totalCoveredCallPremium > 0 && (
          <div className="rounded-md bg-blue-50 p-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <dt className="text-xs font-medium text-blue-900 uppercase tracking-wide">
                  Covered Call Premium
                </dt>
                <dd className="mt-1 text-sm font-semibold text-blue-900">
                  {formatCurrency(totalCoveredCallPremium)}
                </dd>
              </div>
              {position.coveredCalls && position.coveredCalls.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {position.coveredCalls.length} {position.coveredCalls.length === 1 ? 'Call' : 'Calls'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Acquired Date:</span>{' '}
                <span className="text-gray-900">
                  {new Date(position.acquiredDate).toLocaleDateString()}
                </span>
              </div>
              {position.closedDate && (
                <div>
                  <span className="font-medium text-gray-700">Closed Date:</span>{' '}
                  <span className="text-gray-900">
                    {new Date(position.closedDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Position ID:</span>{' '}
                <span className="text-gray-600 font-mono text-xs">{position.id}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {position.status === 'OPEN' && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {onSellCall && (
              <button
                onClick={() => onSellCall(position.id)}
                className="flex-1 px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Sell Covered Call
              </button>
            )}
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(position.id)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                View Details
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

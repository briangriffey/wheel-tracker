'use client'

import { useState } from 'react'
import type { PositionWithCalculations } from '@/lib/queries/positions'

interface PositionCardProps {
  position: PositionWithCalculations
  onSellCall?: (positionId: string) => void
  onViewDetails?: (positionId: string) => void
}

export function PositionCard({ position, onSellCall, onViewDetails }: PositionCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Format currency
  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Get P&L color class
  const getPLColorClass = (pl?: number) => {
    if (!pl) return 'text-gray-600'
    if (pl > 0) return 'text-green-600'
    if (pl < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  // Get P&L background color class
  const getPLBgColorClass = (pl?: number) => {
    if (!pl) return 'bg-gray-50'
    if (pl > 0) return 'bg-green-50 border-green-200'
    if (pl < 0) return 'bg-red-50 border-red-200'
    return 'bg-gray-50'
  }

  // Handle Sell Call action
  const handleSellCall = async () => {
    if (!onSellCall) return
    setIsLoading(true)
    try {
      await onSellCall(position.id)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle View Details action
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(position.id)
    }
  }

  // Calculate current price per share
  const currentPrice = position.currentValue
    ? position.currentValue.toNumber() / position.shares
    : null

  return (
    <div className={`bg-white rounded-lg shadow border-2 transition-all hover:shadow-md ${getPLBgColorClass(position.unrealizedPL)}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{position.ticker}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {position.shares} shares • Held {position.daysHeld} days
            </p>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${getPLColorClass(position.unrealizedPL)}`}>
              {position.unrealizedPL !== undefined
                ? formatCurrency(position.unrealizedPL)
                : 'N/A'}
            </div>
            {position.unrealizedPLPercent !== undefined && (
              <div className={`text-sm ${getPLColorClass(position.unrealizedPL)}`}>
                {position.unrealizedPLPercent > 0 ? '+' : ''}
                {position.unrealizedPLPercent.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Position Details */}
      <div className="p-4 space-y-3">
        {/* Cost Basis */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Cost Basis:</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(position.costBasis.toNumber())}/share
          </span>
        </div>

        {/* Current Price */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Current Price:</span>
          <span className="text-sm font-semibold text-gray-900">
            {currentPrice ? formatCurrency(currentPrice) : 'Updating...'}
          </span>
        </div>

        {/* Total Cost */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Cost:</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(position.totalCost.toNumber())}
          </span>
        </div>

        {/* Current Value */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Current Value:</span>
          <span className="text-sm font-semibold text-gray-900">
            {position.currentValue
              ? formatCurrency(position.currentValue.toNumber())
              : 'Updating...'}
          </span>
        </div>

        {/* Covered Calls Premium */}
        {position.coveredCallsPremium > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm text-gray-600">Covered Calls Premium:</span>
            <span className="text-sm font-semibold text-green-600">
              +{formatCurrency(position.coveredCallsPremium)}
            </span>
          </div>
        )}

        {/* Net Cost Basis */}
        {position.coveredCallsPremium > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Net Cost Basis:</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(position.netCostBasis)}/share
            </span>
          </div>
        )}

        {/* Acquired Date */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <span className="text-sm text-gray-600">Acquired:</span>
          <span className="text-sm font-medium text-gray-900">
            {formatDate(position.acquiredDate)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2">
        {onSellCall && position.status === 'OPEN' && (
          <button
            onClick={handleSellCall}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Sell Call
          </button>
        )}
        {onViewDetails && (
          <button
            onClick={handleViewDetails}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            View Details
          </button>
        )}
      </div>

      {/* Loading State Indicator */}
      {!position.currentValue && (
        <div className="absolute top-2 right-2">
          <div className="animate-pulse flex space-x-1">
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  )
}

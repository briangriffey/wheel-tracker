'use client'

import React, { useState } from 'react'
import type { ExpirationTrade } from '@/lib/queries/expirations'
import { markExpired, markAssigned, rollOption } from '@/lib/actions/expirations'

interface ExpirationCardProps {
  trade: ExpirationTrade
  onUpdate?: () => void
}

export function ExpirationCard({ trade, onUpdate }: ExpirationCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleMarkExpired = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const result = await markExpired(trade.id)

      if (!result.success) {
        setError(result.error)
        return
      }

      // Trigger parent refresh
      if (onUpdate) {
        onUpdate()
      }
    } catch (err) {
      setError('Failed to mark as expired')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMarkAssigned = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const result = await markAssigned(trade.id)

      if (!result.success) {
        setError(result.error)
        return
      }

      // Trigger parent refresh
      if (onUpdate) {
        onUpdate()
      }
    } catch (err) {
      setError('Failed to mark as assigned')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRollOption = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const result = await rollOption(trade.id)

      if (!result.success) {
        setError(result.error)
        return
      }

      // Trigger parent refresh
      if (onUpdate) {
        onUpdate()
      }
    } catch (err) {
      setError('Failed to roll option')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num)
  }

  // Determine urgency badge
  const getUrgencyBadge = () => {
    if (trade.daysUntil < 0) {
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-800">
          PAST DUE
        </span>
      )
    } else if (trade.daysUntil === 0) {
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-800">
          TODAY
        </span>
      )
    } else if (trade.daysUntil === 1) {
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-800">
          TOMORROW
        </span>
      )
    } else if (trade.daysUntil < 7) {
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-800">
          {trade.daysUntil} DAYS
        </span>
      )
    } else if (trade.daysUntil < 14) {
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-yellow-100 text-yellow-800">
          {trade.daysUntil} DAYS
        </span>
      )
    } else {
      return (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-800">
          {trade.daysUntil} DAYS
        </span>
      )
    }
  }

  return (
    <div
      className={`border-l-4 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow ${
        trade.daysUntil < 7
          ? 'border-red-500'
          : trade.daysUntil < 14
          ? 'border-yellow-500'
          : 'border-green-500'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-900">{trade.ticker}</h3>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              trade.type === 'PUT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
            }`}
          >
            {trade.type}
          </span>
        </div>
        {getUrgencyBadge()}
      </div>

      {/* Trade Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Strike Price</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(trade.strikePrice.toString())}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Premium</p>
          <p className="font-semibold text-green-600">
            {formatCurrency(trade.premium.toString())}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Contracts</p>
          <p className="font-semibold text-gray-900">{trade.contracts}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Expiration</p>
          <p className="font-semibold text-gray-900">{formatDate(trade.expirationDate)}</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleMarkExpired}
          disabled={isProcessing}
          className="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
          aria-label={`Mark ${trade.ticker} as expired`}
        >
          {isProcessing ? 'Processing...' : 'Mark Expired'}
        </button>
        <button
          onClick={handleMarkAssigned}
          disabled={isProcessing}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
          aria-label={`Mark ${trade.ticker} as assigned`}
        >
          {isProcessing ? 'Processing...' : 'Mark Assigned'}
        </button>
        <button
          onClick={handleRollOption}
          disabled={isProcessing}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-md transition-colors"
          aria-label={`Roll ${trade.ticker} option`}
        >
          {isProcessing ? 'Processing...' : 'Roll Option'}
        </button>
      </div>

      {/* Notes */}
      {trade.notes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">Notes:</p>
          <p className="text-sm text-gray-700 mt-1">{trade.notes}</p>
        </div>
      )}
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { assignPut } from '@/lib/actions/positions'

interface Trade {
  id: string
  ticker: string
  type: 'PUT' | 'CALL'
  strikePrice: number
  premium: number
  contracts: number
  shares: number
  expirationDate: Date
  status: string
}

interface AssignPutDialogProps {
  trade: Trade
  isOpen: boolean
  onClose: () => void
  onSuccess?: (positionId: string) => void
}

export function AssignPutDialog({ trade, isOpen, onClose, onSuccess }: AssignPutDialogProps) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [isFetchingPrice, setIsFetchingPrice] = useState(false)
  const [showSellCallPrompt, setShowSellCallPrompt] = useState(false)
  const [positionId, setPositionId] = useState<string | null>(null)

  // Calculate values
  const totalCost = trade.strikePrice * trade.shares
  const premiumCredit = trade.premium
  const effectiveCostBasis = trade.strikePrice - trade.premium / trade.shares
  const totalEffectiveCost = effectiveCostBasis * trade.shares

  // Calculate unrealized P/L if current price is available
  const unrealizedPL = currentPrice
    ? (currentPrice - effectiveCostBasis) * trade.shares
    : null
  const unrealizedPLPercent = currentPrice
    ? ((currentPrice - effectiveCostBasis) / effectiveCostBasis) * 100
    : null

  // Fetch current stock price when dialog opens
  useEffect(() => {
    if (isOpen && !currentPrice) {
      fetchCurrentPrice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  async function fetchCurrentPrice() {
    setIsFetchingPrice(true)
    try {
      const response = await fetch(`/api/stocks/${trade.ticker}/price`)
      if (response.ok) {
        const data = await response.json()
        setCurrentPrice(data.price)
      }
    } catch (err) {
      console.error('Failed to fetch current price:', err)
    } finally {
      setIsFetchingPrice(false)
    }
  }

  async function handleAssign() {
    setIsAssigning(true)
    setError(null)

    try {
      const result = await assignPut({ tradeId: trade.id })

      if (!result.success) {
        setError(result.error)
        return
      }

      // Show success and prompt to sell covered call
      setPositionId(result.data.positionId)
      setShowSellCallPrompt(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign PUT')
    } finally {
      setIsAssigning(false)
    }
  }

  function handleSellCall() {
    if (positionId && onSuccess) {
      onSuccess(positionId)
    }
    onClose()
  }

  function handleSkipSellCall() {
    onClose()
  }

  // Significant loss threshold (>10%)
  const hasSignificantLoss = unrealizedPLPercent !== null && unrealizedPLPercent < -10

  if (!isOpen) return null

  // Show sell call prompt after successful assignment
  if (showSellCallPrompt) {
    return (
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title="PUT Assigned Successfully!"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            The PUT has been assigned and a new position has been created for {trade.shares}{' '}
            shares of {trade.ticker}.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">
              Would you like to sell a covered call?
            </p>
            <p className="text-xs text-blue-700">
              Selling a covered call can generate additional premium income on your new position.
            </p>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={handleSkipSellCall}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Skip for Now
            </button>
            <button
              type="button"
              onClick={handleSellCall}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Sell Covered Call →
            </button>
          </div>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Assign PUT Option" maxWidth="lg">
      <div className="space-y-6">
        {/* PUT Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">PUT Option Details</h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-600">Ticker:</dt>
            <dd className="font-medium text-gray-900">{trade.ticker}</dd>

            <dt className="text-gray-600">Strike Price:</dt>
            <dd className="font-medium text-gray-900">${trade.strikePrice.toFixed(2)}</dd>

            <dt className="text-gray-600">Premium Collected:</dt>
            <dd className="font-medium text-green-600">+${trade.premium.toFixed(2)}</dd>

            <dt className="text-gray-600">Contracts:</dt>
            <dd className="font-medium text-gray-900">{trade.contracts}</dd>

            <dt className="text-gray-600">Shares:</dt>
            <dd className="font-medium text-gray-900">{trade.shares}</dd>

            <dt className="text-gray-600">Expiration:</dt>
            <dd className="font-medium text-gray-900">
              {new Date(trade.expirationDate).toLocaleDateString()}
            </dd>
          </dl>
        </div>

        {/* Cost Breakdown */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Total Cost (strike × shares):</dt>
              <dd className="font-medium text-gray-900">${totalCost.toFixed(2)}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-gray-600">Less: Premium Credit:</dt>
              <dd className="font-medium text-green-600">-${premiumCredit.toFixed(2)}</dd>
            </div>

            <div className="flex justify-between border-t border-gray-200 pt-2">
              <dt className="font-semibold text-gray-900">Net Cost:</dt>
              <dd className="font-semibold text-gray-900">${totalEffectiveCost.toFixed(2)}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-gray-600">Effective Cost Basis per Share:</dt>
              <dd className="font-medium text-gray-900">${effectiveCostBasis.toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        {/* Current Price & Unrealized P/L */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Current Market Position</h4>

          {isFetchingPrice ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" />
              <span className="ml-2 text-sm text-gray-600">Fetching current price...</span>
            </div>
          ) : currentPrice ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Current {trade.ticker} Price:</dt>
                <dd className="font-medium text-gray-900">${currentPrice.toFixed(2)}</dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-gray-600">Unrealized P/L:</dt>
                <dd
                  className={`font-semibold ${
                    unrealizedPL! >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {unrealizedPL! >= 0 ? '+' : ''}${unrealizedPL!.toFixed(2)} (
                  {unrealizedPLPercent!.toFixed(2)}%)
                </dd>
              </div>

              {/* Warning for significant loss */}
              {hasSignificantLoss && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-3">
                  <div className="flex">
                    <svg
                      className="h-5 w-5 text-red-400 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Significant Unrealized Loss</h3>
                      <div className="mt-1 text-xs text-red-700">
                        The current stock price is {Math.abs(unrealizedPLPercent!).toFixed(1)}%
                        below your cost basis. You will be purchasing shares at an immediate loss.
                        Consider if you&apos;re comfortable holding this position.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-500">
              Unable to fetch current price. P/L will be calculated once price data is available.
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isAssigning}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={isAssigning}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isAssigning && <Spinner size="sm" className="mr-2" />}
            {isAssigning ? 'Assigning...' : 'Assign PUT & Create Position'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { assignPut } from '@/lib/actions/positions'
import { fetchCurrentStockPrice } from '@/lib/actions/stock-price'
import { formatCurrency, formatPercentage } from '@/lib/utils/position-calculations'
import toast from 'react-hot-toast'

export interface AssignPutDialogProps {
  trade: {
    id: string
    ticker: string
    strikePrice: number
    premium: number
    contracts: number
    shares: number
    expirationDate: Date
    status: string
    type: string
  }
  wheelId?: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onSellCoveredCall?: () => void
}

export function AssignPutDialog({
  trade,
  wheelId,
  isOpen,
  onClose,
  onSuccess,
  onSellCoveredCall,
}: AssignPutDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSellCallPrompt, setShowSellCallPrompt] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [isPriceLoading, setIsPriceLoading] = useState(true)
  const [priceError, setPriceError] = useState<string | null>(null)

  // Fetch current stock price when dialog opens
  useEffect(() => {
    if (!isOpen) return

    const loadPrice = async () => {
      setIsPriceLoading(true)
      setPriceError(null)

      try {
        const result = await fetchCurrentStockPrice(trade.ticker)
        if (result.success) {
          setCurrentPrice(result.price)
        } else {
          setPriceError(result.error || 'Failed to fetch current price')
        }
      } catch (error) {
        console.error('Error fetching stock price:', error)
        setPriceError('Failed to fetch current price')
      } finally {
        setIsPriceLoading(false)
      }
    }

    loadPrice()
  }, [isOpen, trade.ticker])

  // Calculate cost breakdown
  const totalCost = trade.strikePrice * trade.shares
  const costBasisPerShare = trade.strikePrice - trade.premium / trade.shares
  const effectiveTotalCost = costBasisPerShare * trade.shares

  // Calculate unrealized P&L if we have current price
  const currentValue = currentPrice ? currentPrice * trade.shares : null
  const unrealizedPL = currentValue ? currentValue - effectiveTotalCost : null
  const unrealizedPLPercent = unrealizedPL && effectiveTotalCost ? (unrealizedPL / effectiveTotalCost) * 100 : null

  // Check if there's a significant unrealized loss (>10%)
  const hasSignificantLoss = unrealizedPLPercent !== null && unrealizedPLPercent < -10

  const handleAssign = async () => {
    setIsSubmitting(true)

    try {
      const result = await assignPut({ tradeId: trade.id })

      if (result.success) {
        toast.success('PUT assigned and position created successfully!')
        onSuccess()

        // Show "Sell Covered Call?" prompt if callback is provided
        if (onSellCoveredCall) {
          setShowSellCallPrompt(true)
        } else {
          onClose()
        }
      } else {
        toast.error(result.error || 'Failed to assign PUT')
      }
    } catch (error) {
      console.error('Error assigning PUT:', error)
      toast.error('Failed to assign PUT')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSellCoveredCall = () => {
    onSellCoveredCall?.()
    onClose()
  }

  const handleSkipSellCall = () => {
    setShowSellCallPrompt(false)
    onClose()
  }

  if (!isOpen) return null

  // Show "Sell Covered Call?" prompt if assignment was successful
  if (showSellCallPrompt) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleSkipSellCall}
          aria-hidden="true"
        />

        {/* Prompt Dialog */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-title"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 id="prompt-title" className="text-xl font-semibold text-gray-900">
                Position Created Successfully!
              </h2>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                You now own {trade.shares} shares of {trade.ticker} at an effective cost basis of{' '}
                {formatCurrency(costBasisPerShare)} per share. Would you like to sell a covered call
                to generate additional premium?
              </p>
              <div className="rounded-md bg-blue-50 p-3 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Selling a covered call is the next step in the wheel strategy.
                  You collect premium while setting a target price for your shares.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={handleSkipSellCall}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleSellCoveredCall}
                className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Sell Covered Call on {trade.ticker}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={!isSubmitting ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 id="dialog-title" className="text-xl font-semibold text-gray-900">
                Assign PUT and Create Position
              </h2>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close dialog"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Warning Message */}
            <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
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
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    You are about to purchase {trade.shares} shares of {trade.ticker} at{' '}
                    {formatCurrency(trade.strikePrice)} per share. This action creates a new position
                    and cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Significant Loss Warning */}
            {hasSignificantLoss && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">
                      <strong>Warning:</strong> You have a significant unrealized loss of{' '}
                      {unrealizedPL && formatCurrency(unrealizedPL)} (
                      {unrealizedPLPercent && formatPercentage(unrealizedPLPercent)}). Consider if
                      assignment is the best strategy.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PUT Details */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">
                  PUT Option Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Ticker:</span>
                    <span className="ml-2 font-semibold text-gray-900">{trade.ticker}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Contracts:</span>
                    <span className="ml-2 font-semibold text-gray-900">{trade.contracts}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Strike Price:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {formatCurrency(trade.strikePrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Premium Collected:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      {formatCurrency(trade.premium)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Expiration:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {new Date(trade.expirationDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                  Cost Breakdown
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Strike Price × Shares ({trade.shares}):
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Premium Credit:</span>
                    <span className="font-medium text-green-600">
                      -{formatCurrency(trade.premium)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between">
                    <span className="font-semibold text-gray-700">Effective Cost per Share:</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(costBasisPerShare)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Total Effective Cost:</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(effectiveTotalCost)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Market Value */}
              <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                  Current Market Value
                </h3>
                {isPriceLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg
                      className="animate-spin h-4 w-4"
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
                    <span>Loading current price...</span>
                  </div>
                ) : priceError ? (
                  <div className="text-sm text-red-600">{priceError}</div>
                ) : currentPrice ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Price:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(currentPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Value ({trade.shares} shares):</span>
                      <span className="font-medium text-gray-900">
                        {currentValue && formatCurrency(currentValue)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-300 flex justify-between items-baseline">
                      <span className="font-semibold text-gray-700">Unrealized P&L:</span>
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-lg font-bold ${
                            unrealizedPL && unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {unrealizedPL && unrealizedPL >= 0 ? '+' : ''}
                          {unrealizedPL && formatCurrency(unrealizedPL)}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            unrealizedPL && unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {unrealizedPLPercent && unrealizedPLPercent >= 0 ? '+' : ''}
                          {unrealizedPLPercent && formatPercentage(unrealizedPLPercent)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">Unable to fetch current price</div>
                )}
              </div>

              {/* Wheel Status */}
              {wheelId && (
                <div className="rounded-md bg-green-50 p-3 border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>Wheel Strategy:</strong> This position will be linked to your wheel for{' '}
                    {trade.ticker}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
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
                  Processing...
                </span>
              ) : (
                'Confirm Assignment'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

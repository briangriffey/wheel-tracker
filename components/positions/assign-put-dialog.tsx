'use client'

import React, { useState, useEffect } from 'react'
import { assignPut } from '@/lib/actions/positions'
import { getLatestPrice } from '@/lib/actions/prices'
import { formatCurrency, formatPercentage } from '@/lib/utils/position-calculations'
import toast from 'react-hot-toast'

export interface AssignPutDialogProps {
  trade: {
    id: string
    ticker: string
    type: string
    strikePrice: number
    premium: number
    shares: number
    expirationDate: Date
    status: string
  }
  isOpen: boolean
  onClose: () => void
  onSuccess: (positionId: string, ticker: string, shares: number) => void
  onSellCall?: (positionId: string, ticker: string, shares: number) => void
}

export function AssignPutDialog({
  trade,
  isOpen,
  onClose,
  onSuccess,
  onSellCall,
}: AssignPutDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNextStep, setShowNextStep] = useState(false)
  const [createdPositionId, setCreatedPositionId] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [isPriceLoading, setIsPriceLoading] = useState(false)

  // Calculate cost basis and position details
  const costBasisPerShare = trade.strikePrice - trade.premium / trade.shares
  const totalCost = costBasisPerShare * trade.shares

  // Calculate unrealized P&L if we have current price
  const currentValue = currentPrice ? currentPrice * trade.shares : null
  const unrealizedPnL = currentValue ? currentValue - totalCost : null
  const unrealizedPnLPercent = unrealizedPnL ? (unrealizedPnL / totalCost) * 100 : null

  // Fetch current stock price when dialog opens
  useEffect(() => {
    if (isOpen && !currentPrice && !isPriceLoading) {
      setIsPriceLoading(true)
      getLatestPrice(trade.ticker)
        .then((result) => {
          if (result.success) {
            setCurrentPrice(result.data.price)
          }
        })
        .catch((error) => {
          console.error('Error fetching price:', error)
        })
        .finally(() => {
          setIsPriceLoading(false)
        })
    }
  }, [isOpen, trade.ticker, currentPrice, isPriceLoading])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowNextStep(false)
      setCreatedPositionId(null)
      setIsSubmitting(false)
      setCurrentPrice(null)
      setIsPriceLoading(false)
    }
  }, [isOpen])

  const handleAssign = async () => {
    setIsSubmitting(true)

    try {
      const result = await assignPut({ tradeId: trade.id })

      if (result.success) {
        toast.success('PUT assigned successfully! Position created.')
        setCreatedPositionId(result.data.positionId)

        // Show next step prompt if onSellCall callback is provided
        if (onSellCall) {
          setShowNextStep(true)
        } else {
          // If no onSellCall callback, just close and call success
          onSuccess(result.data.positionId, trade.ticker, trade.shares)
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

  const handleSellCall = () => {
    if (createdPositionId && onSellCall) {
      onSellCall(createdPositionId, trade.ticker, trade.shares)
      onClose()
    }
  }

  const handleSkipSellCall = () => {
    if (createdPositionId) {
      onSuccess(createdPositionId, trade.ticker, trade.shares)
      onClose()
    }
  }

  if (!isOpen) return null

  // Show next step screen after successful assignment
  if (showNextStep) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          aria-hidden="true"
        />

        {/* Dialog */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="next-step-title"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 id="next-step-title" className="text-xl font-semibold text-gray-900">
                Next Step: Sell Covered Call?
              </h2>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      You now own {trade.shares} shares of {trade.ticker}. Would you like to sell a
                      covered call to continue the wheel strategy?
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Position:</span>
                  <span className="font-semibold text-gray-900">
                    {trade.shares} shares of {trade.ticker}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost Basis:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(costBasisPerShare)} per share
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={handleSkipSellCall}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Skip for Now
              </button>
              <button
                onClick={handleSellCall}
                className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Sell Covered Call
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Main assignment dialog
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
                Mark PUT as Assigned
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
            {/* Info Message */}
            <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    This will close the PUT trade and create a stock position at your strike price.
                  </p>
                </div>
              </div>
            </div>

            {/* PUT Trade Details */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">
                  PUT Trade Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Ticker:</span>
                    <span className="ml-2 font-semibold text-gray-900">{trade.ticker}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Shares:</span>
                    <span className="ml-2 font-semibold text-gray-900">{trade.shares}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Strike Price:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {formatCurrency(trade.strikePrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Premium:</span>
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

              {/* Position Preview */}
              <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                  Position Preview
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Strike Price:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(trade.strikePrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Premium Collected:</span>
                    <span className="font-medium text-green-600">
                      -{formatCurrency(trade.premium)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Cost Basis per Share:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(costBasisPerShare)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between">
                    <span className="font-semibold text-gray-700">Total Cost:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Price & Unrealized P&L (if available) */}
              {currentPrice && (
                <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                    Current Market Value
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Price:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(currentPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Value:</span>
                      <span className="font-medium text-gray-900">
                        {currentValue && formatCurrency(currentValue)}
                      </span>
                    </div>
                    {unrealizedPnL !== null && unrealizedPnLPercent !== null && (
                      <div className="pt-2 border-t border-gray-300 flex justify-between items-baseline">
                        <span className="font-semibold text-gray-700">Unrealized P&L:</span>
                        <div className="flex flex-col items-end">
                          <span
                            className={`text-lg font-bold ${
                              unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {unrealizedPnL >= 0 ? '+' : ''}
                            {formatCurrency(unrealizedPnL)}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {unrealizedPnL >= 0 ? '+' : ''}
                            {formatPercentage(unrealizedPnLPercent)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loading price indicator */}
              {isPriceLoading && (
                <div className="text-sm text-gray-500 text-center">
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
                    Loading current price...
                  </span>
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

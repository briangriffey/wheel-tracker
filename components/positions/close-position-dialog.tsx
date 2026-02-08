'use client'

import React, { useState, useEffect } from 'react'
import { closePosition } from '@/lib/actions/positions'
import { formatCurrency, formatPercentage } from '@/lib/utils/position-calculations'

interface ClosePositionDialogProps {
  position: {
    id: string
    ticker: string
    shares: number
    costBasis: number
    totalCost: number
    currentValue: number | null
    coveredCalls?: Array<{
      premium: number
    }>
  }
  putPremium: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ClosePositionDialog({
  position,
  putPremium,
  isOpen,
  onClose,
  onSuccess,
}: ClosePositionDialogProps) {
  const [closingPrice, setClosingPrice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate current price from currentValue if available
  const currentPrice = position.currentValue
    ? position.currentValue / position.shares
    : null

  // Pre-fill with current price
  useEffect(() => {
    if (isOpen && currentPrice && !closingPrice) {
      setClosingPrice(currentPrice.toFixed(2))
    }
  }, [isOpen, currentPrice, closingPrice])

  // Calculate preview P&L
  const calculatePreviewPnL = () => {
    const price = parseFloat(closingPrice)
    if (isNaN(price) || price <= 0) {
      return null
    }

    const saleProceeds = price * position.shares
    const coveredCallPremiums = position.coveredCalls
      ? position.coveredCalls.reduce((sum, call) => sum + call.premium, 0)
      : 0
    const totalPremiums = putPremium + coveredCallPremiums
    const realizedGainLoss = saleProceeds + totalPremiums - position.totalCost

    return {
      saleProceeds,
      totalPremiums,
      realizedGainLoss,
      percentage: (realizedGainLoss / position.totalCost) * 100,
    }
  }

  const previewPnL = calculatePreviewPnL()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const price = parseFloat(closingPrice)
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid closing price')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await closePosition({
        positionId: position.id,
        closingPrice: price,
      })

      if (!result.success) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      // Success - reset form and notify parent
      setClosingPrice('')
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error closing position:', err)
      setError('An unexpected error occurred')
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setClosingPrice('')
    setError(null)
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleCancel}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                  <h3 className="text-base font-semibold leading-6 text-gray-900" id="modal-title">
                    Close Position: {position.ticker}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Enter the closing price per share to complete the sale and calculate realized P&L.
                    </p>
                  </div>

                  {/* Position Details */}
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="font-medium text-gray-500">Shares</dt>
                        <dd className="mt-1 text-gray-900">{position.shares}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500">Cost Basis</dt>
                        <dd className="mt-1 text-gray-900">{formatCurrency(position.costBasis)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500">Total Cost</dt>
                        <dd className="mt-1 text-gray-900">{formatCurrency(position.totalCost)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500">Total Premiums</dt>
                        <dd className="mt-1 text-gray-900">
                          {formatCurrency(
                            putPremium +
                              (position.coveredCalls?.reduce(
                                (sum, call) => sum + call.premium,
                                0
                              ) || 0)
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Closing Price Input */}
                  <div className="mt-4">
                    <label htmlFor="closingPrice" className="block text-sm font-medium text-gray-700">
                      Closing Price per Share
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        name="closingPrice"
                        id="closingPrice"
                        step="0.01"
                        min="0.01"
                        value={closingPrice}
                        onChange={(e) => setClosingPrice(e.target.value)}
                        className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="0.00"
                        required
                        autoFocus
                      />
                    </div>
                    {currentPrice && (
                      <p className="mt-1 text-xs text-gray-500">
                        Current market price: {formatCurrency(currentPrice)}
                      </p>
                    )}
                  </div>

                  {/* P&L Preview */}
                  {previewPnL && (
                    <div className={`mt-4 rounded-md p-4 ${
                      previewPnL.realizedGainLoss >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Projected Results</h4>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-gray-600">Sale Proceeds</dt>
                          <dd className="mt-1 font-medium text-gray-900">
                            {formatCurrency(previewPnL.saleProceeds)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-600">Total Premiums</dt>
                          <dd className="mt-1 font-medium text-gray-900">
                            {formatCurrency(previewPnL.totalPremiums)}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <dt className="text-xs font-medium text-gray-600 uppercase">Realized P&L</dt>
                        <dd className={`mt-1 text-xl font-bold ${
                          previewPnL.realizedGainLoss >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {formatCurrency(previewPnL.realizedGainLoss)}
                          <span className="ml-2 text-sm">
                            ({formatPercentage(previewPnL.percentage)})
                          </span>
                        </dd>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="mt-4 rounded-md bg-red-50 p-3 border border-red-200">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !closingPrice || parseFloat(closingPrice) <= 0}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Closing...' : 'Close Position'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

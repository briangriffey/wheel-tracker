'use client'

import React, { useState } from 'react'
import { assignCall } from '@/lib/actions/positions'
import { formatCurrency, formatPercentage } from '@/lib/utils/format'
import { calculateAnnualizedReturn } from '@/lib/calculations/wheel'
import toast from 'react-hot-toast'

export interface AssignCallDialogProps {
  positionId: string
  ticker: string
  shares: number
  costBasis: number
  totalCost: number
  acquiredDate: Date
  coveredCall: {
    id: string
    strikePrice: number
    premium: number
    expirationDate: Date
    status: string
  }
  putPremium: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onStartNewPut?: () => void
}

export function AssignCallDialog({
  ticker,
  shares,
  costBasis,
  totalCost,
  acquiredDate,
  coveredCall,
  putPremium,
  isOpen,
  onClose,
  onSuccess,
  onStartNewPut,
}: AssignCallDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNewPutPrompt, setShowNewPutPrompt] = useState(false)

  // Calculate P&L components
  const saleProceeds = coveredCall.strikePrice * shares
  const totalPremiums = putPremium + coveredCall.premium
  const stockGain = (coveredCall.strikePrice - costBasis) * shares
  const estimatedPL = saleProceeds + totalPremiums - totalCost
  const estimatedPLPercent = (estimatedPL / totalCost) * 100

  // Calculate duration (days between acquired and now)
  const duration = Math.ceil(
    (new Date().getTime() - new Date(acquiredDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  // Calculate annualized return
  const annualizedReturn = calculateAnnualizedReturn(estimatedPL, duration, totalCost)

  const handleAssign = async () => {
    setIsSubmitting(true)

    try {
      const result = await assignCall({ tradeId: coveredCall.id })

      if (result.success) {
        toast.success('Position closed successfully!')
        onSuccess()

        // Show "Start New PUT" prompt if callback is provided
        if (onStartNewPut) {
          setShowNewPutPrompt(true)
        } else {
          onClose()
        }
      } else {
        toast.error(result.error || 'Failed to assign covered call')
      }
    } catch (error) {
      console.error('Error assigning call:', error)
      toast.error('Failed to assign covered call')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartNewPut = () => {
    onStartNewPut?.()
    onClose()
  }

  const handleSkipNewPut = () => {
    setShowNewPutPrompt(false)
    onClose()
  }

  if (!isOpen) return null

  // Show "Start New PUT" prompt if assignment was successful
  if (showNewPutPrompt) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleSkipNewPut}
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
                Cycle Complete! 🎉
              </h2>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                Your {ticker} position has been closed successfully. Would you like to start a new
                PUT on {ticker} to begin the next wheel cycle?
              </p>
              <div className="rounded-md bg-blue-50 p-3 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Starting a new PUT immediately helps you continue collecting
                  premium and compound your returns.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={handleSkipNewPut}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleStartNewPut}
                className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Start New PUT on {ticker}
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
                Mark Covered Call as Assigned
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
                    This action will close your position and record the realized gain/loss. This
                    cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Position Details */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">
                  Position Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Ticker:</span>
                    <span className="ml-2 font-semibold text-gray-900">{ticker}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Shares:</span>
                    <span className="ml-2 font-semibold text-gray-900">{shares}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">PUT Premium:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      {formatCurrency(putPremium)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Covered Call Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">
                  Covered Call Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Strike Price:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {formatCurrency(coveredCall.strikePrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">CALL Premium:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      {formatCurrency(coveredCall.premium)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Expiration:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {new Date(coveredCall.expirationDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* P&L Calculation */}
              <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                  Profit & Loss Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sale Proceeds:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(saleProceeds)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Total Premiums ({formatCurrency(putPremium)} +{' '}
                      {formatCurrency(coveredCall.premium)}):
                    </span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(totalPremiums)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Stock Gain (${coveredCall.strikePrice.toFixed(2)} - ${costBasis.toFixed(2)}{' '}
                      cost basis):
                    </span>
                    <span
                      className={`font-medium ${stockGain >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {stockGain >= 0 ? '+' : ''}
                      {formatCurrency(stockGain)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between items-baseline">
                    <span className="font-semibold text-gray-700">Total Realized Profit:</span>
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-lg font-bold ${
                          estimatedPL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {estimatedPL >= 0 ? '+' : ''}
                        {formatCurrency(estimatedPL)}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          estimatedPL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {estimatedPL >= 0 ? '+' : ''}
                        {formatPercentage(estimatedPLPercent)} return
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-between text-xs text-gray-600">
                    <span>Duration: {duration} days</span>
                    <span
                      className={`font-medium ${
                        annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatPercentage(annualizedReturn)} annualized
                    </span>
                  </div>
                </div>
              </div>
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

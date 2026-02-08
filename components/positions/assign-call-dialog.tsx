'use client'

import React, { useState } from 'react'
import { assignCall } from '@/lib/actions/positions'
import { formatCurrency, formatPercentage } from '@/lib/utils/position-calculations'
import toast from 'react-hot-toast'

export interface AssignCallDialogProps {
  positionId: string
  ticker: string
  shares: number
  costBasis: number
  totalCost: number
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
}

export function AssignCallDialog({
  ticker,
  shares,
  totalCost,
  coveredCall,
  putPremium,
  isOpen,
  onClose,
  onSuccess,
}: AssignCallDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate estimated P&L
  const saleProceeds = coveredCall.strikePrice * shares
  const totalPremiums = putPremium + coveredCall.premium
  const estimatedPL = saleProceeds + totalPremiums - totalCost
  const estimatedPLPercent = (estimatedPL / totalCost) * 100

  const handleAssign = async () => {
    setIsSubmitting(true)

    try {
      const result = await assignCall({ tradeId: coveredCall.id })

      if (result.success) {
        toast.success('Position closed successfully!')
        onSuccess()
        onClose()
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

  if (!isOpen) return null

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
                      {new Date(coveredCall.expirationDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* P&L Calculation */}
              <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                  Estimated P&L Breakdown
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sale Proceeds:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(saleProceeds)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Premiums:</span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(totalPremiums)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(totalCost)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between items-baseline">
                    <span className="font-semibold text-gray-700">Realized P&L:</span>
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
                        {formatPercentage(estimatedPLPercent)}
                      </span>
                    </div>
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

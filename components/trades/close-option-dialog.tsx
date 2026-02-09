'use client'

import React, { useState } from 'react'
import { closeOption } from '@/lib/actions/trades'
import { formatCurrency } from '@/lib/utils/position-calculations'
import toast from 'react-hot-toast'

export interface CloseOptionDialogProps {
  tradeId: string
  ticker: string
  type: 'PUT' | 'CALL'
  strikePrice: number
  originalPremium: number
  expirationDate: Date
  contracts: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CloseOptionDialog({
  tradeId,
  ticker,
  type,
  strikePrice,
  originalPremium,
  expirationDate,
  contracts,
  isOpen,
  onClose,
  onSuccess,
}: CloseOptionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [closePremium, setClosePremium] = useState<string>('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Calculate net P/L
  const closePremiumNum = parseFloat(closePremium) || 0
  const netPL = originalPremium - closePremiumNum
  const netPLPercent = originalPremium > 0 ? (netPL / originalPremium) * 100 : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate input
    if (!closePremium || closePremiumNum < 0) {
      toast.error('Please enter a valid close premium (0 or greater)')
      return
    }

    // Show confirmation
    setShowConfirmation(true)
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)

    try {
      const result = await closeOption({
        tradeId,
        closePremium: closePremiumNum,
      })

      if (result.success) {
        toast.success(
          `Option closed successfully! Net P/L: ${netPL >= 0 ? '+' : ''}${formatCurrency(netPL)}`
        )
        onSuccess()
        onClose()
      } else {
        toast.error(result.error || 'Failed to close option')
        setShowConfirmation(false)
      }
    } catch (error) {
      console.error('Error closing option:', error)
      toast.error('Failed to close option')
      setShowConfirmation(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowConfirmation(false)
  }

  if (!isOpen) return null

  // Show confirmation dialog
  if (showConfirmation) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={!isSubmitting ? handleCancel : undefined}
          aria-hidden="true"
        />

        {/* Confirmation Dialog */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 id="confirm-title" className="text-xl font-semibold text-gray-900">
                Confirm Close Option
              </h2>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                Are you sure you want to close this {type} option on {ticker}? This action cannot
                be undone.
              </p>

              <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Original Premium Collected:</span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(originalPremium)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Close Premium Paid:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(closePremiumNum)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between items-baseline">
                    <span className="font-semibold text-gray-700">Net P/L:</span>
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-lg font-bold ${
                          netPL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {netPL >= 0 ? '+' : ''}
                        {formatCurrency(netPL)}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          netPL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {netPL >= 0 ? '+' : ''}
                        {netPLPercent.toFixed(2)}% return
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
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
                  'Confirm Close'
                )}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Main dialog
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
                Close {type} Option Early
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

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
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
                    Closing this option early (buying it back) will lock in your profit or loss.
                    {type === 'CALL' && ' Your position will return to OPEN status.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Option Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">
                Option Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Ticker:</span>
                  <span className="ml-2 font-semibold text-gray-900">{ticker}</span>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-semibold text-gray-900">{type}</span>
                </div>
                <div>
                  <span className="text-gray-600">Strike Price:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {formatCurrency(strikePrice)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Contracts:</span>
                  <span className="ml-2 font-semibold text-gray-900">{contracts}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Expiration:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {new Date(expirationDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Premium Collected:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    +{formatCurrency(originalPremium)}
                  </span>
                </div>
              </div>
            </div>

            {/* Close Premium Input */}
            <div>
              <label htmlFor="closePremium" className="block text-sm font-medium text-gray-700 mb-1">
                Close Premium (Amount Paid to Buy Back) <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="closePremium"
                  value={closePremium}
                  onChange={(e) => setClosePremium(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                  className="block w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                  aria-describedby="close-premium-description"
                />
              </div>
              <p id="close-premium-description" className="mt-1 text-xs text-gray-500">
                Enter the total premium you paid to close this option (0 if it expired worthless before closing)
              </p>
            </div>

            {/* P&L Preview */}
            {closePremium && !isNaN(closePremiumNum) && (
              <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                  Net P/L Preview
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Premium Collected:</span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(originalPremium)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Premium Paid:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(closePremiumNum)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between items-baseline">
                    <span className="font-semibold text-gray-700">Net P/L:</span>
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-lg font-bold ${
                          netPL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {netPL >= 0 ? '+' : ''}
                        {formatCurrency(netPL)}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          netPL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {netPL >= 0 ? '+' : ''}
                        {netPLPercent.toFixed(2)}% return
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !closePremium}
                className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

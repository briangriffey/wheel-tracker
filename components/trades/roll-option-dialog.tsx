'use client'

import React, { useState, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { rollOption } from '@/lib/actions/roll-options'
import { RollOptionSchema, calculateNetPremium, type RollOptionInput } from '@/lib/validations/roll-option'
import { formatCurrency } from '@/lib/utils/position-calculations'
import toast from 'react-hot-toast'

export interface RollOptionDialogProps {
  trade: {
    id: string
    ticker: string
    type: string
    strikePrice: number
    premium: number
    contracts: number
    expirationDate: Date
    status: string
  }
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RollOptionDialog({ trade, isOpen, onClose, onSuccess }: RollOptionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RollOptionInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(RollOptionSchema) as any,
    defaultValues: {
      tradeId: trade.id,
      newStrikePrice: trade.strikePrice,
      closePremium: 0,
      openPremium: 0,
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form

  // Watch form values for real-time net premium calculation
  const closePremium = watch('closePremium') || 0
  const openPremium = watch('openPremium') || 0

  // Calculate net premium in real-time
  const netPremium = useMemo(() => {
    return calculateNetPremium(Number(closePremium), Number(openPremium))
  }, [closePremium, openPremium])

  const isNetCredit = netPremium > 0
  const isNetDebit = netPremium < 0

  const handleRoll: SubmitHandler<RollOptionInput> = async (data) => {
    setIsSubmitting(true)

    try {
      const result = await rollOption(data)

      if (result.success) {
        const netAmount = result.data.netPremium
        const message =
          netAmount >= 0
            ? `Option rolled successfully! Net credit: ${formatCurrency(netAmount)}`
            : `Option rolled successfully! Net debit: ${formatCurrency(Math.abs(netAmount))}`

        toast.success(message)
        onSuccess()
        onClose()
      } else {
        toast.error(result.error || 'Failed to roll option')
      }
    } catch (error) {
      console.error('Error rolling option:', error)
      toast.error('Failed to roll option')
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
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 id="dialog-title" className="text-xl font-semibold text-gray-900">
                Roll {trade.type} Option
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

          {/* Form */}
          <form onSubmit={handleSubmit(handleRoll)}>
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
                      Rolling closes your current option and opens a new one with different
                      parameters. You&apos;ll pay a premium to close the current position and
                      receive a premium from opening the new one.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Option Details */}
              <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                  Current {trade.type} Option
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
                    <span className="text-gray-600">Current Expiration:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {new Date(trade.expirationDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* New Option Parameters */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                  New Option Parameters
                </h3>

                {/* New Strike Price */}
                <div>
                  <label htmlFor="newStrikePrice" className="block text-sm font-medium text-gray-700">
                    New Strike Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="newStrikePrice"
                    type="number"
                    step="0.01"
                    {...register('newStrikePrice', { valueAsNumber: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder={trade.strikePrice.toString()}
                    disabled={isSubmitting}
                  />
                  {errors.newStrikePrice && (
                    <p className="mt-1 text-sm text-red-600">{errors.newStrikePrice.message}</p>
                  )}
                </div>

                {/* New Expiration Date */}
                <div>
                  <label htmlFor="newExpirationDate" className="block text-sm font-medium text-gray-700">
                    New Expiration Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="newExpirationDate"
                    type="date"
                    {...register('newExpirationDate')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    disabled={isSubmitting}
                  />
                  {errors.newExpirationDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.newExpirationDate.message}</p>
                  )}
                </div>

                {/* Premium to Close Current Position */}
                <div>
                  <label htmlFor="closePremium" className="block text-sm font-medium text-gray-700">
                    Premium to Close Current Position <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      id="closePremium"
                      type="number"
                      step="0.01"
                      {...register('closePremium', { valueAsNumber: true })}
                      className="block w-full pl-7 pr-12 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="0.00"
                      disabled={isSubmitting}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Amount you&apos;ll pay to buy back the current option
                  </p>
                  {errors.closePremium && (
                    <p className="mt-1 text-sm text-red-600">{errors.closePremium.message}</p>
                  )}
                </div>

                {/* Premium from Opening New Position */}
                <div>
                  <label htmlFor="openPremium" className="block text-sm font-medium text-gray-700">
                    Premium from Opening New Position <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      id="openPremium"
                      type="number"
                      step="0.01"
                      {...register('openPremium', { valueAsNumber: true })}
                      className="block w-full pl-7 pr-12 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="0.00"
                      disabled={isSubmitting}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Amount you&apos;ll receive from selling the new option
                  </p>
                  {errors.openPremium && (
                    <p className="mt-1 text-sm text-red-600">{errors.openPremium.message}</p>
                  )}
                </div>

                {/* Optional Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    rows={2}
                    {...register('notes')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Why are you rolling this option?"
                    disabled={isSubmitting}
                  />
                  {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
                </div>
              </div>

              {/* Net Premium Calculation */}
              <div
                className={`rounded-md p-4 border ${
                  isNetCredit
                    ? 'bg-green-50 border-green-200'
                    : isNetDebit
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                }`}
              >
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                  Net Premium
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Premium to Close:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(Number(closePremium))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Premium to Open:</span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(Number(openPremium))}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between items-baseline">
                    <span className="font-semibold text-gray-700">
                      {isNetCredit ? 'Net Credit:' : isNetDebit ? 'Net Debit:' : 'Net:'}
                    </span>
                    <div className="text-right">
                      <div
                        className={`text-xl font-bold ${
                          isNetCredit ? 'text-green-600' : isNetDebit ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {netPremium >= 0 ? '+' : ''}
                        {formatCurrency(netPremium)}
                      </div>
                      <div
                        className={`text-sm ${
                          isNetCredit ? 'text-green-600' : isNetDebit ? 'text-red-600' : 'text-gray-600'
                        }`}
                      >
                        {isNetCredit && 'You will receive this amount'}
                        {isNetDebit && 'You will pay this amount'}
                        {!isNetCredit && !isNetDebit && 'Break-even roll'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
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
                    Rolling...
                  </span>
                ) : (
                  'Confirm Roll'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

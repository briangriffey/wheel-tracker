'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { rollOption } from '@/lib/actions/trades'
import { RollOptionSchema, type RollOptionInput } from '@/lib/validations/trade'
import { formatCurrency } from '@/lib/utils/position-calculations'
import toast from 'react-hot-toast'

export interface RollOptionDialogProps {
  trade: {
    id: string
    ticker: string
    type: 'PUT' | 'CALL'
    strikePrice: number
    premium: number
    contracts: number
    expirationDate: Date
  }
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  newExpirationDate: string
  newStrikePrice: string
  newPremium: string
  closePremium: string
}

export function RollOptionDialog({ trade, isOpen, onClose, onSuccess }: RollOptionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      newStrikePrice: trade.strikePrice.toString(),
      newPremium: '0',
      closePremium: '0',
    },
  })

  // Watch form values to calculate net credit/debit
  const newPremiumStr = watch('newPremium') || '0'
  const closePremiumStr = watch('closePremium') || '0'
  const newPremium = parseFloat(newPremiumStr) || 0
  const closePremium = parseFloat(closePremiumStr) || 0
  const netCredit = newPremium - closePremium

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      // Parse and validate input
      const input: RollOptionInput = {
        originalTradeId: trade.id,
        newExpirationDate: new Date(data.newExpirationDate),
        newStrikePrice: parseFloat(data.newStrikePrice),
        newPremium: parseFloat(data.newPremium),
        closePremium: parseFloat(data.closePremium),
      }

      // Validate with Zod schema
      const validated = RollOptionSchema.parse(input)
      const result = await rollOption(validated)

      if (result.success) {
        toast.success(
          `Option rolled successfully! Net ${result.data.netCredit >= 0 ? 'credit' : 'debit'}: ${formatCurrency(Math.abs(result.data.netCredit))}`
        )
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
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
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
          <form onSubmit={handleSubmit(onSubmit)}>
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
                      Rolling will close the current {trade.type} and open a new one at a later
                      expiration date.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Option Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">
                  Current Option
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 p-3 rounded-md">
                  <div>
                    <span className="text-gray-600">Ticker:</span>
                    <span className="ml-2 font-semibold text-gray-900">{trade.ticker}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-semibold text-gray-900">{trade.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Strike:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {formatCurrency(trade.strikePrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Contracts:</span>
                    <span className="ml-2 font-semibold text-gray-900">{trade.contracts}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Expiration:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {new Date(trade.expirationDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* New Option Form */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">
                  New Option Details
                </h3>
                <div className="space-y-3">
                  {/* New Expiration Date */}
                  <div>
                    <label
                      htmlFor="newExpirationDate"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      New Expiration Date *
                    </label>
                    <input
                      type="date"
                      id="newExpirationDate"
                      {...register('newExpirationDate')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.newExpirationDate && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.newExpirationDate.message}
                      </p>
                    )}
                  </div>

                  {/* New Strike Price */}
                  <div>
                    <label
                      htmlFor="newStrikePrice"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      New Strike Price ($) *
                    </label>
                    <input
                      type="number"
                      id="newStrikePrice"
                      step="0.01"
                      {...register('newStrikePrice')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.newStrikePrice && (
                      <p className="mt-1 text-sm text-red-600">{errors.newStrikePrice.message}</p>
                    )}
                  </div>

                  {/* New Premium */}
                  <div>
                    <label
                      htmlFor="newPremium"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      New Premium Received ($) *
                    </label>
                    <input
                      type="number"
                      id="newPremium"
                      step="0.01"
                      {...register('newPremium')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Premium from selling new option"
                    />
                    {errors.newPremium && (
                      <p className="mt-1 text-sm text-red-600">{errors.newPremium.message}</p>
                    )}
                  </div>

                  {/* Close Premium */}
                  <div>
                    <label
                      htmlFor="closePremium"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Cost to Close Current ($) *
                    </label>
                    <input
                      type="number"
                      id="closePremium"
                      step="0.01"
                      {...register('closePremium')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Cost to buy back current option"
                    />
                    {errors.closePremium && (
                      <p className="mt-1 text-sm text-red-600">{errors.closePremium.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Net Credit/Debit Summary */}
              <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                  Roll Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">New Premium Received:</span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(newPremium)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost to Close Current:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(closePremium)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between items-baseline">
                    <span className="font-semibold text-gray-700">
                      Net {netCredit >= 0 ? 'Credit' : 'Debit'}:
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        netCredit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {netCredit >= 0 ? '+' : ''}
                      {formatCurrency(netCredit)}
                    </span>
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
                  'Roll Option'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

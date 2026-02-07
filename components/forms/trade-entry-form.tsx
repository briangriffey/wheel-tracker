'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateTradeSchema, type CreateTradeInput } from '@/lib/validations/trade'
import { createTrade } from '@/lib/actions/trades'

interface TradeEntryFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

// Form-specific type with string dates (HTML input compatibility)
type TradeFormData = Omit<CreateTradeInput, 'expirationDate' | 'openDate'> & {
  expirationDate: string | Date
  openDate?: string | Date
}

export function TradeEntryForm({ onSuccess, onCancel }: TradeEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TradeFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(CreateTradeSchema) as any,
    defaultValues: {
      action: 'SELL_TO_OPEN',
      openDate: new Date().toISOString().split('T')[0],
    },
  })

  const onSubmit = async (formData: TradeFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      // Convert form data to server action format (ensure dates are Date objects)
      const data: CreateTradeInput = {
        ...formData,
        openDate: formData.openDate ? new Date(formData.openDate) : undefined,
        expirationDate: new Date(formData.expirationDate),
      }

      const result = await createTrade(data)

      if (!result.success) {
        setSubmitError(result.error)
      } else {
        setSubmitSuccess(true)
        reset()
        onSuccess?.()
      }
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Success Message */}
      {submitSuccess && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-800">
            Trade created successfully!
          </div>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{submitError}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Ticker */}
        <div>
          <label htmlFor="ticker" className="block text-sm font-medium text-gray-700">
            Ticker Symbol <span className="text-red-500">*</span>
          </label>
          <input
            id="ticker"
            type="text"
            maxLength={5}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase"
            {...register('ticker')}
            aria-invalid={errors.ticker ? 'true' : 'false'}
            aria-describedby={errors.ticker ? 'ticker-error' : undefined}
          />
          {errors.ticker && (
            <p id="ticker-error" className="mt-1 text-sm text-red-600">
              {errors.ticker.message}
            </p>
          )}
        </div>

        {/* Trade Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Trade Type <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('type')}
            aria-invalid={errors.type ? 'true' : 'false'}
            aria-describedby={errors.type ? 'type-error' : undefined}
          >
            <option value="">Select type</option>
            <option value="PUT">PUT</option>
            <option value="CALL">CALL</option>
          </select>
          {errors.type && (
            <p id="type-error" className="mt-1 text-sm text-red-600">
              {errors.type.message}
            </p>
          )}
        </div>

        {/* Trade Action */}
        <div>
          <label htmlFor="action" className="block text-sm font-medium text-gray-700">
            Trade Action <span className="text-red-500">*</span>
          </label>
          <select
            id="action"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('action')}
            aria-invalid={errors.action ? 'true' : 'false'}
            aria-describedby={errors.action ? 'action-error' : undefined}
          >
            <option value="SELL_TO_OPEN">Sell to Open</option>
            <option value="BUY_TO_CLOSE">Buy to Close</option>
          </select>
          {errors.action && (
            <p id="action-error" className="mt-1 text-sm text-red-600">
              {errors.action.message}
            </p>
          )}
        </div>

        {/* Strike Price */}
        <div>
          <label htmlFor="strikePrice" className="block text-sm font-medium text-gray-700">
            Strike Price <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              id="strikePrice"
              type="number"
              step="0.01"
              min="0"
              className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              {...register('strikePrice', { valueAsNumber: true })}
              aria-invalid={errors.strikePrice ? 'true' : 'false'}
              aria-describedby={errors.strikePrice ? 'strikePrice-error' : undefined}
            />
          </div>
          {errors.strikePrice && (
            <p id="strikePrice-error" className="mt-1 text-sm text-red-600">
              {errors.strikePrice.message}
            </p>
          )}
        </div>

        {/* Premium */}
        <div>
          <label htmlFor="premium" className="block text-sm font-medium text-gray-700">
            Premium (Total) <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              id="premium"
              type="number"
              step="0.01"
              min="0"
              className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              {...register('premium', { valueAsNumber: true })}
              aria-invalid={errors.premium ? 'true' : 'false'}
              aria-describedby={errors.premium ? 'premium-error' : undefined}
            />
          </div>
          {errors.premium && (
            <p id="premium-error" className="mt-1 text-sm text-red-600">
              {errors.premium.message}
            </p>
          )}
        </div>

        {/* Contracts */}
        <div>
          <label htmlFor="contracts" className="block text-sm font-medium text-gray-700">
            Number of Contracts <span className="text-red-500">*</span>
          </label>
          <input
            id="contracts"
            type="number"
            min="1"
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('contracts', { valueAsNumber: true })}
            aria-invalid={errors.contracts ? 'true' : 'false'}
            aria-describedby={errors.contracts ? 'contracts-error' : undefined}
          />
          {errors.contracts && (
            <p id="contracts-error" className="mt-1 text-sm text-red-600">
              {errors.contracts.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">Each contract = 100 shares</p>
        </div>

        {/* Entry Date */}
        <div>
          <label htmlFor="openDate" className="block text-sm font-medium text-gray-700">
            Entry Date <span className="text-red-500">*</span>
          </label>
          <input
            id="openDate"
            type="date"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('openDate')}
            aria-invalid={errors.openDate ? 'true' : 'false'}
            aria-describedby={errors.openDate ? 'openDate-error' : undefined}
          />
          {errors.openDate && (
            <p id="openDate-error" className="mt-1 text-sm text-red-600">
              {errors.openDate.message}
            </p>
          )}
        </div>

        {/* Expiration Date */}
        <div>
          <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">
            Expiration Date <span className="text-red-500">*</span>
          </label>
          <input
            id="expirationDate"
            type="date"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('expirationDate')}
            aria-invalid={errors.expirationDate ? 'true' : 'false'}
            aria-describedby={errors.expirationDate ? 'expirationDate-error' : undefined}
          />
          {errors.expirationDate && (
            <p id="expirationDate-error" className="mt-1 text-sm text-red-600">
              {errors.expirationDate.message}
            </p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          {...register('notes')}
          aria-describedby="notes-description"
        />
        <p id="notes-description" className="mt-1 text-xs text-gray-500">
          Add any additional information about this trade
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Trade...' : 'Create Trade'}
        </button>
      </div>
    </form>
  )
}

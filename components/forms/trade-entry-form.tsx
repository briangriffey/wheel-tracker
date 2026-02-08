'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { CreateTradeSchema, type CreateTradeInput } from '@/lib/validations/trade'
import { createTrade } from '@/lib/actions/trades'
import { Input } from '@/components/design-system/input/input'
import { Select } from '@/components/design-system/select/select'
import { Button } from '@/components/design-system/button/button'

interface TradeEntryFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

// Form data type - HTML inputs return strings for dates
type TradeFormData = Omit<CreateTradeInput, 'expirationDate' | 'openDate'> & {
  expirationDate: string
  openDate?: string
}

export function TradeEntryForm({ onSuccess, onCancel }: TradeEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    try {
      // The schema will coerce string dates to Date objects automatically
      const result = await createTrade(formData as unknown as CreateTradeInput)

      if (!result.success) {
        toast.error(result.error || 'Failed to create trade')
      } else {
        toast.success('Trade created successfully!')
        reset()
        onSuccess?.()
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Ticker */}
        <div>
          <label htmlFor="ticker" className="block text-sm font-medium text-neutral-700">
            Ticker Symbol <span className="text-error">*</span>
          </label>
          <Input
            id="ticker"
            type="text"
            maxLength={5}
            wrapperClassName="mt-1"
            className="uppercase"
            error={errors.ticker?.message}
            {...register('ticker')}
          />
        </div>

        {/* Trade Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-neutral-700">
            Trade Type <span className="text-error">*</span>
          </label>
          <Select
            id="type"
            wrapperClassName="mt-1"
            error={errors.type?.message}
            {...register('type')}
          >
            <option value="">Select type</option>
            <option value="PUT">PUT</option>
            <option value="CALL">CALL</option>
          </Select>
        </div>

        {/* Trade Action */}
        <div>
          <label htmlFor="action" className="block text-sm font-medium text-neutral-700">
            Trade Action <span className="text-error">*</span>
          </label>
          <Select
            id="action"
            wrapperClassName="mt-1"
            error={errors.action?.message}
            {...register('action')}
          >
            <option value="SELL_TO_OPEN">Sell to Open</option>
            <option value="BUY_TO_CLOSE">Buy to Close</option>
          </Select>
        </div>

        {/* Strike Price */}
        <div>
          <label htmlFor="strikePrice" className="block text-sm font-medium text-neutral-700">
            Strike Price <span className="text-error">*</span>
          </label>
          <Input
            id="strikePrice"
            type="number"
            step="0.01"
            min="0"
            wrapperClassName="mt-1"
            prefix={<span className="text-neutral-500 sm:text-sm">$</span>}
            error={errors.strikePrice?.message}
            {...register('strikePrice', { valueAsNumber: true })}
          />
        </div>

        {/* Premium */}
        <div>
          <label htmlFor="premium" className="block text-sm font-medium text-neutral-700">
            Premium (Total) <span className="text-error">*</span>
          </label>
          <Input
            id="premium"
            type="number"
            step="0.01"
            min="0"
            wrapperClassName="mt-1"
            prefix={<span className="text-neutral-500 sm:text-sm">$</span>}
            error={errors.premium?.message}
            {...register('premium', { valueAsNumber: true })}
          />
        </div>

        {/* Contracts */}
        <div>
          <label htmlFor="contracts" className="block text-sm font-medium text-neutral-700">
            Number of Contracts <span className="text-error">*</span>
          </label>
          <Input
            id="contracts"
            type="number"
            min="1"
            step="1"
            wrapperClassName="mt-1"
            error={errors.contracts?.message}
            helpText="Each contract = 100 shares"
            {...register('contracts', { valueAsNumber: true })}
          />
        </div>

        {/* Entry Date */}
        <div>
          <label htmlFor="openDate" className="block text-sm font-medium text-neutral-700">
            Entry Date <span className="text-error">*</span>
          </label>
          <Input
            id="openDate"
            type="date"
            wrapperClassName="mt-1"
            error={errors.openDate?.message}
            {...register('openDate')}
          />
        </div>

        {/* Expiration Date */}
        <div>
          <label htmlFor="expirationDate" className="block text-sm font-medium text-neutral-700">
            Expiration Date <span className="text-error">*</span>
          </label>
          <Input
            id="expirationDate"
            type="date"
            wrapperClassName="mt-1"
            error={errors.expirationDate?.message}
            {...register('expirationDate')}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-neutral-700">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:border-primary-500 hover:border-neutral-400 transition-colors sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50"
          {...register('notes')}
          aria-describedby="notes-description"
        />
        <p id="notes-description" className="mt-1 text-xs text-neutral-500">
          Add any additional information about this trade
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? 'Creating Trade...' : 'Create Trade'}
        </Button>
      </div>
    </form>
  )
}

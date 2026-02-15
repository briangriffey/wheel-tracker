'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { RecordWithdrawalSchema, type RecordWithdrawalInput } from '@/lib/validations/deposit'
import { recordCashWithdrawal } from '@/lib/actions/deposits'
import { calculateWithdrawalPreview, type WithdrawalPreview } from '@/lib/actions/deposit-preview'
import { Input } from '@/components/design-system/input/input'
import { Button } from '@/components/design-system/button/button'
import { InfoTooltip } from '@/components/ui/tooltip'

interface WithdrawalFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

// Form data type - HTML inputs return strings for dates
type WithdrawalFormData = Omit<RecordWithdrawalInput, 'depositDate'> & {
  depositDate: string
}

export function WithdrawalForm({ onSuccess, onCancel }: WithdrawalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<WithdrawalPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<WithdrawalFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(RecordWithdrawalSchema) as any,
    defaultValues: {
      depositDate: new Date().toISOString().split('T')[0],
      amount: undefined,
      notes: '',
    },
  })

  // Watch amount and date for preview calculation
  const amount = watch('amount')
  const depositDate = watch('depositDate')

  // Calculate preview when amount or date changes
  useEffect(() => {
    const loadPreview = async () => {
      // Only calculate if we have both amount and date
      if (!amount || amount <= 0 || !depositDate) {
        setPreview(null)
        setPreviewError(null)
        return
      }

      setIsLoadingPreview(true)
      setPreviewError(null)

      try {
        const date = new Date(depositDate)
        const result = await calculateWithdrawalPreview(Number(amount), date)

        if (result.success) {
          setPreview(result.data)
        } else {
          setPreviewError(result.error)
          setPreview(null)
        }
      } catch {
        setPreviewError('Failed to calculate preview')
        setPreview(null)
      } finally {
        setIsLoadingPreview(false)
      }
    }

    // Debounce the preview calculation
    const timeoutId = setTimeout(loadPreview, 500)
    return () => clearTimeout(timeoutId)
  }, [amount, depositDate])

  const onSubmit = async (formData: WithdrawalFormData) => {
    setIsSubmitting(true)

    try {
      // The schema will coerce string dates to Date objects automatically
      const result = await recordCashWithdrawal(formData as unknown as RecordWithdrawalInput)

      if (!result.success) {
        toast.error(result.error || 'Failed to record withdrawal')
      } else {
        toast.success('Withdrawal recorded successfully!')
        reset()
        setPreview(null)
        onSuccess?.()
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" aria-label="Withdrawal form">
      <div className="space-y-6">
        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-neutral-700">
            Withdrawal Amount{' '}
            <span className="text-error" aria-hidden="true">
              *
            </span>
            <InfoTooltip
              content="The amount of cash you're withdrawing from your trading account. This will reduce your benchmark SPY shares accordingly."
              position="top"
            />
          </label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            wrapperClassName="mt-1"
            prefix={<span className="text-neutral-500 sm:text-sm">$</span>}
            error={errors.amount?.message}
            required
            aria-required="true"
            placeholder="1000.00"
            {...register('amount', { valueAsNumber: true })}
          />
        </div>

        {/* Withdrawal Date */}
        <div>
          <label htmlFor="depositDate" className="block text-sm font-medium text-neutral-700">
            Withdrawal Date{' '}
            <span className="text-error" aria-hidden="true">
              *
            </span>
            <InfoTooltip
              content="The date when the withdrawal was made. Used to fetch the SPY price for accurate benchmark tracking."
              position="top"
            />
          </label>
          <Input
            id="depositDate"
            type="date"
            wrapperClassName="mt-1"
            error={errors.depositDate?.message}
            required
            aria-required="true"
            {...register('depositDate')}
          />
        </div>

        {/* Preview Section */}
        {(preview || isLoadingPreview || previewError) && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="text-sm font-medium text-neutral-700 mb-3">Preview Calculation</h3>

            {isLoadingPreview && (
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                <span>Calculating...</span>
              </div>
            )}

            {previewError && !isLoadingPreview && (
              <div className="text-sm text-error" role="alert">
                {previewError}
              </div>
            )}

            {preview && !isLoadingPreview && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Current Net Invested:</span>
                  <span className="font-medium text-neutral-900">
                    ${preview.netInvested.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">SPY Price:</span>
                  <span className="font-medium text-neutral-900">
                    ${preview.spyPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">SPY Shares to Remove:</span>
                  <span className="font-medium text-neutral-900">
                    {Math.abs(preview.spyShares).toFixed(4)} shares
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-200">
                  <span className="text-neutral-600">Remaining Invested:</span>
                  <span className="font-semibold text-neutral-900">
                    ${preview.remainingAfterWithdrawal.toFixed(2)}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-neutral-200">
                  <p className="text-xs text-neutral-500">
                    Your ${amount} withdrawal will remove {Math.abs(preview.spyShares).toFixed(4)}{' '}
                    SPY shares at ${preview.spyPrice.toFixed(2)} per share from your benchmark
                    tracking.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

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
            placeholder="Add any additional information about this withdrawal"
          />
          <p id="notes-description" className="mt-1 text-xs text-neutral-500">
            Optional notes about this withdrawal
          </p>
        </div>
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
          disabled={isSubmitting || isLoadingPreview}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? 'Recording Withdrawal...' : 'Record Withdrawal'}
        </Button>
      </div>
    </form>
  )
}

'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { RecordDepositSchema, type RecordDepositInput } from '@/lib/validations/deposit'
import { recordCashDeposit } from '@/lib/actions/deposits'
import { Input } from '@/components/design-system/input/input'
import { Button } from '@/components/design-system/button/button'

interface RecordDepositDialogProps {
  onSuccess?: () => void
  onCancel?: () => void
}

// Form data type - HTML inputs return strings for dates
type DepositFormData = Omit<RecordDepositInput, 'depositDate'> & {
  depositDate: string
}

export function RecordDepositDialog({ onSuccess, onCancel }: RecordDepositDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DepositFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(RecordDepositSchema) as any,
    defaultValues: {
      depositDate: new Date().toISOString().split('T')[0],
    },
  })

  const onSubmit = async (formData: DepositFormData) => {
    setIsSubmitting(true)

    try {
      // Convert string date to Date object
      const input: RecordDepositInput = {
        amount: formData.amount,
        depositDate: new Date(formData.depositDate),
        notes: formData.notes,
      }

      const result = await recordCashDeposit(input)

      if (!result.success) {
        toast.error(result.error || 'Failed to record deposit')
      } else {
        toast.success('Deposit recorded successfully!')
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" aria-label="Record deposit form">
      <div className="space-y-4">
        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-neutral-700">
            Deposit Amount <span className="text-error" aria-hidden="true">*</span>
          </label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            wrapperClassName="mt-1"
            error={errors.amount?.message}
            required
            aria-required="true"
            placeholder="1000.00"
            {...register('amount', { valueAsNumber: true })}
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter the amount you&apos;re depositing into your trading account
          </p>
        </div>

        {/* Deposit Date */}
        <div>
          <label htmlFor="depositDate" className="block text-sm font-medium text-neutral-700">
            Deposit Date <span className="text-error" aria-hidden="true">*</span>
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
          <p className="mt-1 text-xs text-gray-500">
            SPY price will be fetched for this date to calculate benchmark shares
          </p>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-neutral-700">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Add any notes about this deposit..."
            {...register('notes')}
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-error" role="alert">
              {errors.notes.message}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Recording...' : 'Record Deposit'}
        </Button>
      </div>
    </form>
  )
}

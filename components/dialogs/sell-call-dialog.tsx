'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/design-system/input/input'
import { Button } from '@/components/design-system/button/button'
import { SellCallSchema, type SellCallInput } from '@/lib/validations/sell-call'
import { createTrade } from '@/lib/actions/trades'
import { suggestCallStrike } from '@/lib/calculations/wheel'
import {
  validateStrikePrice,
  validatePositionState,
  type ValidationResult,
} from '@/lib/validations/wheel'

/**
 * Position data required for the sell call dialog
 */
export interface SellCallPosition {
  id: string
  ticker: string
  shares: number
  costBasis: number
  status: 'OPEN' | 'CLOSED'
  coveredCalls?: Array<{ status: string }>
}

export interface SellCallDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean

  /**
   * Handler to close the dialog
   */
  onClose: () => void

  /**
   * Position to sell covered call against
   */
  position: SellCallPosition

  /**
   * Callback when call is successfully created
   */
  onSuccess?: () => void

  /**
   * Desired return percentage for strike suggestion (default: 5%)
   */
  desiredReturn?: number
}

/**
 * Form data type - HTML inputs return strings for dates
 */
type SellCallFormData = Omit<SellCallInput, 'expirationDate'> & {
  expirationDate: string
}

/**
 * Sell Covered Call Dialog
 *
 * Guided dialog for selling covered calls with pre-filled position data.
 * Validates strike price against cost basis and prevents multiple open calls.
 *
 * Features:
 * - Pre-fills ticker, position, shares from context
 * - Validates strike price vs cost basis (warns if below)
 * - Prevents multiple open CALLs on same position
 * - Suggests profitable strike prices
 * - Links CALL to position automatically
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false)
 * const position = {
 *   id: 'pos_123',
 *   ticker: 'AAPL',
 *   shares: 100,
 *   costBasis: 147.50,
 *   status: 'OPEN',
 *   coveredCalls: []
 * }
 *
 * <SellCallDialog
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   position={position}
 *   onSuccess={() => {
 *     toast.success('Covered call created!')
 *     setIsOpen(false)
 *   }}
 * />
 * ```
 */
export function SellCallDialog({
  isOpen,
  onClose,
  position,
  onSuccess,
  desiredReturn = 5,
}: SellCallDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [strikePriceValidation, setStrikePriceValidation] = useState<ValidationResult | null>(
    null
  )

  // Calculate suggested strike price
  const suggestedStrike = useMemo(() => {
    return suggestCallStrike({ costBasis: position.costBasis }, desiredReturn)
  }, [position.costBasis, desiredReturn])

  // Count open calls on this position
  const openCallsCount = useMemo(() => {
    return position.coveredCalls?.filter((call) => call.status === 'OPEN').length ?? 0
  }, [position.coveredCalls])

  // Validate position state
  const positionValidation = useMemo(() => {
    return validatePositionState({
      positionId: position.id,
      positionStatus: position.status,
      openCallsCount,
    })
  }, [position.id, position.status, openCallsCount])

  // Calculate contracts from shares
  const contracts = Math.floor(position.shares / 100)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<SellCallFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(SellCallSchema) as any,
    defaultValues: {
      positionId: position.id,
      strikePrice: Number(suggestedStrike.toFixed(2)),
      expirationDate: '',
      notes: '',
    },
  })

  // Watch strike price for real-time validation
  const strikePrice = watch('strikePrice')

  // Validate strike price whenever it changes
  useEffect(() => {
    if (strikePrice && !isNaN(strikePrice)) {
      const validation = validateStrikePrice({
        callStrike: strikePrice,
        positionCostBasis: position.costBasis,
      })
      setStrikePriceValidation(validation)
    } else {
      setStrikePriceValidation(null)
    }
  }, [strikePrice, position.costBasis])

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      reset({
        positionId: position.id,
        strikePrice: Number(suggestedStrike.toFixed(2)),
        expirationDate: '',
        notes: '',
      })
      setStrikePriceValidation(null)
    }
  }, [isOpen, position.id, suggestedStrike, reset])

  const onSubmit = async (formData: SellCallFormData) => {
    // Check position validation before submitting
    if (!positionValidation.valid) {
      toast.error(positionValidation.errors[0] || 'Cannot sell call on this position')
      return
    }

    setIsSubmitting(true)

    try {
      // Create CALL trade linked to position
      const result = await createTrade({
        ticker: position.ticker,
        type: 'CALL',
        action: 'SELL_TO_OPEN',
        strikePrice: formData.strikePrice,
        premium: formData.premium,
        contracts: contracts,
        expirationDate: new Date(formData.expirationDate),
        openDate: new Date(),
        notes: formData.notes,
        positionId: formData.positionId,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to create covered call')
      } else {
        toast.success('Covered call created successfully!')
        reset()
        onSuccess?.()
        onClose()
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Sell Covered Call" maxWidth="2xl">
      {/* Position validation errors */}
      {!positionValidation.valid && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800 font-medium">Cannot sell covered call:</p>
          <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
            {positionValidation.errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Position summary */}
      <div className="mb-6 p-4 bg-neutral-50 rounded-md border border-neutral-200">
        <h4 className="text-sm font-medium text-neutral-900 mb-2">Position Summary</h4>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-neutral-500">Ticker</dt>
            <dd className="font-medium text-neutral-900">{position.ticker}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Shares</dt>
            <dd className="font-medium text-neutral-900">{position.shares}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Cost Basis</dt>
            <dd className="font-medium text-neutral-900">
              ${position.costBasis.toFixed(2)} per share
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Contracts</dt>
            <dd className="font-medium text-neutral-900">{contracts}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
              helpText={`Suggested: $${suggestedStrike.toFixed(2)} (${desiredReturn}% return)`}
              {...register('strikePrice', { valueAsNumber: true })}
            />
            {/* Strike price warnings */}
            {strikePriceValidation && strikePriceValidation.warnings.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-800">
                  <span className="font-medium">⚠️ Warning:</span>{' '}
                  {strikePriceValidation.warnings[0]}
                </p>
              </div>
            )}
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
              helpText={`Total premium for ${contracts} contract(s)`}
              {...register('premium', { valueAsNumber: true })}
            />
          </div>

          {/* Expiration Date */}
          <div className="sm:col-span-2">
            <label htmlFor="expirationDate" className="block text-sm font-medium text-neutral-700">
              Expiration Date <span className="text-error">*</span>
            </label>
            <Input
              id="expirationDate"
              type="date"
              wrapperClassName="mt-1"
              error={errors.expirationDate?.message}
              helpText="Select an expiration date for the call option"
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
            Add any additional information about this covered call
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-neutral-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting || !positionValidation.valid}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Creating Call...' : 'Sell Covered Call'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

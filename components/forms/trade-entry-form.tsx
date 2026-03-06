'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { CreateTradeSchema, type CreateTradeInput } from '@/lib/validations/trade'
import { createTrade } from '@/lib/actions/trades'
import { getTradeUsage, type TradeUsage } from '@/lib/actions/subscription'
import {
  getOpenPositionsForTicker,
  getActiveWheelForTicker,
  type OpenPositionForForm,
  type ActiveWheelForForm,
} from '@/lib/actions/wheel-queries'
import { Input } from '@/components/design-system/input/input'
import { Select } from '@/components/design-system/select/select'
import { Button } from '@/components/design-system/button/button'
import { InfoTooltip } from '@/components/ui/tooltip'
import { UpgradePrompt } from '@/components/trades/upgrade-prompt'
import { TradeUsageBanner } from '@/components/trades/trade-usage-banner'

export interface TradeEntryFormPrefill {
  ticker?: string
  type?: 'PUT' | 'CALL'
  action?: 'SELL_TO_OPEN' | 'BUY_TO_CLOSE'
  positionId?: string
  contracts?: number
}

export interface TradeEntryFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  prefill?: TradeEntryFormPrefill
  readOnlyFields?: ('ticker' | 'type' | 'action' | 'positionId' | 'contracts')[]
}

// Form data type - HTML inputs return strings for dates
type TradeFormData = Omit<CreateTradeInput, 'expirationDate' | 'openDate'> & {
  expirationDate: string
  openDate?: string
}

export function TradeEntryForm({ onSuccess, onCancel, prefill, readOnlyFields }: TradeEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tradeUsage, setTradeUsage] = useState<TradeUsage | null>(null)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)

  // Wheel/position state for context-aware form
  const [positions, setPositions] = useState<OpenPositionForForm[]>([])
  const [activeWheel, setActiveWheel] = useState<ActiveWheelForForm | null>(null)
  const [isLoadingPositions, setIsLoadingPositions] = useState(false)
  const [multiplePositionsWarning, setMultiplePositionsWarning] = useState(false)

  useEffect(() => {
    getTradeUsage().then((result) => {
      if (result.success) {
        setTradeUsage(result.data)
        if (result.data.limitReached) {
          setShowUpgradePrompt(true)
        }
      }
    })
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<TradeFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(CreateTradeSchema) as any,
    defaultValues: {
      action: prefill?.action ?? 'SELL_TO_OPEN',
      ticker: prefill?.ticker ?? '',
      type: prefill?.type ?? undefined,
      contracts: prefill?.contracts ?? undefined,
      openDate: new Date().toISOString().split('T')[0],
    },
  })

  const watchedTicker = watch('ticker')
  const watchedType = watch('type')
  const watchedAction = watch('action')

  // Apply prefill values on mount
  useEffect(() => {
    if (prefill) {
      if (prefill.ticker) setValue('ticker', prefill.ticker)
      if (prefill.type) setValue('type', prefill.type)
      if (prefill.action) setValue('action', prefill.action)
      if (prefill.positionId) setValue('positionId', prefill.positionId)
      if (prefill.contracts) setValue('contracts', prefill.contracts)
    }
  }, [prefill, setValue])

  // Fetch wheel/position data when ticker, type, or action changes
  const fetchWheelData = useCallback(
    async (ticker: string, type: string | undefined, action: string | undefined) => {
      const normalizedTicker = ticker.trim().toUpperCase()
      if (!normalizedTicker) {
        setPositions([])
        setActiveWheel(null)
        return
      }

      // Fetch wheel info for any SELL_TO_OPEN trade
      if (action === 'SELL_TO_OPEN') {
        const wheelResult = await getActiveWheelForTicker(normalizedTicker)
        if (wheelResult.success) {
          setActiveWheel(wheelResult.data)
        }
      } else {
        setActiveWheel(null)
      }

      // Fetch positions only for CALL + SELL_TO_OPEN
      if (type === 'CALL' && action === 'SELL_TO_OPEN') {
        setIsLoadingPositions(true)
        const posResult = await getOpenPositionsForTicker(normalizedTicker)
        if (posResult.success) {
          setPositions(posResult.data)
          setMultiplePositionsWarning(posResult.data.length > 1)
          // Auto-select if exactly one position and no prefill positionId
          if (posResult.data.length === 1 && !prefill?.positionId) {
            setValue('positionId', posResult.data[0].id)
          }
        }
        setIsLoadingPositions(false)
      } else {
        setPositions([])
        setMultiplePositionsWarning(false)
      }
    },
    [prefill?.positionId, setValue]
  )

  useEffect(() => {
    const ticker = watchedTicker ?? ''
    if (!ticker) {
      setPositions([])
      setActiveWheel(null)
      return
    }

    const timer = setTimeout(() => {
      fetchWheelData(ticker, watchedType, watchedAction)
    }, 300)

    return () => clearTimeout(timer)
  }, [watchedTicker, watchedType, watchedAction, fetchWheelData])

  const onSubmit = async (formData: TradeFormData) => {
    setIsSubmitting(true)

    try {
      // The schema will coerce string dates to Date objects automatically
      const result = await createTrade(formData as unknown as CreateTradeInput)

      if (!result.success) {
        if (result.error === 'FREE_TIER_LIMIT_REACHED') {
          setShowUpgradePrompt(true)
          return
        }
        toast.error(result.error || 'Failed to create trade')
      } else {
        const data = result.data as { id: string; wheelId?: string; wheelTicker?: string }
        if (data.wheelId && data.wheelTicker) {
          toast.success(`Trade created and linked to ${data.wheelTicker} wheel!`)
        } else {
          toast.success('Trade created successfully!')
        }
        reset()
        onSuccess?.()
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isReadOnly = (field: 'ticker' | 'type' | 'action' | 'positionId' | 'contracts') =>
    readOnlyFields?.includes(field) ?? false

  if (showUpgradePrompt) {
    return <UpgradePrompt tradesUsed={tradeUsage?.tradesUsed} onCancel={onCancel} />
  }

  const normalizedTicker = (watchedTicker ?? '').trim().toUpperCase()

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" aria-label="Trade entry form">
      {tradeUsage && <TradeUsageBanner usage={tradeUsage} />}

      {/* Wheel badge — shown when SELL_TO_OPEN and ticker has been entered */}
      {watchedAction === 'SELL_TO_OPEN' && normalizedTicker && (
        activeWheel ? (
          <div className="rounded-md bg-green-50 p-3 border border-green-200">
            <p className="text-sm text-green-800">
              This trade will be added to your <strong>{activeWheel.ticker}</strong> wheel
              (Cycle {activeWheel.cycleCount + 1}).
            </p>
          </div>
        ) : (
          <div className="rounded-md bg-blue-50 p-3 border border-blue-200">
            <p className="text-sm text-blue-800">
              A new wheel will be created for <strong>{normalizedTicker}</strong>.
            </p>
          </div>
        )
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Ticker */}
        <div>
          <label htmlFor="ticker" className="block text-sm font-medium text-neutral-700">
            Ticker Symbol{' '}
            <span className="text-error" aria-hidden="true">
              *
            </span>
          </label>
          <Input
            id="ticker"
            type="text"
            maxLength={5}
            wrapperClassName="mt-1"
            className="uppercase"
            error={errors.ticker?.message}
            required
            aria-required="true"
            disabled={isReadOnly('ticker')}
            {...register('ticker')}
          />
        </div>

        {/* Trade Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-neutral-700">
            Trade Type{' '}
            <span className="text-error" aria-hidden="true">
              *
            </span>
            <InfoTooltip
              content="PUT = Right to sell shares at strike price. CALL = Right to buy shares at strike price. For the wheel strategy, start by selling PUTs."
              position="top"
            />
          </label>
          <Select
            id="type"
            wrapperClassName="mt-1"
            error={errors.type?.message}
            required
            aria-required="true"
            disabled={isReadOnly('type')}
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
            Trade Action{' '}
            <span className="text-error" aria-hidden="true">
              *
            </span>
            <InfoTooltip
              content="SELL TO OPEN = Opening a new position (collecting premium). BUY TO CLOSE = Closing an existing position early (paying premium)."
              position="top"
            />
          </label>
          <Select
            id="action"
            wrapperClassName="mt-1"
            error={errors.action?.message}
            required
            aria-required="true"
            disabled={isReadOnly('action')}
            {...register('action')}
          >
            <option value="SELL_TO_OPEN">Sell to Open</option>
            <option value="BUY_TO_CLOSE">Buy to Close</option>
          </Select>
        </div>

        {/* Strike Price */}
        <div>
          <label htmlFor="strikePrice" className="block text-sm font-medium text-neutral-700">
            Strike Price{' '}
            <span className="text-error" aria-hidden="true">
              *
            </span>
            <InfoTooltip
              content="The price at which the option can be exercised. For PUTs, you'll buy shares at this price if assigned. Choose a strike you're comfortable owning the stock at."
              position="top"
            />
          </label>
          <Input
            id="strikePrice"
            type="number"
            step="0.01"
            min="0"
            wrapperClassName="mt-1"
            prefix={<span className="text-neutral-500 sm:text-sm">$</span>}
            error={errors.strikePrice?.message}
            required
            aria-required="true"
            {...register('strikePrice', { valueAsNumber: true })}
          />
        </div>

        {/* Premium */}
        <div>
          <label htmlFor="premium" className="block text-sm font-medium text-neutral-700">
            Premium (Total){' '}
            <span className="text-error" aria-hidden="true">
              *
            </span>
            <InfoTooltip
              content="Total premium collected or paid across all contracts. Example: If you collect $2.50 per share on 1 contract, enter $250 (2.50 × 100 shares)."
              position="top"
            />
          </label>
          <Input
            id="premium"
            type="number"
            step="0.01"
            min="0"
            wrapperClassName="mt-1"
            prefix={<span className="text-neutral-500 sm:text-sm">$</span>}
            error={errors.premium?.message}
            required
            aria-required="true"
            {...register('premium', { valueAsNumber: true })}
          />
        </div>

        {/* Contracts */}
        <div>
          <label htmlFor="contracts" className="block text-sm font-medium text-neutral-700">
            Number of Contracts{' '}
            <span className="text-error" aria-hidden="true">
              *
            </span>
          </label>
          <Input
            id="contracts"
            type="number"
            min="1"
            step="1"
            wrapperClassName="mt-1"
            error={errors.contracts?.message}
            helpText="Each contract = 100 shares"
            required
            aria-required="true"
            disabled={isReadOnly('contracts')}
            {...register('contracts', { valueAsNumber: true })}
          />
        </div>

        {/* Entry Date */}
        <div>
          <label htmlFor="openDate" className="block text-sm font-medium text-neutral-700">
            Entry Date{' '}
            <span className="text-error" aria-hidden="true">
              *
            </span>
          </label>
          <Input
            id="openDate"
            type="date"
            wrapperClassName="mt-1"
            error={errors.openDate?.message}
            required
            aria-required="true"
            {...register('openDate')}
          />
        </div>

        {/* Expiration Date */}
        <div>
          <label htmlFor="expirationDate" className="block text-sm font-medium text-neutral-700">
            Expiration Date{' '}
            <span className="text-error" aria-hidden="true">
              *
            </span>
            <InfoTooltip
              content="The date when the option expires. Best practice: 30-45 days out for optimal theta decay. Options closer to expiration decay faster but carry more risk."
              position="top"
            />
          </label>
          <Input
            id="expirationDate"
            type="date"
            wrapperClassName="mt-1"
            error={errors.expirationDate?.message}
            required
            aria-required="true"
            {...register('expirationDate')}
          />
        </div>

        {/* Position Selector — only shown for CALL + SELL_TO_OPEN */}
        {watchedType === 'CALL' && watchedAction === 'SELL_TO_OPEN' && (
          <div className="col-span-1 sm:col-span-2">
            <label htmlFor="positionId" className="block text-sm font-medium text-neutral-700">
              Position
            </label>
            {isLoadingPositions ? (
              <p className="mt-1 text-sm text-neutral-500">Loading positions...</p>
            ) : positions.length > 0 ? (
              <div className="mt-1">
                <Select
                  id="positionId"
                  error={errors.positionId?.message}
                  disabled={isReadOnly('positionId')}
                  {...register('positionId')}
                >
                  <option value="">Select a position</option>
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.id} disabled={pos.hasOpenCall}>
                      {pos.shares} shares @ ${pos.costBasis.toFixed(2)}/share (acquired{' '}
                      {new Date(pos.acquiredDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}){pos.hasOpenCall ? ' [Has Open Call]' : ''}
                    </option>
                  ))}
                </Select>
                {multiplePositionsWarning && (
                  <p className="mt-1 text-xs text-yellow-600">
                    Multiple positions found for this ticker. Please select the correct one.
                  </p>
                )}
              </div>
            ) : normalizedTicker ? (
              <p className="mt-1 text-sm text-neutral-500">
                No open positions found for {normalizedTicker}.
              </p>
            ) : null}
          </div>
        )}
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

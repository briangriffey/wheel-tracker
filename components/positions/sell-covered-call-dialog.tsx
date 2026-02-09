'use client'

import React, { useState, useEffect } from 'react'
import { createTrade } from '@/lib/actions/trades'
import { fetchCurrentStockPrice } from '@/lib/actions/stock-price'
import { formatCurrency } from '@/lib/utils/position-calculations'
import toast from 'react-hot-toast'

export interface SellCoveredCallDialogProps {
  position: {
    id: string
    ticker: string
    shares: number
    costBasis: number
    totalCost: number
    acquiredDate: Date
    coveredCalls?: Array<{
      id: string
      status: string
    }>
  }
  wheelId?: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function SellCoveredCallDialog({
  position,
  wheelId,
  isOpen,
  onClose,
  onSuccess,
}: SellCoveredCallDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [isPriceLoading, setIsPriceLoading] = useState(true)
  const [priceError, setPriceError] = useState<string | null>(null)

  // Form fields
  const [strikePrice, setStrikePrice] = useState<string>('')
  const [premium, setPremium] = useState<string>('')
  const [expirationDate, setExpirationDate] = useState<string>('')

  // Calculate contracts from shares
  const contracts = position.shares / 100

  // Check if position already has an OPEN covered call
  const hasOpenCall = position.coveredCalls?.some((call) => call.status === 'OPEN')

  // Fetch current stock price when dialog opens
  useEffect(() => {
    if (!isOpen) return

    const loadPrice = async () => {
      setIsPriceLoading(true)
      setPriceError(null)

      try {
        const result = await fetchCurrentStockPrice(position.ticker)
        if (result.success) {
          setCurrentPrice(result.price)
          // Suggest a strike price 2-3% above current price
          const suggestedStrike = Math.ceil(result.price * 1.025)
          setStrikePrice(suggestedStrike.toString())
        } else {
          setPriceError(result.error || 'Failed to fetch current price')
        }
      } catch (error) {
        console.error('Error fetching stock price:', error)
        setPriceError('Failed to fetch current price')
      } finally {
        setIsPriceLoading(false)
      }
    }

    loadPrice()
  }, [isOpen, position.ticker])

  // Calculate if strike will result in gain or loss
  const strikePriceNum = parseFloat(strikePrice)
  const premiumNum = parseFloat(premium)

  const isValidStrike = !isNaN(strikePriceNum) && strikePriceNum > 0
  const isValidPremium = !isNaN(premiumNum) && premiumNum > 0

  const willRealizeLoss = isValidStrike && strikePriceNum < position.costBasis
  const willRealizeGain = isValidStrike && strikePriceNum >= position.costBasis

  // Calculate potential profit if assigned
  let potentialProfit = 0
  if (isValidStrike && isValidPremium) {
    const stockGain = (strikePriceNum - position.costBasis) * position.shares
    potentialProfit = stockGain + premiumNum
  }

  // Generate suggested strike prices
  const suggestedStrikes = currentPrice
    ? [
        { price: Math.ceil(currentPrice * 1.02), label: '2% OTM' },
        { price: Math.ceil(currentPrice * 1.03), label: '3% OTM' },
        { price: Math.ceil(currentPrice * 1.05), label: '5% OTM' },
      ]
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValidStrike || !isValidPremium || !expirationDate) {
      toast.error('Please fill in all required fields')
      return
    }

    if (hasOpenCall) {
      toast.error('Position already has an open covered call')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createTrade({
        ticker: position.ticker,
        type: 'CALL',
        action: 'SELL_TO_OPEN',
        strikePrice: strikePriceNum,
        premium: premiumNum,
        contracts,
        expirationDate: new Date(expirationDate),
        positionId: position.id,
        ...(wheelId && { wheelId }),
      })

      if (result.success) {
        toast.success('Covered call created successfully!')
        onSuccess()
        onClose()
      } else {
        toast.error(result.error || 'Failed to create covered call')
      }
    } catch (error) {
      console.error('Error creating covered call:', error)
      toast.error('Failed to create covered call')
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
                Sell Covered Call on {position.ticker}
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
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Blocking Error - Position already has OPEN call */}
            {hasOpenCall && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">
                      <strong>Cannot proceed:</strong> This position already has an open covered call.
                      You must wait for it to expire, be assigned, or close it before creating a new one.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Position Details */}
            <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                Position Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Ticker:</span>
                  <span className="ml-2 font-semibold text-gray-900">{position.ticker}</span>
                </div>
                <div>
                  <span className="text-gray-600">Shares:</span>
                  <span className="ml-2 font-semibold text-gray-900">{position.shares}</span>
                </div>
                <div>
                  <span className="text-gray-600">Cost Basis:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {formatCurrency(position.costBasis)}/share
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Contracts:</span>
                  <span className="ml-2 font-semibold text-gray-900">{contracts}</span>
                </div>
              </div>
            </div>

            {/* Current Market Price */}
            {isPriceLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
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
                <span>Loading current price...</span>
              </div>
            ) : priceError ? (
              <div className="text-sm text-red-600">{priceError}</div>
            ) : currentPrice ? (
              <div className="rounded-md bg-blue-50 p-3 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Current Price:</strong> {formatCurrency(currentPrice)}
                </p>
              </div>
            ) : null}

            {/* Suggested Strikes */}
            {suggestedStrikes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suggested Strike Prices
                </label>
                <div className="flex gap-2">
                  {suggestedStrikes.map((strike) => (
                    <button
                      key={strike.price}
                      type="button"
                      onClick={() => setStrikePrice(strike.price.toString())}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {formatCurrency(strike.price)}
                      <span className="block text-xs text-gray-500">{strike.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Strike Price Input */}
            <div>
              <label htmlFor="strikePrice" className="block text-sm font-medium text-gray-700 mb-1">
                Strike Price <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="strikePrice"
                value={strikePrice}
                onChange={(e) => setStrikePrice(e.target.value)}
                step="0.01"
                min="0.01"
                required
                disabled={hasOpenCall}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., 155.00"
              />
            </div>

            {/* Strike Price Validation Warnings */}
            {willRealizeLoss && (
              <div className="rounded-md bg-yellow-50 p-3 border border-yellow-200">
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
                      <strong>Warning:</strong> Strike price ({formatCurrency(strikePriceNum)}) is
                      below your cost basis ({formatCurrency(position.costBasis)}). If assigned, you
                      will realize a loss on the stock position.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {willRealizeGain && (
              <div className="rounded-md bg-green-50 p-3 border border-green-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">
                      <strong>Good:</strong> Strike price ({formatCurrency(strikePriceNum)}) is above
                      your cost basis ({formatCurrency(position.costBasis)}). If assigned, you will
                      realize a gain of{' '}
                      {formatCurrency((strikePriceNum - position.costBasis) * position.shares)}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Premium Input */}
            <div>
              <label htmlFor="premium" className="block text-sm font-medium text-gray-700 mb-1">
                Premium (Total) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="premium"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                step="0.01"
                min="0.01"
                required
                disabled={hasOpenCall}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., 250.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Total premium collected for {contracts} contract(s)
              </p>
            </div>

            {/* Expiration Date Input */}
            <div>
              <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                id="expirationDate"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                disabled={hasOpenCall}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Potential Profit Summary */}
            {isValidStrike && isValidPremium && (
              <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">
                  If Assigned
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sale Proceeds:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(strikePriceNum * position.shares)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Call Premium:</span>
                    <span className="font-medium text-green-600">+{formatCurrency(premiumNum)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Stock Gain/Loss (vs {formatCurrency(position.costBasis)} cost):
                    </span>
                    <span
                      className={`font-medium ${
                        strikePriceNum >= position.costBasis ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {strikePriceNum >= position.costBasis ? '+' : ''}
                      {formatCurrency((strikePriceNum - position.costBasis) * position.shares)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between">
                    <span className="font-semibold text-gray-700">Total Potential Profit:</span>
                    <span
                      className={`text-lg font-bold ${
                        potentialProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {potentialProfit >= 0 ? '+' : ''}
                      {formatCurrency(potentialProfit)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Wheel Info */}
            {wheelId && (
              <div className="rounded-md bg-green-50 p-3 border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>Wheel Strategy:</strong> This covered call will be linked to your wheel for{' '}
                  {position.ticker}.
                </p>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              type="button"
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || hasOpenCall}
              type="button"
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
                  Creating...
                </span>
              ) : (
                'Create Covered Call'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

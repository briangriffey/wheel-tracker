'use client'

import React, { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import type { Trade } from '@/lib/generated/prisma'
import { Prisma } from '@/lib/generated/prisma'
import type { PriceData } from '@/lib/actions/prices'
import { calculateOptionMoneyness, getMoneynessColor } from '@/lib/calculations/option-moneyness'
import { batchMarkExpired, batchMarkAssigned } from '@/lib/actions/batch-trades'

interface ExpirationCalendarProps {
  groupedTrades: Map<string, Trade[]>
  prices: Record<string, PriceData>
}

export function ExpirationCalendar({ groupedTrades, prices }: ExpirationCalendarProps) {
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  // Convert Map to sorted array for rendering
  const sortedGroups = useMemo(() => {
    return Array.from(groupedTrades.entries()).sort(([dateA], [dateB]) =>
      dateA.localeCompare(dateB)
    )
  }, [groupedTrades])

  // Helper to safely convert Prisma Decimal to number
  const toDecimalNumber = (value: Prisma.Decimal | number | string): number => {
    if (value && typeof value === 'object' && 'toNumber' in value) {
      return (value as Prisma.Decimal).toNumber()
    }
    return Number(value)
  }

  // Format currency
  const formatCurrency = (value: Prisma.Decimal | number | string) => {
    return `$${toDecimalNumber(value).toFixed(2)}`
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Normalize to date only (no time)
    today.setHours(0, 0, 0, 0)
    tomorrow.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)

    if (date.getTime() === today.getTime()) {
      return 'Today'
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
  }

  // Calculate days until expiration
  const getDaysUntil = (dateString: string): number => {
    const date = new Date(dateString)
    const today = new Date()
    date.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Get type badge color
  const getTypeColor = (type: 'PUT' | 'CALL') => {
    return type === 'PUT' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'
  }

  // Toggle trade selection
  const toggleTrade = (tradeId: string) => {
    const newSelection = new Set(selectedTrades)
    if (newSelection.has(tradeId)) {
      newSelection.delete(tradeId)
    } else {
      newSelection.add(tradeId)
    }
    setSelectedTrades(newSelection)
  }

  // Toggle all trades in a group
  const toggleGroup = (trades: Trade[]) => {
    const tradeIds = trades.map((t) => t.id)
    const allSelected = tradeIds.every((id) => selectedTrades.has(id))

    const newSelection = new Set(selectedTrades)
    if (allSelected) {
      // Deselect all
      tradeIds.forEach((id) => newSelection.delete(id))
    } else {
      // Select all
      tradeIds.forEach((id) => newSelection.add(id))
    }
    setSelectedTrades(newSelection)
  }

  // Handle batch mark as expired
  const handleBatchExpired = async () => {
    if (selectedTrades.size === 0) {
      toast.error('Please select trades to mark as expired')
      return
    }

    if (!confirm(`Mark ${selectedTrades.size} trade(s) as expired?`)) {
      return
    }

    setIsProcessing(true)
    try {
      const result = await batchMarkExpired(Array.from(selectedTrades))

      if (result.success) {
        const { successCount, failedCount, errors } = result.data

        if (successCount > 0) {
          toast.success(`Successfully marked ${successCount} trade(s) as expired`)
        }

        if (failedCount > 0) {
          const errorMessages = errors.map((e) => `${e.tradeId}: ${e.error}`).join(', ')
          toast.error(`Failed to update ${failedCount} trade(s): ${errorMessages}`)
        }

        // Clear selection and refresh
        setSelectedTrades(new Set())
        window.location.reload()
      } else {
        toast.error(result.error || 'Failed to mark trades as expired')
      }
    } catch (error) {
      console.error('Error in batch expired:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle batch mark as assigned
  const handleBatchAssigned = async () => {
    if (selectedTrades.size === 0) {
      toast.error('Please select trades to mark as assigned')
      return
    }

    if (!confirm(`Mark ${selectedTrades.size} trade(s) as assigned?`)) {
      return
    }

    setIsProcessing(true)
    try {
      const result = await batchMarkAssigned(Array.from(selectedTrades))

      if (result.success) {
        const { successCount, failedCount, errors } = result.data

        if (successCount > 0) {
          toast.success(`Successfully marked ${successCount} trade(s) as assigned`)
        }

        if (failedCount > 0) {
          const errorMessages = errors.map((e) => `${e.tradeId}: ${e.error}`).join(', ')
          toast.error(`Failed to update ${failedCount} trade(s): ${errorMessages}`)
        }

        // Clear selection and refresh
        setSelectedTrades(new Set())
        window.location.reload()
      } else {
        toast.error(result.error || 'Failed to mark trades as assigned')
      }
    } catch (error) {
      console.error('Error in batch assigned:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  // Calculate moneyness for a trade
  const getMoneyness = (trade: Trade) => {
    const priceData = prices[trade.ticker]
    if (!priceData) {
      return { status: 'OTM' as const, message: 'No price data' }
    }

    const strikePrice = toDecimalNumber(
      trade.strikePrice as unknown as Prisma.Decimal | string | number
    )
    const result = calculateOptionMoneyness(priceData.price, strikePrice, trade.type)

    return {
      status: result.status,
      message: `$${priceData.price.toFixed(2)} vs $${strikePrice.toFixed(2)}`,
      intrinsicValue: result.intrinsicValue,
      percentageFromStrike: result.percentageFromStrike,
    }
  }

  // Empty state
  if (sortedGroups.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">No expiring trades</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don&apos;t have any options expiring in the next 30 days.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Batch Action Bar */}
      {selectedTrades.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sticky top-4 z-10 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                {selectedTrades.size}
              </div>
              <span className="text-gray-900 font-medium">
                {selectedTrades.size} trade{selectedTrades.size === 1 ? '' : 's'} selected
              </span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={handleBatchExpired}
                disabled={isProcessing}
                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Mark as Expired
              </button>
              <button
                onClick={handleBatchAssigned}
                disabled={isProcessing}
                className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Mark as Assigned
              </button>
              <button
                onClick={() => setSelectedTrades(new Set())}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expiration Groups */}
      {sortedGroups.map(([dateString, trades]) => {
        const daysUntil = getDaysUntil(dateString)
        const allGroupSelected = trades.every((t) => selectedTrades.has(t.id))
        const someGroupSelected = trades.some((t) => selectedTrades.has(t.id)) && !allGroupSelected

        return (
          <div key={dateString} className="bg-white rounded-lg shadow overflow-hidden">
            {/* Group Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allGroupSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = someGroupSelected
                      }
                    }}
                    onChange={() => toggleGroup(trades)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    aria-label={`Select all trades expiring ${formatDate(dateString)}`}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatDate(dateString)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {daysUntil === 0 && 'Expires today'}
                      {daysUntil === 1 && 'Expires tomorrow'}
                      {daysUntil > 1 && `Expires in ${daysUntil} days`}
                      {daysUntil < 0 &&
                        `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} ago`}
                    </p>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {trades.length} trade{trades.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            {/* Trades List - Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Strike
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Premium
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trades.map((trade) => {
                    const moneyness = getMoneyness(trade)
                    const moneynessColors = getMoneynessColor(moneyness.status)

                    return (
                      <tr
                        key={trade.id}
                        className={`hover:bg-gray-50 cursor-pointer ${selectedTrades.has(trade.id) ? 'bg-blue-50' : ''}`}
                        onClick={() => toggleTrade(trade.id)}
                      >
                        <td
                          className="px-6 py-4 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTrades.has(trade.id)}
                            onChange={() => toggleTrade(trade.id)}
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            aria-label={`Select ${trade.ticker} ${trade.type}`}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {trade.ticker}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(trade.type)}`}
                          >
                            {trade.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(
                            trade.strikePrice as unknown as Prisma.Decimal | string | number
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(
                            trade.premium as unknown as Prisma.Decimal | string | number
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {prices[trade.ticker]
                            ? `$${prices[trade.ticker].price.toFixed(2)}`
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${moneynessColors.bg} ${moneynessColors.text}`}
                          >
                            {moneyness.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Trades List - Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {trades.map((trade) => {
                const moneyness = getMoneyness(trade)
                const moneynessColors = getMoneynessColor(moneyness.status)

                return (
                  <div
                    key={trade.id}
                    className={`p-4 ${selectedTrades.has(trade.id) ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTrades.has(trade.id)}
                        onChange={() => toggleTrade(trade.id)}
                        className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Select ${trade.ticker} ${trade.type}`}
                      />
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-base font-semibold text-gray-900">
                              {trade.ticker}
                            </h4>
                            <div className="flex gap-2 mt-1">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(trade.type)}`}
                              >
                                {trade.type}
                              </span>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${moneynessColors.bg} ${moneynessColors.text}`}
                              >
                                {moneyness.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Strike:</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(
                                trade.strikePrice as unknown as Prisma.Decimal | string | number
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Premium:</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(
                                trade.premium as unknown as Prisma.Decimal | string | number
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Current Price:</span>
                            <span className="font-medium text-gray-900">
                              {prices[trade.ticker]
                                ? `$${prices[trade.ticker].price.toFixed(2)}`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Contracts:</span>
                            <span className="font-medium text-gray-900">{trade.contracts}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

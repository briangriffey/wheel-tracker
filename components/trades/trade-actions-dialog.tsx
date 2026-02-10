'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { Trade } from '@/lib/generated/prisma'
import { Prisma } from '@/lib/generated/prisma'
import { deleteTrade, updateTradeStatus } from '@/lib/actions/trades'
import { getStatusColor } from '@/lib/design/colors'
import { Button } from '@/components/design-system/button/button'
import type { StockPriceResult } from '@/lib/services/market-data'

interface TradeActionsDialogProps {
  trade: Trade
  isOpen: boolean
  onClose: () => void
  currentPrice?: StockPriceResult
}

export function TradeActionsDialog({ trade, isOpen, onClose, currentPrice }: TradeActionsDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  if (!isOpen) return null

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
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Get type badge color
  const getTypeColor = (type: string) => {
    return type === 'PUT' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'
  }

  // Check if price is stale (older than 1 day)
  const isPriceStale = (date: Date) => {
    const dayInMs = 24 * 60 * 60 * 1000
    return Date.now() - new Date(date).getTime() > dayInMs
  }

  // Handle status update
  const handleStatusUpdate = async (status: 'EXPIRED' | 'ASSIGNED') => {
    setLoading(true)
    try {
      const result = await updateTradeStatus({ id: trade.id, status })
      if (result.success) {
        toast.success(`Trade marked as ${status.toLowerCase()}`)
        router.refresh()
        onClose()
      } else {
        toast.error(result.error || 'Failed to update trade status')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this trade?')) {
      return
    }

    setLoading(true)
    try {
      const result = await deleteTrade(trade.id)
      if (result.success) {
        toast.success('Trade deleted successfully')
        router.refresh()
        onClose()
      } else {
        toast.error(result.error || 'Failed to delete trade')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="dialog-title" className="text-2xl font-bold text-gray-900">
                  {trade.ticker}
                </h2>
                <div className="flex gap-2 mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(trade.type)}`}>
                    {trade.type}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trade.status).bg} ${getStatusColor(trade.status).text}`}>
                    {trade.status}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close dialog"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Current Price */}
            {currentPrice && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Current Price:</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-900">
                      ${currentPrice.price.toFixed(2)}
                    </span>
                    {isPriceStale(currentPrice.date) && (
                      <div className="text-xs text-blue-700">
                        as of {formatDate(currentPrice.date)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Trade Details */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Strike Price:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(trade.strikePrice as unknown as Prisma.Decimal | string | number)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Premium:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(trade.premium as unknown as Prisma.Decimal | string | number)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Contracts:</span>
                <span className="text-sm font-medium text-gray-900">{trade.contracts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Shares:</span>
                <span className="text-sm font-medium text-gray-900">{trade.shares}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Expiration:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(trade.expirationDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Open Date:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(trade.openDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer - Actions */}
          <div className="p-6 border-t border-gray-200 space-y-2">
            {/* View Details */}
            <Button
              onClick={() => {
                router.push(`/trades/${trade.id}`)
                onClose()
              }}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              View Full Details
            </Button>

            {/* Actions for OPEN trades */}
            {trade.status === 'OPEN' && (
              <>
                <Button
                  onClick={() => {
                    router.push(`/trades/${trade.id}`)
                    onClose()
                  }}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Close Early
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('EXPIRED')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Mark as Expired
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('ASSIGNED')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Mark as Assigned
                </Button>
                <div className="pt-2 border-t border-gray-200">
                  <Button
                    onClick={handleDelete}
                    disabled={loading}
                    variant="destructive"
                    className="w-full"
                  >
                    Delete Trade
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AssignPutDialog } from '@/components/trades/assign-put-dialog'
import { CloseOptionDialog } from '@/components/trades/close-option-dialog'
import { formatCurrency } from '@/lib/utils/format'

interface Trade {
  id: string
  ticker: string
  type: 'PUT' | 'CALL'
  action: 'SELL_TO_OPEN' | 'BUY_TO_CLOSE'
  status: 'OPEN' | 'CLOSED' | 'EXPIRED' | 'ASSIGNED'
  strikePrice: number
  premium: number
  contracts: number
  shares: number
  expirationDate: Date
  openDate: Date
  closeDate: Date | null
  notes: string | null
  wheelId: string | null
  position: {
    id: string
    ticker: string
    shares: number
    costBasis: number
    status: string
  } | null
  createdPosition: {
    id: string
    ticker: string
    shares: number
    costBasis: number
    status: string
  } | null
}

interface TradeDetailClientProps {
  trade: Trade
}

export function TradeDetailClient({ trade }: TradeDetailClientProps) {
  const router = useRouter()
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)

  const canAssign = trade.type === 'PUT' && trade.status === 'OPEN'
  const canClose = trade.status === 'OPEN'

  const handleAssignSuccess = () => {
    router.refresh()
  }

  const handleCloseSuccess = () => {
    router.refresh()
  }

  const handleSellCoveredCall = () => {
    // Navigate to new trade form with pre-filled data for covered call
    router.push(`/trades/new?type=CALL&ticker=${trade.ticker}&fromAssignment=true`)
  }

  // Determine status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-100 text-green-800'
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800'
      case 'EXPIRED':
        return 'bg-yellow-100 text-yellow-800'
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PUT':
        return 'bg-red-100 text-red-800'
      case 'CALL':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/trades"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Trades
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{trade.ticker}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeColor(trade.type)}`}>
                  {trade.type}
                </span>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(trade.status)}`}>
                  {trade.status}
                </span>
                <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                  {trade.action.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {canClose && (
                <button
                  onClick={() => setIsCloseDialogOpen(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  Close Early
                </button>
              )}
              {canAssign && (
                <button
                  onClick={() => setIsAssignDialogOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Assign PUT
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">Strike Price</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(trade.strikePrice)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Premium</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(trade.premium)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contracts</p>
              <p className="text-lg font-semibold text-gray-900">{trade.contracts}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Shares</p>
              <p className="text-lg font-semibold text-gray-900">{trade.shares}</p>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Trade Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Expiration Date:</span>
              <span className="font-medium text-gray-900">
                {new Date(trade.expirationDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Open Date:</span>
              <span className="font-medium text-gray-900">
                {new Date(trade.openDate).toLocaleDateString()}
              </span>
            </div>
            {trade.closeDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Close Date:</span>
                <span className="font-medium text-gray-900">
                  {new Date(trade.closeDate).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Premium per Share:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(trade.premium / trade.shares)}
              </span>
            </div>
            {trade.wheelId && (
              <div className="flex justify-between">
                <span className="text-gray-600">Wheel Strategy:</span>
                <Link
                  href={`/wheels/${trade.wheelId}`}
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  View Wheel
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Position Information */}
        {(trade.position || trade.createdPosition) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {trade.type === 'CALL' ? 'Associated Position' : 'Created Position'}
            </h2>
            {trade.createdPosition ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Position ID:</span>
                  <Link
                    href={`/positions/${trade.createdPosition.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    View Position
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shares:</span>
                  <span className="font-medium text-gray-900">{trade.createdPosition.shares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost Basis:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(trade.createdPosition.costBasis)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    trade.createdPosition.status === 'OPEN'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {trade.createdPosition.status}
                  </span>
                </div>
              </div>
            ) : trade.position ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Position ID:</span>
                  <Link
                    href={`/positions/${trade.position.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    View Position
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shares:</span>
                  <span className="font-medium text-gray-900">{trade.position.shares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost Basis:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(trade.position.costBasis)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    trade.position.status === 'OPEN'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {trade.position.status}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Notes */}
        {trade.notes && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{trade.notes}</p>
          </div>
        )}

        {/* Assign PUT Dialog */}
        <AssignPutDialog
          trade={{
            id: trade.id,
            ticker: trade.ticker,
            strikePrice: trade.strikePrice,
            premium: trade.premium,
            contracts: trade.contracts,
            shares: trade.shares,
            expirationDate: trade.expirationDate,
            status: trade.status,
            type: trade.type,
          }}
          wheelId={trade.wheelId}
          isOpen={isAssignDialogOpen}
          onClose={() => setIsAssignDialogOpen(false)}
          onSuccess={handleAssignSuccess}
          onSellCoveredCall={handleSellCoveredCall}
        />

        {/* Close Option Dialog */}
        <CloseOptionDialog
          tradeId={trade.id}
          ticker={trade.ticker}
          type={trade.type}
          strikePrice={trade.strikePrice}
          originalPremium={trade.premium}
          expirationDate={trade.expirationDate}
          contracts={trade.contracts}
          isOpen={isCloseDialogOpen}
          onClose={() => setIsCloseDialogOpen(false)}
          onSuccess={handleCloseSuccess}
        />
      </div>
    </div>
  )
}

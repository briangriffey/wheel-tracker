'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AssignPutDialog } from '@/components/trades/assign-put-dialog'

interface Trade {
  id: string
  ticker: string
  type: 'PUT' | 'CALL'
  action: 'SELL' | 'BUY'
  strikePrice: number
  premium: number
  contracts: number
  shares: number
  expirationDate: Date
  openDate: Date
  closeDate: Date | null
  status: string
  notes: string | null
  position: {
    id: string
    status: string
    ticker: string
    shares: number
    costBasis: number
  } | null
}

interface TradeDetailClientProps {
  trade: Trade
}

export function TradeDetailClient({ trade }: TradeDetailClientProps) {
  const router = useRouter()
  const [showAssignDialog, setShowAssignDialog] = useState(false)

  const canAssignPut = trade.type === 'PUT' && trade.status === 'OPEN'

  function handleAssignSuccess(positionId: string) {
    // Navigate to position detail page to sell covered call
    router.push(`/positions/${positionId}?action=sell-call`)
  }

  const statusColors: Record<string, string> = {
    OPEN: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    EXPIRED: 'bg-yellow-100 text-yellow-800',
    ASSIGNED: 'bg-blue-100 text-blue-800',
  }

  return (
    <>
      <div className="mb-6">
        <Link
          href="/trades"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M15 19l-7-7 7-7"></path>
          </svg>
          Back to Trades
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {trade.ticker} {trade.type}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {trade.action === 'SELL' ? 'Sold' : 'Bought'} on{' '}
                {new Date(trade.openDate).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[trade.status] || 'bg-gray-100 text-gray-800'}`}
            >
              {trade.status}
            </span>
          </div>
        </div>

        {/* Trade Details */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Option Details</h3>
                <dl className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Type:</dt>
                    <dd className="text-sm font-medium text-gray-900">{trade.type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Strike Price:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      ${trade.strikePrice.toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Premium:</dt>
                    <dd
                      className={`text-sm font-medium ${trade.action === 'SELL' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {trade.action === 'SELL' ? '+' : '-'}${trade.premium.toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Contracts:</dt>
                    <dd className="text-sm font-medium text-gray-900">{trade.contracts}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Shares:</dt>
                    <dd className="text-sm font-medium text-gray-900">{trade.shares}</dd>
                  </div>
                </dl>
              </div>

              {trade.position && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Linked Position</h3>
                  <div className="mt-2">
                    <Link
                      href={`/positions/${trade.position.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View Position ({trade.position.shares} shares of {trade.position.ticker})
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Dates</h3>
                <dl className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Open Date:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {new Date(trade.openDate).toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Expiration:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {new Date(trade.expirationDate).toLocaleDateString()}
                    </dd>
                  </div>
                  {trade.closeDate && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Close Date:</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {new Date(trade.closeDate).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

            </div>
          </div>

          {trade.notes && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{trade.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {canAssignPut && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={() => setShowAssignDialog(true)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Assign PUT Option
            </button>
          </div>
        )}
      </div>

      {/* Assign PUT Dialog */}
      {canAssignPut && (
        <AssignPutDialog
          trade={trade}
          isOpen={showAssignDialog}
          onClose={() => setShowAssignDialog(false)}
          onSuccess={handleAssignSuccess}
        />
      )}
    </>
  )
}

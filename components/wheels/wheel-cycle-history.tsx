'use client'

import { useState } from 'react'

interface Position {
  id: string
  shares: number
  costBasis: number
  totalCost: number
  status: string
  realizedGainLoss: number | null
  acquiredDate: Date
  closedDate: Date | null
}

interface WheelCycleHistoryProps {
  closedPositions: Position[]
}

export function WheelCycleHistory({ closedPositions }: WheelCycleHistoryProps) {
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null)

  if (closedPositions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No completed cycles yet</p>
      </div>
    )
  }

  // Sort positions by closed date (most recent first)
  const sortedPositions = [...closedPositions].sort((a, b) => {
    const dateA = a.closedDate ? new Date(a.closedDate).getTime() : 0
    const dateB = b.closedDate ? new Date(b.closedDate).getTime() : 0
    return dateB - dateA
  })

  return (
    <div className="space-y-3">
      {sortedPositions.map((position, index) => {
        const cycleNumber = closedPositions.length - index
        const isExpanded = expandedCycle === cycleNumber
        const duration =
          position.closedDate && position.acquiredDate
            ? Math.ceil(
                (new Date(position.closedDate).getTime() -
                  new Date(position.acquiredDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0

        return (
          <div key={position.id} className="bg-white shadow rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedCycle(isExpanded ? null : cycleNumber)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold">
                  {cycleNumber}
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-gray-900">Cycle {cycleNumber}</h4>
                  <p className="text-xs text-gray-500">
                    {new Date(position.acquiredDate).toLocaleDateString()} -{' '}
                    {position.closedDate
                      ? new Date(position.closedDate).toLocaleDateString()
                      : 'Open'}
                    {duration > 0 && <> • {duration} days</>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {position.realizedGainLoss !== null && (
                  <div
                    className={`text-right text-lg font-semibold ${
                      position.realizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {position.realizedGainLoss >= 0 ? '+' : ''}$
                    {position.realizedGainLoss.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                )}
                <svg
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    isExpanded ? 'transform rotate-180' : ''
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="px-6 pb-4 border-t border-gray-200 bg-gray-50">
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Shares</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">{position.shares}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Cost Basis</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">
                      ${position.costBasis.toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Total Cost</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">
                      $
                      {position.totalCost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Duration</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">{duration} days</dd>
                  </div>
                </div>

                {position.realizedGainLoss !== null && duration > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500">Return on Capital</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {((position.realizedGainLoss / position.totalCost) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-medium text-gray-500">Annualized Return</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(
                          ((position.realizedGainLoss / position.totalCost) * 365 * 100) /
                          duration
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

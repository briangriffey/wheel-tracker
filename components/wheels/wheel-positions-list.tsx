'use client'

import Link from 'next/link'

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

interface WheelPositionsListProps {
  positions: Position[]
  ticker: string
}

export function WheelPositionsList({ positions, ticker }: WheelPositionsListProps) {
  if (positions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No positions</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {positions.map((position) => (
        <div key={position.id} className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-gray-900">{ticker || 'Position'}</h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    position.status === 'OPEN'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {position.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Shares</dt>
                  <dd className="mt-1 text-base sm:text-lg font-semibold text-gray-900">
                    {position.shares}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Cost Basis</dt>
                  <dd className="mt-1 text-base sm:text-lg font-semibold text-gray-900">
                    ${position.costBasis.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Total Cost</dt>
                  <dd className="mt-1 text-base sm:text-lg font-semibold text-gray-900">
                    $
                    {position.totalCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </dd>
                </div>
                {position.realizedGainLoss !== null && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Realized P&L</dt>
                    <dd
                      className={`mt-1 text-base sm:text-lg font-semibold ${
                        position.realizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {position.realizedGainLoss >= 0 ? '+' : ''}$
                      {position.realizedGainLoss.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </dd>
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Acquired {new Date(position.acquiredDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                {position.closedDate && (
                  <> • Closed {new Date(position.closedDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</>
                )}
              </div>
            </div>

            <div className="sm:ml-6">
              <Link
                href={`/positions/${position.id}`}
                className="inline-flex items-center justify-center w-full sm:w-auto px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

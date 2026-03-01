'use client'

import Link from 'next/link'

interface Trade {
  id: string
  type: string
  action: string
  status: string
  strikePrice: number
  premium: number
  contracts: number
  expirationDate: Date
  openDate: Date
  closeDate: Date | null
}

interface WheelTradesListProps {
  trades: Trade[]
}

function getTypeColor(type: string): string {
  return type === 'PUT' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'bg-yellow-100 text-yellow-800'
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800'
    case 'EXPIRED':
      return 'bg-gray-100 text-gray-600'
    case 'ASSIGNED':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function WheelTradesList({ trades }: WheelTradesListProps) {
  if (trades.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No active trades</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {trades.map((trade) => (
          <div key={trade.id} className="bg-white shadow rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                    trade.type
                  )}`}
                >
                  {trade.type}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    trade.status
                  )}`}
                >
                  {trade.status}
                </span>
              </div>
              <Link
                href={`/trades/${trade.id}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-900"
              >
                View
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Action</span>
                <p className="font-medium text-gray-900">{trade.action}</p>
              </div>
              <div>
                <span className="text-gray-500">Strike</span>
                <p className="font-medium text-gray-900">${trade.strikePrice.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500">Premium</span>
                <p className="font-medium text-green-600">${trade.premium.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500">Contracts</span>
                <p className="font-medium text-gray-900">{trade.contracts}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Expiration</span>
                <p className="font-medium text-gray-900">
                  {new Date(trade.expirationDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white shadow overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Action
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Strike
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Premium
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Contracts
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Expiration
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                        trade.type
                      )}`}
                    >
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.action}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${trade.strikePrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    ${trade.premium.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.contracts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(trade.expirationDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        trade.status
                      )}`}
                    >
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/trades/${trade.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

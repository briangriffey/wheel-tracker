'use client'

import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import type { Trade, TradeStatus, TradeType } from '@/lib/generated/prisma'
import { Prisma } from '@/lib/generated/prisma'
import { deleteTrade, updateTradeStatus } from '@/lib/actions/trades'

interface TradeListProps {
  initialTrades: Trade[]
}

type SortField = 'expirationDate' | 'ticker' | 'premium'
type SortDirection = 'asc' | 'desc'

export function TradeList({ initialTrades }: TradeListProps) {
  const [trades, setTrades] = useState<Trade[]>(initialTrades)
  const [tickerFilter, setTickerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<TradeStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<TradeType | 'ALL'>('ALL')
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [sortField, setSortField] = useState<SortField>('expirationDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    let filtered = [...trades]

    // Apply filters
    if (tickerFilter) {
      filtered = filtered.filter((trade) =>
        trade.ticker.toLowerCase().includes(tickerFilter.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((trade) => trade.status === statusFilter)
    }

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((trade) => trade.type === typeFilter)
    }

    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart)
      filtered = filtered.filter((trade) => new Date(trade.expirationDate) >= startDate)
    }

    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd)
      filtered = filtered.filter((trade) => new Date(trade.expirationDate) <= endDate)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sortField) {
        case 'ticker':
          aValue = a.ticker
          bValue = b.ticker
          break
        case 'premium':
          aValue = (a.premium as Prisma.Decimal).toNumber()
          bValue = (b.premium as Prisma.Decimal).toNumber()
          break
        case 'expirationDate':
        default:
          aValue = new Date(a.expirationDate)
          bValue = new Date(b.expirationDate)
          break
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [trades, tickerFilter, statusFilter, typeFilter, dateRangeStart, dateRangeEnd, sortField, sortDirection])

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Handle delete
  const handleDelete = async (tradeId: string) => {
    if (!confirm('Are you sure you want to delete this trade?')) {
      return
    }

    setLoadingAction(tradeId)
    try {
      const result = await deleteTrade(tradeId)
      if (result.success) {
        setTrades(trades.filter((t) => t.id !== tradeId))
        toast.success('Trade deleted successfully')
      } else {
        toast.error(result.error || 'Failed to delete trade')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoadingAction(null)
    }
  }

  // Handle status update
  const handleStatusUpdate = async (tradeId: string, status: TradeStatus) => {
    setLoadingAction(tradeId)
    try {
      const result = await updateTradeStatus({ id: tradeId, status })
      if (result.success) {
        setTrades(
          trades.map((t) =>
            t.id === tradeId
              ? { ...t, status, closeDate: status !== 'OPEN' ? new Date() : t.closeDate }
              : t
          )
        )
        toast.success(`Trade marked as ${status.toLowerCase()}`)
      } else {
        toast.error(result.error || 'Failed to update trade status')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoadingAction(null)
    }
  }

  // Format currency
  const formatCurrency = (value: Prisma.Decimal) => {
    return `$${value.toNumber().toFixed(2)}`
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Get status badge color
  const getStatusColor = (status: TradeStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-100 text-green-800'
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800'
      case 'EXPIRED':
        return 'bg-blue-100 text-blue-800'
      case 'ASSIGNED':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get type badge color
  const getTypeColor = (type: TradeType) => {
    return type === 'PUT' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'
  }

  return (
    <div className="w-full">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Ticker Filter */}
          <div>
            <label htmlFor="ticker-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Ticker
            </label>
            <input
              id="ticker-filter"
              type="text"
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
              placeholder="e.g., AAPL"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TradeStatus | 'ALL')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="EXPIRED">Expired</option>
              <option value="ASSIGNED">Assigned</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TradeType | 'ALL')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="PUT">PUT</option>
              <option value="CALL">CALL</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label htmlFor="date-start" className="block text-sm font-medium text-gray-700 mb-1">
              Exp. Date From
            </label>
            <input
              id="date-start"
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label htmlFor="date-end" className="block text-sm font-medium text-gray-700 mb-1">
              Exp. Date To
            </label>
            <input
              id="date-end"
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(tickerFilter || statusFilter !== 'ALL' || typeFilter !== 'ALL' || dateRangeStart || dateRangeEnd) && (
          <button
            onClick={() => {
              setTickerFilter('')
              setStatusFilter('ALL')
              setTypeFilter('ALL')
              setDateRangeStart('')
              setDateRangeEnd('')
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 mb-4">
        Showing {filteredTrades.length} of {trades.length} trades
      </div>

      {/* Empty State */}
      {filteredTrades.length === 0 && (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No trades found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {trades.length === 0
              ? 'Get started by creating your first trade.'
              : 'Try adjusting your filters to find what you\'re looking for.'}
          </p>
        </div>
      )}

      {/* Desktop Table View */}
      {filteredTrades.length > 0 && (
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('ticker')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    Ticker
                    {sortField === 'ticker' && (
                      <span className="text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Strike
                </th>
                <th
                  onClick={() => handleSort('premium')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    Premium
                    {sortField === 'premium' && (
                      <span className="text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('expirationDate')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    Expiration
                    {sortField === 'expirationDate' && (
                      <span className="text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {trade.ticker}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(trade.type)}`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(trade.strikePrice as Prisma.Decimal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(trade.premium as Prisma.Decimal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(trade.expirationDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trade.status)}`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {/* Edit Button */}
                      <button
                        onClick={() => toast('Edit functionality coming soon', { icon: 'ℹ️' })}
                        disabled={loadingAction === trade.id}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        title="Edit trade"
                      >
                        Edit
                      </button>

                      {/* Mark Expired - Only for OPEN trades */}
                      {trade.status === 'OPEN' && (
                        <button
                          onClick={() => handleStatusUpdate(trade.id, 'EXPIRED')}
                          disabled={loadingAction === trade.id}
                          className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                          title="Mark as expired"
                        >
                          Expired
                        </button>
                      )}

                      {/* Mark Assigned - Only for OPEN trades */}
                      {trade.status === 'OPEN' && (
                        <button
                          onClick={() => handleStatusUpdate(trade.id, 'ASSIGNED')}
                          disabled={loadingAction === trade.id}
                          className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                          title="Mark as assigned"
                        >
                          Assigned
                        </button>
                      )}

                      {/* Delete - Only for OPEN trades */}
                      {trade.status === 'OPEN' && (
                        <button
                          onClick={() => handleDelete(trade.id)}
                          disabled={loadingAction === trade.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Delete trade"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card View */}
      {filteredTrades.length > 0 && (
        <div className="md:hidden space-y-4">
          {filteredTrades.map((trade) => (
            <div key={trade.id} className="bg-white rounded-lg shadow p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{trade.ticker}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(trade.type)}`}>
                      {trade.type}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trade.status)}`}>
                      {trade.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Strike Price:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(trade.strikePrice as Prisma.Decimal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Premium:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(trade.premium as Prisma.Decimal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expiration:</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(trade.expirationDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contracts:</span>
                  <span className="font-medium text-gray-900">{trade.contracts}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => toast('Edit functionality coming soon', { icon: 'ℹ️' })}
                  disabled={loadingAction === trade.id}
                  className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50"
                >
                  Edit
                </button>

                {trade.status === 'OPEN' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(trade.id, 'EXPIRED')}
                      disabled={loadingAction === trade.id}
                      className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 disabled:opacity-50"
                    >
                      Expired
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(trade.id, 'ASSIGNED')}
                      disabled={loadingAction === trade.id}
                      className="flex-1 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 disabled:opacity-50"
                    >
                      Assigned
                    </button>
                    <button
                      onClick={() => handleDelete(trade.id)}
                      disabled={loadingAction === trade.id}
                      className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { Trade, TradeStatus, TradeType } from '@/lib/generated/prisma'
import { Prisma } from '@/lib/generated/prisma'
import { deleteTrade, updateTradeStatus } from '@/lib/actions/trades'
import { getStatusColor } from '@/lib/design/colors'
import { Button } from '@/components/design-system/button/button'
import type { StockPriceResult } from '@/lib/services/market-data'
import { TradeActionsDialog } from './trade-actions-dialog'

interface TradeListProps {
  initialTrades: Trade[]
  prices: Map<string, StockPriceResult>
}

type SortField = 'expirationDate' | 'ticker' | 'premium'
type SortDirection = 'asc' | 'desc'

export function TradeList({ initialTrades, prices }: TradeListProps) {
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>(initialTrades)

  // Sync state with props
  React.useEffect(() => {
    setTrades(initialTrades)
  }, [initialTrades])
  const [tickerFilter, setTickerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<TradeStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<TradeType | 'ALL'>('ALL')
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [sortField, setSortField] = useState<SortField>('expirationDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

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
          aValue = toDecimalNumber(a.premium as unknown as Prisma.Decimal | string | number)
          bValue = toDecimalNumber(b.premium as unknown as Prisma.Decimal | string | number)
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

  // Helper to safely convert Prisma Decimal (or serialized string/number) to number
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
  const getTypeColor = (type: TradeType) => {
    return type === 'PUT' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'
  }

  // Check if price is stale (older than 1 day)
  const isPriceStale = (date: Date) => {
    const dayInMs = 24 * 60 * 60 * 1000
    return Date.now() - new Date(date).getTime() > dayInMs
  }

  // Handle refresh prices
  const handleRefreshPrices = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/market-data/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()

      if (data.success) {
        toast.success(`Refreshed ${data.summary.successful} prices`)
        router.refresh()
      } else {
        toast.error('Failed to refresh prices')
      }
    } catch {
      toast.error('Error refreshing prices')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

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

        {/* Actions Row */}
        <div className="flex items-center gap-2 mt-4">
          {/* Clear Filters Button */}
          {(tickerFilter || statusFilter !== 'ALL' || typeFilter !== 'ALL' || dateRangeStart || dateRangeEnd) && (
            <Button
              onClick={() => {
                setTickerFilter('')
                setStatusFilter('ALL')
                setTypeFilter('ALL')
                setDateRangeStart('')
                setDateRangeEnd('')
              }}
              variant="ghost"
              size="sm"
              aria-label="Clear all filters and show all trades"
            >
              Clear all filters
            </Button>
          )}

          {/* Refresh Prices Button */}
          <Button
            onClick={handleRefreshPrices}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            aria-label="Refresh stock prices"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Prices
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 mb-4" role="status" aria-live="polite" aria-atomic="true">
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
            aria-hidden="true"
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
          <table className="min-w-full divide-y divide-gray-200" aria-label="Trades list">
            <caption className="sr-only">
              List of trades with filtering and sorting options
            </caption>
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  onClick={() => handleSort('ticker')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  aria-sort={sortField === 'ticker' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div className="flex items-center gap-1">
                    Ticker
                    {sortField === 'ticker' && (
                      <span className="text-blue-600" aria-hidden="true">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Strike
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort('premium')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  aria-sort={sortField === 'premium' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div className="flex items-center gap-1">
                    Premium
                    {sortField === 'premium' && (
                      <span className="text-blue-600" aria-hidden="true">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort('expirationDate')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  aria-sort={sortField === 'expirationDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div className="flex items-center gap-1">
                    Expiration
                    {sortField === 'expirationDate' && (
                      <span className="text-blue-600" aria-hidden="true">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrades.map((trade) => {
                const currentPrice = prices.get(trade.ticker)
                return (
                  <tr
                    key={trade.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTrade(trade)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trade.ticker}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {currentPrice ? (
                        <div>
                          <div className={isPriceStale(currentPrice.date) ? 'text-gray-500' : ''}>
                            ${currentPrice.price.toFixed(2)}
                          </div>
                          {isPriceStale(currentPrice.date) && (
                            <div className="text-xs text-gray-400">stale</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(trade.type)}`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(trade.strikePrice as unknown as Prisma.Decimal | string | number)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(trade.premium as unknown as Prisma.Decimal | string | number)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(trade.expirationDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trade.status).bg} ${getStatusColor(trade.status).text}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block text-left">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenDropdown(openDropdown === trade.id ? null : trade.id)
                          }}
                          disabled={loadingAction === trade.id}
                          variant="ghost"
                          size="sm"
                          aria-label={`Actions for ${trade.ticker} trade`}
                        >
                          Actions
                          <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </Button>

                        {openDropdown === trade.id && (
                          <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1" role="menu">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/trades/${trade.id}`)
                                  setOpenDropdown(null)
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                role="menuitem"
                              >
                                View Details
                              </button>

                              {trade.status === 'OPEN' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      router.push(`/trades/${trade.id}`)
                                      setOpenDropdown(null)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    role="menuitem"
                                  >
                                    Close Early
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusUpdate(trade.id, 'EXPIRED')
                                      setOpenDropdown(null)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    role="menuitem"
                                  >
                                    Mark as Expired
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusUpdate(trade.id, 'ASSIGNED')
                                      setOpenDropdown(null)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    role="menuitem"
                                  >
                                    Mark as Assigned
                                  </button>
                                  <div className="border-t border-gray-100"></div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDelete(trade.id)
                                      setOpenDropdown(null)
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                    role="menuitem"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card View */}
      {filteredTrades.length > 0 && (
        <div className="md:hidden space-y-4">
          {filteredTrades.map((trade) => {
            const currentPrice = prices.get(trade.ticker)
            return (
              <div
                key={trade.id}
                className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTrade(trade)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{trade.ticker}</h3>
                    {currentPrice && (
                      <div className={`text-sm mt-1 ${isPriceStale(currentPrice.date) ? 'text-gray-500' : 'text-gray-700'}`}>
                        ${currentPrice.price.toFixed(2)}
                        {isPriceStale(currentPrice.date) && <span className="text-xs"> (stale)</span>}
                      </div>
                    )}
                    <div className="flex gap-2 mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(trade.type)}`}>
                        {trade.type}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trade.status).bg} ${getStatusColor(trade.status).text}`}>
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
                      {formatCurrency(trade.strikePrice as unknown as Prisma.Decimal | string | number)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Premium:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(trade.premium as unknown as Prisma.Decimal | string | number)}
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

                {/* Tap to view hint */}
                <div className="mt-4 text-center text-xs text-gray-500">
                  Tap to view actions
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Trade Actions Dialog */}
      {selectedTrade && (
        <TradeActionsDialog
          trade={selectedTrade}
          isOpen={!!selectedTrade}
          onClose={() => setSelectedTrade(null)}
          currentPrice={prices.get(selectedTrade.ticker)}
        />
      )}
    </div>
  )
}

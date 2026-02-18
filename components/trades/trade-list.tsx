'use client'

import React, { useState, useMemo } from 'react'
import type { Trade, TradeStatus, TradeType } from '@/lib/generated/prisma'
import { Prisma } from '@/lib/generated/prisma'
import { getStatusColor, getPnlColor } from '@/lib/design/colors'
import { Button } from '@/components/design-system/button/button'
import type { StockPriceResult } from '@/lib/services/market-data'
import { formatTimeAgo, formatNextRefreshTime } from '@/lib/utils/format'
import { TradeActionsDialog } from './trade-actions-dialog'

export interface RefreshInfo {
  canRefresh: boolean
  nextRefreshAt: string | null
  reason: string
  lastUpdated: string
}

interface TradeListProps {
  initialTrades: Trade[]
  prices: Map<string, StockPriceResult>
  refreshInfo?: Record<string, RefreshInfo>
}

type SortField = 'expirationDate' | 'ticker' | 'premium'
type SortDirection = 'asc' | 'desc'

export function TradeList({ initialTrades: trades, prices, refreshInfo = {} }: TradeListProps) {
  const [tickerFilter, setTickerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<TradeStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<TradeType | 'ALL'>('ALL')
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [sortField, setSortField] = useState<SortField>('expirationDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)

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
  }, [
    trades,
    tickerFilter,
    statusFilter,
    typeFilter,
    dateRangeStart,
    dateRangeEnd,
    sortField,
    sortDirection,
  ])

  // Split into open vs closed trades
  const openTrades = useMemo(
    () => filteredTrades.filter((trade) => trade.status === 'OPEN'),
    [filteredTrades]
  )

  const closedTrades = useMemo(
    () => filteredTrades.filter((trade) => trade.status !== 'OPEN'),
    [filteredTrades]
  )

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
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

  // Format date using UTC values to avoid timezone shift
  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  // Get type badge color
  const getTypeColor = (type: TradeType) => {
    return type === 'PUT' ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'
  }

  // Calculate if a trade is in the money or out of the money
  const getMoneyStatus = (trade: Trade, currentPrice: number | undefined) => {
    if (!currentPrice) return null

    const strikePrice = toDecimalNumber(
      trade.strikePrice as unknown as Prisma.Decimal | string | number
    )

    if (trade.type === 'PUT') {
      // For selling a put: OTM when strike > current, ITM when strike < current
      return strikePrice < currentPrice ? 'otm' : 'itm'
    } else {
      // For selling a call: OTM when strike < current, ITM when strike > current
      return strikePrice > currentPrice ? 'otm' : 'itm'
    }
  }

  // Get realized P&L for closed/expired trades
  // P&L = (premium - closePremium) * 100 * contracts
  const getClosedTradePnL = (trade: Trade): number | null => {
    if (trade.status === 'EXPIRED') {
      // Expired = full premium kept as profit
      const premium = toDecimalNumber(trade.premium as unknown as Prisma.Decimal | string | number)
      return premium * 100 * trade.contracts
    }
    if (trade.status === 'CLOSED' && trade.closePremium != null) {
      const premium = toDecimalNumber(trade.premium as unknown as Prisma.Decimal | string | number)
      const closePremium = toDecimalNumber(
        trade.closePremium as unknown as Prisma.Decimal | string | number
      )
      return (premium - closePremium) * 100 * trade.contracts
    }
    return null
  }

  // Get row background color based on money status (open) or P&L (closed)
  const getRowBgColor = (trade: Trade, currentPrice: number | undefined) => {
    // Closed/expired trades: color by realized P&L
    const closedPnL = getClosedTradePnL(trade)
    if (closedPnL !== null) {
      return getPnlColor(closedPnL).bg
    }

    // Open trades: color by moneyness
    const status = getMoneyStatus(trade, currentPrice)
    if (status === 'otm') return 'bg-green-50'
    if (status === 'itm') return 'bg-red-50'
    return ''
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

        {/* Actions Row */}
        {(tickerFilter ||
          statusFilter !== 'ALL' ||
          typeFilter !== 'ALL' ||
          dateRangeStart ||
          dateRangeEnd) && (
          <div className="mt-4">
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
          </div>
        )}
      </div>

      {/* Results Count */}
      <div
        className="text-sm text-gray-600 mb-4"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
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
              : "Try adjusting your filters to find what you're looking for."}
          </p>
        </div>
      )}

      {/* ===== Open Trades Section ===== */}
      {openTrades.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Open Trades ({openTrades.length})
          </h2>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden mb-8">
            <table className="min-w-full divide-y divide-gray-200" aria-label="Open trades list">
              <caption className="sr-only">Open trades with current prices and moneyness</caption>
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    onClick={() => handleSort('ticker')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    aria-sort={
                      sortField === 'ticker'
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
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
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Current Price
                  </th>
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
                    Strike
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort('premium')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    aria-sort={
                      sortField === 'premium'
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
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
                    aria-sort={
                      sortField === 'expirationDate'
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
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
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {openTrades.map((trade) => {
                  const currentPrice = prices.get(trade.ticker)
                  const rowBgColor = getRowBgColor(trade, currentPrice?.price)
                  return (
                    <tr
                      key={trade.id}
                      className={`hover:bg-gray-100 cursor-pointer transition-colors ${rowBgColor}`}
                      onClick={() => setSelectedTrade(trade)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {trade.ticker}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currentPrice ? (
                          <div>
                            <div>${currentPrice.price.toFixed(2)}</div>
                            {(() => {
                              const info = refreshInfo[trade.ticker]
                              if (!info) return null
                              return (
                                <div className="text-xs text-gray-400">
                                  {formatTimeAgo(new Date(info.lastUpdated))}
                                  {info.nextRefreshAt && (
                                    <span className="ml-1">
                                      · Next: {formatNextRefreshTime(new Date(info.nextRefreshAt))}
                                    </span>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
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
                        {formatDate(trade.expirationDate)}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTrade(trade)
                          }}
                          variant="outline"
                          size="sm"
                          aria-label={`Open actions for ${trade.ticker} trade`}
                        >
                          Action
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 mb-8">
            {openTrades.map((trade) => {
              const currentPrice = prices.get(trade.ticker)
              const rowBgColor = getRowBgColor(trade, currentPrice?.price)
              return (
                <div
                  key={trade.id}
                  className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow ${rowBgColor}`}
                  onClick={() => setSelectedTrade(trade)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{trade.ticker}</h3>
                      {currentPrice && (
                        <div className="text-sm mt-1 text-gray-700">
                          ${currentPrice.price.toFixed(2)}
                          {(() => {
                            const info = refreshInfo[trade.ticker]
                            if (!info) return null
                            return (
                              <span className="text-xs text-gray-400 ml-1">
                                ({formatTimeAgo(new Date(info.lastUpdated))})
                              </span>
                            )
                          })()}
                        </div>
                      )}
                      <div className="flex gap-2 mt-1">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(trade.type)}`}
                        >
                          {trade.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Strike Price:</span>
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
                  <div className="mt-4 text-center text-xs text-gray-500">Tap to view actions</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ===== Closed Trades Section ===== */}
      {closedTrades.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Closed Trades ({closedTrades.length})
          </h2>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden mb-8">
            <table className="min-w-full divide-y divide-gray-200" aria-label="Closed trades list">
              <caption className="sr-only">
                Closed, expired, and assigned trades with realized P&L
              </caption>
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    onClick={() => handleSort('ticker')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    aria-sort={
                      sortField === 'ticker'
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
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
                    Strike
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort('premium')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    aria-sort={
                      sortField === 'premium'
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
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
                    aria-sort={
                      sortField === 'expirationDate'
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
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
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    P&L
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {closedTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedTrade(trade)}
                  >
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
                      {formatDate(trade.expirationDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trade.status).bg} ${getStatusColor(trade.status).text}`}
                      >
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        const pnl = getClosedTradePnL(trade)
                        if (pnl === null) return <span className="text-gray-400">-</span>
                        const colors = getPnlColor(pnl)
                        return (
                          <span className={`font-semibold ${colors.text}`}>
                            {pnl >= 0 ? '+' : ''}
                            {formatCurrency(pnl)}
                          </span>
                        )
                      })()}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTrade(trade)
                        }}
                        variant="outline"
                        size="sm"
                        aria-label={`Open actions for ${trade.ticker} trade`}
                      >
                        Action
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 mb-8">
            {closedTrades.map((trade) => (
              <div
                key={trade.id}
                className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTrade(trade)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{trade.ticker}</h3>
                    <div className="flex gap-2 mt-1">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(trade.type)}`}
                      >
                        {trade.type}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(trade.status).bg} ${getStatusColor(trade.status).text}`}
                      >
                        {trade.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Strike Price:</span>
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
                    <span className="text-gray-500">Expiration:</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(trade.expirationDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contracts:</span>
                    <span className="font-medium text-gray-900">{trade.contracts}</span>
                  </div>
                  {(() => {
                    const pnl = getClosedTradePnL(trade)
                    if (pnl === null) return null
                    const colors = getPnlColor(pnl)
                    return (
                      <div className="flex justify-between">
                        <span className="text-gray-500">P&L:</span>
                        <span className={`font-semibold ${colors.text}`}>
                          {pnl >= 0 ? '+' : ''}
                          {formatCurrency(pnl)}
                        </span>
                      </div>
                    )
                  })()}
                </div>
                <div className="mt-4 text-center text-xs text-gray-500">Tap to view actions</div>
              </div>
            ))}
          </div>
        </>
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

'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import type { PositionWithCalculations } from '@/lib/queries/positions'
import { PositionCard } from './position-card'
import { refreshPositionPrices, getLatestPrices, type PriceData } from '@/lib/actions/prices'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { TradeEntryForm } from '@/components/forms/trade-entry-form'
import { getPnLColorClass } from '@/lib/design/colors'
import { SellCoveredCallDialog } from './sell-covered-call-dialog'

interface PositionsListProps {
  initialPositions: PositionWithCalculations[]
}

type SortField = 'ticker' | 'unrealizedPL' | 'daysHeld'
type SortDirection = 'asc' | 'desc'
type PLFilter = 'ALL' | 'PROFIT' | 'LOSS' | 'BREAKEVEN'

export function PositionsList({ initialPositions }: PositionsListProps) {
  const router = useRouter()
  const [positions] = useState<PositionWithCalculations[]>(initialPositions)
  const [tickerFilter, setTickerFilter] = useState('')
  const [plFilter, setPLFilter] = useState<PLFilter>('ALL')
  const [sortField, setSortField] = useState<SortField>('ticker')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [priceData, setPriceData] = useState<Record<string, PriceData>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false)
  const [sellCallDialogOpen, setSellCallDialogOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<PositionWithCalculations | null>(null)

  // Fetch price data for all positions
  const fetchPriceData = useCallback(async () => {
    const openPositions = positions.filter((p) => p.status === 'OPEN')
    if (openPositions.length === 0) return

    const tickers = [...new Set(openPositions.map((p) => p.ticker))]

    try {
      const result = await getLatestPrices(tickers)
      if (result.success) {
        setPriceData(result.data)
        setRefreshError(null)
      } else {
        const errorMsg = result.error
        setRefreshError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error('Error fetching price data:', error)
      const errorMsg = 'Failed to fetch prices'
      setRefreshError(errorMsg)
      toast.error(errorMsg)
    }
  }, [positions])

  // Handle manual refresh of all position prices
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true)
    setRefreshError(null)

    try {
      const result = await refreshPositionPrices()

      if (result.success) {
        toast.success('Positions refreshed successfully')
        // Refresh the page to get updated position values
        router.refresh()
        // Also fetch latest price data
        await fetchPriceData()
      } else {
        const errorMsg = result.error
        setRefreshError(errorMsg)
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error('Error refreshing positions:', error)
      const errorMsg = 'Failed to refresh positions'
      setRefreshError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsRefreshing(false)
    }
  }, [router, fetchPriceData])

  // Handle single position refresh callback
  const handlePositionRefresh = useCallback(() => {
    // Refresh the page to get updated values
    router.refresh()
    // Also fetch latest price data
    fetchPriceData()
  }, [router, fetchPriceData])

  // Fetch price data on mount and when positions change
  useEffect(() => {
    fetchPriceData()
  }, [fetchPriceData])

  // Auto-refresh timer (every 5 minutes)
  useEffect(() => {
    if (!autoRefreshEnabled) return

    const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

    const intervalId = setInterval(() => {
      handleRefreshAll()
    }, AUTO_REFRESH_INTERVAL)

    return () => clearInterval(intervalId)
  }, [autoRefreshEnabled, handleRefreshAll])

  // Filter and sort positions
  const filteredPositions = useMemo(() => {
    let filtered = [...positions]

    // Apply ticker filter
    if (tickerFilter) {
      filtered = filtered.filter((position) =>
        position.ticker.toLowerCase().includes(tickerFilter.toLowerCase())
      )
    }

    // Apply P&L filter
    if (plFilter !== 'ALL') {
      filtered = filtered.filter((position) => {
        const pl = position.unrealizedPL
        if (pl === undefined) return false

        switch (plFilter) {
          case 'PROFIT':
            return pl > 0
          case 'LOSS':
            return pl < 0
          case 'BREAKEVEN':
            return pl === 0
          default:
            return true
        }
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField) {
        case 'ticker':
          aValue = a.ticker
          bValue = b.ticker
          break
        case 'unrealizedPL':
          aValue = a.unrealizedPL ?? 0
          bValue = b.unrealizedPL ?? 0
          break
        case 'daysHeld':
          aValue = a.daysHeld
          bValue = b.daysHeld
          break
        default:
          aValue = a.ticker
          bValue = b.ticker
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [positions, tickerFilter, plFilter, sortField, sortDirection])

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalPositions = positions.length
    const totalPL = positions.reduce((sum, pos) => sum + (pos.unrealizedPL ?? 0), 0)
    const totalCapital = positions.reduce((sum, pos) => sum + pos.totalCost.toNumber(), 0)

    return {
      totalPositions,
      totalPL,
      totalCapital,
    }
  }, [positions])

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Handle quick actions
  const handleSellCall = (positionId: string) => {
    const position = positions.find((p) => p.id === positionId)
    if (!position) {
      toast.error('Position not found')
      return
    }
    setSelectedPosition(position)
    setSellCallDialogOpen(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleViewDetails = (_positionId: string) => {
    // TODO: Implement view details functionality
    toast('Position details view coming soon!', { icon: 'ℹ️' })
  }

  // Handle successful trade creation
  const handleTradeSuccess = useCallback(() => {
    setIsTradeModalOpen(false)
    // Refresh the page to get updated positions
    router.refresh()
  }, [router])

  // Handle successful covered call creation
  const handleSellCallSuccess = useCallback(() => {
    setSellCallDialogOpen(false)
    setSelectedPosition(null)
    // Refresh the page to get updated positions
    router.refresh()
    // Also fetch latest price data
    fetchPriceData()
  }, [router, fetchPriceData])

  return (
    <div className="w-full">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 font-medium">Total Positions</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPositions}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 font-medium">Total P&L</div>
          <div className={`text-3xl font-bold mt-2 ${getPnLColorClass(stats.totalPL)}`}>
            {stats.totalPL >= 0 ? '+' : ''}
            {formatCurrency(stats.totalPL)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 font-medium">Capital Deployed</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {formatCurrency(stats.totalCapital)}
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters & Sorting</h3>
          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Auto-refresh (5m)</span>
            </label>
            {/* New Trade button */}
            <button
              onClick={() => setIsTradeModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              aria-label="Create new trade"
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Trade
            </button>
            {/* Manual refresh button */}
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Refresh all prices"
            >
              <svg
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
            </button>
          </div>
        </div>

        {/* Refresh Error */}
        {refreshError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 border border-red-200">
            <p className="text-sm text-red-800">{refreshError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* P&L Filter */}
          <div>
            <label htmlFor="pl-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Profit/Loss
            </label>
            <select
              id="pl-filter"
              value={plFilter}
              onChange={(e) => setPLFilter(e.target.value as PLFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Positions</option>
              <option value="PROFIT">Profit Only</option>
              <option value="LOSS">Loss Only</option>
              <option value="BREAKEVEN">Break-even</option>
            </select>
          </div>

          {/* Sort Field */}
          <div>
            <label htmlFor="sort-field" className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              id="sort-field"
              value={sortField}
              onChange={(e) => handleSort(e.target.value as SortField)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ticker">Ticker</option>
              <option value="unrealizedPL">P&L</option>
              <option value="daysHeld">Days Held</option>
            </select>
          </div>

          {/* Sort Direction */}
          <div>
            <label htmlFor="sort-direction" className="block text-sm font-medium text-gray-700 mb-1">
              Direction
            </label>
            <select
              id="sort-direction"
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as SortDirection)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(tickerFilter || plFilter !== 'ALL') && (
          <button
            onClick={() => {
              setTickerFilter('')
              setPLFilter('ALL')
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 mb-4">
        Showing {filteredPositions.length} of {positions.length} positions
      </div>

      {/* Empty State */}
      {filteredPositions.length === 0 && (
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
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No positions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {positions.length === 0
              ? 'You don\'t have any stock positions yet. Positions are created when PUT options are assigned.'
              : 'Try adjusting your filters to find what you\'re looking for.'}
          </p>
        </div>
      )}

      {/* Desktop Grid View */}
      {filteredPositions.length > 0 && (
        <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPositions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              onSellCall={handleSellCall}
              onViewDetails={handleViewDetails}
              priceData={priceData[position.ticker] || null}
              onPriceRefresh={handlePositionRefresh}
            />
          ))}
        </div>
      )}

      {/* Tablet Grid View */}
      {filteredPositions.length > 0 && (
        <div className="hidden md:grid lg:hidden md:grid-cols-2 gap-6">
          {filteredPositions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              onSellCall={handleSellCall}
              onViewDetails={handleViewDetails}
              priceData={priceData[position.ticker] || null}
              onPriceRefresh={handlePositionRefresh}
            />
          ))}
        </div>
      )}

      {/* Mobile List View */}
      {filteredPositions.length > 0 && (
        <div className="md:hidden space-y-4">
          {filteredPositions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              onSellCall={handleSellCall}
              onViewDetails={handleViewDetails}
              priceData={priceData[position.ticker] || null}
              onPriceRefresh={handlePositionRefresh}
            />
          ))}
        </div>
      )}

      {/* New Trade Modal */}
      <Modal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        title="Create New Trade"
        description="Enter the details of your options trade"
        size="lg"
      >
        <TradeEntryForm
          onSuccess={handleTradeSuccess}
          onCancel={() => setIsTradeModalOpen(false)}
        />
      </Modal>

      {/* Sell Covered Call Dialog */}
      {selectedPosition && (
        <SellCoveredCallDialog
          position={{
            id: selectedPosition.id,
            ticker: selectedPosition.ticker,
            shares: selectedPosition.shares,
            costBasis: selectedPosition.costBasis.toNumber(),
            totalCost: selectedPosition.totalCost.toNumber(),
            acquiredDate: selectedPosition.acquiredDate,
            coveredCalls: selectedPosition.coveredCalls?.map((call) => ({
              id: call.id,
              status: call.status,
            })),
          }}
          wheelId={selectedPosition.wheelId}
          isOpen={sellCallDialogOpen}
          onClose={() => {
            setSellCallDialogOpen(false)
            setSelectedPosition(null)
          }}
          onSuccess={handleSellCallSuccess}
        />
      )}
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import type { PositionWithCalculations } from '@/lib/queries/positions'
import { PositionCard } from './position-card'

interface PositionsListProps {
  initialPositions: PositionWithCalculations[]
}

type SortField = 'ticker' | 'unrealizedPL' | 'daysHeld'
type SortDirection = 'asc' | 'desc'
type PLFilter = 'ALL' | 'PROFIT' | 'LOSS' | 'BREAKEVEN'

export function PositionsList({ initialPositions }: PositionsListProps) {
  const [positions] = useState<PositionWithCalculations[]>(initialPositions)
  const [tickerFilter, setTickerFilter] = useState('')
  const [plFilter, setPLFilter] = useState<PLFilter>('ALL')
  const [sortField, setSortField] = useState<SortField>('ticker')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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

  // Get P&L color class
  const getPLColorClass = (pl: number) => {
    if (pl > 0) return 'text-green-600'
    if (pl < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  // Handle quick actions
  const handleSellCall = (positionId: string) => {
    // TODO: Implement sell call functionality
    alert(`Sell Call for position ${positionId} - Coming soon!`)
  }

  const handleViewDetails = (positionId: string) => {
    // TODO: Implement view details functionality
    alert(`View Details for position ${positionId} - Coming soon!`)
  }

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
          <div className={`text-3xl font-bold mt-2 ${getPLColorClass(stats.totalPL)}`}>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters & Sorting</h3>
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
            />
          ))}
        </div>
      )}
    </div>
  )
}

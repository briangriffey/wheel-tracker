'use client'

import React, { useState, useMemo } from 'react'
import { WheelCard, type WheelCardData } from './wheel-card'
import { formatCurrency } from '@/lib/utils/position-calculations'
import { getPnLColorClass } from '@/lib/design/colors'
import Link from 'next/link'

interface WheelsListProps {
  initialWheels: WheelCardData[]
}

type SortField = 'ticker' | 'totalRealizedPL' | 'cycleCount' | 'lastActivityAt'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'ALL' | 'ACTIVE' | 'IDLE' | 'PAUSED' | 'COMPLETED'

export function WheelsList({ initialWheels }: WheelsListProps) {
  const [wheels] = useState<WheelCardData[]>(initialWheels)
  const [tickerFilter, setTickerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sortField, setSortField] = useState<SortField>('lastActivityAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Filter and sort wheels
  const filteredWheels = useMemo(() => {
    let filtered = [...wheels]

    // Apply ticker filter
    if (tickerFilter) {
      filtered = filtered.filter((wheel) =>
        wheel.ticker.toLowerCase().includes(tickerFilter.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((wheel) => wheel.status === statusFilter)
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
        case 'totalRealizedPL':
          aValue = a.totalRealizedPL
          bValue = b.totalRealizedPL
          break
        case 'cycleCount':
          aValue = a.cycleCount
          bValue = b.cycleCount
          break
        case 'lastActivityAt':
          aValue = new Date(a.lastActivityAt).getTime()
          bValue = new Date(b.lastActivityAt).getTime()
          break
        default:
          aValue = new Date(a.lastActivityAt).getTime()
          bValue = new Date(b.lastActivityAt).getTime()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [wheels, tickerFilter, statusFilter, sortField, sortDirection])

  // Calculate summary statistics
  const stats = useMemo(() => {
    const activeWheels = wheels.filter((w) => w.status === 'ACTIVE').length
    const totalCycles = wheels.reduce((sum, w) => sum + w.cycleCount, 0)
    const totalPL = wheels.reduce((sum, w) => sum + w.totalRealizedPL, 0)
    const totalPremiums = wheels.reduce((sum, w) => sum + w.totalPremiums, 0)

    return {
      totalWheels: wheels.length,
      activeWheels,
      totalCycles,
      totalPL,
      totalPremiums,
    }
  }, [wheels])

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'lastActivityAt' ? 'desc' : 'asc')
    }
  }

  return (
    <div className="w-full">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 font-medium">Total Wheels</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalWheels}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.activeWheels} active
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 font-medium">Total Cycles</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCycles}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.totalWheels > 0 ? (stats.totalCycles / stats.totalWheels).toFixed(1) : '0'} avg
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 font-medium">Total P&L</div>
          <div className={`text-3xl font-bold mt-2 ${getPnLColorClass(stats.totalPL)}`}>
            {stats.totalPL >= 0 ? '+' : ''}
            {formatCurrency(stats.totalPL)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 font-medium">Total Premium</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {formatCurrency(stats.totalPremiums)}
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters & Sorting</h3>
          <Link
            href="/wheels/new"
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Wheel
          </Link>
        </div>

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

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Wheels</option>
              <option value="ACTIVE">Active Only</option>
              <option value="IDLE">Idle Only</option>
              <option value="PAUSED">Paused Only</option>
              <option value="COMPLETED">Completed Only</option>
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
              <option value="totalRealizedPL">Total P&L</option>
              <option value="cycleCount">Cycle Count</option>
              <option value="lastActivityAt">Last Activity</option>
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
        {(tickerFilter || statusFilter !== 'ALL') && (
          <button
            onClick={() => {
              setTickerFilter('')
              setStatusFilter('ALL')
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 mb-4">
        Showing {filteredWheels.length} of {wheels.length} wheels
      </div>

      {/* Empty State */}
      {filteredWheels.length === 0 && (
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No wheels found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {wheels.length === 0
              ? "You haven't created any wheels yet. Get started by creating your first wheel!"
              : 'Try adjusting your filters to find what you\'re looking for.'}
          </p>
          {wheels.length === 0 && (
            <div className="mt-6">
              <Link
                href="/wheels/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Your First Wheel
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Desktop Grid View */}
      {filteredWheels.length > 0 && (
        <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredWheels.map((wheel) => (
            <WheelCard key={wheel.id} wheel={wheel} />
          ))}
        </div>
      )}

      {/* Tablet Grid View */}
      {filteredWheels.length > 0 && (
        <div className="hidden md:grid lg:hidden md:grid-cols-2 gap-6">
          {filteredWheels.map((wheel) => (
            <WheelCard key={wheel.id} wheel={wheel} />
          ))}
        </div>
      )}

      {/* Mobile List View */}
      {filteredWheels.length > 0 && (
        <div className="md:hidden space-y-4">
          {filteredWheels.map((wheel) => (
            <WheelCard key={wheel.id} wheel={wheel} />
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import React from 'react'
import type { TradeType } from '@/lib/generated/prisma'

export interface FilterValues {
  ticker: string
  type: TradeType | 'ALL'
  daysRange: 'all' | 'urgent' | 'soon' | 'later'
}

interface ExpirationFiltersProps {
  filters: FilterValues
  onFilterChange: (filters: FilterValues) => void
  availableTickers: string[]
}

export function ExpirationFilters({
  filters,
  onFilterChange,
  availableTickers,
}: ExpirationFiltersProps) {
  const handleTickerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      ticker: e.target.value,
    })
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      type: e.target.value as TradeType | 'ALL',
    })
  }

  const handleDaysRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      daysRange: e.target.value as FilterValues['daysRange'],
    })
  }

  const handleClearFilters = () => {
    onFilterChange({
      ticker: '',
      type: 'ALL',
      daysRange: 'all',
    })
  }

  const hasActiveFilters = filters.ticker !== '' || filters.type !== 'ALL' || filters.daysRange !== 'all'

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
        {/* Ticker Filter */}
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="ticker-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Ticker
          </label>
          <select
            id="ticker-filter"
            value={filters.ticker}
            onChange={handleTickerChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Tickers</option>
            {availableTickers.map((ticker) => (
              <option key={ticker} value={ticker}>
                {ticker}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            id="type-filter"
            value={filters.type}
            onChange={handleTypeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="PUT">PUT</option>
            <option value="CALL">CALL</option>
          </select>
        </div>

        {/* Days Range Filter */}
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="days-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Urgency
          </label>
          <select
            id="days-filter"
            value={filters.daysRange}
            onChange={handleDaysRangeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="urgent">Urgent (&lt;7 days)</option>
            <option value="soon">Soon (7-14 days)</option>
            <option value="later">Later (14+ days)</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors whitespace-nowrap"
            aria-label="Clear all filters"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Active filters:</span>{' '}
            {filters.ticker && `Ticker: ${filters.ticker}`}
            {filters.ticker && (filters.type !== 'ALL' || filters.daysRange !== 'all') && ', '}
            {filters.type !== 'ALL' && `Type: ${filters.type}`}
            {filters.type !== 'ALL' && filters.daysRange !== 'all' && ', '}
            {filters.daysRange !== 'all' && `Urgency: ${filters.daysRange}`}
          </p>
        </div>
      )}
    </div>
  )
}

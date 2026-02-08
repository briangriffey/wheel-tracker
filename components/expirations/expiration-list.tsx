'use client'

import React, { useState, useMemo } from 'react'
import type { ExpirationTrade } from '@/lib/queries/expirations'
import { ExpirationCard } from './expiration-card'
import { ExpirationFilters, type FilterValues } from './expiration-filters'

interface ExpirationListProps {
  initialExpirations: ExpirationTrade[]
  onRefresh?: () => void
}

export function ExpirationList({ initialExpirations, onRefresh }: ExpirationListProps) {
  const [filters, setFilters] = useState<FilterValues>({
    ticker: '',
    type: 'ALL',
    daysRange: 'all',
  })

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  // Extract unique tickers for filter dropdown
  const availableTickers = useMemo(() => {
    const tickers = new Set(initialExpirations.map((exp) => exp.ticker))
    return Array.from(tickers).sort()
  }, [initialExpirations])

  // Apply filters
  const filteredExpirations = useMemo(() => {
    let filtered = [...initialExpirations]

    // Filter by ticker
    if (filters.ticker) {
      filtered = filtered.filter((exp) => exp.ticker === filters.ticker)
    }

    // Filter by type
    if (filters.type !== 'ALL') {
      filtered = filtered.filter((exp) => exp.type === filters.type)
    }

    // Filter by days range
    if (filters.daysRange !== 'all') {
      filtered = filtered.filter((exp) => {
        if (filters.daysRange === 'urgent') {
          return exp.daysUntil < 7
        } else if (filters.daysRange === 'soon') {
          return exp.daysUntil >= 7 && exp.daysUntil < 14
        } else if (filters.daysRange === 'later') {
          return exp.daysUntil >= 14
        }
        return true
      })
    }

    return filtered
  }, [initialExpirations, filters])

  // Group by urgency for stats
  const stats = useMemo(() => {
    const urgent = filteredExpirations.filter((exp) => exp.daysUntil < 7).length
    const soon = filteredExpirations.filter((exp) => exp.daysUntil >= 7 && exp.daysUntil < 14).length
    const later = filteredExpirations.filter((exp) => exp.daysUntil >= 14).length

    return { urgent, soon, later, total: filteredExpirations.length }
  }, [filteredExpirations])

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters)
  }

  const handleUpdate = () => {
    // Trigger parent refresh if provided
    if (onRefresh) {
      onRefresh()
    }
  }

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label="List view"
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label="Calendar view"
          >
            Calendar View
          </button>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            aria-label="Refresh expirations"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Filters */}
      <ExpirationFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        availableTickers={availableTickers}
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow-sm p-4">
          <p className="text-sm text-red-600">Urgent (&lt;7d)</p>
          <p className="text-2xl font-bold text-red-700">{stats.urgent}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-sm p-4">
          <p className="text-sm text-yellow-600">Soon (7-14d)</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.soon}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-4">
          <p className="text-sm text-green-600">Later (14+d)</p>
          <p className="text-2xl font-bold text-green-700">{stats.later}</p>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <>
          {/* List View */}
          {filteredExpirations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">No expirations found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredExpirations.map((expiration) => (
                <ExpirationCard
                  key={expiration.id}
                  trade={expiration}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Calendar View - Group by date */}
          {filteredExpirations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">No expirations found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(
                filteredExpirations.reduce((acc, exp) => {
                  const dateKey = new Date(exp.expirationDate).toISOString().split('T')[0]
                  if (!acc[dateKey]) {
                    acc[dateKey] = []
                  }
                  acc[dateKey].push(exp)
                  return acc
                }, {} as Record<string, ExpirationTrade[]>)
              )
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([dateKey, expirations]) => {
                  const date = new Date(dateKey)
                  const formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })

                  return (
                    <div key={dateKey}>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>{formattedDate}</span>
                        <span className="text-sm font-normal text-gray-500">
                          ({expirations.length} {expirations.length === 1 ? 'trade' : 'trades'})
                        </span>
                      </h3>
                      <div className="space-y-4">
                        {expirations.map((expiration) => (
                          <ExpirationCard
                            key={expiration.id}
                            trade={expiration}
                            onUpdate={handleUpdate}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

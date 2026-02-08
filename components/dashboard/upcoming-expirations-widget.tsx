'use client'

import React from 'react'
import Link from 'next/link'
import type { ExpirationTrade } from '@/lib/queries/expirations'

interface UpcomingExpirationsWidgetProps {
  expirations: ExpirationTrade[]
}

export function UpcomingExpirationsWidget({ expirations }: UpcomingExpirationsWidgetProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const getDaysText = (daysUntil: number) => {
    if (daysUntil < 0) return 'Past due'
    if (daysUntil === 0) return 'Today'
    if (daysUntil === 1) return 'Tomorrow'
    return `${daysUntil}d`
  }

  const getColorClass = (daysUntil: number) => {
    if (daysUntil < 7) return 'text-red-600 bg-red-50'
    if (daysUntil < 14) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Upcoming Expirations</h2>
        <Link
          href="/expirations"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          View All
        </Link>
      </div>

      {/* Expirations List */}
      {expirations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No upcoming expirations</p>
          <Link
            href="/trades/new"
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Create a trade
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {expirations.map((expiration) => (
            <div
              key={expiration.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              {/* Left Side - Ticker and Type */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{expiration.ticker}</span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        expiration.type === 'PUT'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {expiration.type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Strike: {formatCurrency(expiration.strikePrice.toString())} • {expiration.contracts}x
                  </div>
                </div>
              </div>

              {/* Right Side - Days and Date */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div
                    className={`text-sm font-semibold px-2 py-1 rounded ${getColorClass(expiration.daysUntil)}`}
                  >
                    {getDaysText(expiration.daysUntil)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(expiration.expirationDate)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer with summary */}
      {expirations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {expirations.filter((e) => e.daysUntil < 7).length} urgent
            </span>
            <span className="text-gray-600">
              Total premium: {formatCurrency(
                expirations.reduce((sum, e) => sum + parseFloat(e.premium.toString()), 0)
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

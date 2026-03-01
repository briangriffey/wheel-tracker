'use client'

import React, { useState, useMemo } from 'react'
import { WheelCard } from './wheel-card'

type WheelStatus = 'ACTIVE' | 'IDLE' | 'PAUSED' | 'COMPLETED'

interface Wheel {
  id: string
  ticker: string
  status: string
  cycleCount: number
  totalPremiums: number
  totalRealizedPL: number
  startedAt: Date
  lastActivityAt: Date
  completedAt: Date | null
  notes: string | null
  tradeCount: number
  positionCount: number
  deployedCapital: number
}

interface WheelsListProps {
  initialWheels: Wheel[]
  accountValue: number
}

const statusFilters: { value: WheelStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Wheels' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IDLE', label: 'Idle' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
]

export function WheelsList({ initialWheels, accountValue }: WheelsListProps) {
  const [statusFilter, setStatusFilter] = useState<WheelStatus | 'ALL'>('ALL')

  // Filter wheels based on status
  const filteredWheels = useMemo(() => {
    if (statusFilter === 'ALL') {
      return initialWheels
    }
    return initialWheels.filter((wheel) => wheel.status === statusFilter)
  }, [initialWheels, statusFilter])

  // Calculate summary stats
  const stats = useMemo(() => {
    const activeCount = initialWheels.filter((w) => w.status === 'ACTIVE').length
    const idleCount = initialWheels.filter((w) => w.status === 'IDLE').length
    const totalPremiums = initialWheels.reduce((sum, w) => sum + w.totalPremiums, 0)
    const totalPL = initialWheels.reduce((sum, w) => sum + w.totalRealizedPL, 0)

    return {
      activeCount,
      idleCount,
      totalPremiums,
      totalPL,
    }
  }, [initialWheels])

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Active Wheels</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.activeCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Idle Wheels</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.idleCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Premiums</h3>
          <p className="text-2xl font-bold text-green-600">
            $
            {stats.totalPremiums.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Realized P&L</h3>
          <p
            className={`text-2xl font-bold ${
              stats.totalPL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {stats.totalPL >= 0 ? '+' : ''}$
            {stats.totalPL.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-min" aria-label="Tabs">
          {statusFilters.map((filter) => {
            const count =
              filter.value === 'ALL'
                ? initialWheels.length
                : initialWheels.filter((w) => w.status === filter.value).length

            const isActive = statusFilter === filter.value

            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex-shrink-0
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {filter.label}
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Wheels Grid */}
      {filteredWheels.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-lg shadow">
          <p className="text-gray-500">
            No {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()} wheels found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWheels.map((wheel) => (
            <WheelCard key={wheel.id} wheel={wheel} accountValue={accountValue} />
          ))}
        </div>
      )}
    </div>
  )
}

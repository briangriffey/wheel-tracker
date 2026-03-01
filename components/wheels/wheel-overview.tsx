'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { pauseWheel, completeWheel } from '@/lib/actions/wheels'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils/format'

interface WheelOverviewProps {
  wheel: {
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
    deployedCapital: number
  }
  accountValue: number
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800'
    case 'IDLE':
      return 'bg-gray-100 text-gray-800'
    case 'PAUSED':
      return 'bg-yellow-100 text-yellow-800'
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function WheelOverview({ wheel, accountValue }: WheelOverviewProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handlePause = async () => {
    if (!confirm('Are you sure you want to pause this wheel?')) {
      return
    }

    setIsLoading(true)
    const result = await pauseWheel(wheel.id)
    setIsLoading(false)

    if (result.success) {
      toast.success('Wheel paused successfully')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const handleComplete = async () => {
    if (
      !confirm(
        'Are you sure you want to complete this wheel? This will permanently end the wheel strategy for this ticker.'
      )
    ) {
      return
    }

    setIsLoading(true)
    const result = await completeWheel(wheel.id)
    setIsLoading(false)

    if (result.success) {
      toast.success('Wheel completed successfully')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const avgCyclePL = wheel.cycleCount > 0 ? wheel.totalRealizedPL / wheel.cycleCount : 0

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-5 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{wheel.ticker}</h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  wheel.status
                )}`}
              >
                {wheel.status}
              </span>
            </div>
            {wheel.notes && <p className="mt-2 text-sm text-gray-600">{wheel.notes}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Started {new Date(wheel.startedAt).toLocaleDateString('en-US', { timeZone: 'UTC' })} • Last activity{' '}
              {new Date(wheel.lastActivityAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            {wheel.status === 'ACTIVE' && (
              <>
                <button
                  onClick={handlePause}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Pause
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Complete
                </button>
              </>
            )}
            <Link
              href="/wheels"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Wheels
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 px-6 py-5">
        {/* Cycles Completed */}
        <div>
          <dt className="text-sm font-medium text-gray-500">Cycles Completed</dt>
          <dd className="mt-1 text-2xl font-semibold text-gray-900">{wheel.cycleCount}</dd>
        </div>

        {/* Total P&L */}
        <div>
          <dt className="text-sm font-medium text-gray-500">Total Realized P&L</dt>
          <dd
            className={`mt-1 text-2xl font-semibold ${
              wheel.totalRealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {wheel.totalRealizedPL >= 0 ? '+' : ''}$
            {wheel.totalRealizedPL.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </dd>
        </div>

        {/* Total Premiums */}
        <div>
          <dt className="text-sm font-medium text-gray-500">Total Premiums Collected</dt>
          <dd className="mt-1 text-2xl font-semibold text-gray-900">
            $
            {wheel.totalPremiums.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </dd>
        </div>

        {/* Average Cycle P&L */}
        <div>
          <dt className="text-sm font-medium text-gray-500">Avg Cycle P&L</dt>
          <dd
            className={`mt-1 text-2xl font-semibold ${
              avgCyclePL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {wheel.cycleCount > 0 ? (
              <>
                {avgCyclePL >= 0 ? '+' : ''}$
                {avgCyclePL.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </>
            ) : (
              <span className="text-gray-400">N/A</span>
            )}
          </dd>
        </div>

        {/* Capital Deployed */}
        <div>
          <dt className="text-sm font-medium text-gray-500">Capital Deployed</dt>
          <dd className="mt-1 text-2xl font-semibold text-gray-900">
            {accountValue > 0 ? (
              <>
                {formatCurrency(wheel.deployedCapital)}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  ({((wheel.deployedCapital / accountValue) * 100).toFixed(1)}%)
                </span>
              </>
            ) : (
              <span className="text-gray-400">N/A</span>
            )}
          </dd>
        </div>
      </div>
    </div>
  )
}

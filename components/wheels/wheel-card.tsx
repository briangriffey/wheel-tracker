'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
}

interface WheelCardProps {
  wheel: Wheel
}

// Helper to determine current step in wheel cycle
function getCurrentStep(wheel: Wheel): {
  step: string
  description: string
  color: string
} {
  // This is a simplified version - in a full implementation,
  // we'd fetch the actual trades and positions to determine the exact state
  if (wheel.status === 'IDLE') {
    return {
      step: 'Idle',
      description: 'Cycle complete, ready for new PUT',
      color: 'gray',
    }
  }

  if (wheel.status === 'PAUSED') {
    return {
      step: 'Paused',
      description: 'Wheel strategy paused',
      color: 'yellow',
    }
  }

  if (wheel.status === 'COMPLETED') {
    return {
      step: 'Completed',
      description: 'Wheel strategy ended',
      color: 'gray',
    }
  }

  // ACTIVE status - determine based on trade/position count
  if (wheel.positionCount > 0) {
    // Has positions - either holding or covered
    return {
      step: 'Step 2-3',
      description: 'Holding position / Covered calls',
      color: 'blue',
    }
  }

  // Has trades but no positions - collecting PUT premium
  return {
    step: 'Step 1',
    description: 'Collecting PUT premium',
    color: 'green',
  }
}

// Helper to get status badge color
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

// Helper to calculate win rate (simplified - would use actual cycle data in full impl)
function calculateWinRate(wheel: Wheel): number {
  if (wheel.cycleCount === 0) return 0
  // Simplified: if total P&L is positive, assume high win rate
  if (wheel.totalRealizedPL > 0) {
    return Math.min(100, 75 + (wheel.cycleCount * 5))
  }
  return 50
}

// Helper to calculate average cycle P&L
function calculateAvgCyclePL(wheel: Wheel): number {
  if (wheel.cycleCount === 0) return 0
  return wheel.totalRealizedPL / wheel.cycleCount
}

export function WheelCard({ wheel }: WheelCardProps) {
  const router = useRouter()
  const currentStep = getCurrentStep(wheel)
  const winRate = calculateWinRate(wheel)
  const avgCyclePL = calculateAvgCyclePL(wheel)

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        {/* Header: Ticker and Status */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{wheel.ticker}</h3>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  wheel.status
                )}`}
              >
                {wheel.status}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                currentStep.color === 'green'
                  ? 'bg-green-100 text-green-800'
                  : currentStep.color === 'blue'
                  ? 'bg-blue-100 text-blue-800'
                  : currentStep.color === 'yellow'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {currentStep.step}
            </div>
            <p className="text-xs text-gray-500 mt-1">{currentStep.description}</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-3 mb-4">
          {/* Cycles Completed */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Cycles Completed</span>
            <span className="text-sm font-semibold text-gray-900">{wheel.cycleCount}</span>
          </div>

          {/* Total P&L */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total P&L</span>
            <span
              className={`text-sm font-semibold ${
                wheel.totalRealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {wheel.totalRealizedPL >= 0 ? '+' : ''}$
              {wheel.totalRealizedPL.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Total Premiums */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Premiums</span>
            <span className="text-sm font-semibold text-gray-900">
              ${wheel.totalPremiums.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Average Cycle P&L */}
          {wheel.cycleCount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Cycle P&L</span>
              <span
                className={`text-sm font-semibold ${
                  avgCyclePL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {avgCyclePL >= 0 ? '+' : ''}$
                {avgCyclePL.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          {/* Win Rate */}
          {wheel.cycleCount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Win Rate</span>
              <span className="text-sm font-semibold text-gray-900">{winRate}%</span>
            </div>
          )}

          {/* Trade Count */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">Trades</span>
            <span className="text-xs font-medium text-gray-700">{wheel.tradeCount}</span>
          </div>

          {/* Position Count */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Positions</span>
            <span className="text-xs font-medium text-gray-700">{wheel.positionCount}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <Link
            href={`/wheels/${wheel.id}`}
            className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Details
          </Link>

          {wheel.status === 'ACTIVE' && (
            <button
              onClick={() => {
                // Quick action based on current step
                if (wheel.positionCount > 0) {
                  router.push(`/trades/new?ticker=${wheel.ticker}&type=CALL`)
                } else {
                  router.push(`/trades/new?ticker=${wheel.ticker}&type=PUT`)
                }
              }}
              className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {wheel.positionCount > 0 ? 'Sell Call' : 'Sell Put'}
            </button>
          )}

          {wheel.status === 'IDLE' && (
            <button
              onClick={() => router.push(`/trades/new?ticker=${wheel.ticker}&type=PUT`)}
              className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Start New PUT
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

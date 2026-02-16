import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getWheelDetail } from '@/lib/actions/wheels'
import { WheelOverview } from '@/components/wheels/wheel-overview'
import { WheelCurrentStatus } from '@/components/wheels/wheel-current-status'
import { WheelTradesList } from '@/components/wheels/wheel-trades-list'
import { WheelPositionsList } from '@/components/wheels/wheel-positions-list'
import { WheelCycleHistory } from '@/components/wheels/wheel-cycle-history'

export const metadata = {
  title: 'Wheel Details | GreekWheel',
  description: 'Detailed view of your wheel strategy cycle',
}

interface WheelDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WheelDetailPage({ params }: WheelDetailPageProps) {
  const { id } = await params
  const result = await getWheelDetail(id)

  if (!result.success) {
    if (result.error === 'Wheel not found' || result.error === 'Unauthorized') {
      notFound()
    }

    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading wheel: {result.error}</p>
        </div>
      </div>
    )
  }

  const wheel = result.data

  // Separate current (OPEN) and historical (CLOSED) data
  const currentTrades = wheel.trades.filter((t) => t.status === 'OPEN')
  const currentPosition = wheel.positions.find((p) => p.status === 'OPEN')
  const closedPositions = wheel.positions.filter((p) => p.status === 'CLOSED')

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumb Navigation */}
      <nav className="mb-6 flex items-center text-sm text-gray-600">
        <Link href="/wheels" className="hover:text-gray-900 hover:underline">
          Wheels
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{wheel.ticker}</span>
      </nav>

      {/* Page Header with Overview */}
      <WheelOverview wheel={wheel} />

      {/* Current Status - Step in Cycle */}
      <div className="mt-8">
        <WheelCurrentStatus
          wheel={wheel}
          currentTrades={currentTrades}
          currentPosition={currentPosition}
        />
      </div>

      {/* Current Trades Section */}
      {currentTrades.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Trades</h2>
          <WheelTradesList trades={currentTrades} />
        </div>
      )}

      {/* Current Position Section */}
      {currentPosition && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Position</h2>
          <WheelPositionsList positions={[currentPosition]} ticker={wheel.ticker} />
        </div>
      )}

      {/* Cycle History */}
      {wheel.cycleCount > 0 && closedPositions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cycle History</h2>
          <WheelCycleHistory closedPositions={closedPositions} />
        </div>
      )}

      {/* Empty State for New Wheels */}
      {currentTrades.length === 0 && !currentPosition && closedPositions.length === 0 && (
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No activity yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Start this wheel by selling a PUT option on {wheel.ticker}.
          </p>
          <div className="mt-6">
            <Link
              href={`/trades/new?ticker=${wheel.ticker}&type=PUT&wheelId=${wheel.id}`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sell PUT Option
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
